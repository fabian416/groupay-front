import React from 'react';

interface Friend {
    id: number;
    name: string;
    // puedes agregar más detalles si lo necesitas
}

// Define the types of the props
interface FriendDetailsProps {
    friend: Friend;
}

const FriendDetails: React.FC<FriendDetailsProps> = ({ friend }) => {
    return (
        <div>
            <h2>Friend Details</h2>
            <div key={friend.id}>
                <p>{friend.name}</p>
                {/* Aquí puedes mostrar más detalles sobre el amigo, como su historial de transacciones contigo, etc. */}
            </div>
        </div>
    );
}

export default FriendDetails;
