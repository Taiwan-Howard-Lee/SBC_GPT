import React from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import FeedbackModal from '../feedback/FeedbackModal';
import * as api from '../../services/api';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  // Get chat context
  const { chats, currentChatId, createNewChat, switchChat, deleteChat, updateChatTitle } = useChatContext();

  // State for delete confirmation
  const [chatToDelete, setChatToDelete] = React.useState<string | null>(null);

  // State for editing chat title
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null);
  const [editedTitle, setEditedTitle] = React.useState<string>('');

  // State for feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = React.useState<boolean>(false);
  const [feedbackChatId, setFeedbackChatId] = React.useState<string | null>(null);

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
      // Store the chat ID for feedback
      setFeedbackChatId(chatToDelete);

      // Delete the chat
      deleteChat(chatToDelete);

      // Reset delete confirmation
      setChatToDelete(null);

      // Show feedback modal
      setShowFeedbackModal(true);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setChatToDelete(null);
  };

  // Handle edit button click
  const handleEditClick = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation(); // Prevent triggering the chat click
    setEditingChatId(chatId);
    setEditedTitle(currentTitle);
  };

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  // Handle title input key press
  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Save edited title
  const saveTitle = async () => {
    if (editingChatId && editedTitle.trim()) {
      await updateChatTitle(editingChatId, editedTitle.trim());
      setEditingChatId(null);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingChatId(null);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (rating: number, comments: string) => {
    if (!feedbackChatId) return;

    try {
      await api.submitFeedback(feedbackChatId, rating, comments);
      setShowFeedbackModal(false);
      setFeedbackChatId(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still close the modal even if there's an error
      setShowFeedbackModal(false);
      setFeedbackChatId(null);
    }
  };

  // Handle feedback skip
  const handleFeedbackSkip = () => {
    setShowFeedbackModal(false);
    setFeedbackChatId(null);
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
              {editingChatId === chat.id ? (
                <div className="edit-title-container" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={handleTitleChange}
                    onKeyDown={handleTitleKeyPress}
                    onBlur={saveTitle}
                    autoFocus
                    className="edit-title-input"
                  />
                </div>
              ) : (
                <span className="chat-title">{chat.title}</span>
              )}
              <div className="chat-item-actions">
                <span className="chat-count">{chat.messageCount}</span>
                {/* Edit button */}
                <button
                  className="edit-chat-button"
                  onClick={(e) => handleEditClick(e, chat.id, chat.title)}
                  title="Edit chat title"
                >
                  <i className="fas fa-edit"></i>
                </button>
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

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackChatId && (
        <FeedbackModal
          chatId={feedbackChatId}
          onSubmit={handleFeedbackSubmit}
          onSkip={handleFeedbackSkip}
        />
      )}
    </div>
  );
};

export default Sidebar;
