// components/ChatHistory.js
import React, { useState, useEffect } from 'react';
import '../App.css';

const ChatHistory = ({ userId, onChatSelect }) => {
  const [historyChats, setHistoryChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [userId, currentPage]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/chats/${userId}?page=${currentPage}&limit=20`);
      const data = await response.json();
      if (response.ok) {
        setHistoryChats(data.chats);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadHistory(); // Reload history
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  if (loading) return <div className="loading">Loading history...</div>;

  return (
    <div className="chat-history">
      <h3>Chat History</h3>
      <div className="history-list">
        {historyChats.map(chat => (
          <div key={chat._id} className="history-item">
            <div className="history-content" onClick={() => onChatSelect(chat)}>
              <div className="history-message">{chat.message}</div>
              <div className="history-timestamp">
                {new Date(chat.timestamp).toLocaleString()}
              </div>
            </div>
            <button 
              className="delete-button"
              onClick={() => deleteChat(chat._id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;