import React, { useEffect, useState } from 'react';
import './GroupDetails.css';
import ExpenseModal from './ExpenseModal';
import axios from 'axios';
import { simplifyDebts, calculateIndividualBalances } from './utils/debtUtils';
import { ethers } from 'ethers';
import Safe,{ EthersAdapter, SafeFactory } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import USDC_ABI from './abi/USDC.json';
import SquaryContractABIJson from './abi/SquaryContractAbi.json';



interface Group {
    id: number;
    name: string;
    status: string;
    safeAddress?: string;
}
export interface Debt {
    id: number;
    debtor: string;
    creditor: string;
    amount: number;
    createdAt: string;
}

interface GroupDetailsProps {
    group: Group;
}

interface SettlementConfirmation {
    userWalletAddress: string;
    confirmed: boolean;
}
interface Transaction {
    to: string;
    data: string;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ group }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [members, setMembers] = useState<{alias: string, walletAddress: string}[]>([]);
    const [balances, setBalances] = useState<Map<string, number>>(new Map());
    const [expenses, setExpenses] = useState<any[]>([]);  
    const [gnosisSafeAddress, setGnosisSafeAddress] = useState('');
    const [debts, setDebts] = useState<any[]>([]); 
    const SQUARY_CONTRACT_ADDRESS = '0xAA04456f31a6177C4CE0Cf2655e034177E873776';
    const USDC_CONTRACT_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [settleInitiated, setSettleInitiated] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [settlementTransactions, setSettlementTransactions] = useState([]);
    const [userHasConfirmed, setUserHasConfirmed] = useState(false);
    const [umbralAlcanzado, setUmbralAlcanzado] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [safeSdk, setSafeSdk] = useState<Safe | null>(null); 
    const [safeApiKit, setSafeApiKit] = useState<SafeApiKit | null>(null);
    const [isSafeSdkReady, setIsSafeSdkReady] = useState(false);

    const createAndProposeTransaction = async () => {
        if (!safeSdk || debts.length === 0) {
            console.error("Safe SDK not initialized or simplified debts are not available.");
            return;
        }
        try {
            const debtsInMicroUSD = debts.map(debt => ({
                ...debt,
                amount: ethers.utils.parseUnits(debt.amount.toFixed(6), 6)
            }));
    
            const walletAddress = await signer.getAddress();
            const squaryContractInterface = new ethers.utils.Interface(SquaryContractABIJson.abi);
            const data = squaryContractInterface.encodeFunctionData("settleGroup", [gnosisSafeAddress, debtsInMicroUSD]);
    
            const safeTransactionData = {
                to: SQUARY_CONTRACT_ADDRESS,
                value: '0',
                data: data
            };
    
            const safeTransaction = await safeSdk.createTransaction({ safeTransactionData });
    
            const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
            const senderSignature = await safeSdk.signTransactionHash(safeTxHash);
    
            // Create ethAdapter
            const ethAdapter = new EthersAdapter({
                ethers,
                signerOrProvider: signer
            });
    
            // Initiate SafeApiKit con ethAdapter y txServiceUrl
            const safeApiKit = new SafeApiKit({
                ethAdapter: ethAdapter,
                txServiceUrl: 'https://safe-transaction-goerli.safe.global'
            });
    
            await safeApiKit.proposeTransaction({
                safeAddress: gnosisSafeAddress,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: walletAddress,
                senderSignature: senderSignature.data,
                origin: 'TuApp'
            });
            //  Update the commit status in the database
            await axios.post(`http://localhost:3001/api/transactions/${group.id}/confirm`, {
                userWalletAddress: walletAddress
            });
    
            //  Update the frontend status to reflect the commit
            setUserHasConfirmed(true);
        } catch (error) {
            console.error("Error when creating and proposing settlement transaction:", error);
        }
    };

    const executeSettlementTransaction = async () => {
        if (!safeSdk || debts.length === 0 || !safeApiKit) {
            console.error("Safe SDK not initialized or simplified debts are not available.");
            return;
        }
        try {
            const status = await getSettleStatus(group.id);
            console.log("Settlement Status:", status);
    
            if (status.confirmed) {
                const pendingTransactionsResponse = await safeApiKit.getPendingTransactions(gnosisSafeAddress);
                console.log("Pending Transactions:", pendingTransactionsResponse);
    
                const transactionsArray = pendingTransactionsResponse.results;
                const squaryContractInterface = new ethers.utils.Interface(SquaryContractABIJson.abi);
                const settleGroupSelector = squaryContractInterface.getSighash('settleGroup');
    
                const safeTransaction = transactionsArray.find((tx) => 
                    tx.to.toLowerCase() === SQUARY_CONTRACT_ADDRESS.toLowerCase() &&
                    tx.data && tx.data.startsWith(settleGroupSelector)
                );
    
                console.log("Transaction found:", safeTransaction);
    
                if (safeTransaction) {
                    const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
                    console.log("Transaction Response:", executeTxResponse);
    
                    if (executeTxResponse.transactionResponse) {
                        const receipt = await executeTxResponse.transactionResponse.wait();
                        console.log('Transaction executed:', receipt);
                        await registerSettlementTransaction();
    
                        // Resetear el estado del asentamiento
                        try {
                            await axios.post(`http://localhost:3001/api/transactions/${group.id}/resetSettleState`);
                            // Actualizar el estado en el frontend
                            setSettleInitiated(false);
                            setUserHasConfirmed(false);
                            fetchTransactions();
                            fetchGroupDebtsAndBalances();
                        } catch (error) {
                            console.error('Error al resetear el estado del asentamiento:', error);
                        }
                    } else {
                        console.error("Could not get the transaction response");
                    }
                } else {
                    console.error("Pending transaction not found or not ready to run");
                }
            } else {
                console.error("The settlement is not yet ready to be executed.");
            }
        } catch (error) {
            console.error("Error executing the settlement transaction:", error);
        }
    };
    
    const registerSettlementTransaction = async () => {
        try {
            const description = "Settlement executed";
            const groupId = Number(group.id);
            const amount = 1;

            console.log("Enviando datos a settlementTransaction:", { groupId, amount, description });
    
            await axios.post(`http://localhost:3001/api/transactions/${groupId}/settlementTransaction`, {
                description,
                groupId,
                amount
            });
        } catch (error) {
            console.error("Error al registrar la transacción de asentamiento:", error);
        }
    };

    const checkIfSettleReadyToExecute = async () => {
        // Get the settlement state
        const status = await getSettleStatus(group.id);
        if (status.confirmed) {
            // Execute the settlement Transaction
            executeSettlementTransaction();
        }
    };
    
    useEffect(() => {
        const checkSettleStatus = async () => {
            const status = await getSettleStatus(group.id);
            setSettleInitiated(status.initiated);
            setUserHasConfirmed(status.confirmed);
            await fetchSettlementConfirmations(); 
        };
        checkSettleStatus();
    }, [group.id]);
    

    useEffect(() => {
        if (gnosisSafeAddress) {
            const initializeSafeSdk = async () => {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const ethAdapter = new EthersAdapter({
                    ethers,
                    signerOrProvider: signer
                });
                const safeSdkInstance = await Safe.create({
                    ethAdapter,
                    safeAddress: gnosisSafeAddress
                });
                const newSafeApiKit = new SafeApiKit({
                    ethAdapter,
                    txServiceUrl: 'https://safe-transaction-goerli.safe.global'
                });
    
                setSafeSdk(safeSdkInstance);
                setSafeApiKit(newSafeApiKit);
                setIsSafeSdkReady(true); 
            };
    
            initializeSafeSdk();
        }
    }, [gnosisSafeAddress]);

    const fetchTransactions = async () => {
        try {
            const expensesResponse = await axios.get(`http://localhost:3001/api/transactions/${group.id}/expenses`);
            const settlementsResponse = await axios.get(`http://localhost:3001/api/transactions/${group.id}/settlementTransactions`);
    
            // Combinar y ordenar por fecha
            const combinedTransactions = [...expensesResponse.data, ...settlementsResponse.data]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Ajusta según el formato de fecha que uses
    
            setTransactions(combinedTransactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        }
    };
    
    const fetchGroupDebtsAndBalances = async () => {
        try {
            // Actualiza la URL para obtener solo las deudas no incluidas en asentamientos anteriores
            const debtsResponse = await axios.get(`http://localhost:3001/api/debts/groups/${group.id}/unsettled`);
            const simplifiedDebts = debtsResponse.data;
            setDebts(simplifiedDebts);
            const newBalances = calculateIndividualBalances(simplifiedDebts); // Asegúrate de que esto refleje correctamente los saldos basados en las deudas simplificadas
            setBalances(newBalances);
        } catch (error) {
            console.error("Error fetching group debts and balances: ", error);
        }
    };

    useEffect(() => {
        fetchTransactions();
        fetchGroupDebtsAndBalances(); 
    }, [group.id]);
    
    useEffect(() => {
        // Function to get all the members and the Gnosis Safe Address
        const fetchGroupMembers = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`);
                
                // Save the members in the members state
                setMembers(response.data.members);
                // Save the Gnosis Safe Address in the gnosisSafeAddress state
                setGnosisSafeAddress(response.data.gnosisSafeAddress);
            } catch (error) {
                console.error("Error getting members of the group:", error);
            }
        };
        fetchGroupMembers();
    }, [group.id]);

    // Function to open the modal
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };
    const handleOpenConfirmModal = () => {
        setIsConfirmModalOpen(true);
    };
    const handleCloseConfirmModal = () => {
        setIsConfirmModalOpen(false);
    };    

    // Functión to close the modal
const handleCloseModal = () => {
    setIsModalOpen(false);
    fetchTransactions();
    fetchGroupDebtsAndBalances(); 
};

   // Función to get the state of the settle
   const getSettleStatus = async (groupId: number) => {
    try {
        const response = await axios.get(`http://localhost:3001/api/transactions/${groupId}/settleState`);
        // La API del backend ahora devuelve solo 'initiated' y 'confirmed'
        return response.data;
    } catch (error) {
        console.error("Error getting the settlement state ", error);
        return { initiated: false, confirmed: false };
    }
};

const fetchSettlementConfirmations = async () => {
    try {
        const response = await axios.get<SettlementConfirmation[]>(`http://localhost:3001/api/transactions/${group.id}/confirmations`);
        const walletAddress = await signer.getAddress();
        const hasConfirmed = response.data.some((confirmation: SettlementConfirmation) => confirmation.userWalletAddress === walletAddress && confirmation.confirmed);
        setUserHasConfirmed(hasConfirmed);
    } catch (error) {
        console.error("Error getting settlement confirmations:", error);
    }
};

const handleSettle = async () => {
    // If the settlement has not yet started or the user has not confirmed
    if (!settleInitiated || !userHasConfirmed) {
        handleOpenConfirmModal(); 
    } else {
        console.log("Checking if settle is ready to execute...");
        checkIfSettleReadyToExecute(); // Check if the settlement is ready to be executed
    }
};

const confirmSettleAction = async () => {
    handleCloseConfirmModal(); 

    const walletAddress = await signer.getAddress();  

    if (!settleInitiated) {
        console.log("Settle not initiated, initiating...");
         // Initiates the settlement process and proposes the transaction if it is the first
         try {
           
            const response = await axios.post(`http://localhost:3001/api/transactions/${group.id}/initiateConfirmation`);
            if (response.status === 200) {
                setSettleInitiated(true);
                //  If you're the first to confirm, create and propose the transaction
                await createAndProposeTransaction();
            }
        } catch (error) {
            console.error("Error al iniciar confirmación de asentamiento:", error);
        }
    } else {
        if (!safeApiKit || !safeSdk) {
            console.error("Gnosis Safe SDK o Safe API Kit no están inicializados.");
            return;
        }
        try {
            // Obtén las transacciones pendientes de la Safe
            const pendingTransactions = await safeApiKit.getPendingTransactions(gnosisSafeAddress);
            if (pendingTransactions && pendingTransactions.results && pendingTransactions.results.length > 0) {
                const transactions = pendingTransactions.results;
                const squaryContractInterface = new ethers.utils.Interface(SquaryContractABIJson.abi);
                const settleGroupSelector = squaryContractInterface.getSighash('settleGroup');

                // Busca la transacción que corresponde al proceso de asentamiento
                const transaction = transactions.find((tx) => 
                    tx.to.toLowerCase() === SQUARY_CONTRACT_ADDRESS.toLowerCase() &&
                    tx.data?.startsWith(settleGroupSelector)
                );

                if (transaction) {
                     // Imprimir los detalles de la transacción pendiente
                     console.log("Detalles de la transacción pendiente:", transaction);


                    // Firma la transacción
                    const signature = await safeSdk.signTransactionHash(transaction.safeTxHash);

                    // Confirma la transacción
                    await safeApiKit.confirmTransaction(transaction.safeTxHash, signature.data);

                    await axios.post(`http://localhost:3001/api/transactions/${group.id}/confirm`, {
                        userWalletAddress: walletAddress
                    });

                    setUserHasConfirmed(true);

                    console.log('Transacción confirmada y firmada por el usuario.');
                } else {
                    console.error('No se encontró la transacción pendiente propuesta para el asentamiento.');
                }
            } else {
                console.error('No se encontraron transacciones pendientes');
            }
        } catch (error) {
            console.error('Error al confirmar y firmar la transacción de asentamiento:', error);
        }
    }
};
    useEffect(() => {
        if (isSafeSdkReady && debts.length > 0) 
        checkIfSettleReadyToExecute();
    }, [settleInitiated, userHasConfirmed,isSafeSdkReady, debts]);
    
    const handleDepositUSDC = async () => {
    try {
        const amountNumber = parseFloat(depositAmount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            alert('Por favor, ingresa un monto válido.');
            return;
        }

        // Convertir el monto a depositar a un objeto BigNumber
        const amountToDeposit = ethers.utils.parseUnits(amountNumber.toString(), '6');

        // Crear una instancia del contrato USDC
        const usdcContract = new ethers.Contract(
            USDC_CONTRACT_ADDRESS,
            USDC_ABI,
            signer
        );

        // Aprobar que el contrato Squary retire los tokens USDC
        const approveTx = await usdcContract.approve(SQUARY_CONTRACT_ADDRESS, amountToDeposit);
        await approveTx.wait();

        // Crear una instancia del contrato Squary
        const squaryContract = new ethers.Contract(
            SQUARY_CONTRACT_ADDRESS,
            SquaryContractABIJson.abi,
            signer
        );

        // Realizar el depósito
        const depositTx = await squaryContract.depositFunds(gnosisSafeAddress, amountToDeposit.toString());
        await depositTx.wait();


        console.log('Depósito de USDC realizado con éxito!');
        setIsModalOpen(false);
    } catch (error) {
        console.error('Error al realizar el depósito de USDC:', error);
    }
    };

    return (
        <div className="group-details-container">
            <h2 className="group-details-header">Group Details</h2>
            <div className="group-details-content">
            <p>
        <strong>Name:</strong> {group.name}<br />
            <strong>Status:</strong> {group.status}<br />
                {gnosisSafeAddress && (<>
            <strong>Gnosis Safe Address:</strong> {gnosisSafeAddress}<br />
                </>
                )}
            </p>
                <button className="button-add" onClick={handleOpenModal}>Add shared expense</button>
                <button className="button-settle" onClick={handleSettle}>
                {!settleInitiated ? "Start Settle" : !userHasConfirmed ? "Confirm Settle" : userHasConfirmed ? "Settle" : "Waiting for Others"}
                </button>
                <button className="button-deposit" onClick={() => setIsDepositModalOpen(true)}>Deposit USDC</button>

                {/* Modal de confirmación */}
            {isConfirmModalOpen && (
            <div className="modal">
            <p>¿Areyou sure you want to confirm the settlement?</p>
            <button onClick={confirmSettleAction}>Confirmar</button>
            <button onClick={handleCloseConfirmModal}>Cancelar</button>
        </div>
            )}
            </div>
    
            <div className="finances-container">
            <div className="gastos-section">
                    <h3>Expenses and Settlements</h3>
                    {transactions.length > 0 ? (
                        <ul>
                            {transactions.map((transaction, index) => (
                                <li key={`${transaction.id}-${index}`}>
                                    Date: {transaction.createdAt} -
                                    Description: {transaction.type === 'SETTLEMENT' ? 'Settlement Executed' : transaction.description} -
                                    Amount: ${transaction.amount}
                                    {transaction.type !== 'SETTLEMENT' && (
                                        <>
                                            - Proposed by: {transaction.proposedby} -
                                            Shared with: {transaction.sharedWith.join(", ")}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No expenses or settlements to display</p>
                    )}
                </div>
                <div className="saldos-section">
                    <h3>Balances</h3>
                    {balances.size > 0 ? (
                        <ul>
                            {Array.from(balances).map(([member, balance]) => (
                                <li key={member} className={balance >= 0 ? "positive-balance" : "negative-balance"}>
                                    {member}: {balance >= 0 ? `Recovers $${balance.toFixed(2)}` : `Owes $${Math.abs(balance).toFixed(2)}`}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No balances to display</p>
                    )}
                </div>
            </div>
              {/* Modal para el depósito */}
              {isDepositModalOpen && (
                <div className="modal">
                    <input 
                        type="text"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount in USDC"
                    />
                    <button onClick={handleDepositUSDC}>Confirm Deposit</button>
                    <button onClick={() => setIsDepositModalOpen(false)}>Cancel</button>
                </div>
            )}

            {/* Modal para añadir gastos */}
            {isModalOpen && (
                <ExpenseModal
                    closeModal={handleCloseModal}
                    groupId={group.id}
                    members={members}
                />
            )}
        </div>
    );
}

export default GroupDetails;