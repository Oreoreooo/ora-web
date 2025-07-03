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
    setIsRegenerating(true);
    try {
      const response = await axios.post('http://localhost:3002/api/regenerate-text', {
        currentContent: formData.thoughts,
        newContent: newContent
      });

      setFormData(prev => ({
        ...prev,
        thoughts: response.data.regeneratedText
      }));
    } catch (error) {
      console.error('Error regenerating text:', error);
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
    
    if (!formData.title || !formData.thoughts || !formData.date) {
      setSaveStatus('Please fill in all fields');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3002/api/conversations', {
        title: formData.title,
        content: formData.thoughts,
        date: formData.date,
        messages: chatMessages
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
      setSaveStatus('Error saving story. Please try again.');
    }
  };

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);
    
    try {
      // Call our backend API
      const response = await axios.post('http://localhost:3002/api/chat', {
        messages: updatedMessages,
        conversationId: conversationId
      });
      
      // Extract the assistant's response from the API response
      const aiMessage = response.data.choices[0].message;
      
      setChatMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
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