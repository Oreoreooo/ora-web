import React, { useState, useEffect } from 'react';
import './WriteStory.css';
import axios from 'axios';
import { getAccessToken, handleApiError, getAuthHeaders, checkAuthWithRedirect } from '../utils/auth';

const WriteStory = ({ onReturn }) => {
  const [formData, setFormData] = useState({
    title: '',
    thoughts: ''
  });
  
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: 'I am an AI assistant that can help you create stories and memories.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [pendingContent, setPendingContent] = useState(''); // 存储待保存的内容
  
  // 语音相关状态
  const [chatMode, setChatMode] = useState('text'); // 'text' or 'voice'
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  
  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');

  // 不再自动更新 thoughts，而是生成待保存的内容
  useEffect(() => {
    const userMessages = chatMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n\n');
    
    if (userMessages) {
      generatePendingContent(userMessages);
    }
  }, [chatMessages]);

  const generatePendingContent = async (newContent) => {
    if (!checkAuthWithRedirect()) return;
    
    setIsRegenerating(true);
    try {
      const response = await axios.post('http://localhost:5000/api/regenerate-text', {
        text: newContent,
        currentContent: formData.thoughts
      }, {
        headers: getAuthHeaders()
      });

      // 只更新待保存内容，不直接更新 formData
      setPendingContent(response.data.regenerated_text);
    } catch (error) {
      console.error('Error regenerating text:', error);
      handleApiError(error);
      // 如果生成失败，使用原始内容
      setPendingContent(newContent);
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

  const handleExport = () => {
    // 进入编辑模式，将待保存内容或用户输入内容设置为编辑内容
    const contentToEdit = pendingContent || formData.thoughts;
    
    if (!contentToEdit.trim()) {
      alert('Please create some content first by chatting with AI or typing in the text area.');
      return;
    }
    
    // 提示用户进入编辑模式
    if (window.confirm('This will take you to edit mode where you can finalize and save your story. Continue?')) {
      setEditContent(contentToEdit);
      setIsEditMode(true);
    }
  };

  const handleSaveFromEdit = async () => {
    if (!checkAuthWithRedirect()) return;
    
    if (!formData.title || !editContent) {
      setSaveStatus('Please fill in title and content');
      return;
    }

    // 添加确认对话框，确保用户真的想要保存
    if (!window.confirm('Are you sure you want to save this story to your diary?')) {
      return;
    }

    try {
      const currentDateTime = new Date().toISOString(); // 获取当前完整日期时间
      
      const response = await axios.post('http://localhost:5000/api/conversations', {
        title: formData.title,
        content: editContent,
        date: currentDateTime, // 使用当前完整时间
        messages: chatMessages
      }, {
        headers: getAuthHeaders()
      });

      if (response.data.id) {
        setConversationId(response.data.id);
        setSaveStatus('Story saved successfully! Redirecting in 3 seconds...');
        
        // 延长显示时间，让用户明确看到保存成功的消息
        setTimeout(() => {
          // Clear the form and exit edit mode
          setFormData({
            title: '',
            thoughts: ''
          });
          setPendingContent('');
          setEditContent('');
          setIsEditMode(false);
          onReturn();
        }, 3000); // 增加到3秒，让用户有时间看到消息
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
    if (!checkAuthWithRedirect()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);
    
    try {
      // Call our backend API
      const response = await axios.post('http://localhost:5000/api/chat', {
        messages: updatedMessages,
        conversationId: conversationId
      }, {
        headers: getAuthHeaders()
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
    // 将AI回复添加到待保存内容中
    setPendingContent(prev => prev ? `${prev}\n\n${messageContent}` : messageContent);
  };

  // 语音录制相关函数
  const handleMicrophoneRequest = async () => {
    if (!checkAuthWithRedirect()) return;
    
    if (isRecording) {
      // Stop recording
      try {
        const response = await axios.post('http://localhost:5000/api/asr/stop', {}, {
          headers: getAuthHeaders()
        });
        
        if (response.data.error) {
          setMicError(response.data.error);
        } else if (response.data.text) {
          setTranscribedText(response.data.text);
          
          // 将转录文本作为用户消息发送
          await handleVoiceMessage(response.data.text);
        }
      } catch (error) {
        console.error('Stop recording error:', error);
        handleApiError(error);
        setMicError('Failed to stop recording: ' + (error.message || 'Unknown error'));
      } finally {
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const response = await axios.post('http://localhost:5000/api/asr/start', {}, {
          headers: getAuthHeaders()
        });
        
        if (response.data.error) {
          setMicError(response.data.error);
        } else {
          setIsRecording(true);
          setTranscribedText('');
          setMicError('');
        }
      } catch (error) {
        console.error('Start recording error:', error);
        handleApiError(error);
        setMicError('Failed to start recording: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleVoiceMessage = async (transcribedText) => {
    if (!transcribedText.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: transcribedText };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    
    try {
      // Call our backend API
      const response = await axios.post('http://localhost:5000/api/chat', {
        messages: updatedMessages,
        conversationId: conversationId
      }, {
        headers: getAuthHeaders()
      });
      
      // Extract the assistant's response from the API response
      const aiMessage = response.data.choices[0].message;
      
      setChatMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error('Error sending voice message to AI:', error);
      handleApiError(error);
      // Add error message to chat
      setChatMessages([
        ...updatedMessages, 
        { 
          role: 'system', 
          content: `Sorry, there was an error processing your voice message: ${error.response?.data?.error || error.message}. Please try again.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="desktop-frame">
      {!isEditMode ? (
        <div className="story-container">
          
          
          <div className="form-and-chat">
            <div className="story-form">
              <div className="form-group">
                <div className="input-container">
                  <textarea 
                    name="thoughts" 
                    value={pendingContent || formData.thoughts} 
                    onChange={(e) => {
                      // 当用户手动编辑时，清除待保存内容，使用用户输入
                      if (pendingContent) {
                        setPendingContent('');
                      }
                      handleChange(e);
                    }}
                    placeholder="Type your Thoughts"
                    className="form-textarea"
                    rows={10}
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
              
              <div className="buttons-container">
                <button 
                  type="button" 
                  className="action-button"
                  onClick={handleExport}
                  disabled={!pendingContent && !formData.thoughts}
                >
                  Export
                </button>
              </div>
            </div>
            
            <div className="chat-container">
              <div className="chat-header">
                <h2 className="chat-title">Chat with AI</h2>
                <div className="chat-mode-toggle">
                  <button 
                    className={`mode-button ${chatMode === 'text' ? 'active' : ''}`}
                    onClick={() => setChatMode('text')}
                  >
                    💬 Text
                  </button>
                  <button 
                    className={`mode-button ${chatMode === 'voice' ? 'active' : ''}`}
                    onClick={() => setChatMode('voice')}
                  >
                    🎤 Voice
                  </button>
                </div>
              </div>
              
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
              
              {chatMode === 'text' ? (
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
              ) : (
                <div className="voice-controls">
                  <button 
                    className={`voice-button ${isRecording ? 'recording' : ''}`} 
                    onClick={handleMicrophoneRequest}
                    disabled={isLoading}
                  >
                    {isRecording ? (
                      <>
                        <span className="recording-indicator"></span>
                        Stop Recording
                      </>
                    ) : (
                      <>
                        Speak
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="story-container">
          <div className="story-header">
            <h2 className="story-title">Edit Story</h2>
          </div>
          
          <div className="edit-form">
            <div className="save-warning">
              ⚠️ <strong>Note:</strong> Clicking "Save" will permanently add this story to your diary.
            </div>
            
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
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your content here..."
                  className="form-textarea"
                  rows={15}
                />
              </div>
            </div>
            
            <div className="buttons-container">
              <button 
                type="button" 
                className="action-button secondary"
                onClick={() => setIsEditMode(false)}
              >
                Back
              </button>
              <button 
                type="button" 
                className="action-button"
                onClick={handleSaveFromEdit}
              >
                Save
              </button>
            </div>
            
            {saveStatus && (
              <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
                {saveStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteStory;