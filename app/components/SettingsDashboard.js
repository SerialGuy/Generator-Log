'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Shield, 
  Users, 
  Activity, 
  Save, 
  Trash2,
  Eye,
  Edit,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsDashboard() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [editingSetting, setEditingSetting] = useState(null);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    type: 'string',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    if (user && user.role === 'administrator') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [settingsRes, auditRes] = await Promise.all([
        fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      const setting = settings[key];
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settingKey: key,
          settingValue: value,
          settingType: setting.type,
          description: setting.description,
          isPublic: setting.isPublic
        })
      });

      if (response.ok) {
        setSettings({
          ...settings,
          [key]: { ...setting, value }
        });
        setEditingSetting(null);
        toast.success('Setting updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleAddSetting = async (e) => {
    e.preventDefault();
    
    if (!newSetting.key || newSetting.value === '') {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settingKey: newSetting.key,
          settingValue: newSetting.value,
          settingType: newSetting.type,
          description: newSetting.description,
          isPublic: newSetting.isPublic
        })
      });

      if (response.ok) {
        setSettings({
          ...settings,
          [newSetting.key]: {
            value: newSetting.value,
            type: newSetting.type,
            description: newSetting.description,
            isPublic: newSetting.isPublic
          }
        });
        setShowAddSettingModal(false);
        setNewSetting({ key: '', value: '', type: 'string', description: '', isPublic: false });
        toast.success('Setting added successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add setting');
      }
    } catch (error) {
      console.error('Error adding setting:', error);
      toast.error('Failed to add setting');
    }
  };

  const handleDeleteSetting = async (key) => {
    if (!confirm('Are you sure you want to delete this setting?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/settings?key=${key}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const newSettings = { ...settings };
        delete newSettings[key];
        setSettings(newSettings);
        toast.success('Setting deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete setting');
      }
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error('Failed to delete setting');
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'INSERT': return 'text-green-600';
      case 'UPDATE': return 'text-blue-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (user?.role !== 'administrator') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Manage system configuration and view audit trails</p>
            </div>
            <button
              onClick={() => setShowAddSettingModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Setting
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Audit Trail
            </button>
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
            </div>
            <div className="p-6">
              {Object.keys(settings).length === 0 ? (
                <p className="text-center text-gray-500">No settings configured</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(settings).map(([key, setting]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{key}</h4>
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {setting.isPublic && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Public
                            </span>
                          )}
                          <button
                            onClick={() => setEditingSetting(key)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSetting(key)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {editingSetting === key ? (
                        <div className="mt-3">
                          {setting.type === 'boolean' ? (
                            <select
                              value={setting.value}
                              onChange={(e) => handleSaveSetting(key, e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : setting.type === 'number' ? (
                            <input
                              type="number"
                              value={setting.value}
                              onChange={(e) => handleSaveSetting(key, e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={setting.value}
                              onChange={(e) => handleSaveSetting(key, e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => setEditingSetting(null)}
                              className="text-sm text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => setEditingSetting(null)}
                              className="text-sm text-blue-600 hover:text-blue-900"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-900">
                            Value: <span className="font-normal">{setting.value}</span>
                          </p>
                          <p className="text-xs text-gray-500">Type: {setting.type}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Record ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user_id || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.table_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.record_id ? log.record_id.substring(0, 8) + '...' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => {
                            const details = {
                              old: log.old_values,
                              new: log.new_values
                            };
                            alert(JSON.stringify(details, null, 2));
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Setting Modal */}
      {showAddSettingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Setting</h3>
            </div>
            
            <form onSubmit={handleAddSetting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setting Key</label>
                <input
                  type="text"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({...newSetting, key: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="text"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({...newSetting, value: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newSetting.type}
                  onChange={(e) => setNewSetting({...newSetting, type: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newSetting.isPublic}
                  onChange={(e) => setNewSetting({...newSetting, isPublic: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Public setting (visible to all users)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSettingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 