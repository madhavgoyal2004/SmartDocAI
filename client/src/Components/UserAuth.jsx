import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import '../App.css';

const UserAuth = ({ onUserAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Wrapper for login callback
  const handleLogin = (user) => {
    onUserAuth(user);
  };
  // Wrapper for signup callback
  const handleSignup = (user) => {
    onUserAuth(user);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        {isLogin ? (
          <div>
            <Login onUserLogin={handleLogin} />
            <div className="toggle-auth">
              Don't have an account?&nbsp;{' '}
              <span onClick={() => { setIsLogin(false); setError(''); }} >
                Sign Up
              </span>
            </div>
          </div>
        ) : (
          <div>
            <Signup onUserSignup={handleSignup} />
            <p className="toggle-auth">
              Already have an account?&nbsp;{' '}
              <span onClick={() => { setIsLogin(true); setError(''); }} >
                Login
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAuth;