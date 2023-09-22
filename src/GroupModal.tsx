import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { SafeFactory } from '@safe-global/protocol-kit';
import axios from 'axios';
import UserContext from './UserContext';
import './GroupModal.css';

// Definimos los tipos de las props
interface GroupModalProps {
    closeModal: () => void;
}

// Definimos la estructura de una invitación
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
    const userContextValue = useContext(UserContext); // get the value of context

    useEffect(() => {
        if (signingMethod === 'custom') {
            setSignatureThreshold(Object.values(selectedSigners).filter(val => val).length);
        } else {
            setSignatureThreshold(null);
        }
    }, [signingMethod, selectedSigners]);

    // verify if the value of the context is null or not
    if (!userContextValue) {
        throw new Error('UserContext must be used within a UserContextProvider');
    }
    const { account } = userContextValue; //  after verify, extract the value of 'account'

    const isAliasFormatCorrect = (alias: string) => {
        return alias.startsWith("@") && alias.length > 3;
    };

    const isAddressFormatCorrect = (address: string) => {
        return address.startsWith("0x") && address.length === 42;  // A Ethereum address starts with '0x' and is 42 characters long.
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
        
        const form = e.target as typeof e.target & {
            groupName: { value: string };
            groupDescription: { value: string };
        };
    
        const groupName = form.groupName.value;
        const groupDescription = form.groupDescription.value;
    
        // Obtener todos los alias que necesitan ser convertidos
        const aliasesToConvert = invitations.filter(invite => isAliasFormatCorrect(invite.aliasOrWallet)).map(invite => invite.aliasOrWallet);
    
        if (aliasesToConvert.length > 0) {
            const addresses = await aliasesToAddresses(aliasesToConvert);
            
            // Actualizar las invitaciones con las direcciones obtenidas
            for (let invite of invitations) {
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
        
        try {
        console.log({
        name: groupName,
        description: groupDescription,
        invitees: invitations,
        owner: account,
        signingMethod: signingMethod,
        signatureThreshold: signatureThreshold 
        });
            const response = await axios.post('http://localhost:3001/api/groups/create', {
                name: groupName,
                description: groupDescription,
                invitees: invitations, 
                owner: account,
                signingMethod: signingMethod,
                signatureThreshold: signatureThreshold 
            });
            if (response.data && response.data.unsignedTransaction) {
                const unsignedTx = response.data.unsignedTransaction;
            
                // Llamar a alguna función que solicite al usuario que firme esta transacción.
                const signedTx = await requestUserToSignTransaction(unsignedTx);
            
                // Enviar la transacción firmada al back-end.
                const deployResponse = await sendSignedTransactionToBackend(signedTx);
            
                // Opcional: Verificar si el Gnosis Safe fue desplegado exitosamente, y actuar en consecuencia.
                if (deployResponse.data && deployResponse.data.safeAddress) {
                    setSafeAddress(deployResponse.data.safeAddress);
                }
            }
    
            if (response.data) {
                closeModal();
            }
        } catch (error) {
            console.error("Error al crear el grupo", error);
        }
    };
    

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

    const requestUserToSignTransaction = async (unsignedTx: string) => {
        // Aquí debes implementar la lógica para solicitar al usuario que firme la transacción.
        // Si estás usando MetaMask, MetaMask presentará una ventana emergente al usuario pidiéndole que firme.
        const signedTx = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [unsignedTx], // Dependerá de cómo estructures unsignedTx
        });
        return signedTx;
    };
    
    const sendSignedTransactionToBackend = async (signedTx: string) => {
        const response = await axios.post('http://localhost:3001/api/gnosis/deploy', {
            signedTransaction: signedTx
        });
        return response;
    };
    
    return (
        <div className="modal" onClick={closeModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Crear Grupo</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Nombre del Grupo:</label>
                        <input type="text" name="groupName" required />
                    </div>
                    <div>
                        <label>Descripción (opcional):</label>
                        <input type="text" name="groupDescription" />
                    </div>
                    {invitations.map((invite, index) => (
                        <div key={index}>
                            <label>Alias o Wallet para Invitar:</label>
                            <input
                                type="text"
                                value={invite.aliasOrWallet}
                                onChange={e => handleInvitationChange(index, 'aliasOrWallet', e.target.value)}
                                placeholder="Ej: @alias o 0x123..."
                            />
                            <label>Email para Invitación (opcional si proporcionas un Alias o Wallet válido):</label>
                            <input
                                type="email"
                                value={invite.email}
                                onChange={e => handleInvitationChange(index, 'email', e.target.value)}
                                placeholder="Ej: usuario@email.com"
                            />
                        </div>
                    ))}
                    <button type="button" onClick={addInvitation}>+ Añadir otro miembro</button>
                    
                    <div>
                        <label>Configuración de Firmantes:</label>
                        <select value={signingMethod} onChange={(e) => setSigningMethod(e.target.value as any)}>
                            <option value="majority">Más del 50%</option>
                            <option value="all">Todos</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    {signingMethod === 'custom' && invitations.map((invite, index) => (
                        <div key={index}>
                            <input
                                type="checkbox"
                                checked={!!selectedSigners[index]}
                                onChange={(e) => handleSignerSelection(index, e.target.checked)}
                            />
                            {invite.aliasOrWallet} ({invite.email})
                        </div>
                    ))}
                    
                    <div>
                        <button type="submit">Crear Grupo</button>
                    </div>
                </form>
            </div>
        </div>
    );

}

export default GroupModal;
