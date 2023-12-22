import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
  ReactNode,
} from 'react'
import { UserState } from './States'

interface UserContextType {
  account: string
  setAccount: Dispatch<SetStateAction<string>>
  gnosisSafeAddress: string
  setGnosisSafeAddress: Dispatch<SetStateAction<string>>
  userState: UserState
  setUserState: Dispatch<SetStateAction<UserState>>
}
interface UserContextProviderProps {
  children: ReactNode
  value: UserContextType
}

export const UserContext = createContext<UserContextType | null>(null)

export const useUserContext = () => useContext(UserContext)

export const UserContextProvider: React.FC<UserContextProviderProps> = ({
  children,
}) => {
  const [account, setAccount] = useState<string>('')
  const [gnosisSafeAddress, setGnosisSafeAddress] = useState<string>('')
  const [userState, setUserState] = useState<UserState>('UNKNOWN')

  // Aquí proporcionas todos los estados y funciones que el contexto va a exponer
  const contextValue: UserContextType = {
    account,
    setAccount,
    gnosisSafeAddress,
    setGnosisSafeAddress,
    userState,
    setUserState,
  }

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  )
}

export default UserContext
