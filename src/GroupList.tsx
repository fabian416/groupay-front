import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Define the types of the props
interface GroupListProps {
    userAddress: string;
    loadGroups: boolean;
}


interface Group {
    id: string;
    name: string;

}

const GroupList: React.FC<GroupListProps> = ({ userAddress, loadGroups }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupsLoaded, setGroupsLoaded] = useState(false);
    //State for manage errors
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        try {
            const response = await axios.get(`/api/groups/${userAddress}/groups`);
            setGroups(response.data);
            setGroupsLoaded(true);
        } catch (error) {
            console.error("Error al obtener los grupos", error);
            setError('Error al obtener los grupos.'); 
        }
    }, [userAddress]);

    useEffect(() => {
        if(loadGroups && !groupsLoaded) {
            fetchGroups();
        }
    }, [loadGroups, fetchGroups]);

    return (
        <div>
            <h2>Your Groups</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {groups.map(group => (
                <div key={group.id}>
                    <p>{group.name}</p>
                </div>
            ))}
        </div>
    );
}

export default GroupList;
