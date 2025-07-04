import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MemoriesCreator from './components/MemoriesCreator';
import Auth from './components/Auth';
import StoryPreference from './components/StoryPreference';
import WriteStory from './components/WriteStory';
import SpeakToOra from './components/SpeakToOra';
import './App.css';

// 首页组件
const HomePage = () => {
  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>Welcome to Ora</h1>
        <p>Create your personal memory stories</p>
        <div className="hero-buttons">
          <button onClick={() => window.location.href = '/memories'} className="primary-btn">
            Start Creating Memories
          </button>
          <button onClick={() => window.location.href = '/stories'} className="secondary-btn">
            Story Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

// 登录页面组件
const LoginPage = () => {
  return <Auth mode="login" />;
};

// 注册页面组件
const RegisterPage = () => {
  return <Auth mode="register" />;
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/memories" element={<MemoriesCreator />} />
          <Route path="/stories" element={<StoryPreference />} />
          <Route path="/write" element={<WriteStory />} />
          <Route path="/speak" element={<SpeakToOra />} />
          {/* 重定向未知路由到首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 