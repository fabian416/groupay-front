/// <reference path="../declarations.d.ts" />
import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Web3Provider } from '@ethersproject/providers';
import axios from 'axios';
import RegistrationModal from './RegistrationModal';
import { UserState } from './States'; 
import { ethers } from 'ethers';

interface HomePageProps {
    setAccount: (newAccount: string) => void;
    setUserState: Dispatch<SetStateAction<UserState>>;
}


const HomePage: React.FC<HomePageProps> = ({ setAccount, setUserState}) => {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [wasRegistered, setWasRegistered] = useState<boolean>(false);
    const [connectedAddress, setConnectedAddress] = useState<string | null>(null); 
    const navigate = useNavigate();

    useEffect(() => {
        if (wasRegistered && connectedAddress) {
            setAccount(connectedAddress);
            navigate("/dashboard");
        }
    }, [wasRegistered, connectedAddress, navigate]);


    async function connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                const provider = new Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const connectedAddress = await signer.getAddress();
                setConnectedAddress(connectedAddress);
                setAccount(connectedAddress);
    

                const response = await axios.post('http://localhost:3001/api/users/authenticate', {
                    walletAddress: connectedAddress
                });
                console.log("Respuesta del servidor:", response.data);

                if (response.data.user === null) {
                    setUserState('NEW');
                    setIsModalOpen(true);
                } else {
                    setUserState('EXISTING');
                    setAccount(connectedAddress); 
                }
            } catch (error) {
                console.error('Error:', error);
            }
        } else {
            alert('Please install MetaMask to use this function');
        }
    }

    return (
        <div>
            <button className='connect-button' onClick={connectWallet}>
                Connect to MetaMask
            </button>
            
            <RegistrationModal 
                isOpen={isModalOpen} 
                onRequestClose={() => setIsModalOpen(false)} 
                setAccount={setAccount} 
                onRegistered={setWasRegistered}
                walletAddress={connectedAddress} 
            />
        </div>
    );
}

export default HomePage;
