import React, { useState } from 'react'
import GroupModal from './GroupModal'
import './Sidebar.css'

interface Group {
  id: number
  name: string
  status: string
}

interface Friend {
  id: number
  name: string
}

interface SidebarProps {
  groups: Group[]
  friends?: Friend[]
  selectGroup: (group: Group) => void
  selectFriend?: (friend: Friend) => void
  changeView: (view: 'groupDetails' | 'transactions' | 'friendDetails') => void
  openModal?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  groups,
  friends,
  selectGroup,
  selectFriend,
  changeView,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen)
  }

  return (
    <div className="sidebar">
      <h2>Squary</h2>

      <div className="sidebar-section">
        <h3>Expenses</h3>
        <button onClick={() => changeView('transactions')}>
          Transaction History
        </button>
      </div>

      <div className="sidebar-section">
        <h3>Groups</h3>
        <button onClick={toggleModal}>Add new Group</button>
        <ul>
          {groups.map((group) => (
            <li
              key={group.id}
              onClick={() => {
                selectGroup(group)
                changeView('groupDetails')
              }}
            >
              {group.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>Friends</h3>
        <ul>
          {friends &&
            friends.map((friend) => (
              <li
                key={friend.id}
                onClick={() => {
                  if (selectFriend) {
                    selectFriend(friend)
                  }
                  changeView('friendDetails')
                }}
              >
                {friend.name}
              </li>
            ))}
        </ul>
        <button>+ Add</button>
      </div>
      {isModalOpen && <GroupModal closeModal={toggleModal} />}
    </div>
  )
}

export default Sidebar
