'use client';

import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  );
} 