import React from 'react';

type Transaction = {
    _id: number;
    amount: number;
    // description: string;
    // date: Date;
};

type TransactionHistoryProps = {
    transactions: Transaction[];
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
    return (
        <div>
            <h2>Historial de transacciones</h2>
            {transactions.map(tx => (
                <div key={tx._id}>
                    {/* Muestra la información de la transacción aquí */}
                    <p>{tx.amount}</p>
                </div>
            ))}
        </div>
    );
}

export default TransactionHistory;
