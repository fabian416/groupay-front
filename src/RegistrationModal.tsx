import React, { FormEvent } from 'react'
import Modal from 'react-modal'
import axios from 'axios'
import './registrationModal.css'

interface RegistrationModalProps {
  isOpen: boolean
  onRequestClose: () => void
  setAccount: (walletAddress: string) => void
  onRegistered: (wasRegistered: boolean) => void
  walletAddress: string | null
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onRequestClose,
  setAccount,
  onRegistered,
  walletAddress,
}) => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    let alias = form.alias.value

    // Prepend "@" if it doesn't already start with it
    if (!alias.startsWith('@')) {
      alias = '@' + alias
    }

    const email = form.email.value

    // Here, send this data to your API and register the user
    // After register, redirect to dashboard
    if (walletAddress) {
      const response = await axios.post(
        'http://localhost:3001/api/users/register',
        {
          walletAddress,
          alias,
          email,
        },
      )

      if (response.status === 201 || response.status === 200) {
        setAccount(response.data.walletAddress)
        onRequestClose()
        onRegistered(true)
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="modalContent"
      overlayClassName="modalOverlay"
      contentLabel="Registration Form"
    >
      <h2 className="modalTitle">Complete your Profile</h2>
      <div className="explanationText">To continue to Squary</div>
      <form onSubmit={handleSubmit} className="registrationForm">
        <label htmlFor="alias" className="inputLabel">
          Alias
        </label>
        <input
          className="formInput"
          id="alias"
          name="alias"
          type="text"
          required
        />
        <label htmlFor="email" className="inputLabel">
          Email (optional)
        </label>
        <input className="formInput" id="email" name="email" type="email" />
        <button className="submitButton" type="submit">
          Submit
        </button>
      </form>
    </Modal>
  )
}

export default RegistrationModal
