import React, { FormEvent } from 'react';
import Modal from 'react-modal';
import axios from 'axios';

// Styles
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#f2f2f2',
    padding: '20px',
    borderRadius: '10px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  }
};

interface RegistrationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  setAccount: (walletAddress: string) => void;
  onRegistered: (wasRegistered: boolean) => void;
  walletAddress: string | null;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onRequestClose, setAccount, onRegistered, walletAddress }) => {

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        let alias = form.alias.value;
    
        // Prepend "@" if it doesn't already start with it
        if (!alias.startsWith("@")) {
            alias = "@" + alias;
        }
    
        const email = form.email.value;
    
        // Here, send this data to your API and register the user
        // After register, redirect to dashboard
        if (walletAddress) {
            const response = await axios.post('http://localhost:3001/api/users/register', {
                walletAddress, 
                alias,
                email
            });
            
            if (response.status === 201 || response.status === 200) {
                setAccount(response.data.walletAddress);
                onRequestClose();
                onRegistered(true);
            }
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            style={customStyles}
            contentLabel="Registration Form"
        >
            <form onSubmit={handleSubmit}>
                <input name="alias" type="text" placeholder="Alias" required />
                <input name="email" type="email" placeholder="Email (optional)" />
                <button type="submit">Submit</button>
            </form>
        </Modal>
    );
}

export default RegistrationModal;
