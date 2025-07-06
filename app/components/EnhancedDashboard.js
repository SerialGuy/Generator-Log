'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';
import { 
  Fuel, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  FileText, 
  Plus,
  Camera,
  Upload,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  PointElement,
  LineElement,
  ArcElement
);

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState(null);
  const [logForm, setLogForm] = useState({
    action: 'start',
    runtime_hours: '',
    fuel_consumed_liters: '',
    fuel_added_liters: '',
    fuel_level_before: '',
    fuel_level_after: '',
    remarks: '',
    fault_description: '',
    maintenance_actions: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalGenerators: 0,
    runningGenerators: 0,
    totalRuntime: 0,
    totalFuelConsumed: 0,
    pendingMaintenance: 0
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchNotifications();
      // Poll for updates every 30 seconds
      const interval = setInterval(() => {
        fetchData();
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all data in parallel
      const [generatorsRes, zonesRes, logsRes] = await Promise.all([
        fetch('/api/generators', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/zones', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (generatorsRes.ok) {
        const generatorsData = await generatorsRes.json();
        setGenerators(generatorsData);
        calculateStats(generatorsData, logs);
      }

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
        calculateStats(generators, logsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications?isRead=false&limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const notificationsData = await response.json();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const calculateStats = (generatorsData, logsData) => {
    const totalGenerators = generatorsData.length;
    const runningGenerators = generatorsData.filter(g => g.status === 'running').length;
    const totalRuntime = logsData.reduce((sum, log) => sum + (log.runtime_hours || 0), 0);
    const totalFuelConsumed = logsData.reduce((sum, log) => sum + (log.fuel_consumed_liters || 0), 0);
    const pendingMaintenance = generatorsData.filter(g => 
      g.next_maintenance_date && new Date(g.next_maintenance_date) <= new Date()
    ).length;

    setStats({
      totalGenerators,
      runningGenerators,
      totalRuntime,
      totalFuelConsumed,
      pendingMaintenance
    });
  };

  const handleGeneratorAction = async (generatorId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/generators/${generatorId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchData();
        toast.success(`Generator ${action} successful`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Action failed');
    }
  };

  const openLogModal = (generator) => {
    setSelectedGenerator(generator);
    setLogForm({
      action: 'start',
      runtime_hours: '',
      fuel_consumed_liters: '',
      fuel_added_liters: '',
      fuel_level_before: generator.current_fuel_level || '',
      fuel_level_after: '',
      remarks: '',
      fault_description: '',
      maintenance_actions: ''
    });
    setAttachments([]);
    setShowLogModal(true);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          generator_id: selectedGenerator.id,
          ...logForm,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      });

      if (response.ok) {
        setShowLogModal(false);
        fetchData();
        toast.success('Log entry created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create log');
      }
    } catch (error) {
      console.error('Error creating log:', error);
      toast.error('Failed to create log');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      data: URL.createObjectURL(file)
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isRead: true })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  // Chart data
  const runtimeChartData = {
    labels: ['Running', 'Offline', 'Maintenance', 'Fault'],
    datasets: [{
      label: 'Generators',
      data: [
        generators.filter(g => g.status === 'running').length,
        generators.filter(g => g.status === 'offline').length,
        generators.filter(g => g.status === 'maintenance').length,
        generators.filter(g => g.status === 'fault').length
      ],
      backgroundColor: ['#10B981', '#6B7280', '#F59E0B', '#EF4444']
    }]
  };

  const fuelChartData = {
    labels: logs.slice(0, 10).map(log => new Date(log.timestamp).toLocaleDateString()),
    datasets: [{
      label: 'Fuel Consumed (L)',
      data: logs.slice(0, 10).map(log => log.fuel_consumed_liters || 0),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1
    }]
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Enhanced Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 text-gray-600 hover:text-gray-900 relative">
                  <AlertTriangle size={24} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fuel className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Generators</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalGenerators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.runningGenerators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Runtime</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRuntime.toFixed(1)}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fuel Used</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFuelConsumed.toFixed(1)}L</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Wrench className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingMaintenance}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generator Status Distribution</h3>
            <div className="h-64">
              <PieChart data={runtimeChartData} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Consumption Trend</h3>
            <div className="h-64">
              <LineChart data={fuelChartData} />
            </div>
          </div>
        </div>

        {/* Generators Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Your Generators</h3>
          </div>
          <div className="p-6">
            {generators.length === 0 ? (
              <p className="text-center text-gray-500">No generators assigned to your zones.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generators.map(generator => (
                  <div key={generator.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{generator.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        generator.status === 'running' ? 'bg-green-100 text-green-800' :
                        generator.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        generator.status === 'fault' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {generator.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">Zone: {getZoneName(generator.zone_id)}</p>
                    <p className="text-sm text-gray-600 mb-2">KVA: {generator.kva}</p>
                    <p className="text-sm text-gray-600 mb-2">Fuel Level: {generator.current_fuel_level || 0}L</p>
                    <p className="text-sm text-gray-600 mb-4">Runtime: {generator.total_runtime_hours || 0}h</p>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openLogModal(generator)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Log
                      </button>
                      
                      {generator.status === 'offline' ? (
                        <button
                          onClick={() => handleGeneratorAction(generator.id, 'start')}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGeneratorAction(generator.id, 'stop')}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Log Entry - {selectedGenerator?.name}
              </h3>
            </div>
            
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={logForm.action}
                    onChange={(e) => setLogForm({...logForm, action: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="start">Start</option>
                    <option value="stop">Stop</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="fault">Fault</option>
                    <option value="fuel_refill">Fuel Refill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Runtime Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logForm.runtime_hours}
                    onChange={(e) => setLogForm({...logForm, runtime_hours: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Consumed (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logForm.fuel_consumed_liters}
                    onChange={(e) => setLogForm({...logForm, fuel_consumed_liters: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Added (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logForm.fuel_added_liters}
                    onChange={(e) => setLogForm({...logForm, fuel_added_liters: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level Before</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logForm.fuel_level_before}
                    onChange={(e) => setLogForm({...logForm, fuel_level_before: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level After</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logForm.fuel_level_after}
                    onChange={(e) => setLogForm({...logForm, fuel_level_after: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {logForm.action === 'fault' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fault Description</label>
                  <textarea
                    value={logForm.fault_description}
                    onChange={(e) => setLogForm({...logForm, fault_description: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the fault..."
                  />
                </div>
              )}

              {logForm.action === 'maintenance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Actions</label>
                  <textarea
                    value={logForm.maintenance_actions}
                    onChange={(e) => setLogForm({...logForm, maintenance_actions: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe maintenance actions..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={logForm.remarks}
                  onChange={(e) => setLogForm({...logForm, remarks: e.target.value})}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional remarks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </button>
                
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border z-40">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Notifications</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.map(notification => (
              <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900">{notification.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => markNotificationRead(notification.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 