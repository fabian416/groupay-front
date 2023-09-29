import React, { useState, useContext, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { SafeFactory } from '@safe-global/protocol-kit';
import { EthersAdapter } from '@safe-global/protocol-kit';
import axios from 'axios';
import UserContext from './UserContext';
import './GroupModal.css';

// Define the types of the props
interface GroupModalProps {
    closeModal: () => void;
}
// Define the structure of an invitation
interface Invitation {
    aliasOrWallet: string;
    email: string;
}
const GroupModal: React.FC<GroupModalProps> = ({ closeModal }) => {
    const [invitations, setInvitations] = useState<Invitation[]>([{ aliasOrWallet: '', email: '' }]);
    const [signingMethod, setSigningMethod] = useState<'majority' | 'all' | 'custom'>('majority');
    const [selectedSigners, setSelectedSigners] = useState<Record<number, boolean>>({});
    const [safeAddress, setSafeAddress] = useState<string | null>(null);
    const [signatureThreshold, setSignatureThreshold] = useState<number | null>(null);
    const [customThreshold, setCustomThreshold] = useState<number | null>(null);
    const userContextValue = useContext(UserContext); // get the value of context
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer
    });
    // Verifies if the value of the context is null or not
    if (!userContextValue) {
        throw new Error('UserContext must be used within a UserContextProvider');
    }

    const { account } = userContextValue!;  //  Add the simbol '!' to make sure to TypeScript that userContextValue is not null

    const updatedOwnerAddresses = useMemo(() => {
        return [account, ...invitations.map(invite => invite.aliasOrWallet)];
    }, [account, invitations]);
    
    useEffect(() => {
        const totalSigners = updatedOwnerAddresses.length;
        
        switch(signingMethod) {
            case 'majority':
                setSignatureThreshold(Math.ceil(totalSigners / 2));
                break;
            case 'all':
                setSignatureThreshold(totalSigners);
                break;
            case 'custom':
                setSignatureThreshold(customThreshold);
                break;
            default:
                setSignatureThreshold(null);
        }
    }, [signingMethod, updatedOwnerAddresses, customThreshold]);

    const isAliasFormatCorrect = (alias: string) => {
        return alias.startsWith("@") && alias.length > 3;
    };

    const isAddressFormatCorrect = (address: string) => {
        return address.startsWith("0x") && address.length === 42;  
    };

    const aliasesToAddresses = async (aliases: string[]): Promise<Record<string, string | null>> => {
        try {
            const response = await axios.get(`http://localhost:3001/api/users/aliases-to-addresses`, {
                params: { aliases }
            });
            return response.data;
        } catch (error) {
            console.error("Error al convertir alias a direcciones:", error);
            return {};
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    
        let groupId;
    
        const form = e.target as typeof e.target & {
            groupName: { value: string };
            groupDescription: { value: string };
        };
        const groupName = form.groupName.value;
        const groupDescription = form.groupDescription.value;
    
        const updatedInvitations = [...invitations];
    
        const aliasesToConvert = updatedInvitations.filter(invite => isAliasFormatCorrect(invite.aliasOrWallet)).map(invite => invite.aliasOrWallet);
    
        if (aliasesToConvert.length > 0) {
            const addresses = await aliasesToAddresses(aliasesToConvert);
    
            for (let invite of updatedInvitations) {
                if (isAliasFormatCorrect(invite.aliasOrWallet)) {
                    const address = addresses[invite.aliasOrWallet];
                    if (!address) {
                        console.error(`No se pudo obtener la dirección para el alias ${invite.aliasOrWallet}`);
                        return;
                    }
                    invite.aliasOrWallet = address;
                } else if (!isAddressFormatCorrect(invite.aliasOrWallet)) {
                    console.error(`El formato de ${invite.aliasOrWallet} no es válido como alias o dirección`);
                    return;
                }
            }
        }
    
        const updatedOwnerAddresses = [account, ...updatedInvitations.map(invite => invite.aliasOrWallet)];
    
        try {
            console.log({
                name: groupName,
                description: groupDescription,
                invitees: updatedInvitations,
                owner: account,
                signingMethod: signingMethod,
                signatureThreshold: signatureThreshold,
                selected_signers : updatedOwnerAddresses
            });
    
            if (!updatedInvitations.every(invite => isAddressFormatCorrect(invite.aliasOrWallet))) {
                console.error("Algunas invitaciones no tienen direcciones Ethereum válidas");
                return;
            }            
    
            const response = await axios.post('http://localhost:3001/api/groups/create', {
                name: groupName,
                description: groupDescription,
                invitees: updatedInvitations,
                owner: account,
                signingMethod: signingMethod,
                signatureThreshold: signatureThreshold ,
                selected_signers: updatedOwnerAddresses 
            });
    
            if (!updatedOwnerAddresses.every(isAddressFormatCorrect)) {
                const invalidAddresses = updatedOwnerAddresses.filter(address => !isAddressFormatCorrect(address));
                console.error("Las siguientes direcciones de los propietarios no son válidas:", invalidAddresses);
                return;
            }
    
            const safeAccountConfig = {
                owners: updatedOwnerAddresses,  
                threshold: signatureThreshold as number 
            };
    
            if (response.data?.data?.id) {
                groupId = response.data.data.id;
            }
    
            if (response.data) {
                console.log("updatedOwnerAddresses", updatedOwnerAddresses); 
        
                closeModal();
                const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapter });
                const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });
        
                const safeAddress = await safeSdk.getAddress();
        
                // call to your back-end to update the address of Gnosis Safe
                const updateResponse = await axios.post('http://localhost:3001/api/groups/updateGnosisAddress', {
                    groupId: groupId, 
                    gnosissafeaddress: safeAddress
                });
        
                //  Manage the response of the server here
                if (updateResponse.data.message === "Gnosis Safe address updated successfully.") {
                    console.log("Dirección de Gnosis Safe actualizada en el backend.");
                } else {
                    console.warn("Hubo un problema al actualizar la dirección en el backend.");
                }
                
            }
        } catch (error) {
            console.error("Error al crear el grupo", error);
        }
    }
    
    const addInvitation = () => {
        setInvitations([...invitations, { aliasOrWallet: '', email: '' }]);
    }
    
    const handleInvitationChange = (index: number, field: keyof Invitation, value: string) => {
        const newInvitations = [...invitations];
        if (field === 'aliasOrWallet' && !isAddressFormatCorrect(value) && !value.startsWith("@")) {
            value = "@" + value;
        }
        newInvitations[index][field] = value;
        setInvitations(newInvitations);
    }
    
    const handleSignerSelection = (index: number, isSelected: boolean) => {
        setSelectedSigners(prev => ({ ...prev, [index]: isSelected }));
    };
    
    return (
        <div className="modal" onClick={closeModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Create Group</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Name of the Group:</label>
                        <input type="text" name="groupName" required />
                    </div>
                    <div>
                        <label>Description (optional):</label>
                        <input type="text" name="groupDescription" />
                    </div>
                    {invitations.map((invite, index) => (
                        <div key={index}>
                            <label>Alias or Wallet to invite :</label>
                            <input
                                type="text"
                                value={invite.aliasOrWallet}
                                onChange={e => handleInvitationChange(index, 'aliasOrWallet', e.target.value)}
                                placeholder="Ej: @alias o 0x123..."
                            />
                            <label>Email to invite  ( optional if the alias or wallet is valid):</label>
                            <input
                                type="email"
                                value={invite.email}
                                onChange={e => handleInvitationChange(index, 'email', e.target.value)}
                                placeholder="Ej: usuario@email.com"
                            />
                        </div>
                    ))}
                    <button type="button" onClick={addInvitation}>+ Add another member</button>
                    
                    <div>
                        <label>Configuration of Signers:</label>
                        <select value={signingMethod} onChange={(e) => setSigningMethod(e.target.value as any)}>
                            <option value="majority">More than 50%</option>
                            <option value="all">Everybody</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {signingMethod === 'custom' && (
                    <div>
                    <label>Number of Signers required:</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={updatedOwnerAddresses.length} 
                        onChange={e => setCustomThreshold(Number(e.target.value))}
                        value={customThreshold || ""}
                        />
                    </div>
                    )}
                    
                    <div>
                        <button type="submit">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );

}
    
export default GroupModal;
