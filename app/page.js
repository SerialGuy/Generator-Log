'use client';

import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import BillingDashboard from './components/BillingDashboard';
import SettingsDashboard from './components/SettingsDashboard';
import Navigation from './components/Navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="App">
      <Navigation />
      <div className="container">
        {user.role === 'administrator' ? (
          <AdminDashboard />
        ) : user.role === 'commercial' ? (
          <BillingDashboard />
        ) : user.role === 'client' ? (
          <BillingDashboard />
        ) : (
          <EnhancedDashboard />
        )}
      </div>
    </div>
  );
} 