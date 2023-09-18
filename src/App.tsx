import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Dashboard from './Dashboard';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from "react-router-dom";
import './App.css';
import HomePage from './HomePage';
import { Web3Provider } from '@ethersproject/providers';
import Sidebar from './Sidebar';
import GroupModal from './GroupModal';
import UserContext from './UserContext';
import GroupList from './GroupList';
import TransactionHistory from './TransactionHistory';
import Modal from 'react-modal';
import { UserState } from './States'; 


Modal.setAppElement('#root');

interface Group {
    
    id: number;
    name: string;
    // etc.
}

interface Friend {

    id: number;
    name: string;

}
interface Transaction {
    
    _id: number;
    amount: number;

}

interface NavigationHandlerProps {
    userState: UserState;
}

interface DashboardLayoutProps {
    account: string;
    groups: Group[];
    friends: Friend[];
}


const socket = io('http://localhost:3001', { withCredentials: true });

const App: React.FC = () => {
  const [message, setMessage] = useState<string>(''); 
  const [account, setAccount] = useState<string>(''); 
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userState, setUserState] = useState<UserState>('UNKNOWN');

  const NavigationHandler: React.FC<NavigationHandlerProps> = ({ userState }) => {
      const navigate = useNavigate();

      useEffect(() => {
          if (userState === 'EXISTING') {
              navigate("/dashboard");
          }
      }, [userState, navigate]);

      return null;
  }

  return (
    <Router>
        <UserContext.Provider value={{ account, setAccount, setUserState }}>
        <NavigationHandler userState={userState} />
            <div className="App">
                <Routes>
                    <Route path="/" element={<HomePage setAccount={setAccount} setUserState={setUserState} />} />
                    <Route path="/dashboard" element={<DashboardLayout groups={groups} friends={friends} account={account} />} />
                </Routes>
            </div>
        </UserContext.Provider>
    </Router>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ account }) => {
   
const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
const [activeView, setActiveView] = useState<'groups' | 'transactions'>('groups');
const [transactions, setTransactions] = useState<Transaction[]>([
    {
        _id: 1,
        amount: 100,
        // otros campos
    },
    {
        _id: 2,
        amount: 200,
        // otros campos
    }
]);

const [loadGroups, setLoadGroups] = useState<boolean>(false);

const handleLoadGroups = () => {
    setLoadGroups(true);
}

const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
}

const handleViewChange = (view: 'groups' | 'transactions') => {
    setActiveView(view);
}

return (
  <div>
      <Sidebar changeView={handleViewChange} openModal={toggleModal} loadGroups={handleLoadGroups} />
      {activeView === 'groups' ? <GroupList userAddress={account} loadGroups={loadGroups} /> : <TransactionHistory transactions={transactions} />}
      {isModalOpen && <GroupModal closeModal={toggleModal} />}
  </div>
);
}


export default App;
