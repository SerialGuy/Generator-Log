'use client';

import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { SettingsProvider } from './contexts/SettingsContext';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </SettingsProvider>
    </AuthProvider>
  );
} 