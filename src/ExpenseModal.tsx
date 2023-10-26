import React, { useState, useContext } from 'react';
import './ExpenseModalStyle.css';
import UserContext from './UserContext';
import axios from 'axios';

interface ExpenseModalProps {
    closeModal: () => void;
    groupId: number;
    members: { alias: string, walletAddress: string }[];
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ closeModal, groupId, members }) => {
    const userContext = useContext(UserContext);
    if (!userContext) {
        throw new Error("UserContext is not available");
    }

    const { account } = userContext;
    const myMemberInfo = members.find(member => member.walletAddress === account);
    const myAlias = myMemberInfo?.alias || '@UnknownAlias';

    const [selectedMembers, setSelectedMembers] = useState<string[]>([myAlias]);
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState<string>('');

    const toggleMemberSelection = (alias: string) => {
        if (selectedMembers.includes(alias)) {
            setSelectedMembers(prev => prev.filter(m => m !== alias));
        } else {
            setSelectedMembers(prev => [...prev, alias]);
        }
    };

    const isFormValid = (): boolean => {
        if (amount <= 0 || isNaN(amount)) {
            alert("Amount must be greater than 0.");
            return false;
        }
        if (description.trim() === "") {
            alert("Description cannot be empty.");
            return false;
        }
        if (selectedMembers.length === 0) {
            alert("You must select at least one member.");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (isFormValid()) {
            const sharedWalletAddresses = members
                .filter(member => selectedMembers.includes(member.alias) || member.walletAddress === account)
                .map(member => member.walletAddress);

            const expenseData = {
                amount,
                description,
                proposedBy: account,
                sharedWith: sharedWalletAddresses,
                type: 'EXPENSE',
                groupId
            };

            try {
                const response = await axios.post('http://localhost:3001/api/transactions/create', expenseData);
                console.log('Expense data to send:', expenseData);
                console.log('Expense sent successfully:', response.data);

                // Obtener las deudas actualizadas
                const debtResponse = await axios.get(`http://localhost:3001/api/debts/groups/${groupId}`);


                const debts = debtResponse.data;
                console.log('Debts fetched:', debts);

                // Aquí puedes manejar las deudas, por ejemplo, actualizando algún estado o variable de tu aplicación.
                // setGroupDebts(debts);

                closeModal();
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    console.error('Error:', error.response?.data.message || error.message);
                } else {
                    console.error('Unknown error occurred:', error);
                }
            }
        }
    };

    return (
        <div className="expense-modal-background">
            <div className="expense-modal-content">
                <button onClick={closeModal}>Close</button>
                <h2>Add Shared Expense</h2>
                <div>
                    <label>
                        Amount: $ <input 
                            type="number" 
                            value={amount.toString()} 
                            onChange={e => setAmount(parseFloat(e.target.value))}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Description:
                        <textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                        ></textarea>
                    </label>
                </div>
                <div>
                    Share with:
                    {members.map(member => (
                        member.walletAddress !== account && (
                            <label key={member.walletAddress}>
                                <input
                                    type="checkbox"
                                    value={member.alias}
                                    checked={selectedMembers.includes(member.alias)}
                                    onChange={() => toggleMemberSelection(member.alias)}
                                />
                                {member.alias}
                            </label>
                        )
                    ))}
                </div>
                <button onClick={handleSubmit}>Send Expense</button>
            </div>
        </div>
    );
}

export default ExpenseModal;
