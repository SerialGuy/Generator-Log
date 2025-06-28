import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Navigation from './components/Navigation';
import './App.css';

// Create authentication context
export const AuthContext = React.createContext();
export const SocketContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      // Connect to socket when user is authenticated
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [user]);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <SocketContext.Provider value={socket}>
        <Router>
          <div className="App">
            <Toaster position="top-right" />
            {user && <Navigation />}
            <div className="container">
              <Routes>
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/" /> : <Login />} 
                />
                <Route 
                  path="/register" 
                  element={user ? <Navigate to="/" /> : <Register />} 
                />
                <Route 
                  path="/" 
                  element={
                    user ? (
                      user.role === 'administrator' ? (
                        <AdminDashboard />
                      ) : (
                        <Dashboard />
                      )
                    ) : (
                      <Navigate to="/login" />
                    )
                  } 
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </Router>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}

export default App; 