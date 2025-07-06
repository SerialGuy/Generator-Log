import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Activity,
  MapPin,
  Zap,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Power,
  Battery,
  Thermometer,
  Gauge
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const ClientDetailView = ({ client, zones, generators, users, onBack, onEdit, onDelete, onAddZone, onEditZone, onDeleteZone }) => {
  const clientZones = zones.filter(zone => zone.client_id === client.id);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4" />;
      case 'stopped': return <AlertCircle className="h-4 w-4" />;
      case 'maintenance': return <Clock className="h-4 w-4" />;
      case 'offline': return <Power className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {client.location}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => onAddZone(client)}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </button>
              <button
                onClick={() => onEdit(client, 'client')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Client Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Client Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <span className="text-gray-600 w-24">Status:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {client.contact_person && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-600 w-24">Contact:</span>
                  <span className="text-gray-900">{client.contact_person}</span>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{client.contact_email}</span>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{client.contact_phone}</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Created: {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {client.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">{client.description}</p>
              </div>
            )}
          </div>

          {/* Statistics Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-600" />
              Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Zones:</span>
                <span className="text-lg font-semibold text-blue-600">{clientZones.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Generators:</span>
                <span className="text-lg font-semibold text-green-600">
                  {generators.filter(g => clientZones.some(z => z.id === g.zone_id)).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Running:</span>
                <span className="text-lg font-semibold text-green-600">
                  {generators.filter(g => clientZones.some(z => z.id === g.zone_id) && g.status === 'running').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stopped:</span>
                <span className="text-lg font-semibold text-red-600">
                  {generators.filter(g => clientZones.some(z => z.id === g.zone_id) && g.status === 'stopped').length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => onAddZone(client)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Zone
              </button>
              <button
                onClick={() => onEdit(client, 'client')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </button>
              <button
                onClick={() => onDelete(client, 'client')}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Client
              </button>
            </div>
          </div>
        </div>

        {/* Zones and Generators */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Zones & Generators</h3>
          </div>
          <div className="p-6">
            {clientZones.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Zones Found</h3>
                <p className="text-gray-600 mb-4">This client doesn't have any zones assigned yet.</p>
                <button
                  onClick={() => onAddZone(client)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Zone
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {clientZones.map(zone => {
                  const zoneGenerators = generators.filter(g => g.zone_id === zone.id);
                  const zoneOperator = users.find(u => u.id === zone.assigned_operator_id);
                  
                  return (
                    <div key={zone.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Zone Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{zone.name}</h4>
                              <p className="text-sm text-gray-600 flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {zone.location || 'No location specified'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-600">
                                {zoneGenerators.length} generator{zoneGenerators.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-green-600">
                                {zoneGenerators.filter(g => g.status === 'running').length} running
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {zoneOperator && (
                              <span className="text-sm text-gray-600">
                                Operator: {zoneOperator.name}
                              </span>
                            )}
                            <button
                              onClick={() => onEditZone(zone)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit Zone"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteZone(zone)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete Zone"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {zone.description && (
                          <p className="text-sm text-gray-600 mt-2">{zone.description}</p>
                        )}
                      </div>

                      {/* Generators in Zone */}
                      <div className="p-6">
                        {zoneGenerators.length === 0 ? (
                          <div className="text-center py-8">
                            <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600">No generators assigned to this zone</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {zoneGenerators.map(generator => (
                              <div key={generator.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h5 className="font-semibold text-gray-900">{generator.name}</h5>
                                    <p className="text-sm text-gray-600">{generator.model || 'No model'}</p>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(generator.status)}`}>
                                    {getStatusIcon(generator.status)}
                                    <span className="ml-1 capitalize">{generator.status}</span>
                                  </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Power Output:</span>
                                    <span className="font-medium">{generator.power_output || 'N/A'} kW</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Fuel Level:</span>
                                    <span className="font-medium">{generator.fuel_level || 'N/A'}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Uptime:</span>
                                    <span className="font-medium">{formatUptime(generator.uptime)}</span>
                                  </div>
                                  {generator.temperature && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Temperature:</span>
                                      <span className="font-medium">{generator.temperature}°C</span>
                                    </div>
                                  )}
                                  {generator.last_maintenance && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Last Maintenance:</span>
                                      <span className="font-medium">{new Date(generator.last_maintenance).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>ID: {generator.id.substring(0, 8)}...</span>
                                    <span>Created: {new Date(generator.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [zones, setZones] = useState([]);
  const [generators, setGenerators] = useState([]);
  const [users, setUsers] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedClientForZone, setSelectedClientForZone] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    location: '',
    description: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    is_active: true
  });
  const [zoneForm, setZoneForm] = useState({
    name: '',
    location: '',
    client_id: '',
    assigned_operator_id: '',
    description: ''
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
      
      const [generatorsRes, zonesRes, usersRes, clientsRes] = await Promise.all([
        fetch('/api/generators', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/zones', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/clients', {
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

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setEditingItem(null);
    setClientForm({
      name: '',
      location: '',
      description: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      is_active: true
    });
    setShowClientModal(true);
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

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingItem ? `/api/clients/${editingItem.id}` : '/api/clients';
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clientForm)
      });

      if (response.ok) {
        await fetchData();
        setShowClientModal(false);
        setEditingItem(null);
        setClientForm({
          name: '',
          location: '',
          description: '',
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          is_active: true
        });
        toast.success(editingItem ? 'Client updated successfully!' : 'Client created successfully!');
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
      const url = editingItem ? `/api/zones/${editingItem.id}` : '/api/zones';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(zoneForm)
      });

      if (response.ok) {
        const zoneData = await response.json();
        
        // If creating a new zone and generators are selected, assign them
        if (!editingItem && zoneData.id) {
          const selectedGenerators = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
          
          if (selectedGenerators.length > 0) {
            const assignResponse = await fetch('/api/generators/assign', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                generator_ids: selectedGenerators,
                zone_id: zoneData.id
              })
            });
            
            if (assignResponse.ok) {
              toast.success(`${selectedGenerators.length} generator(s) assigned to zone!`);
            }
          }
        }

        await fetchData();
        setShowZoneModal(false);
        setShowAddZoneModal(false);
        setEditingItem(null);
        setSelectedClientForZone(null);
        setZoneForm({
          name: '',
          location: '',
          client_id: '',
          assigned_operator_id: '',
          description: ''
        });
        toast.success(editingItem ? 'Zone updated successfully!' : 'Zone created successfully!');
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
    if (type === 'zone') {
      setZoneForm({
        name: item.name,
        location: item.location || '',
        client_id: item.client_id || '',
        assigned_operator_id: item.assigned_operator_id || '',
        description: item.description || ''
      });
      setShowAddZoneModal(true);
    } else if (type === 'client') {
      setClientForm({
        name: item.name,
        location: item.location || '',
        description: item.description || '',
        contact_person: item.contact_person || '',
        contact_email: item.contact_email || '',
        contact_phone: item.contact_phone || '',
        is_active: item.is_active !== undefined ? item.is_active : true
      });
      setShowClientModal(true);
    }
  };

  const handleDelete = async (item, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${type}s/${item.id}`, {
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
          <p className="text-gray-600">Loading client dashboard...</p>
        </div>
      </div>
    );
  }

  // Show detailed client view if a client is selected
  if (selectedClient) {
    return (
      <ClientDetailView
        client={selectedClient}
        zones={zones}
        generators={generators}
        users={users}
        onBack={() => setSelectedClient(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddZone={handleAddZoneToClient}
        onEditZone={(zone) => {
          setEditingItem(zone);
          setZoneForm({
            name: zone.name,
            location: zone.location,
            client_id: zone.client_id,
            assigned_operator_id: zone.assigned_operator_id || '',
            description: zone.description || ''
          });
          setShowAddZoneModal(true);
        }}
        onDeleteZone={(zone) => handleDelete(zone, 'zone')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">Manage clients, zones, and generator assignments</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleAddClient}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Client</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Zones</p>
                <p className="text-2xl font-bold text-gray-900">{zones.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unassigned Generators</p>
                <p className="text-2xl font-bold text-gray-900">{generators.filter(g => !g.zone_id).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Clients & Their Zones</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => {
              const clientZones = zones.filter(z => z.client_id === client.id);
              const totalGenerators = clientZones.reduce((sum, zone) => {
                return sum + generators.filter(g => g.zone_id === zone.id).length;
              }, 0);
              const runningGenerators = clientZones.reduce((sum, zone) => {
                return sum + generators.filter(g => g.zone_id === zone.id && g.status === 'running').length;
              }, 0);
              
              return (
                <div 
                  key={client.id} 
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.location}</p>
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
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600">{zoneGenerators.length} generators</p>
                                    <p className="text-xs text-green-600">{zoneRunningGenerators} running</p>
                                  </div>
                                  <div className="flex space-x-1 ml-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(zone, 'zone');
                                      }}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      title="Edit Zone"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(zone, 'zone');
                                      }}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Delete Zone"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddZoneToClient(client);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Add Zone"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client, 'client');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client, 'client');
                        }}
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
      </div>

      {/* Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title={editingItem ? 'Edit Client' : 'Add Client'}
      >
        <form onSubmit={handleClientSubmit} className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800 font-medium">
                {editingItem ? 'Update client information' : 'Create a new client to manage their zones and generators'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter client name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={clientForm.location}
              onChange={(e) => setClientForm({...clientForm, location: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter client location"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={clientForm.description}
              onChange={(e) => setClientForm({...clientForm, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter client description (optional)"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
            <input
              type="text"
              value={clientForm.contact_person}
              onChange={(e) => setClientForm({...clientForm, contact_person: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter contact person name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input
              type="email"
              value={clientForm.contact_email}
              onChange={(e) => setClientForm({...clientForm, contact_email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter contact email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input
              type="tel"
              value={clientForm.contact_phone}
              onChange={(e) => setClientForm({...clientForm, contact_phone: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter contact phone"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={clientForm.is_active}
              onChange={(e) => setClientForm({...clientForm, is_active: e.target.checked})}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active Client
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowClientModal(false)}
              className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{editingItem ? 'Update Client' : 'Create Client'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Zone Modal */}
      <Modal
        isOpen={showAddZoneModal}
        onClose={() => setShowAddZoneModal(false)}
        title={editingItem ? 'Edit Zone' : `Add Zone to ${selectedClientForZone?.name || 'Client'}`}
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
              {users.filter(u => u.role === 'OPERATOR').map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
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
          
          {/* Show unassigned generators */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Generators to Assign</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {generators.filter(g => !g.zone_id).length === 0 ? (
                <p className="text-sm text-gray-500">No unassigned generators available</p>
              ) : (
                generators.filter(g => !g.zone_id).map(generator => (
                  <div key={generator.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`gen-${generator.id}`}
                        value={generator.id}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`gen-${generator.id}`} className="text-sm">
                        {generator.name} ({generator.kva} KVA)
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">{generator.status}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {generators.filter(g => !g.zone_id).length} unassigned generators available
            </p>
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
              {editingItem ? 'Update Zone' : 'Add Zone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 