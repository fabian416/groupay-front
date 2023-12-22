import React, { useState, useContext, useEffect, useMemo, useRef } from 'react'
import { ethers, ContractInterface } from 'ethers'
import { SafeFactory, EthersAdapter } from '@safe-global/protocol-kit'
import ReactDOM from 'react-dom'

import axios from 'axios'
import UserContext from './UserContext'
import './GroupModal.css'
import SquaryContractABIJson from './abi/SquaryContractAbi.json'
interface GroupModalProps {
  closeModal: () => void
}
// Define the structure of an invitation
interface Invitation {
  aliasOrWallet: string
  email: string
}
const GroupModal: React.FC<GroupModalProps> = ({ closeModal }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([
    { aliasOrWallet: '', email: '' },
  ])
  const [signingMethod, setSigningMethod] = useState<
    'majority' | 'all' | 'custom'
  >('majority')
  const endOfListRef = useRef<HTMLDivElement | null>(null)
  const [selectedSigners, setSelectedSigners] = useState<
    Record<number, boolean>
  >({})
  const [safeAddress, setSafeAddress] = useState<string | null>(null)
  const [signatureThreshold, setSignatureThreshold] = useState<number | null>(
    null,
  )
  const [customThreshold, setCustomThreshold] = useState<number | null>(null)
  const userContextValue = useContext(UserContext)
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  })

  const SquaryContractABI = SquaryContractABIJson.abi
  const SQUARY_CONTRACT_ADDRESS = '0xE94E9d573E547DF5B7FCeDA6B03ee279e5B864Ce'
  // Verifies if the value of the context is null or not
  if (!userContextValue) {
    throw new Error('UserContext must be used within a UserContextProvider')
  }

  const { account } = userContextValue! //  Add the simbol '!' to make sure to TypeScript that userContextValue is not null

  const updatedOwnerAddresses = useMemo(() => {
    return [account, ...invitations.map((invite) => invite.aliasOrWallet)]
  }, [account, invitations])

  useEffect(() => {
    const totalSigners = updatedOwnerAddresses.length

    switch (signingMethod) {
      case 'majority':
        setSignatureThreshold(Math.ceil(totalSigners / 2))
        break
      case 'all':
        setSignatureThreshold(totalSigners)
        break
      case 'custom':
        setSignatureThreshold(customThreshold)
        break
      default:
        setSignatureThreshold(null)
    }
  }, [signingMethod, updatedOwnerAddresses, customThreshold])

  useEffect(() => {
    if (endOfListRef.current) {
      endOfListRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [invitations])

  const isAliasFormatCorrect = (alias: string) => {
    return alias.startsWith('@') && alias.length > 3
  }

  const isAddressFormatCorrect = (address: string) => {
    return address.startsWith('0x') && address.length === 42
  }

  const aliasesToAddresses = async (
    aliases: string[],
  ): Promise<Record<string, string | null>> => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/users/aliases-to-addresses`,
        {
          params: { aliases },
        },
      )
      return response.data
    } catch (error) {
      console.error('Error converting aliases to addresses:', error)
      return {}
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    let groupId

    const form = e.target as typeof e.target & {
      groupName: { value: string }
      groupDescription: { value: string }
    }
    const groupName = form.groupName.value
    const groupDescription = form.groupDescription.value

    const updatedInvitations = [...invitations]

    const aliasesToConvert = updatedInvitations
      .filter((invite) => isAliasFormatCorrect(invite.aliasOrWallet))
      .map((invite) => invite.aliasOrWallet)

    if (aliasesToConvert.length > 0) {
      const addresses = await aliasesToAddresses(aliasesToConvert)

      for (let invite of updatedInvitations) {
        if (isAliasFormatCorrect(invite.aliasOrWallet)) {
          const address = addresses[invite.aliasOrWallet]
          if (!address) {
            console.error(
              `Could not get address for alias ${invite.aliasOrWallet}`,
            )
            return
          }
          invite.aliasOrWallet = address
        } else if (!isAddressFormatCorrect(invite.aliasOrWallet)) {
          console.error(
            `The format of ${invite.aliasOrWallet} not valid as an alias or address`,
          )
          return
        }
      }
    }

    const updatedOwnerAddresses = [
      account,
      ...updatedInvitations.map((invite) => invite.aliasOrWallet),
    ]

    try {
      console.log({
        name: groupName,
        description: groupDescription,
        invitees: updatedInvitations,
        owner: account,
        signingMethod: signingMethod,
        signatureThreshold: signatureThreshold,
        selected_signers: updatedOwnerAddresses,
      })

      if (
        !updatedInvitations.every((invite) =>
          isAddressFormatCorrect(invite.aliasOrWallet),
        )
      ) {
        console.error('Some invites do not have valid Ethereum addresses')
        return
      }

      const response = await axios.post(
        'http://localhost:3001/api/groups/create',
        {
          name: groupName,
          description: groupDescription,
          invitees: updatedInvitations,
          owner: account,
          signingMethod: signingMethod,
          signatureThreshold: signatureThreshold,
          selected_signers: updatedOwnerAddresses,
        },
      )

      if (!updatedOwnerAddresses.every(isAddressFormatCorrect)) {
        const invalidAddresses = updatedOwnerAddresses.filter(
          (address) => !isAddressFormatCorrect(address),
        )
        console.error(
          'The following owner addresses are not valid:',
          invalidAddresses,
        )
        return
      }

      const safeAccountConfig = {
        owners: updatedOwnerAddresses,
        threshold: signatureThreshold as number,
      }
      const options = {
        gasLimit: ethers.utils.hexlify(1000000),
        maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei').toString(),
        maxFeePerGas: ethers.utils.parseUnits('2', 'gwei').toString(),
      }

      if (response.data?.data?.id) {
        groupId = response.data.data.id

        console.log('updatedOwnerAddresses', updatedOwnerAddresses)

        // Create the  Gnosis Safe
        const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapter })
        const safeSdk = await safeFactory.deploySafe({
          safeAccountConfig,
          options,
        })

        const safeAddress = await safeSdk.getAddress()

        // Update Gnosis Safe address in backend
        const updateResponse = await axios.post(
          'http://localhost:3001/api/groups/updateGnosisAddress',
          {
            groupId: groupId,
            gnosissafeaddress: safeAddress,
          },
        )

        // Check server response
        if (
          updateResponse.data.message ===
          'Gnosis Safe address updated successfully.'
        ) {
          console.log('Gnosis Safe address updated in backend.')

          // Instantiate the Squary contract with the signer
          const squaryContract = new ethers.Contract(
            SQUARY_CONTRACT_ADDRESS,
            SquaryContractABI,
            signer,
          )

          // Call the createGroup function of the Squary contract
          try {
            const tx = await squaryContract.createGroup(
              safeAddress,
              updatedOwnerAddresses,
            )
            await tx.wait() // Wait for the transaction to be mined
            console.log(`Group successfully created in Squary: ${tx.hash}`)
            closeModal()
          } catch (error) {
            console.error('Error registering group in Squary', error)
            closeModal()
          }
        } else {
          console.warn(
            'There was a problem updating the address in the backend.',
          )
        }
      }
    } catch (error) {
      console.error('Error creating group', error)
    }
  }

  const addInvitation = () => {
    setInvitations([...invitations, { aliasOrWallet: '', email: '' }])
  }

  const handleInvitationChange = (
    index: number,
    field: keyof Invitation,
    value: string,
  ) => {
    const newInvitations = [...invitations]
    if (
      field === 'aliasOrWallet' &&
      !isAddressFormatCorrect(value) &&
      !value.startsWith('@')
    ) {
      value = '@' + value
    }
    newInvitations[index][field] = value
    setInvitations(newInvitations)
  }

  const handleSignerSelection = (index: number, isSelected: boolean) => {
    setSelectedSigners((prev) => ({ ...prev, [index]: isSelected }))
  }

  return ReactDOM.createPortal(
    <div className="modal" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Group</h2>
        </div>
        <div className="modal-body">
          {/* All content of the modal, including the form and confirmation button */}
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="groupName">Name of the Group:</label>
              <input type="text" id="groupName" name="groupName" required />
            </div>
            <div>
              <label htmlFor="groupDescription">Description (optional):</label>
              <input
                type="text"
                id="groupDescription"
                name="groupDescription"
              />
            </div>
            {invitations.map((invite, index) => (
              <div key={index}>
                <label htmlFor={`aliasOrWallet-${index}`}>
                  Alias or Wallet to invite:
                </label>
                <input
                  type="text"
                  id={`aliasOrWallet-${index}`}
                  value={invite.aliasOrWallet}
                  onChange={(e) =>
                    handleInvitationChange(
                      index,
                      'aliasOrWallet',
                      e.target.value,
                    )
                  }
                  placeholder="Ej: @alias o 0x123..."
                />
                <label htmlFor={`email-${index}`}>
                  Email to invite (optional if the alias or wallet is valid):
                </label>
                <input
                  type="email"
                  id={`email-${index}`}
                  value={invite.email}
                  onChange={(e) =>
                    handleInvitationChange(index, 'email', e.target.value)
                  }
                  placeholder="Ej: usuario@email.com"
                />
              </div>
            ))}
            <button
              className="add-member-button"
              type="button"
              onClick={addInvitation}
            >
              + Add another member
            </button>
            <div>
              <label htmlFor="signingMethod">Configuration of Signers:</label>
              <select
                id="signingMethod"
                value={signingMethod}
                onChange={(e) => {
                  const value = e.target.value
                  if (
                    value === 'majority' ||
                    value === 'all' ||
                    value === 'custom'
                  ) {
                    setSigningMethod(value)
                  } else {
                    console.error('Invalid value for signingMethod')
                  }
                }}
              >
                <option value="majority">More than 50%</option>
                <option value="all">Everybody</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {signingMethod === 'custom' && (
              <div>
                <label htmlFor="customThreshold">
                  Number of Signers required:
                </label>
                <input
                  type="number"
                  id="customThreshold"
                  min="1"
                  max={updatedOwnerAddresses.length}
                  onChange={(e) => setCustomThreshold(Number(e.target.value))}
                  value={customThreshold || ''}
                />
              </div>
            )}
            {/* Mover el botón de confirmación aquí dentro */}
            <button className="submit-button" type="submit">
              Confirm
            </button>
            <div ref={endOfListRef} />
          </form>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default GroupModal
