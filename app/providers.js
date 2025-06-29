'use client';

import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}
        <Toaster position="top-right" />
      </SocketProvider>
    </AuthProvider>
  );
} 