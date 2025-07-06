'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  Settings, 
  DollarSign, 
  Activity, 
  Users, 
  LogOut,
  Bell
} from 'lucide-react';

const Navigation = ({ onViewChange, currentView }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'administrator': return 'Administrator';
      case 'operator': return 'Technician';
      case 'commercial': return 'Commercial';
      case 'client': return 'Client';
      default: return role;
    }
  };

  const getDashboardName = (role) => {
    switch (role) {
      case 'administrator': return 'Admin Dashboard';
      case 'operator': return 'Technician Dashboard';
      case 'commercial': return 'Billing Dashboard';
      case 'client': return 'Client Portal';
      default: return 'Dashboard';
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Generator Log System</h2>
              <p className="text-sm text-gray-600">
                {getDashboardName(user.role)}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {/* Dashboard button */}
              <button 
                onClick={() => onViewChange('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'dashboard' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>

              {/* Role-specific navigation items */}
              {user.role === 'administrator' && (
                <>
                  <button 
                    onClick={() => onViewChange('users')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'users' 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="h-4 w-4 inline mr-2" />
                    Users
                  </button>
                  <button 
                    onClick={() => onViewChange('settings')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'settings' 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                  </button>
                  <button 
                    onClick={() => onViewChange('audit')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'audit' 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Activity className="h-4 w-4 inline mr-2" />
                    Audit
                  </button>
                </>
              )}
              
              {(user.role === 'administrator' || user.role === 'commercial') && (
                <button 
                  onClick={() => onViewChange('billing')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'billing' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Billing
                </button>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-600">
                      {user.username} • {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <LogOut className="h-4 w-4 inline mr-1" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {/* Dashboard button */}
            <button 
              onClick={() => {
                onViewChange('dashboard');
                setIsMenuOpen(false);
              }}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                currentView === 'dashboard' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>

            {user.role === 'administrator' && (
              <>
                <button 
                  onClick={() => {
                    onViewChange('users');
                    setIsMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    currentView === 'users' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Users
                </button>
                <button 
                  onClick={() => {
                    onViewChange('settings');
                    setIsMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    currentView === 'settings' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Settings
                </button>
                <button 
                  onClick={() => {
                    onViewChange('audit');
                    setIsMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    currentView === 'audit' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-2" />
                  Audit
                </button>
              </>
            )}
            
            {(user.role === 'administrator' || user.role === 'commercial') && (
              <button 
                onClick={() => {
                  onViewChange('billing');
                  setIsMenuOpen(false);
                }}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  currentView === 'billing' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Billing
              </button>
            )}
            
            <div className="border-t border-gray-200 pt-4">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-600">
                  {user.username} • {getRoleDisplayName(user.role)}
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation; 