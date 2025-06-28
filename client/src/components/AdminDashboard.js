import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { AuthContext, SocketContext } from '../App';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingGenerator, setEditingGenerator] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', location: '' });
  const [generatorForm, setGeneratorForm] = useState({ name: '', zoneId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('generatorUpdate', (data) => {
        setGenerators(prev => 
          prev.map(gen => 
            gen.id === data.generator.id ? data.generator : gen
          )
        );
        setLogs(prev => [data.log, ...prev]);
        toast.success(`Generator ${data.generator.name} ${data.log.action}ed by ${data.log.operatorName}`);
      });

      return () => {
        socket.off('generatorUpdate');
      };
    }
  }, [socket]);

  const fetchData = async () => {
    try {
      const [generatorsRes, zonesRes, usersRes, logsRes] = await Promise.all([
        axios.get('/api/generators', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/zones', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/logs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setGenerators(generatorsRes.data);
      setZones(zonesRes.data);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOperator = async (zoneId) => {
    if (!selectedOperator) {
      toast.error('Please select an operator');
      return;
    }

    try {
      await axios.post(`/api/zones/${zoneId}/assign-operator`, 
        { operatorId: selectedOperator },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success('Operator assigned successfully');
      fetchData();
      setSelectedOperator('');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to assign operator';
      toast.error(message);
    }
  };

  const handleCreateZone = async () => {
    try {
      await axios.post('/api/zones', zoneForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Zone created successfully');
      setShowZoneModal(false);
      setZoneForm({ name: '', location: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create zone');
    }
  };

  const handleUpdateZone = async () => {
    try {
      await axios.put(`/api/zones/${editingZone.id}`, zoneForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Zone updated successfully');
      setShowZoneModal(false);
      setEditingZone(null);
      setZoneForm({ name: '', location: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update zone');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    
    try {
      await axios.delete(`/api/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Zone deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete zone');
    }
  };

  const handleCreateGenerator = async () => {
    try {
      await axios.post('/api/generators', generatorForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Generator created successfully');
      setShowGeneratorModal(false);
      setGeneratorForm({ name: '', zoneId: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create generator');
    }
  };

  const handleUpdateGenerator = async () => {
    try {
      await axios.put(`/api/generators/${editingGenerator.id}`, generatorForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Generator updated successfully');
      setShowGeneratorModal(false);
      setEditingGenerator(null);
      setGeneratorForm({ name: '', zoneId: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update generator');
    }
  };

  const handleDeleteGenerator = async (generatorId) => {
    if (!window.confirm('Are you sure you want to delete this generator?')) return;
    
    try {
      await axios.delete(`/api/generators/${generatorId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Generator deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete generator');
    }
  };

  const openZoneModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ name: zone.name, location: zone.location });
    } else {
      setEditingZone(null);
      setZoneForm({ name: '', location: '' });
    }
    setShowZoneModal(true);
  };

  const openGeneratorModal = (generator = null) => {
    if (generator) {
      setEditingGenerator(generator);
      setGeneratorForm({ name: generator.name, zoneId: generator.zoneId });
    } else {
      setEditingGenerator(null);
      setGeneratorForm({ name: '', zoneId: '' });
    }
    setShowGeneratorModal(true);
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getOperatorName = (operatorId) => {
    const operator = users.find(u => u.id === operatorId);
    return operator ? operator.name : 'Unassigned';
  };

  const getZoneLogs = (zoneId) => {
    const zoneGenerators = generators.filter(g => g.zoneId === zoneId);
    return logs.filter(log => zoneGenerators.some(g => g.id === log.generatorId));
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  const runningGenerators = generators.filter(g => g.status === 'running');
  const stoppedGenerators = generators.filter(g => g.status === 'offline');
  const operators = users.filter(u => u.role === 'operator');

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <h1>Administrator Dashboard</h1>
        <p>Real-time monitoring and management of all generators and zones.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          Zone Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'generators' ? 'active' : ''}`}
          onClick={() => setActiveTab('generators')}
        >
          Generator Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setActiveTab('operators')}
        >
          Operator Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Logs
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{generators.length}</h3>
              <p>Total Generators</p>
            </div>
            <div className="stat-card">
              <h3>{runningGenerators.length}</h3>
              <p>Currently Running</p>
            </div>
            <div className="stat-card">
              <h3>{zones.length}</h3>
              <p>Total Zones</p>
            </div>
            <div className="stat-card">
              <h3>{operators.length}</h3>
              <p>Active Operators</p>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ marginBottom: '20px', color: '#28a745' }}>🟢 Running Generators</h3>
              {runningGenerators.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>No generators currently running</p>
              ) : (
                <div className="grid grid-2">
                  {runningGenerators.map(generator => (
                    <div key={generator.id} className="generator-card running">
                      <div className="generator-header">
                        <div>
                          <div className="generator-name">{generator.name}</div>
                          <div className="generator-zone">Zone: {getZoneName(generator.zoneId)}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Operator: {getOperatorName(generator.lastOperator)}
                          </div>
                        </div>
                        <span className="status-badge status-running">Running</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '20px', color: '#dc3545' }}>🔴 Stopped Generators</h3>
              {stoppedGenerators.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>All generators are running</p>
              ) : (
                <div className="grid grid-2">
                  {stoppedGenerators.map(generator => (
                    <div key={generator.id} className="generator-card stopped">
                      <div className="generator-header">
                        <div>
                          <div className="generator-name">{generator.name}</div>
                          <div className="generator-zone">Zone: {getZoneName(generator.zoneId)}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Last Operator: {getOperatorName(generator.lastOperator)}
                          </div>
                        </div>
                        <span className="status-badge status-offline">Offline</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Zone Management Tab */}
      {activeTab === 'zones' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3>Zone Management</h3>
            <button className="btn btn-primary" onClick={() => openZoneModal()}>
              + Add New Zone
            </button>
          </div>
          
          <div className="grid grid-2">
            {zones.map(zone => (
              <div key={zone.id} className="zone-card">
                <div className="zone-header">
                  <div>
                    <h4>{zone.name}</h4>
                    <p>Location: {zone.location}</p>
                    <p>Operator: {getOperatorName(zone.assignedOperator)}</p>
                    <p>Generators: {generators.filter(g => g.zoneId === zone.id).length}</p>
                  </div>
                  <div className="zone-actions">
                    <select
                      className="form-control"
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      style={{ marginBottom: '10px' }}
                    >
                      <option value="">Select Operator</option>
                      {operators.map(operator => (
                        <option key={operator.id} value={operator.id}>
                          {operator.name}
                        </option>
                      ))}
                    </select>
                    <div className="btn-group">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAssignOperator(zone.id)}
                        disabled={!selectedOperator}
                      >
                        Assign
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openZoneModal(zone)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generator Management Tab */}
      {activeTab === 'generators' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3>Generator Management</h3>
            <button className="btn btn-primary" onClick={() => openGeneratorModal()}>
              + Add New Generator
            </button>
          </div>
          
          <div className="grid grid-2">
            {generators.map(generator => (
              <div key={generator.id} className="generator-card">
                <div className="generator-header">
                  <div>
                    <div className="generator-name">{generator.name}</div>
                    <div className="generator-zone">Zone: {getZoneName(generator.zoneId)}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Last Operator: {getOperatorName(generator.lastOperator)}
                    </div>
                  </div>
                  <div>
                    <span className={`status-badge status-${generator.status}`}>
                      {generator.status}
                    </span>
                    <div className="btn-group" style={{ marginTop: '10px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openGeneratorModal(generator)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteGenerator(generator.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operator Management Tab */}
      {activeTab === 'operators' && (
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Operator Management</h3>
          <div className="grid grid-3">
            {operators.map(operator => (
              <div key={operator.id} className="operator-card">
                <h4>{operator.name}</h4>
                <p>Username: {operator.username}</p>
                <p>Email: {operator.email}</p>
                <p>Assigned Zone: {zones.find(z => z.assignedOperator === operator.id)?.name || 'None'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Activity Logs by Zone</h3>
          {zones.map(zone => {
            const zoneLogs = getZoneLogs(zone.id);
            return (
              <div key={zone.id} className="zone-logs" style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#007bff', marginBottom: '15px' }}>
                  {zone.name} - {zoneLogs.length} activities
                </h4>
                {zoneLogs.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No activity in this zone</p>
                ) : (
                  <table className="log-table">
                    <thead>
                      <tr>
                        <th>Generator</th>
                        <th>Operator</th>
                        <th>Action</th>
                        <th>Location</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneLogs.slice(0, 10).map(log => (
                        <tr key={log.id}>
                          <td>{log.generatorId}</td>
                          <td>{log.operatorName}</td>
                          <td className={`action-${log.action}`}>
                            {log.action.toUpperCase()}
                          </td>
                          <td className="location">{log.location}</td>
                          <td className="timestamp">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingZone ? 'Edit Zone' : 'Create New Zone'}</h3>
            <div className="form-group">
              <label>Zone Name</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.location}
                onChange={(e) => setZoneForm({ ...zoneForm, location: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={editingZone ? handleUpdateZone : handleCreateZone}
              >
                {editingZone ? 'Update' : 'Create'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowZoneModal(false);
                  setEditingZone(null);
                  setZoneForm({ name: '', location: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {showGeneratorModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingGenerator ? 'Edit Generator' : 'Create New Generator'}</h3>
            <div className="form-group">
              <label>Generator Name</label>
              <input
                type="text"
                className="form-control"
                value={generatorForm.name}
                onChange={(e) => setGeneratorForm({ ...generatorForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Zone</label>
              <select
                className="form-control"
                value={generatorForm.zoneId}
                onChange={(e) => setGeneratorForm({ ...generatorForm, zoneId: e.target.value })}
              >
                <option value="">Select Zone</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} - {zone.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={editingGenerator ? handleUpdateGenerator : handleCreateGenerator}
              >
                {editingGenerator ? 'Update' : 'Create'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowGeneratorModal(false);
                  setEditingGenerator(null);
                  setGeneratorForm({ name: '', zoneId: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 