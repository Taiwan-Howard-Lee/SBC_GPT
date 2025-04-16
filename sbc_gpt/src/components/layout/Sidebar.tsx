import React from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  // Get chat context
  const { chats, currentChatId, createNewChat, switchChat, deleteChat } = useChatContext();

  // State for delete confirmation
  const [chatToDelete, setChatToDelete] = React.useState<string | null>(null);

  // Handle new chat button click
  const handleNewChat = () => {
    createNewChat();
  };

  // Handle chat item click
  const handleChatClick = (chatId: string) => {
    switchChat(chatId);
  };

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent triggering the chat click
    setChatToDelete(chatId);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete);
      setChatToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setChatToDelete(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-button" onClick={handleNewChat}>
          <i className="fas fa-plus"></i>
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title">Library</h3>
        <div className="chat-history">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => handleChatClick(chat.id)}
            >
              <span className="chat-title">{chat.title}</span>
              <div className="chat-item-actions">
                <span className="chat-count">{chat.messageCount}</span>
                {/* Only show delete button if we have more than one chat */}
                {chats.length > 1 && (
                  <button
                    className="delete-chat-button"
                    onClick={(e) => handleDeleteClick(e, chat.id)}
                    title="Delete chat"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Delete confirmation dialog */}
          {chatToDelete && (
            <div className="delete-confirmation">
              <p>Delete this chat?</p>
              <div className="confirmation-buttons">
                <button onClick={confirmDelete} className="confirm-button">Delete</button>
                <button onClick={cancelDelete} className="cancel-button">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            <i className="fas fa-user"></i>
          </div>
          <span className="username">User</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
