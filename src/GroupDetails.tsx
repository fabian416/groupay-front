import React, { useEffect, useState } from 'react'
import './GroupDetails.css'
import ExpenseModal from './ExpenseModal'
import DepositModal from './DepositModal'
import WithdrawalModal from './WithdrawalModal'
import StartSettleModal from './StartSettleModal'
import axios from 'axios'
import { calculateIndividualBalances } from './utils/debtUtils'
import { ethers } from 'ethers'
import Safe, { EthersAdapter } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import USDC_ABI from './abi/USDC.json'
import SquaryContractABIJson from './abi/SquaryContractAbi.json'
import { ActualBalance } from './graphql/ActualBalance'
import { useUserContext } from './UserContext'
import { fetchAliasMapping } from './utils/aliasMapping'
interface Group {
  id: number
  name: string
  status: string
  safeAddress?: string
}
interface GroupDetailsProps {
  group: Group
}

interface SettlementConfirmation {
  userWalletAddress: string
  confirmed: boolean
}
interface Transaction {
  proposedby: string | null
  sharedWith: string[] | null
  id: string
  createdAt: string
  type: string
  description?: string
  amount: number
  address: string
}
interface AliasMapping {
  [address: string]: string | undefined
}

export interface Debt {
  id: number
  debtor: string
  creditor: string
  amount: number
  createdAt: string
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ group }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [members, setMembers] = useState<
    { alias: string; walletAddress: string }[]
  >([])
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [expenses, setExpenses] = useState<any[]>([])
  const userContext = useUserContext()
  const [refreshTrigger, setRefreshTrigger] = useState(false)
  const [gnosisSafeAddress, setGnosisSafeAddress] = useState('')
  const [debts, setDebts] = useState<any[]>([])
  const SQUARY_CONTRACT_ADDRESS = '0xE94E9d573E547DF5B7FCeDA6B03ee279e5B864Ce'
  const USDC_CONTRACT_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
  const [settleInitiated, setSettleInitiated] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [userHasConfirmed, setUserHasConfirmed] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [safeSdk, setSafeSdk] = useState<Safe | null>(null)
  const [safeApiKit, setSafeApiKit] = useState<SafeApiKit | null>(null)
  const [isSafeSdkReady, setIsSafeSdkReady] = useState(false)

  const createAndProposeTransaction = async () => {
    if (!safeSdk || debts.length === 0) {
      console.error(
        'Safe SDK not initialized or simplified debts are not available.',
      )
      return
    }
    try {
      const debtsInMicroUSD = debts.map((debt) => ({
        ...debt,
        amount: ethers.utils.parseUnits(debt.amount.toFixed(6), 6),
      }))

      const walletAddress = await signer.getAddress()
      const squaryContractInterface = new ethers.utils.Interface(
        SquaryContractABIJson.abi,
      )
      const data = squaryContractInterface.encodeFunctionData('settleGroup', [
        gnosisSafeAddress,
        debtsInMicroUSD,
      ])

      const safeTransactionData = {
        to: SQUARY_CONTRACT_ADDRESS,
        value: '0',
        data: data,
      }

      const safeTransaction = await safeSdk.createTransaction({
        safeTransactionData,
      })

      const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
      const senderSignature = await safeSdk.signTransactionHash(safeTxHash)

      // Create ethAdapter
      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      })

      // Initiate SafeApiKit con ethAdapter y txServiceUrl
      const safeApiKit = new SafeApiKit({
        ethAdapter: ethAdapter,
        txServiceUrl: 'https://safe-transaction-goerli.safe.global',
      })

      await safeApiKit.proposeTransaction({
        safeAddress: gnosisSafeAddress,
        safeTransactionData: safeTransaction.data,
        safeTxHash,
        senderAddress: walletAddress,
        senderSignature: senderSignature.data,
        origin: 'Squary',
      })
      //  Update the commit status in the database
      await axios.post(
        `http://localhost:3001/api/transactions/${group.id}/confirm`,
        {
          userWalletAddress: walletAddress,
        },
      )

      //  Update the frontend status to reflect the commit
      setUserHasConfirmed(true)
    } catch (error) {
      console.error(
        'Error when creating and proposing settlement transaction:',
        error,
      )
    }
  }

  const executeSettlementTransaction = async () => {
    if (!safeSdk || debts.length === 0 || !safeApiKit) {
      console.error(
        'Safe SDK not initialized or simplified debts are not available.',
      )
      return
    }
    try {
      const status = await getSettleStatus(group.id)
      console.log('Settlement Status:', status)

      if (status.confirmed) {
        const pendingTransactionsResponse =
          await safeApiKit.getPendingTransactions(gnosisSafeAddress)
        console.log('Pending Transactions:', pendingTransactionsResponse)

        const transactionsArray = pendingTransactionsResponse.results
        const squaryContractInterface = new ethers.utils.Interface(
          SquaryContractABIJson.abi,
        )
        const settleGroupSelector =
          squaryContractInterface.getSighash('settleGroup')

        const safeTransaction = transactionsArray.find(
          (tx) =>
            tx.to.toLowerCase() === SQUARY_CONTRACT_ADDRESS.toLowerCase() &&
            tx.data &&
            tx.data.startsWith(settleGroupSelector),
        )

        console.log('Transaction found:', safeTransaction)

        if (safeTransaction) {
          const executeTxResponse =
            await safeSdk.executeTransaction(safeTransaction)
          console.log('Transaction Response:', executeTxResponse)

          if (executeTxResponse.transactionResponse) {
            const receipt = await executeTxResponse.transactionResponse.wait()
            console.log('Transaction executed:', receipt)
            setRefreshTrigger((prevState) => !prevState)
            console.log('Estado de refreshTrigger cambiado después del retiro.')

            await registerSettlementTransaction()

            // Resetear el estado del asentamiento
            try {
              await axios.post(
                `http://localhost:3001/api/transactions/${group.id}/resetSettleState`,
              )
              // Update status on frontend
              setSettleInitiated(false)
              setUserHasConfirmed(false)
              fetchTransactions()
              fetchGroupDebtsAndBalances()
            } catch (error) {
              console.error(
                'Error al resetear el estado del asentamiento:',
                error,
              )
            }
          } else {
            console.error('Could not get the transaction response')
          }
        } else {
          console.error('Pending transaction not found or not ready to run')
        }
      } else {
        console.error('The settlement is not yet ready to be executed.')
      }
    } catch (error) {
      console.error('Error executing the settlement transaction:', error)
    }
  }

  const registerSettlementTransaction = async () => {
    try {
      const description = 'Settlement executed'
      const groupId = Number(group.id)
      const amount = 1

      console.log('Sending data to settlementTransaction:', {
        groupId,
        amount,
        description,
      })

      await axios.post(
        `http://localhost:3001/api/transactions/${groupId}/settlementTransaction`,
        {
          description,
          groupId,
          amount,
        },
      )
    } catch (error) {
      console.error('Error recording settlement transaction:', error)
    }
  }

  const checkIfSettleReadyToExecute = async () => {
    // Get the settlement state
    const status = await getSettleStatus(group.id)
    if (status.confirmed) {
      // Execute the settlement Transaction
      executeSettlementTransaction()
    }
  }

  useEffect(() => {
    const checkSettleStatus = async () => {
      const status = await getSettleStatus(group.id)
      setSettleInitiated(status.initiated)
      setUserHasConfirmed(status.confirmed)
      await fetchSettlementConfirmations()
    }
    checkSettleStatus()
  }, [group.id])

  useEffect(() => {
    if (gnosisSafeAddress) {
      const initializeSafeSdk = async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const ethAdapter = new EthersAdapter({
          ethers,
          signerOrProvider: signer,
        })
        const safeSdkInstance = await Safe.create({
          ethAdapter,
          safeAddress: gnosisSafeAddress,
        })
        const newSafeApiKit = new SafeApiKit({
          ethAdapter,
          txServiceUrl: 'https://safe-transaction-goerli.safe.global',
        })

        setSafeSdk(safeSdkInstance)
        setSafeApiKit(newSafeApiKit)
        setIsSafeSdkReady(true)
      }

      initializeSafeSdk()
    }
  }, [gnosisSafeAddress])

  const fetchGroupDebtsAndBalances = async () => {
    try {
      // We updated the URL to only get debts not included in previous settlements
      const debtsResponse = await axios.get(
        `http://localhost:3001/api/debts/groups/${group.id}/unsettled`,
      )
      const simplifiedDebts = debtsResponse.data
      setDebts(simplifiedDebts)
      const newBalances = calculateIndividualBalances(simplifiedDebts) // balances based on simplified debts
      setBalances(newBalances)
    } catch (error) {
      console.error('Error fetching group debts and balances: ', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const expensesResponse = await axios.get(
        `http://localhost:3001/api/transactions/${group.id}/expenses`,
      )
      const settlementsResponse = await axios.get(
        `http://localhost:3001/api/transactions/${group.id}/settlementTransactions`,
      )

      const combinedTransactions = [
        ...expensesResponse.data,
        ...settlementsResponse.data,
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      return combinedTransactions
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const updateTransactionsWithAliases = async () => {
    try {
      const fetchedTransactions = await fetchTransactions()
      if (!fetchedTransactions || fetchedTransactions.length === 0) {
        return
      }

      const walletAddresses = new Set<string>()
      fetchedTransactions.forEach((transaction) => {
        if (transaction.proposedby) {
          walletAddresses.add(transaction.proposedby)
        }
        transaction.sharedWith?.forEach((address: string) => {
          if (address) {
            walletAddresses.add(address)
          }
        })
      })

      const aliasMapping = await fetchAliasMapping(Array.from(walletAddresses))

      const updatedTransactions = fetchedTransactions.map((transaction) => ({
        ...transaction,
        proposedby:
          aliasMapping[transaction.proposedby?.toLowerCase()] ||
          transaction.proposedby,
        sharedWith: (transaction.sharedWith ?? []).map(
          (address: string) => aliasMapping[address?.toLowerCase()] || address,
        ),
      }))

      setTransactions(updatedTransactions)
    } catch (error) {
      console.error('Error updating transactions with aliases:', error)
    }
  }

  useEffect(() => {
    const updateData = async () => {
      await fetchTransactions()
      await fetchGroupDebtsAndBalances()
      await updateTransactionsWithAliases()
    }

    updateData()
  }, [group.id])

  // Function to get all the members and the Gnosis Safe Address
  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/api/groups/${group.id}/members`,
        )

        if (response.data && response.data.gnosisSafeAddress) {
          setMembers(response.data.members)
          if (response.data.gnosisSafeAddress !== gnosisSafeAddress) {
            setGnosisSafeAddress(response.data.gnosisSafeAddress)
            userContext?.setGnosisSafeAddress(response.data.gnosisSafeAddress)
            console.log(
              'Updated context with Gnosis Safe Address:',
              response.data.gnosisSafeAddress,
            )
          }
        } else {
          console.error('Gnosis Safe Address not found in response')
        }
      } catch (error) {
        console.error('Error getting group members:', error)
      }
    }

    fetchGroupMembers()
  }, [group.id, gnosisSafeAddress, userContext])

  // Function to open the modal
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }
  const handleOpenConfirmModal = () => {
    setIsConfirmModalOpen(true)
  }
  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false)
  }
  const handleCloseErrorModal = () => {
    setIsErrorModalOpen(false)
    setErrorMessage('')
  }

  // Functión to close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    fetchTransactions()
    fetchGroupDebtsAndBalances()
  }

  // Función to get the state of the settle
  const getSettleStatus = async (groupId: number) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/transactions/${groupId}/settleState`,
      )
      // Backend API now returns only 'initiated' and 'confirmed'
      return response.data
    } catch (error) {
      console.error('Error getting the settlement state ', error)
      return { initiated: false, confirmed: false }
    }
  }

  const fetchSettlementConfirmations = async () => {
    try {
      const response = await axios.get<SettlementConfirmation[]>(
        `http://localhost:3001/api/transactions/${group.id}/confirmations`,
      )
      const walletAddress = await signer.getAddress()
      const hasConfirmed = response.data.some(
        (confirmation: SettlementConfirmation) =>
          confirmation.userWalletAddress === walletAddress &&
          confirmation.confirmed,
      )
      setUserHasConfirmed(hasConfirmed)
    } catch (error) {
      console.error('Error getting settlement confirmations:', error)
    }
  }

  const handleSettle = async () => {
    // If the settlement has not yet started or the user has not confirmed
    if (!settleInitiated || !userHasConfirmed) {
      handleOpenConfirmModal()
    } else {
      console.log('Checking if settle is ready to execute...')
      checkIfSettleReadyToExecute() // Check if the settlement is ready to be executed
    }
  }

  const confirmSettleAction = async () => {
    handleCloseConfirmModal()

    const walletAddress = await signer.getAddress()

    if (!settleInitiated) {
      console.log('Settle not initiated, initiating...')
      // Initiates the settlement process and proposes the transaction if it is the first
      try {
        const response = await axios.post(
          `http://localhost:3001/api/transactions/${group.id}/initiateConfirmation`,
        )
        if (response.status === 200) {
          setSettleInitiated(true)
          //  If you're the first to confirm, create and propose the transaction
          await createAndProposeTransaction()
        }
      } catch (error) {
        console.error('Error starting settlement confirmation:', error)
      }
    } else {
      if (!safeApiKit || !safeSdk) {
        console.error('Gnosis Safe SDK or Safe API Kit are not initialized.')
        return
      }
      try {
        // Get the pending transactions from the Safe
        const pendingTransactions =
          await safeApiKit.getPendingTransactions(gnosisSafeAddress)
        if (
          pendingTransactions &&
          pendingTransactions.results &&
          pendingTransactions.results.length > 0
        ) {
          const transactions = pendingTransactions.results
          const squaryContractInterface = new ethers.utils.Interface(
            SquaryContractABIJson.abi,
          )
          const settleGroupSelector =
            squaryContractInterface.getSighash('settleGroup')

          // Find the transaction that corresponds to the settlement process
          const transaction = transactions.find(
            (tx) =>
              tx.to.toLowerCase() === SQUARY_CONTRACT_ADDRESS.toLowerCase() &&
              tx.data?.startsWith(settleGroupSelector),
          )

          if (transaction) {
            // Print the details of the pending transaction
            console.log('Detalles de la transacción pendiente:', transaction)

            // Sign the transaction
            const signature = await safeSdk.signTransactionHash(
              transaction.safeTxHash,
            )

            // Confirm the transaction
            await safeApiKit.confirmTransaction(
              transaction.safeTxHash,
              signature.data,
            )

            await axios.post(
              `http://localhost:3001/api/transactions/${group.id}/confirm`,
              {
                userWalletAddress: walletAddress,
              },
            )
            setUserHasConfirmed(true)
            console.log('Transaction confirmed and signed by the user.')
          } else {
            console.error(
              'The proposed pending transaction for the settlement was not found.',
            )
          }
        } else {
          console.error('No pending transactions found')
        }
      } catch (error) {
        console.error(
          'Error confirming and signing settlement transaction:',
          error,
        )
      }
    }
  }
  useEffect(() => {
    if (isSafeSdkReady && debts.length > 0) checkIfSettleReadyToExecute()
  }, [settleInitiated, userHasConfirmed, isSafeSdkReady, debts])

  const handleDepositUSDC = async () => {
    try {
      const amountNumber = parseFloat(depositAmount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        alert('Please enter a valid amount.')
        return
      }

      // Convert the amount to be deposited to a BigNumber object
      const amountToDeposit = ethers.utils.parseUnits(
        amountNumber.toString(),
        '6',
      )

      // Create an instance of the USDC contract
      const usdcContract = new ethers.Contract(
        USDC_CONTRACT_ADDRESS,
        USDC_ABI,
        signer,
      )

      // Approve the Squary contract to withdraw USDC tokens
      const approveTx = await usdcContract.approve(
        SQUARY_CONTRACT_ADDRESS,
        amountToDeposit,
      )
      await approveTx.wait()

      // Create an instance of the Squary contract
      const squaryContract = new ethers.Contract(
        SQUARY_CONTRACT_ADDRESS,
        SquaryContractABIJson.abi,
        signer,
      )

      // Make the deposti
      const depositTx = await squaryContract.depositFunds(
        gnosisSafeAddress,
        amountToDeposit.toString(),
      )
      await depositTx.wait()
      setRefreshTrigger((prevState) => !prevState)
      console.log('USDC deposit made successfully!')
      setIsDepositModalOpen(false)
    } catch (error) {
      console.error('USDC deposit failed:', error)
    }
  }
  const handleWithdrawUSDC = async () => {
    try {
      const amountNumber = parseFloat(withdrawAmount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        alert('Please enter a valid amount.')
        return
      }

      // Convert the amount to be withdrawn to a BigNumber object
      const amountToWithdraw = ethers.utils.parseUnits(
        amountNumber.toString(),
        '6',
      )

      // Create an instance of the Squary contract
      const squaryContract = new ethers.Contract(
        SQUARY_CONTRACT_ADDRESS,
        SquaryContractABIJson.abi,
        signer,
      )
      // Make the withdrawal
      const withdrawTx = await squaryContract.withdrawFunds(
        gnosisSafeAddress,
        amountToWithdraw.toString(),
      )
      await withdrawTx.wait()

      console.log('USDC withdrawal successfully completed!')
      setRefreshTrigger((prevState) => !prevState)
      console.log('refreshTrigger state changed after retirement.')
      setIsWithdrawModalOpen(false)
    } catch (error) {
      setIsWithdrawModalOpen(false)
      setIsErrorModalOpen(true)
      setErrorMessage('You cannot withdraw this amount. Check available funds.')
    }
  }

  return (
    <div className="group-details-container">
      <h2 className="group-details-header">Group Details</h2>
      <ActualBalance triggerRefresh={refreshTrigger} />
      <div className="group-details-content">
        <p>
          <strong>Name:</strong> {group.name}
          <br />
          <strong>Status:</strong> {group.status}
          <br />
          {gnosisSafeAddress && (
            <>
              <strong>Gnosis Safe Address:</strong> {gnosisSafeAddress}
              <br />
            </>
          )}
        </p>

        <div className="buttons-container">
          <button className="button-add" onClick={handleOpenModal}>
            Add shared expense
          </button>
          <button
            className="button-deposit"
            onClick={() => setIsDepositModalOpen(true)}
          >
            Deposit USDC
          </button>
          <button
            className="button-withdraw"
            onClick={() => setIsWithdrawModalOpen(true)}
          >
            Withdraw USDC
          </button>
          <button className="button-settle" onClick={handleSettle}>
            {!settleInitiated
              ? 'Start Settle'
              : !userHasConfirmed
                ? 'Confirm Settle'
                : 'Settle'}
          </button>
        </div>
        {/* Confirmation Modal */}
        {isConfirmModalOpen && (
          <StartSettleModal
            isConfirmModalOpen={isConfirmModalOpen}
            confirmSettleAction={confirmSettleAction}
            handleCloseConfirmModal={handleCloseConfirmModal}
          />
        )}
        {/* Deposit Modal */}
        {isDepositModalOpen && (
          <DepositModal
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            handleDepositUSDC={handleDepositUSDC}
            closeModal={() => setIsDepositModalOpen(false)}
          />
        )}
        {/* Withdraw Modal */}
        {isWithdrawModalOpen && (
          <WithdrawalModal
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            handleWithdrawUSDC={handleWithdrawUSDC}
            closeModal={() => setIsWithdrawModalOpen(false)}
          />
        )}
        {/* Error Modal */}
        {isErrorModalOpen && (
          <div className="group-details-modal">
            <div
              className="group-details-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <p>
                An error occurred while trying to withdraw funds. Please check
                if you have enough balance or if the other members have paid
                their debts.
              </p>
              <button onClick={() => setIsErrorModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        )}
        {/* Modal to Add Expenses */}
        {isModalOpen && (
          <ExpenseModal
            closeModal={handleCloseModal}
            groupId={group.id}
            members={members}
          />
        )}
      </div>

      <div className="finances-container">
        {/* Expenses and Settlements Section */}
        <div className="gastos-section">
          <h3>Expenses and Settlements</h3>
          {transactions.length > 0 ? (
            <ul>
              {transactions.map((transaction, index) => (
                <li
                  key={`${transaction.id}-${index}`}
                  className="transaction-item"
                >
                  Date: {transaction.createdAt} - Description:{' '}
                  {transaction.type === 'SETTLEMENT'
                    ? 'Settlement Executed'
                    : transaction.description}{' '}
                  - Amount: ${transaction.amount}
                  {transaction.type !== 'SETTLEMENT' && (
                    <>
                      - Proposed by: {transaction.proposedby} - Shared with:{' '}
                      {transaction.sharedWith.join(', ')}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No expenses or settlements to display</p>
          )}
        </div>

        {/* Balances Section */}
        <div className="saldos-section">
          <h3>Balances</h3>
          {balances.size > 0 ? (
            <ul>
              {Array.from(balances).map(([member, balance]) => (
                <li
                  key={member}
                  className={
                    balance >= 0 ? 'positive-balance' : 'negative-balance'
                  }
                >
                  {member}:{' '}
                  {balance >= 0
                    ? `Recovers $${balance.toFixed(2)}`
                    : `Owes $${Math.abs(balance).toFixed(2)}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>No balances to display</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupDetails
