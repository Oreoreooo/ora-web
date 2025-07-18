import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './components/Auth';
// import StoryPreference from './components/StoryPreference';
import WriteStory from './components/WriteStory';
// import SpeakToOra from './components/SpeakToOra';
import DiaryBrowser from './components/DiaryBrowser';
import Community from './components/Community';
import { isAuthenticated, checkAuthWithRedirect } from './utils/auth';
import './App.css';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (checkAuthWithRedirect()) {
      setShouldRender(true);
    }
  }, []);

  return shouldRender ? children : null;
};

// WriteStory 页面包装器
const WriteStoryPage = () => {
  const navigate = useNavigate();
  
  const handleReturn = () => {
    navigate('/diary');
  };

  return <WriteStory onReturn={handleReturn} />;
};

// Community 页面包装器
const CommunityPage = () => {
  const navigate = useNavigate();
  
  const handleReturn = () => {
    navigate('/');
  };

  return <Community onReturn={handleReturn} />;
};

// 首页组件
const HomePage = () => {
  const handleProtectedNavigation = (path) => {
    if (checkAuthWithRedirect()) {
      window.location.href = path;
    }
  };

  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>Welcome to Ora</h1>
        <p>Create your personal memory stories and share with the community</p>
        <div className="hero-buttons">
          <button onClick={() => handleProtectedNavigation('/memories')} className="primary-btn">
            Start Creating Memories
          </button>
          <button onClick={() => handleProtectedNavigation('/diary')} className="secondary-btn">
            View My Diary
          </button>
          <button onClick={() => handleProtectedNavigation('/community')} className="secondary-btn">
            📖 Community
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
          <Route path="/memories" element={
            <ProtectedRoute>
              <WriteStoryPage />
            </ProtectedRoute>
          } />
          <Route path="/diary" element={
            <ProtectedRoute>
              <DiaryBrowser />
            </ProtectedRoute>
          } />
          <Route path="/community" element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          } />
          {/* 重定向未知路由到首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 