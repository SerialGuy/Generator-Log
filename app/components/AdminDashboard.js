'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showEditZoneModal, setShowEditZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const generatorTypes = [65, 125, 250, 320, 500];
  const [zoneForm, setZoneForm] = useState({
    zoneName: '',
    generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 },
    operatorId: ''
  });
  const [collapsedZones, setCollapsedZones] = useState({});

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

  const handleAddZone = async () => {
    try {
      const totalGens = Object.values(zoneForm.generatorsByType).reduce((a, b) => a + b, 0);
      if (totalGens === 0) {
        toast.error('At least one generator is required');
        return;
      }
      await axios.post('/api/zones/complete', {
        zoneName: zoneForm.zoneName,
        generatorsByType: zoneForm.generatorsByType,
        operatorId: zoneForm.operatorId || undefined
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Zone created successfully');
      setShowAddZoneModal(false);
      setZoneForm({ zoneName: '', generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 }, operatorId: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create zone');
    }
  };

  const handleEditZone = async () => {
    try {
      const generatorsList = zoneForm.generators.filter(name => name.trim() !== '');
      if (generatorsList.length === 0) {
        toast.error('At least one generator name is required');
        return;
      }

      await axios.put(`/api/zones/${editingZone.id}`, {
        name: zoneForm.zoneName,
        location: zoneForm.zoneLocation,
        generators: generatorsList
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Zone updated successfully');
      setShowEditZoneModal(false);
      setEditingZone(null);
      setZoneForm({ zoneName: '', zoneLocation: '', generators: [''], operatorId: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update zone');
    }
  };

  const openEditZoneModal = (zone) => {
    const zoneGenerators = generators.filter(g => g.zone_id === zone.id);
    const generatorsByType = { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 };
    zoneGenerators.forEach(g => {
      if (generatorsByType[g.kva]) {
        generatorsByType[g.kva] += 1;
      } else if (g.kva) {
        generatorsByType[g.kva] = 1;
      }
    });
    setEditingZone(zone);
    setZoneForm({
      zoneName: zone.name,
      generatorsByType,
      operatorId: zone.assigned_operator_id || ''
    });
    setShowEditZoneModal(true);
  };

  const addGeneratorField = () => {
    setZoneForm({
      ...zoneForm,
      generators: [...zoneForm.generators, '']
    });
  };

  const removeGeneratorField = (index) => {
    if (zoneForm.generators.length > 1) {
      const newGenerators = zoneForm.generators.filter((_, i) => i !== index);
      setZoneForm({
        ...zoneForm,
        generators: newGenerators
      });
    }
  };

  const updateGeneratorField = (index, value) => {
    const newGenerators = [...zoneForm.generators];
    newGenerators[index] = value;
    setZoneForm({
      ...zoneForm,
      generators: newGenerators
    });
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
    const zoneGenerators = generators.filter(g => g.zone_id === zoneId);
    return logs.filter(log => zoneGenerators.some(g => g.id === log.generator_id));
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

      {/* Quick Add Zone Button */}
      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div className="flex-between">
          <h3>Quick Actions</h3>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddZoneModal(true)}
          >
            + Add New Zone
          </button>
        </div>
        <p style={{ color: '#666', marginTop: '10px' }}>
          Create a new zone with multiple generators and assign an operator in one step.
        </p>
      </div>

      {/* Generator Status Overview */}
      <div className="grid-2">
        <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', color: '#28a745' }}>🟢 Running Generators ({runningGenerators.length})</h3>
          {runningGenerators.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No generators currently running</p>
          ) : (
            <div className="grid-2">
              {runningGenerators.map(generator => (
                <div key={generator.id} className="generator-card running">
                  <div className="generator-header">
                    <div>
                      <div className="generator-name">{generator.name}</div>
                      <div className="generator-zone">Zone: {getZoneName(generator.zone_id)}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        Operator: {getOperatorName(generator.last_operator_id)}
                      </div>
                    </div>
                    <span className="status-badge status-running" style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      backgroundColor: '#d4edda',
                      color: '#155724'
                    }}>Running</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', color: '#dc3545' }}>🔴 Stopped Generators ({stoppedGenerators.length})</h3>
          {zones.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No zones available</p>
          ) : (
            zones.map(zone => {
              const zoneStopped = stoppedGenerators.filter(g => g.zone_id === zone.id);
              if (zoneStopped.length === 0) return null;
              return (
                <div key={zone.id} style={{ marginBottom: '10px', border: '1px solid #eee', borderRadius: 6 }}>
                  <div
                    style={{ cursor: 'pointer', padding: '10px', background: '#f8f9fa', borderRadius: 6, fontWeight: 600 }}
                    onClick={() => setCollapsedZones(z => ({ ...z, [zone.id]: !z[zone.id] }))}
                  >
                    {zone.name} ({zoneStopped.length})
                    <span style={{ float: 'right' }}>{collapsedZones[zone.id] ? '▲' : '▼'}</span>
                  </div>
                  {collapsedZones[zone.id] && (
                    <div style={{ padding: '10px 20px' }}>
                      {zoneStopped.map(generator => (
                        <div key={generator.id} className="generator-card stopped">
                          <div className="generator-header">
                            <div>
                              <div className="generator-name">{generator.name}</div>
                              <div className="generator-zone">Zone: {getZoneName(generator.zone_id)}</div>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                Last Operator: {getOperatorName(generator.last_operator_id)}
                              </div>
                            </div>
                            <span className="status-badge status-offline" style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              backgroundColor: '#f8d7da',
                              color: '#721c24'
                            }}>Offline</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone Management */}
      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Zone Management</h3>
        {zones.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            No zones created yet. Use the "Add New Zone" button above to create your first zone.
          </p>
        ) : (
          <div className="grid-2">
            {zones.map(zone => {
              const zoneGenerators = generators.filter(g => g.zone_id === zone.id);
              return (
                <div key={zone.id} className="zone-card">
                  <div className="zone-header">
                    <div>
                      <h4>{zone.name}</h4>
                      <p>Location: {zone.location}</p>
                      <p>Operator: {getOperatorName(zone.assigned_operator_id)}</p>
                      <p>Generators: {zoneGenerators.length}</p>
                      <div style={{ marginTop: '10px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => openEditZoneModal(zone)}
                        >
                          Edit Zone
                        </button>
                      </div>
                    </div>
                    <div>
                      <h5>Generators in this zone:</h5>
                      {zoneGenerators.map(gen => (
                        <div key={gen.id} style={{ 
                          padding: '5px 10px', 
                          margin: '2px 0', 
                          background: '#f8f9fa', 
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}>
                          {gen.name} - {gen.status}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Logs by Zone */}
      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Activity Logs by Zone</h3>
        {zones.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No zones to display logs for</p>
        ) : (
          zones.map(zone => {
            const zoneLogs = getZoneLogs(zone.id);
            return (
              <div key={zone.id} className="zone-logs">
                <h4>{zone.name} - {zoneLogs.length} activities</h4>
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
                      {zoneLogs.slice(0, 5).map(log => (
                        <tr key={log.id}>
                          <td>{log.generator_name || log.generator_id}</td>
                          <td>{log.operator_name}</td>
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
          })
        )}
      </div>

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add New Zone</h2>
            <div className="form-group">
              <label>Zone Name</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.zoneName}
                onChange={e => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                placeholder="Enter zone name"
              />
            </div>
            <div className="form-group">
              <label>Generators</label>
              {generatorTypes.map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ minWidth: 70 }}>{type} kVA</span>
                  <button type="button" className="btn btn-secondary" onClick={() => setZoneForm({ ...zoneForm, generatorsByType: { ...zoneForm.generatorsByType, [type]: Math.max(0, zoneForm.generatorsByType[type] - 1) } })}>-</button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{zoneForm.generatorsByType[type]}</span>
                  <button type="button" className="btn btn-secondary" onClick={() => setZoneForm({ ...zoneForm, generatorsByType: { ...zoneForm.generatorsByType, [type]: zoneForm.generatorsByType[type] + 1 } })}>+</button>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Assign Operator (optional)</label>
              <select
                className="form-control"
                value={zoneForm.operatorId}
                onChange={e => setZoneForm({ ...zoneForm, operatorId: e.target.value })}
              >
                <option value="">No operator assigned</option>
                {operators.filter(op => !zones.some(z => z.assigned_operator_id === op.id)).map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name} ({operator.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleAddZone}>Add Zone</button>
              <button className="btn btn-secondary" onClick={() => setShowAddZoneModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {showEditZoneModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Zone: {editingZone?.name}</h3>
            <div className="form-group">
              <label>Zone Name</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.zoneName}
                onChange={e => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                placeholder="Enter zone name"
              />
            </div>
            <div className="form-group">
              <label>Generators</label>
              {generatorTypes.map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ minWidth: 70 }}>{type} kVA</span>
                  <button type="button" className="btn btn-secondary" onClick={() => setZoneForm({ ...zoneForm, generatorsByType: { ...zoneForm.generatorsByType, [type]: Math.max(0, zoneForm.generatorsByType[type] - 1) } })}>-</button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{zoneForm.generatorsByType[type]}</span>
                  <button type="button" className="btn btn-secondary" onClick={() => setZoneForm({ ...zoneForm, generatorsByType: { ...zoneForm.generatorsByType, [type]: zoneForm.generatorsByType[type] + 1 } })}>+</button>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Assign Operator (optional)</label>
              <select
                className="form-control"
                value={zoneForm.operatorId}
                onChange={e => setZoneForm({ ...zoneForm, operatorId: e.target.value })}
              >
                <option value="">No operator assigned</option>
                {operators.filter(op => !zones.some(z => z.assigned_operator_id === op.id) || op.id === editingZone?.assigned_operator_id).map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name} ({operator.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const totalGens = Object.values(zoneForm.generatorsByType).reduce((a, b) => a + b, 0);
                    if (totalGens === 0) {
                      toast.error('At least one generator is required');
                      return;
                    }
                    await axios.put(`/api/zones/${editingZone.id}`, {
                      name: zoneForm.zoneName,
                      generatorsByType: zoneForm.generatorsByType,
                      operatorId: zoneForm.operatorId || undefined
                    }, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    toast.success('Zone updated successfully');
                    setShowEditZoneModal(false);
                    setEditingZone(null);
                    setZoneForm({ zoneName: '', generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 }, operatorId: '' });
                    fetchData();
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Failed to update zone');
                  }
                }}
              >
                Update Zone
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditZoneModal(false);
                  setEditingZone(null);
                  setZoneForm({ zoneName: '', generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 }, operatorId: '' });
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