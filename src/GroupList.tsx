import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Definimos los tipos de las props
interface GroupListProps {
    userAddress: string;
    loadGroups: boolean;
}

// Definimos la estructura de un grupo
interface Group {
    _id: string;
    name: string;
    // Si hay más campos, puedes añadirlos aquí
}

const GroupList: React.FC<GroupListProps> = ({ userAddress, loadGroups }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupsLoaded, setGroupsLoaded] = useState(false);

    const fetchGroups = useCallback(async () => {
        try {
            const response = await axios.get(`/api/groups/${userAddress}/groups`);
            setGroups(response.data);
            setGroupsLoaded(true);
        } catch (error) {
            console.error("Error al obtener los grupos", error);
        }
    }, [userAddress]);

    useEffect(() => {
        if(loadGroups) {
            fetchGroups();
        }
    }, [loadGroups, fetchGroups]);

    return (
        <div>
            <h2>Tus grupos</h2>
            {!groupsLoaded && (
                <button onClick={fetchGroups}>Cargar Grupos</button>
            )}
            {groups.map(group => (
                <div key={group._id}>
                    <p>{group.name}</p>
                </div>
            ))}
        </div>
    );
}

export default GroupList;
