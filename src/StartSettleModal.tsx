import React from 'react'
import './StartSettleModal.css'

interface StartSettleModalProps {
  isConfirmModalOpen: boolean
  confirmSettleAction: () => void
  handleCloseConfirmModal: () => void
}

const StartSettleModal: React.FC<StartSettleModalProps> = ({
  isConfirmModalOpen,
  confirmSettleAction,
  handleCloseConfirmModal,
}) => {
  if (!isConfirmModalOpen) return null

  return (
    <div className="start-settle-modal">
      <div
        className="start-settle-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <p>¿Are you sure you want to confirm the settlement?</p>
        <button onClick={confirmSettleAction}>Confirmar</button>
        <button onClick={handleCloseConfirmModal}>Cancelar</button>
      </div>
    </div>
  )
}

export default StartSettleModal
