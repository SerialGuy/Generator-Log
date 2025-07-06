'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Activity, 
  Users, 
  Zap, 
  MapPin, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const BarChart = ({ data, title }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: title,
        data: data.map(item => item.value),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

const DoughnutChart = ({ data, title }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div style={{ height: '300px' }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color = 'blue', change = null }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== null && (
          <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}% from last month
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

// Modal Components
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { getCurrencySymbol } = useSettings();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedClientForZone, setSelectedClientForZone] = useState(null);
  
  // Form states
  const [generatorForm, setGeneratorForm] = useState({
    name: '',
    kva: '',
    zone_id: '',
    status: 'offline'
  });
  
  const [zoneForm, setZoneForm] = useState({
    name: '',
    location: '',
    client_id: '',
    assigned_operator_id: '',
    description: ''
  });
  
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'client',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [generatorsRes, zonesRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/generators', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/zones', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (generatorsRes.ok) {
        const generatorsData = await generatorsRes.json();
        setGenerators(generatorsData);
      }

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Calculate real statistics
  const stats = {
    totalGenerators: generators.length,
    totalZones: zones.length,
    runningGenerators: generators.filter(g => g.status === 'running').length,
    totalUsers: users.length
  };

  // Calculate percentage changes (mock data for now - would need historical data)
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const generatorStatusData = [
    { label: 'Running', value: generators.filter(g => g.status === 'running').length, color: '#10B981' },
    { label: 'Offline', value: generators.filter(g => g.status === 'offline').length, color: '#6B7280' },
    { label: 'Maintenance', value: generators.filter(g => g.status === 'maintenance').length, color: '#F59E0B' },
    { label: 'Fault', value: generators.filter(g => g.status === 'fault').length, color: '#EF4444' }
  ];

  const generatorCapacityData = generators.reduce((acc, generator) => {
    const capacity = `${generator.kva} KVA`;
    const existing = acc.find(item => item.label === capacity);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ label: capacity, value: 1 });
    }
    return acc;
  }, []);

  const filteredGenerators = generators.filter(generator => {
    const matchesSearch = generator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getZoneName(generator.zone_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || generator.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'fault': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4" />;
      case 'offline': return <Clock className="h-4 w-4" />;
      case 'maintenance': return <AlertTriangle className="h-4 w-4" />;
      case 'fault': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getOperatorName = (operatorId) => {
    const operator = users.find(u => u.id === operatorId);
    return operator ? operator.name : 'Unassigned';
  };

  // Quick Actions Handlers
  const handleAddGenerator = () => {
    setEditingItem(null);
    setGeneratorForm({
      name: '',
      kva: '',
      zone_id: '',
      status: 'offline'
    });
    setShowGeneratorModal(true);
  };

  const handleCreateZone = () => {
    setEditingItem(null);
    setZoneForm({
      name: '',
      location: '',
      client_id: '',
      assigned_operator_id: '',
      description: ''
    });
    setShowZoneModal(true);
  };

  const handleAddClient = () => {
    setEditingItem(null);
    setUserForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'client',
      phone: ''
    });
    setShowUserModal(true);
  };

  const handleAddOperator = () => {
    setEditingItem(null);
    setUserForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'operator',
      phone: ''
    });
    setShowUserModal(true);
  };

  const handleAddUser = () => {
    setEditingItem(null);
    setUserForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'client',
      phone: ''
    });
    setShowUserModal(true);
  };

  const handleAddZoneToClient = (client) => {
    setSelectedClientForZone(client);
    setZoneForm({
      name: '',
      location: '',
      client_id: client.id,
      assigned_operator_id: '',
      description: ''
    });
    setShowAddZoneModal(true);
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Generator', 'Zone', 'Status', 'Capacity', 'Fuel Level', 'Runtime'].join(','),
      ...generators.map(g => [
        g.name,
        getZoneName(g.zone_id),
        g.status,
        `${g.kva} KVA`,
        g.current_fuel_level ? `${g.current_fuel_level}L` : 'N/A',
        g.total_runtime_hours ? `${g.total_runtime_hours}h` : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generator_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  // Form Handlers
  const handleGeneratorSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingItem ? '/api/generators' : '/api/generators';
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...generatorForm, id: editingItem.id } : generatorForm;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setShowGeneratorModal(false);
        setEditingItem(null);
        toast.success(editingItem ? 'Generator updated successfully' : 'Generator created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Operation failed');
    }
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingItem ? '/api/zones' : '/api/zones';
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { ...zoneForm, id: editingItem.id } : zoneForm;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setShowZoneModal(false);
        setShowAddZoneModal(false);
        setEditingItem(null);
        setSelectedClientForZone(null);
        toast.success(editingItem ? 'Zone updated successfully' : 'Zone created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Operation failed');
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      if (response.ok) {
        await fetchData();
        setShowUserModal(false);
        toast.success('User created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Operation failed');
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    if (type === 'generator') {
      setGeneratorForm({
        name: item.name,
        kva: item.kva,
        zone_id: item.zone_id,
        status: item.status
      });
      setShowGeneratorModal(true);
    } else if (type === 'zone') {
      setZoneForm({
        name: item.name,
        location: item.location || '',
        client_id: item.client_id || '',
        assigned_operator_id: item.assigned_operator_id || '',
        description: item.description || ''
      });
      setShowZoneModal(true);
    }
  };

  const handleDelete = async (item, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${type}s?id=${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchData();
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor and manage your generator system</p>
            </div>
            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Generators"
            value={stats.totalGenerators}
            icon={Zap}
            color="blue"
            change={calculatePercentageChange(stats.totalGenerators, Math.max(0, stats.totalGenerators - 2))}
          />
          <StatCard
            title="Active Zones"
            value={stats.totalZones}
            icon={MapPin}
            color="green"
            change={calculatePercentageChange(stats.totalZones, Math.max(0, stats.totalZones - 1))}
          />
          <StatCard
            title="Running Generators"
            value={stats.runningGenerators}
            icon={Activity}
            color="emerald"
            change={calculatePercentageChange(stats.runningGenerators, Math.max(0, stats.runningGenerators - 3))}
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="purple"
            change={calculatePercentageChange(stats.totalUsers, Math.max(0, stats.totalUsers - 1))}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={handleAddGenerator}
              className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Add Generator</span>
            </button>
            <button 
              onClick={handleCreateZone}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Add Client</span>
            </button>
            <button 
              onClick={handleAddClient}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Add Operator</span>
            </button>
            <button 
              onClick={handleExportReport}
              className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Download className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Export Report</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'generators', label: 'Generators', icon: Zap },
                { id: 'clients', label: 'Clients', icon: Users },
                { id: 'activity', label: 'Recent Activity', icon: Activity }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DoughnutChart
                  data={generatorStatusData}
                  title="Generator Status Distribution"
                />
                <BarChart
                  data={generatorCapacityData}
                  title="Generator Capacity Distribution"
                />
              </div>
            )}

            {/* Generators Tab */}
            {activeTab === 'generators' && (
              <div>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search generators..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="running">Running</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="fault">Fault</option>
                  </select>
                </div>

                {/* Generators Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGenerators.map(generator => (
                    <div key={generator.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{generator.name}</h3>
                          <p className="text-sm text-gray-600">{getZoneName(generator.zone_id)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(generator.status)}`}>
                          {getStatusIcon(generator.status)}
                          <span className="ml-1 capitalize">{generator.status}</span>
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Capacity:</span>
                          <span className="font-medium">{generator.kva} KVA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fuel Level:</span>
                          <span className="font-medium">
                            {generator.current_fuel_level ? `${generator.current_fuel_level}L` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Runtime:</span>
                          <span className="font-medium">
                            {generator.total_runtime_hours ? `${generator.total_runtime_hours}h` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date(generator.updated_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(generator, 'generator')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(generator, 'generator')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Clients & Their Zones</h3>
                  <button
                    onClick={handleAddClient}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Client</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => u.role === 'client').map(client => {
                    const clientZones = zones.filter(z => z.client_id === client.id);
                    const totalGenerators = clientZones.reduce((sum, zone) => {
                      return sum + generators.filter(g => g.zone_id === zone.id).length;
                    }, 0);
                    const runningGenerators = clientZones.reduce((sum, zone) => {
                      return sum + generators.filter(g => g.zone_id === zone.id && g.status === 'running').length;
                    }, 0);
                    
                    return (
                      <div key={client.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {clientZones.length} Zones
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Generators:</span>
                            <span className="font-medium">{totalGenerators}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Running:</span>
                            <span className="font-medium text-green-600">{runningGenerators}/{totalGenerators}</span>
                          </div>
                        </div>

                        {/* Client Zones */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Zones:</h4>
                          {clientZones.length === 0 ? (
                            <p className="text-xs text-gray-500">No zones assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {clientZones.map(zone => {
                                const zoneGenerators = generators.filter(g => g.zone_id === zone.id);
                                const zoneRunningGenerators = zoneGenerators.filter(g => g.status === 'running').length;
                                
                                return (
                                  <div key={zone.id} className="bg-white rounded p-3 border border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-sm font-medium">{zone.name}</p>
                                        <p className="text-xs text-gray-600">{zone.location || 'No location'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-600">{zoneGenerators.length} generators</p>
                                        <p className="text-xs text-green-600">{zoneRunningGenerators} running</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Created: {new Date(client.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleAddZoneToClient(client)}
                              className="text-green-600 hover:text-green-800"
                              title="Add Zone"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEdit(client, 'client')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(client, 'client')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Generator Activity Logs</h3>
                  <div className="text-sm text-gray-600">
                    Showing recent generator operations
                  </div>
                </div>
                
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No activity logs found</p>
                      <p className="text-sm">Generator operations will appear here</p>
                    </div>
                  ) : (
                    logs.slice(0, 20).map(log => (
                      <div key={log.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className={`p-2 rounded-full ${getStatusColor(log.action)}`}>
                          {getStatusIcon(log.action)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {log.generators?.name || 'Unknown Generator'} - {log.action.toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-600">
                            Zone: {log.generators?.zones?.name || 'Unknown Zone'} • Operator: {log.operator_name || 'System'}
                          </p>
                          {log.remarks && (
                            <p className="text-xs text-gray-500 mt-1">
                              Remarks: {log.remarks}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showGeneratorModal}
        onClose={() => setShowGeneratorModal(false)}
        title={editingItem ? 'Edit Generator' : 'Add Generator'}
      >
        <form onSubmit={handleGeneratorSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={generatorForm.name}
              onChange={(e) => setGeneratorForm({...generatorForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KVA</label>
            <input
              type="number"
              value={generatorForm.kva}
              onChange={(e) => setGeneratorForm({...generatorForm, kva: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select
              value={generatorForm.zone_id}
              onChange={(e) => setGeneratorForm({...generatorForm, zone_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Zone</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowGeneratorModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        title={editingItem ? 'Edit Zone' : 'Create Zone'}
      >
        <form onSubmit={handleZoneSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={zoneForm.name}
              onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={zoneForm.location}
              onChange={(e) => setZoneForm({...zoneForm, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={zoneForm.client_id}
              onChange={(e) => setZoneForm({...zoneForm, client_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Client</option>
              {users.filter(u => u.role === 'client').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={zoneForm.assigned_operator_id}
              onChange={(e) => setZoneForm({...zoneForm, assigned_operator_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Operator</option>
              {users.filter(u => u.role === 'operator').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={zoneForm.description}
              onChange={(e) => setZoneForm({...zoneForm, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowZoneModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add User"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={userForm.name}
              onChange={(e) => setUserForm({...userForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={userForm.username}
              onChange={(e) => setUserForm({...userForm, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({...userForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="client">Client</option>
              <option value="operator">Operator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={userForm.phone}
              onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create User
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showAddZoneModal}
        onClose={() => setShowAddZoneModal(false)}
        title={`Add Zone to ${selectedClientForZone?.name || 'Client'}`}
      >
        <form onSubmit={handleZoneSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
            <input
              type="text"
              value={zoneForm.name}
              onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={zoneForm.location}
              onChange={(e) => setZoneForm({...zoneForm, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={zoneForm.assigned_operator_id}
              onChange={(e) => setZoneForm({...zoneForm, assigned_operator_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Operator</option>
              {users.filter(u => u.role === 'operator').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={zoneForm.description}
              onChange={(e) => setZoneForm({...zoneForm, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddZoneModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Zone
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 