import React, { useState, useContext } from 'react';
import { useQuery } from 'react-query';
import './DashboardLayout.css';
import GroupDetails from './GroupDetails';
import FriendDetails from './FriendDetails'; 
import Sidebar from './Sidebar';
import TransactionHistory, { Transaction } from "./TransactionHistory";
import GroupModal from './GroupModal';
import axios from 'axios';
import UserContext from './UserContext';


interface Group {
    id: number;
    name: string;
    status: string;
}

interface Friend {
    id: number;
    name: string;

}

const DashboardLayout: React.FC<{ account: string }> = ({ account }) => {
    const context = useContext(UserContext);

    if (!context) {
        throw new Error("DashboardLayout debe estar dentro del proveedor UserContext");
    }

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

    const [activeView, setActiveView] = useState<'groupDetails' | 'transactions' | 'friendDetails' | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const fetchGroups = async (userAddress: string) => {
        const response = await axios.get(`http://localhost:3001/api/groups/getUserGroups/${userAddress}`);
        return response.data;
    };
    
    const { data: groups, isLoading: isLoadingGroups, isError: isErrorGroups } = useQuery<Group[], Error>(
        ['groups', account], 
        () => fetchGroups(account),
        { enabled: !!account } // Only execute the request if account is True (not empty or undefined)
    );
    

    // Lógica similar para fetchFriends...
    
    const [transactions, setTransactions] = useState<Transaction[]>([
        // tus datos iniciales
    ]);


    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    }

    const handleSelectGroup = (group: Group) => {
        setSelectedGroup(group);
        setActiveView('groupDetails');
    };

    return (
        <div className="dashboard-container">
    
            <Sidebar 
                groups={groups || []} 
                changeView={setActiveView} 
                openModal={toggleModal} 
                selectGroup={handleSelectGroup}
            />
    
            <div className="content-section">
                <button className="connected-account-button">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </button>
    
                {isLoadingGroups && <div>Loading...</div>}
                
                {!isLoadingGroups && isErrorGroups && <div>Error loading groups.</div>}
    
                {!isLoadingGroups && !isErrorGroups && (
                    <>
                        {activeView === 'groupDetails' && selectedGroup && <GroupDetails group={selectedGroup} />}
                        {activeView === 'transactions' && <TransactionHistory transactions={transactions} />}
                        {activeView === 'friendDetails' && selectedFriend && <FriendDetails friend={selectedFriend} />} 
                    </>
                )}
            </div>
    
            {isModalOpen && <GroupModal closeModal={toggleModal} />}
        </div>
    );
    
}

export default DashboardLayout;