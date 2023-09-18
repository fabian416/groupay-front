import React, { useState } from 'react';
import GroupModal from './GroupModal';
import './Sidebar.css';

interface Group {
    id: number;
    name: string;

}

interface SidebarProps {
    groups?: Group[];
    friends?: any[];  
    changeView: (view: 'groups' | 'transactions') => void;
    loadGroups: () => void;
    openModal?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ groups = [], friends = [], changeView, loadGroups }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    }

    return (
        <div className="sidebar">
            <h2>Crypto SplitWise</h2>

            <div className="sidebar-section">
                <h3>Gastos</h3>
                <button onClick={() => changeView('transactions')}>Ver Historial de Gastos</button>
            </div>

            <div className="sidebar-section">
                <h3>Grupos</h3>
                <button onClick={() => {changeView('groups'); loadGroups()}}>Ver Grupos</button>
                <button onClick={toggleModal}>Añadir Nuevo Grupo</button>
                {groups && groups.map(group => (
                    <p key={group.id}>{group.name}</p>
                ))}
            </div>

            <div className="sidebar-section">
                <h3>Amigos</h3>
                <button>Añadir</button>
            </div>

            {isModalOpen && <GroupModal closeModal={toggleModal} />}
        </div>
    );
}

export default Sidebar;