'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/settings?publicOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const settingsData = await response.json();
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settingKey: key,
          settingValue: value,
          settingType: settings[key]?.type || 'string',
          description: settings[key]?.description || '',
          isPublic: settings[key]?.isPublic || false
        })
      });

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          [key]: { ...prev[key], value }
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  const getCurrencySymbol = () => {
    const currency = settings.currency?.value || 'USD';
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      case 'INR': return '₹';
      default: return '$';
    }
  };

  const getCurrencyName = () => {
    return settings.currency?.value || 'USD';
  };

  const getDefaultFuelPrice = () => {
    return parseFloat(settings.default_fuel_price?.value || '1.50');
  };

  const value = {
    settings,
    loading,
    fetchSettings,
    updateSetting,
    getCurrencySymbol,
    getCurrencyName,
    getDefaultFuelPrice
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}; 