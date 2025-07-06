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
  RefreshCw
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
        {change && (
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

      if (generatorsRes.ok) setGenerators(await generatorsRes.json());
      if (zonesRes.ok) setZones(await zonesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalGenerators: generators.length,
    totalZones: zones.length,
    totalUsers: users.length,
    totalLogs: logs.length,
    runningGenerators: generators.filter(g => g.status === 'running').length,
    offlineGenerators: generators.filter(g => g.status === 'offline').length,
    maintenanceGenerators: generators.filter(g => g.status === 'maintenance').length,
    faultGenerators: generators.filter(g => g.status === 'fault').length,
    activeOperators: users.filter(u => u.role === 'operator' && u.is_active).length,
    recentLogs: logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return logDate > yesterday;
    }).length
  };

  // Chart data
  const generatorStatusData = [
    { label: 'Running', value: stats.runningGenerators, color: '#10B981' },
    { label: 'Offline', value: stats.offlineGenerators, color: '#6B7280' },
    { label: 'Maintenance', value: stats.maintenanceGenerators, color: '#F59E0B' },
    { label: 'Fault', value: stats.faultGenerators, color: '#EF4444' }
  ];

  const generatorCapacityData = [
    { label: '65 KVA', value: generators.filter(g => g.kva === 65).length },
    { label: '125 KVA', value: generators.filter(g => g.kva === 125).length },
    { label: '250 KVA', value: generators.filter(g => g.kva === 250).length },
    { label: '320 KVA', value: generators.filter(g => g.kva === 320).length },
    { label: '500 KVA', value: generators.filter(g => g.kva === 500).length }
  ];

  const recentActivityData = logs
    .slice(0, 10)
    .map(log => ({
      label: log.generators?.name || 'Unknown',
      value: 1
    }));

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'fault': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const filteredGenerators = generators.filter(generator => {
    const matchesSearch = generator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getZoneName(generator.zone_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || generator.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getOperatorName = (operatorId) => {
    const operator = users.find(u => u.id === operatorId);
    return operator ? operator.name : 'Unassigned';
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
            change={5}
          />
          <StatCard
            title="Active Zones"
            value={stats.totalZones}
            icon={MapPin}
            color="green"
            change={2}
          />
          <StatCard
            title="Running Generators"
            value={stats.runningGenerators}
            icon={Activity}
            color="emerald"
            change={12}
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="purple"
            change={-1}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Add Generator</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Create Zone</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Add User</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
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
                { id: 'zones', label: 'Zones', icon: MapPin },
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
                          <button className="text-blue-600 hover:text-blue-800">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zones Tab */}
            {activeTab === 'zones' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map(zone => {
                  const zoneGenerators = generators.filter(g => g.zone_id === zone.id);
                  const runningGenerators = zoneGenerators.filter(g => g.status === 'running').length;
                  
                  return (
                    <div key={zone.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {zoneGenerators.length} Generators
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{zone.location || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Operator:</span>
                          <span className="font-medium">{getOperatorName(zone.assigned_operator_id)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Running:</span>
                          <span className="font-medium text-green-600">{runningGenerators}/{zoneGenerators.length}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Created: {new Date(zone.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                {logs.slice(0, 20).map(log => (
                  <div key={log.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className={`p-2 rounded-full ${getStatusColor(log.action)}`}>
                      {getStatusIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {log.generators?.name || 'Unknown Generator'} - {log.action}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getZoneName(log.generators?.zone_id)} • {log.operator_name || 'System'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 