import React, { useState } from 'react';
import './StoryPreference.css';
import SpeakToOra from './SpeakToOra';
import WriteStory from '../components/WriteStory';

const StoryPreference = ({ onReturn }) => {
  const [showSpeakToOra, setShowSpeakToOra] = useState(false);
  const [showWriteStory, setShowWriteStory] = useState(false);

  const handleSpeakClick = () => {
    setShowSpeakToOra(true);
  };

  const handleWriteClick = () => {
    setShowWriteStory(true);
  };

  const handleSpeakReturn = () => {
    setShowSpeakToOra(false);
  };

  const handleWriteReturn = () => {
    setShowWriteStory(false);
  };

  if (showSpeakToOra) {
    return <SpeakToOra onReturn={handleSpeakReturn} />;
  }

  if (showWriteStory) {
    return <WriteStory onReturn={handleWriteReturn} />;
  }

  return (
    <div className="desktop-frame">
      <button className="return-button" onClick={onReturn}>
        ← Return
      </button>

      
      <div className="icons-container">
        <div className="robot-icon">
          <img src="/images/robot.svg" alt="Robot Icon" />
        </div>
        
        <div className="question-icon">
          <img src="/images/question_mark.svg" alt="Question Mark" />
        </div>
      </div>
      
      <div className="buttons-container">
        <button className="action-button" onClick={handleWriteClick}>I prefer to type my stories</button>
        <button className="action-button" onClick={handleSpeakClick}>Speak to Ora</button>
      </div>
    </div>
  );
};

export default StoryPreference; 