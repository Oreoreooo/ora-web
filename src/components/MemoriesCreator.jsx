import React, { useState } from 'react';
import './MemoriesCreator.css';
import StoryPreference from './StoryPreference';

const MemoriesCreator = () => {
  const [showStoryPreference, setShowStoryPreference] = useState(false);

  const handleAddClick = () => {
    setShowStoryPreference(true);
  };
  
  const handleReturn = () => {
    setShowStoryPreference(false);
  };

  if (showStoryPreference) {
    return <StoryPreference onReturn={handleReturn} />;
  }

  return (
    <div className="desktop-frame">
      <div className="header-bar">
        <h1 className="title">Create your Memories</h1>
      </div>
      
      <div className="buttons-container">
        <button className="action-button" onClick={handleAddClick}>ADD</button>
      </div>
    </div>
  );
};

export default MemoriesCreator; 