import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import './App.css';
import HomePage from './HomePage';
import Modal from 'react-modal';
import { UserState } from './States'; 
import UserContext from './UserContext';
import { queryClient } from './query.config';
import { QueryClientProvider } from 'react-query';
import DashboardLayout from './DashboardLayout';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

Modal.setAppElement('#root');

interface NavigationHandlerProps {
    userState: UserState;
}

const socket = io('http://localhost:3001', { withCredentials: true });

const App: React.FC = () => {
    const [account, setAccount] = useState<string>(sessionStorage.getItem('userAccount') || '');
    const handleSetAccount = (newAccount: string) => {
    setAccount(newAccount);
    sessionStorage.setItem('userAccount', newAccount);
    }
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
        <QueryClientProvider client={queryClient}>
            <Router>
                <UserContext.Provider value={{ account, setAccount, setUserState }}>
                    <NavigationHandler userState={userState} />
                    <div className="App">
                        <Routes>
                            <Route path="/" element={<HomePage setAccount={handleSetAccount} setUserState={setUserState} />} />
                            <Route path="/dashboard" element={<DashboardLayout account={account} />} />
                        </Routes>
                    </div>
                </UserContext.Provider>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
