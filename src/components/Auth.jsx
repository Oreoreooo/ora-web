import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    captcha: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaSent, setCaptchaSent] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSendCaptcha = async () => {
    if (!formData.email) {
      setError('Please enter your email first');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/auth/captcha/email?email=${formData.email}`);
      if (response.data.code === 200) {
        setCaptchaSent(true);
        setError('');
        alert('Verification code sent to your email!');
      }
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      
      if (isLogin) {
        // Login request
        response = await axios.post('http://localhost:5000/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
      } else {
        // Register request
        response = await axios.post('http://localhost:5000/api/auth/register', {
          email: formData.email,
          password: formData.password,
          username: formData.username,
          captcha: formData.captcha
        });
      }

      if (response.data.success) {
        if (isLogin) {
          // Store token and user info
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          onAuthSuccess(response.data.token);
        } else {
          // Registration successful, switch to login
          setIsLogin(true);
          setFormData({ email: formData.email, password: '', username: '', captcha: '' });
          alert('Registration successful! Please login.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group captcha-group">
                <input
                  type="text"
                  name="captcha"
                  placeholder="Verification Code"
                  value={formData.captcha}
                  onChange={handleInputChange}
                  required
                />
                <button 
                  type="button" 
                  onClick={handleSendCaptcha}
                  disabled={loading || !formData.email}
                  className="captcha-btn"
                >
                  {captchaSent ? 'Resend' : 'Send Code'}
                </button>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ email: '', password: '', username: '', captcha: '' });
                setCaptchaSent(false);
              }}
              className="switch-btn"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
