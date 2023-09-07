import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Dashboard from './Dashboard';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from "react-router-dom";
import './App.css';
import HomePage from './HomePage';
import { Web3Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import Sidebar from './Sidebar';
import GroupModal from './GroupModal';
import UserContext from './UserContext';

const socket = io('http://localhost:3001', { withCredentials: true });

function App() {
  const [message, setMessage] = useState(''); 
  const [account, setAccount] = useState(''); 
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);


  useEffect(() => {
    socket.on('message', (msg) => {
      setMessage(msg);
    });

    const checkConnectedAccount = async () => {
      let provider;
      if (window.ethereum) {
        provider = new Web3Provider(window.ethereum);
    
        try {
          const signer = provider.getSigner();
          const connectedAccount = await signer.getAddress();
          if (connectedAccount) {
            setAccount(connectedAccount);
          }
        } catch (error) {
          console.error("Error al obtener la dirección de la cuenta", error);
        }
      }
    };

    checkConnectedAccount();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(''); 
        } else {
          setAccount(accounts[0]);
        }
      });
    }
    
    return () => {
      socket.off('message');
    };
  }, []);

  function NavigationHandler() {
    const navigate = useNavigate();

    useEffect(() => {
      if (account === null) {
        return;
      }

      if (account) {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    }, [account, navigate]);

    return null;
}


  return (
    <Router>
      <UserContext.Provider value={{ account, setAccount }}>
      <div className="App">
      <NavigationHandler />
        <Routes>
          {/* Para la ruta raíz '/' */}
          <Route path="/" element={account ? <Navigate to="/dashboard" replace /> : <HomePage setAccount={setAccount} />} />

          {/* Para la ruta '/dashboard' */}
          <Route path="/dashboard" element={<DashboardLayout groups={groups} friends={friends} account={account} />} />
        </Routes>
      </div>
      </UserContext.Provider>
    </Router>
);

function DashboardLayout({ groups, friends, account }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
      setIsModalOpen(!isModalOpen);
  }

  return (
      <div>
          <Sidebar groups={groups} friends={friends} openModal={toggleModal} />
          <Dashboard account={account} />
          {isModalOpen && <GroupModal closeModal={toggleModal} />}
      </div>
  );
}


}

export default App;
