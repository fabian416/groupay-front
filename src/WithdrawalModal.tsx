import React from 'react'
import './WithdrawModal.css'

interface WithdrawModalProps {
  withdrawAmount: string
  setWithdrawAmount: (value: string) => void
  handleWithdrawUSDC: () => void
  closeModal: () => void
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  withdrawAmount,
  setWithdrawAmount,
  handleWithdrawUSDC,
  closeModal,
}) => {
  return (
    <div className="withdraw-modal">
      <div
        className="withdraw-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder="Amount in USDC"
        />
        <button onClick={handleWithdrawUSDC}>Confirm Withdraw</button>
        <button onClick={closeModal}>Cancel</button>
      </div>
    </div>
  )
}

export default WithdrawModal
