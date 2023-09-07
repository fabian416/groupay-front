import React from 'react';
import { Web3Provider } from '@ethersproject/providers';

function HomePage({ setAccount }) {
    async function connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                const provider = new providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const connectedAddress = await signer.getAddress();
                console.log("Connected Address:", connectedAddress);
                setAccount(connectedAddress);

            } catch (error) {
                console.error('User rejected request:', error);
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
        </div>
    );
}

export default HomePage;
