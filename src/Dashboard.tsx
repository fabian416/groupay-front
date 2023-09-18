import React from 'react';

type DashboardProps = {
    account: string;
};

const Dashboard: React.FC<DashboardProps> = ({ account }) => {
    return (
        <div>
            {/* Aquí va el contenido de tu Dashboard */}
            <button className="connected-account-button">
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </button>
        </div>
    );
}

export default Dashboard;
