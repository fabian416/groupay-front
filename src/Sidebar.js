import React, { useState } from 'react';
import GroupModal from './GroupModal';
import './Sidebar.css';

function Sidebar({ groups, friends }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    }

    return (
        <div className="sidebar">
            <h2>Crypto SplitWise</h2>
            <div className="sidebar-section">
                <h3>Gastos</h3>
            </div>
            <div className="sidebar-section">
                <h3>Grupos</h3>
                <button onClick={toggleModal}>Añadir</button>
                {groups.map(group => (
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

