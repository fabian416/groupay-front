import React from 'react'

export type Transaction = {
  _id: number
  amount: number
  // description: string;
  // date: Date;
}

type TransactionHistoryProps = {
  transactions: Transaction[]
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
}) => {
  return (
    <div>
      <h2>Transaction History</h2>
      {transactions.map((tx) => (
        <div key={tx._id}>
          {/* Show the info about the transaction */}
          <p>{tx.amount}</p>
        </div>
      ))}
    </div>
  )
}

export default TransactionHistory
