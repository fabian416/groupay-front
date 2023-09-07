import React from 'react';
import axios from 'axios';
import { useContext } from 'react';
import UserContext from './UserContext';
import './GroupModal.css';

function GroupModal({ closeModal }) {

    const { account } = useContext(UserContext);

    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const groupName = e.target.groupName.value;
        const groupDescription = e.target.groupDescription.value;
        const groupType = e.target.groupType.value;

        // Aquí debes obtener la dirección de la billetera del usuario autenticado.
       // Deberías tener esto en un contexto o en algún estado global

        try {
            const response = await axios.post('/api/groups/create', {
                name: groupName,
                description: groupDescription,
                type: groupType,
                owner: account
            });

            if (response.data) {
                // Cierra el modal y, posiblemente, actualiza la lista de grupos en el estado global
                closeModal();
            }
        } catch (error) {
            console.error("Error al crear el grupo", error);
        }
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
                    <div>
                        <label>Tipo de Grupo:</label>
                        <select name="groupType">
                            <option value="normal">Grupo Normal</option>
                            <option value="gnosis">Grupo para fondo común (Gnosis Safe)</option>
                        </select>
                    </div>
                    <div>
                        <button type="submit">Crear Grupo</button>
                    </div>
                </form>
            </div>
        </div>
    );
    
}

export default GroupModal;

