// components/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import ChatHistory from './ChatHistory';
import FileUpload from './FileUpload';
import '../App.css';

const ChatInterface = ({ user, onLogout }) => {
  console.log(user);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  useEffect(() => {
    loadChatHistory();
  }, [user]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chats/${user.id}?limit=10`);
      const data = await response.json();
      if (response.ok) {
        setChats(data.chats.reverse());
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('message', message);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setChats(prev => [...prev, data]);
        setMessage('');
        setFiles([]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Chat - {user.username}</h2>
        <div className="header-buttons">
          <button onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Hide' : 'Show'} History
          </button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {showHistory && (
        <ChatHistory 
          userId={user.id} 
          onChatSelect={(chat) => {
            setShowHistory(false);
            // Optionally scroll to specific chat
          }} 
        />
      )}

      <div className="messages-container">
        {chats.map((chat, index) => (
          <div key={chat.chatId || index} className="message-pair">
            <div className="user-message">
              <strong>You:</strong> {chat.message}
              {chat.files && chat.files.length > 0 && (
                <div className="file-attachments">
                  {chat.files.map((file, idx) => (
                    <span key={idx} className="file-tag">
                      📎 {file.filename}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="ai-response">
              <strong>AI:</strong> {chat.response}
            </div>
            <div className="timestamp">
              {new Date(chat.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
        {loading && (
          <div className="loading-message">
            <strong>AI:</strong> Processing your request...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <FileUpload files={files} setFiles={setFiles} />
        <div className="input-group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || (!message.trim() && files.length === 0)}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;