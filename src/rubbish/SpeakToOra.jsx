import React, { useState, useEffect } from 'react';
import './SpeakToOra.css';
import WriteStory from '../components/WriteStory';
import { getAccessToken, handleApiError, getAuthHeaders, checkAuthWithRedirect } from '../utils/auth';

const SpeakToOra = ({ onReturn }) => {
  const [showWriteStory, setShowWriteStory] = useState(false);

  // Chat-related state
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: 'I am an AI assistant that can help you create stories and memories.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Microphone state
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [transcribedText, setTranscribedText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    thoughts: '',
    date: ''
  });
  const [saveStatus, setSaveStatus] = useState('');

  // Check authentication on component mount
  useEffect(() => {
    checkAuthWithRedirect();
  }, []);

  // Create a new conversation when component mounts
  useEffect(() => {
    const createConversation = async () => {
      if (!checkAuthWithRedirect()) return;
      
      try {
        console.log('Attempting to create conversation...');
        const response = await fetch('http://localhost:5000/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            title: 'New Conversation',
            content: 'Initial conversation',
            date: new Date().toISOString().split('T')[0],
            messages: chatMessages
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server response not OK:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`Failed to create conversation: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('Conversation created successfully:', data);
        setConversationId(data.id);
      } catch (error) {
        console.error('Error creating conversation:', {
          message: error.message,
          stack: error.stack
        });
        handleApiError(error);
      }
    };

    createConversation();
  }, []);

  const handleEndClick = () => {
    setShowWriteStory(true);
  };

  const handleWriteReturn = () => {
    setShowWriteStory(false);
  };

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checkAuthWithRedirect()) return;
    
    if (!formData.title || !formData.thoughts || !formData.date) {
      setSaveStatus('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.thoughts,
          date: formData.date,
          messages: chatMessages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save story');
      }

      const data = await response.json();
      if (data.id) {
        setConversationId(data.id);
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

  // Microphone request handler
  const handleMicrophoneRequest = async () => {
    if (!checkAuthWithRedirect()) return;
    
    if (isRecording) {
      // Stop recording
      try {
        const response = await fetch('http://localhost:5000/api/asr/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          setMicError(data.error);
        } else if (data.text) {
          // Set the transcribed text
          setTranscribedText(data.text);
          
          // Improve text fluency using text regeneration API
          try {
            const regenerateResponse = await fetch('http://localhost:5000/api/regenerate-text', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              },
              body: JSON.stringify({
                text: data.text
              }),
            });

            if (!regenerateResponse.ok) {
              throw new Error('Failed to improve text fluency');
            }

            const improvedText = await regenerateResponse.json();
            
            // Update the thoughts field with improved text
            setFormData(prev => ({
              ...prev,
              thoughts: prev.thoughts ? `${prev.thoughts}\n${improvedText.regenerated_text}` : improvedText.regenerated_text
            }));
          } catch (error) {
            console.error('Text regeneration error:', error);
            // If regeneration fails, use the original transcribed text
            setFormData(prev => ({
              ...prev,
              thoughts: prev.thoughts ? `${prev.thoughts}\n${data.text}` : data.text
            }));
          }
          
          // Add user message to chat
          const userMessage = { role: 'user', content: data.text };
          const updatedMessages = [...chatMessages, userMessage];
          setChatMessages(updatedMessages);
          
          // Get AI response
          setIsLoading(true);
          try {
            const chatResponse = await fetch('http://localhost:5000/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              },
              body: JSON.stringify({
                messages: updatedMessages,
                conversationId: conversationId
              }),
            });

            if (!chatResponse.ok) {
              const errorData = await chatResponse.json();
              throw new Error(errorData.error || `HTTP error! status: ${chatResponse.status}`);
            }

            const chatData = await chatResponse.json();
            if (chatData.choices && chatData.choices[0].message) {
              const aiMessage = chatData.choices[0].message;
              setChatMessages(prev => [...prev, aiMessage]);
            } else {
              throw new Error('Invalid response format from chat API');
            }
          } catch (error) {
            console.error('Chat error:', error);
            handleApiError(error);
            setMicError('Failed to get AI response: ' + (error.message || 'Unknown error'));
            // Add error message to chat
            setChatMessages(prev => [...prev, {
              role: 'system',
              content: `Error: ${error.message || 'Failed to get AI response. Please try again.'}`
            }]);
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Stop recording error:', error);
        handleApiError(error);
        setMicError('Failed to stop recording: ' + (error.message || 'Unknown error'));
      } finally {
        // Always set isRecording to false after stopping
        setIsRecording(false);
      }
    } else {
      // Start recording logic
      try {
        const response = await fetch('http://localhost:5000/api/asr/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          setMicError(data.error);
        } else {
          setIsRecording(true);
          setTranscribedText(''); // Clear previous transcription
        }
      } catch (error) {
        console.error('Start recording error:', error);
        handleApiError(error);
        setMicError('Failed to start recording: ' + (error.message || 'Unknown error'));
      }
    }
  };

  if (showWriteStory) {
    return <WriteStory onReturn={handleWriteReturn} />;
  }

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
            <div className="chat-controls">
              <button 
                className={`action-button ${isRecording ? 'recording' : ''}`} 
                onClick={handleMicrophoneRequest}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {micError && <div className="mic-error">{micError}</div>}
    </div>
  );
};

export default SpeakToOra;