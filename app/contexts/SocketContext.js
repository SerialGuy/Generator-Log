'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    return { socket: null, connected: false };
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // For Vercel deployment, we'll use polling instead of WebSocket
    // This is a simplified approach that works with serverless functions
    const interval = setInterval(() => {
      // Poll for updates every 5 seconds
      // In a real implementation, you might want to use Server-Sent Events or WebSockets
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const value = {
    socket,
    connected,
    emit: (event, data) => {
      // For now, we'll handle real-time updates through polling
      console.log('Emit:', event, data);
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 