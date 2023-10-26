import React, { useEffect, useState } from 'react';
import './GroupDetails.css';
import ExpenseModal from './ExpenseModal';
import axios from 'axios';

interface Group {
    id: number;
    name: string;
    status: string;
}

// Define the types of the props
interface GroupDetailsProps {
    group: Group;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ group }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [members, setMembers] = useState<{alias: string, walletAddress: string}[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);  

    const [debts, setDebts] = useState<any[]>([]);  // define the state for the debts

const fetchGroupDebts = async () => {
    try {
        const response = await axios.get(`http://localhost:3001/api/debts/groups/${group.id}`);
        setDebts(response.data);
    } catch (error) {
        console.error("Error getting the debts: ", error);
    }
};

useEffect(() => {
    fetchGroupDebts();
}, [group.id]);



    useEffect(() => {
        // Function to get all the members
        const fetchGroupMembers = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`);
                
                // save the complete structure in the member's state
                setMembers(response.data);
            } catch (error) {
                console.error("Error getting members of the group:", error);
            }
        };
    
        fetchGroupMembers();
    }, [group.id]); 

    const fetchGroupExpenses = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/transactions/${group.id}/expenses`);
            setExpenses(response.data);
        } catch (error) {
            console.error("Error getting the expenses: ", error);
        }
    };
    
    useEffect(() => {
        // Función to get expenses from group
        fetchGroupExpenses();
    }, [group.id]);
    

    // Function to open the modal
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    // Función para cerrar el modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        fetchGroupExpenses(); 
    };

    const handleSettle = () => {
        // Aquí va la lógica para el cálculo de las deudas o iniciar el proceso
        console.log('Settling...');
    };
    
    return (
        <div className="group-details-container">
    <h2 className="group-details-header">Group Details</h2>
    <div className="group-details-content">
        <p>{group.name} - {group.status}</p>
        {/* Aquí puedes mostrar más detalles sobre el grupo */}
        <button className="button-add" onClick={handleOpenModal}>Add shared expense</button>
        <button className="button-settle" onClick={handleSettle}>Settle</button>
    </div>
    
    <div className="finances-container"> {/* Este es el contenedor de Gastos y Saldos */}
    <div className="gastos-section"> 
  <h3>Expenses</h3>
  <ul>
  {expenses.map(expense => (
    <li key={expense.id}>
        Date: {expense.createdAt} -
        Proposed by: {expense.proposedBy} -
        Description: {expense.description} -
        Amount: ${expense.amount} -
        Shared with: {expense.sharedWith.join(", ")}
    </li>
        ))}
  </ul>
</div>

<div className="saldos-section">
    <h3>Saldos</h3>
    <ul>
    {debts.map(debt => (
        <li key={debt.id}>
            Debtor: {debt.debtor} -
            Creditor: {debt.creditor} -
            Amount: ${debt.amount} -
            Date: {debt.createdAt}
        </li>
    ))}
    </ul>
</div>

    </div>

    {/* Renderiza el modal si isModalOpen es true */}
    {isModalOpen && (
        <ExpenseModal 
            closeModal={handleCloseModal}
            groupId={group.id}
            members={members}
        />
    )}
</div>

    );
}

export default GroupDetails;
