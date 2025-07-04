import React, { useState, useEffect } from 'react';
import './WriteStory.css';
import axios from 'axios';

const WriteStory = ({ onReturn }) => {
  const [formData, setFormData] = useState({
    title: '',
    thoughts: '',
    date: ''
  });
  
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: 'I am an AI assistant that can help you create stories and memories. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Check if user is authenticated
  const checkAuth = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Show alert and redirect to login if no token
      alert('请先登录');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      return false;
    }
    return true;
  };

  // Handle API errors, especially 401 unauthorized
  const handleApiError = (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, show alert and redirect to login
      alert('登录已过期，请重新登录');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setTimeout(() => {
        window.location.href = '/';
      }, 500); // Small delay to ensure alert is shown
    }
    return error;
  };

  // Check authentication on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Update thoughts content based on user chat messages only
  useEffect(() => {
    const userMessages = chatMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n\n');
    
    if (userMessages) {
      regenerateText(userMessages);
    }
  }, [chatMessages]);

  const regenerateText = async (newContent) => {
    if (!checkAuth()) return;
    
    setIsRegenerating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://localhost:5000/api/regenerate-text', {
        text: newContent,
        currentContent: formData.thoughts
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setFormData(prev => ({
        ...prev,
        thoughts: response.data.regenerated_text
      }));
    } catch (error) {
      console.error('Error regenerating text:', error);
      handleApiError(error);
      // If regeneration fails, just use the original content
      setFormData(prev => ({
        ...prev,
        thoughts: newContent
      }));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    if (!formData.title || !formData.thoughts || !formData.date) {
      setSaveStatus('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://localhost:5000/api/conversations', {
        title: formData.title,
        content: formData.thoughts,
        date: formData.date,
        messages: chatMessages
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.id) {
        setConversationId(response.data.id);
        setSaveStatus('Story saved successfully!');
        // Clear the form
        setFormData({
          title: '',
          thoughts: '',
          date: ''
        });
        // Return to previous screen after a short delay
        setTimeout(() => {
          onReturn();
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving story:', error);
      handleApiError(error);
      setSaveStatus('Error saving story. Please try again.');
    }
  };

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;
    if (!checkAuth()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);
    
    try {
      // Call our backend API
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://localhost:5000/api/chat', {
        messages: updatedMessages,
        conversationId: conversationId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Extract the assistant's response from the API response
      const aiMessage = response.data.choices[0].message;
      
      setChatMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      handleApiError(error);
      // Add error message to chat
      setChatMessages([
        ...updatedMessages, 
        { 
          role: 'system', 
          content: `Sorry, there was an error processing your request: ${error.response?.data?.error || error.message}. Please try again.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAIResponse = (messageContent) => {
    setFormData(prev => ({
      ...prev,
      thoughts: prev.thoughts ? `${prev.thoughts}\n\n${messageContent}` : messageContent
    }));
  };

  return (
    <div className="desktop-frame">
      <button className="return-button" onClick={onReturn}>
        ← Return
      </button>
      
      <div className="story-container">
        <div className="form-and-chat">
          <form className="story-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-container">
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange}
                  placeholder="Set a Title"
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="input-container">
                <textarea 
                  name="thoughts" 
                  value={formData.thoughts} 
                  onChange={handleChange}
                  placeholder="Type your Thoughts"
                  className="form-textarea"
                  rows={5}
                />
                {isRegenerating && (
                  <div className="regenerating-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <div className="input-container">
                <input 
                  type="text" 
                  name="date" 
                  value={formData.date} 
                  onChange={handleChange}
                  placeholder="Set the Date"
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="buttons-container">
              <button type="submit" className="action-button">Save</button>
            </div>
            {saveStatus && (
              <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
                {saveStatus}
              </div>
            )}
          </form>
          
          <div className="chat-container">
            <h2 className="chat-title">Chat with AI</h2>
            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <div className="message-content">
                    {message.content}
                    {message.role === 'assistant' && (
                      <button 
                        className="use-response-button"
                        onClick={() => handleUseAIResponse(message.content)}
                      >
                        Use in Story
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message assistant">
                  <div className="message-content loading">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={handleChatInputChange}
                placeholder="Ask the AI for help with your story..."
                className="chat-input"
              />
              <button type="submit" className="send-button" disabled={isLoading}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WriteStory; 