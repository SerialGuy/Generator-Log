'use client';

import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import BillingDashboard from './components/BillingDashboard';
import SettingsDashboard from './components/SettingsDashboard';
import UserManagement from './components/UserManagement';
import AuditLogs from './components/AuditLogs';
import Navigation from './components/Navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('dashboard');

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

  const renderContent = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SettingsDashboard />;
      case 'audit':
        return <AuditLogs />;
      case 'billing':
        return <BillingDashboard />;
      case 'dashboard':
      default:
        if (user.role === 'administrator') {
          return <AdminDashboard />;
        } else if (user.role === 'commercial' || user.role === 'client') {
          return <BillingDashboard />;
        } else {
          return <EnhancedDashboard />;
        }
    }
  };

  return (
    <div className="App">
      <Navigation onViewChange={setCurrentView} currentView={currentView} />
      <div className="container">
        {renderContent()}
      </div>
    </div>
  );
} 