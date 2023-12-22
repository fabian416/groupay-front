import React from 'react'
import './DepositModal.css'

interface DepositModalProps {
  depositAmount: string
  setDepositAmount: (value: string) => void
  handleDepositUSDC: () => void
  closeModal: () => void
}

const DepositModal: React.FC<DepositModalProps> = ({
  depositAmount,
  setDepositAmount,
  handleDepositUSDC,
  closeModal,
}) => {
  return (
    <div className="deposit-modal">
      <div
        className="deposit-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount in USDC"
        />
        <button onClick={handleDepositUSDC}>Confirm Deposit</button>
        <button onClick={closeModal}>Cancel</button>
      </div>
    </div>
  )
}

export default DepositModal
