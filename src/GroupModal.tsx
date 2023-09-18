import React, { useState, useContext } from 'react';
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
    
    const userContextValue = useContext(UserContext); // get the value of context

    // verify if the value of the context is null or not
    if (!userContextValue) {
        throw new Error('UserContext must be used within a UserContextProvider');
    }
    const { account } = userContextValue; //  after verify, extract the value of 'account'

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const form = e.target as typeof e.target & {
            groupName: { value: string };
            groupDescription: { value: string };
        };

        const groupName = form.groupName.value;
        const groupDescription = form.groupDescription.value;

        try {
            const response = await axios.post('http://localhost:3001/api/groups/create', {
                name: groupName,
                description: groupDescription,
                invitations, 
                owner: account
            });

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
        newInvitations[index][field] = value;
        setInvitations(newInvitations);
    }

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
                        <button type="submit">Crear Grupo</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GroupModal;
