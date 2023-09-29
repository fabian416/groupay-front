import { createContext } from 'react';
import { UserState } from './States';  


interface UserContextType {
    account: string;
    setAccount: React.Dispatch<React.SetStateAction<string>>;
    setUserState: React.Dispatch<React.SetStateAction<UserState>>;
}

const UserContext = createContext<UserContextType | null>(null);


export default UserContext;
