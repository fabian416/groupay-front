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
            <h2>Squary</h2>

            <div className="sidebar-section">
                <h3>Expenses</h3>
                <button onClick={() => changeView('transactions')}>Transaction History</button>
            </div>

            <div className="sidebar-section">
                <h3>Grupos</h3>
                <button onClick={() => {changeView('groups'); loadGroups()}}>My Groups</button>
                <button onClick={toggleModal}>Add new Group</button>
                {groups && groups.map(group => (
                    <p key={group.id}>{group.name}</p>
                ))}
            </div>

            <div className="sidebar-section">
                <h3>Friends</h3>
                <button>+ Add</button>
            </div>

            {isModalOpen && <GroupModal closeModal={toggleModal} />}
        </div>
    );
}

export default Sidebar;