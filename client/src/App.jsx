import React, { useState, useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ChatInterface from './Components/ChatInterface';
import UserAuth from './Components/userAuth';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const routerRef = useRef();

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleUserAuth = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    routerRef.current.navigate('/chat');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    routerRef.current.navigate('/');
  };

  const router = createBrowserRouter([
    {
      path: '/',
      element: <UserAuth onUserAuth={handleUserAuth} />,
    },
    {
      path: '/chat',
      element: currentUser ? (
        <ChatInterface user={currentUser} onLogout={handleLogout} />
      ) : (
        <Navigate to="/" />
      ),
    },
    {
      path: '*',
      element: <Navigate to="/" />,
    },
  ]);

  routerRef.current = router;

  if (loading) {
    return <div className="App">Loading...</div>;
  }

  return (
    <div className="App">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;