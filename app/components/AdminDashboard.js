'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedZones, setCollapsedZones] = useState({});
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showEditZoneModal, setShowEditZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({
    zoneName: '',
    generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 },
    operatorId: ''
  });
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [addLogForm, setAddLogForm] = useState({
    generatorId: '',
    operatorId: '',
    action: '',
    timestamp: ''
  });
  const [addLogLoading, setAddLogLoading] = useState(false);
  const downloadRef = useRef(null);
  const [editLogModal, setEditLogModal] = useState({ open: false, log: null });
  const [editLogForm, setEditLogForm] = useState({ generatorId: '', operatorId: '', action: '', timestamp: '' });
  const [editLogLoading, setEditLogLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      // Poll for updates every 10 seconds
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all data
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

  const handleCreateZone = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/zones/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(zoneForm)
      });

      if (response.ok) {
        setShowAddZoneModal(false);
        setZoneForm({
          zoneName: '',
          generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 },
          operatorId: ''
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create zone');
      }
    } catch (error) {
      console.error('Error creating zone:', error);
      alert('Failed to create zone');
    }
  };

  const handleUpdateZone = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/zones/${editingZone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(zoneForm)
      });

      if (response.ok) {
        setShowEditZoneModal(false);
        setEditingZone(null);
        setZoneForm({
          zoneName: '',
          generatorsByType: { '65': 0, '125': 0, '250': 0, '320': 0, '500': 0 },
          operatorId: ''
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update zone');
      }
    } catch (error) {
      console.error('Error updating zone:', error);
      alert('Failed to update zone');
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

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getOperatorName = (operatorId) => {
    const operator = users.find(u => u.id === operatorId);
    return operator ? `${operator.name} (${operator.username})` : 'Unassigned';
  };

  const getZoneLogs = (zoneId) => {
    const zoneGenerators = generators.filter(g => g.zone_id === zoneId);
    const zoneGeneratorIds = zoneGenerators.map(g => g.id);
    return logs.filter(log => zoneGeneratorIds.includes(log.generators?.id || log.generator_id));
  };

  // Download zone logs as Excel
  const handleDownloadZoneLogs = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    const zoneLogs = getZoneLogs(zoneId);
    const data = zoneLogs.map(log => ({
      Generator: log.generators?.name || 'Unknown Generator',
      Operator: log.operator_name,
      Action: log.action,
      Timestamp: new Date(log.timestamp).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, `${zone?.name || 'zone'}-logs.xlsx`);
  };

  // Add previous log
  const handleAddLog = async () => {
    setAddLogLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          generator_id: addLogForm.generatorId,
          operator_id: addLogForm.operatorId,
          action: addLogForm.action,
          timestamp: addLogForm.timestamp
        })
      });
      if (response.ok) {
        setShowAddLogModal(false);
        setAddLogForm({ generatorId: '', operatorId: '', action: '', timestamp: '' });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add log');
      }
    } catch (error) {
      alert('Failed to add log');
    } finally {
      setAddLogLoading(false);
    }
  };

  // Delete log
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/logs?id=${logId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchData();
    else alert('Failed to delete log');
  };

  // Edit log
  const openEditLogModal = (log) => {
    setEditLogForm({
      generatorId: log.generator_id,
      operatorId: users.find(u => u.name === log.operator_name)?.id || '',
      action: log.action,
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString().slice(0,16) : ''
    });
    setEditLogModal({ open: true, log });
  };

  const handleEditLog = async () => {
    setEditLogLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/logs?id=${editLogModal.log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        generator_id: editLogForm.generatorId,
        operator_id: editLogForm.operatorId,
        action: editLogForm.action,
        timestamp: editLogForm.timestamp
      })
    });
    setEditLogLoading(false);
    if (res.ok) {
      setEditLogModal({ open: false, log: null });
      fetchData();
    } else {
      alert('Failed to update log');
    }
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
          {zones.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No zones available</p>
          ) : (
            zones.map(zone => {
              const zoneRunning = runningGenerators.filter(g => g.zone_id === zone.id);
              if (zoneRunning.length === 0) return null;
              return (
                <div key={zone.id} style={{ marginBottom: '10px', border: '1px solid #eee', borderRadius: 6 }}>
                  <div
                    style={{ cursor: 'pointer', padding: '10px', background: '#f8f9fa', borderRadius: 6, fontWeight: 600 }}
                    onClick={() => setCollapsedZones(z => ({ ...z, [`running-${zone.id}`]: !z[`running-${zone.id}`] }))}
                  >
                    {zone.name} ({zoneRunning.length})
                    <span style={{ float: 'right' }}>{collapsedZones[`running-${zone.id}`] ? '▲' : '▼'}</span>
                  </div>
                  {collapsedZones[`running-${zone.id}`] && (
                    <div style={{ padding: '10px 20px' }}>
                      {zoneRunning.map(generator => (
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
              );
            })
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
                    onClick={() => setCollapsedZones(z => ({ ...z, [`stopped-${zone.id}`]: !z[`stopped-${zone.id}`] }))}
                  >
                    {zone.name} ({zoneStopped.length})
                    <span style={{ float: 'right' }}>{collapsedZones[`stopped-${zone.id}`] ? '▲' : '▼'}</span>
                  </div>
                  {collapsedZones[`stopped-${zone.id}`] && (
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
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAddLogModal(true)}>
          + Add Previous Log
        </button>
        {zones.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No zones to display logs for</p>
        ) : (
          zones.map(zone => {
            const zoneLogs = getZoneLogs(zone.id);
            return (
              <div key={zone.id} className="zone-logs">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4>{zone.name} - {zoneLogs.length} activities</h4>
                  <button className="btn btn-success" onClick={() => handleDownloadZoneLogs(zone.id)}>
                    Download Excel
                  </button>
                </div>
                {zoneLogs.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No activity in this zone</p>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: 16 }}>
                    <table className="log-table">
                      <thead>
                        <tr>
                          <th>Generator</th>
                          <th>Operator</th>
                          <th>Action</th>
                          <th>Timestamp</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneLogs.map(log => (
                          <tr key={log.id}>
                            <td>{log.generators?.name || 'Unknown Generator'}</td>
                            <td>{log.operator_name}</td>
                            <td className={`action-${log.action}`}>{log.action.toUpperCase()}</td>
                            <td className="timestamp">{new Date(log.timestamp).toLocaleString()}</td>
                            <td>
                              <button className="btn btn-sm btn-warning" onClick={() => openEditLogModal(log)} style={{ marginRight: 8 }}>Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteLog(log.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            <h3>Add New Zone</h3>
            <div className="form-group">
              <label>Zone Name</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.zoneName}
                onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                placeholder="Enter zone name"
              />
            </div>
            <div className="form-group">
              <label>Assigned Operator</label>
              <select
                className="form-control"
                value={zoneForm.operatorId}
                onChange={(e) => setZoneForm({ ...zoneForm, operatorId: e.target.value })}
              >
                <option value="">No operator assigned</option>
                {operators.filter(op => !zones.some(z => z.assigned_operator_id === op.id)).map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name} ({operator.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Generators</label>
              {Object.entries(zoneForm.generatorsByType).map(([kva, count]) => (
                <div key={kva} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'inline-block', width: '80px' }}>{kva}kVA:</label>
                  <input
                    type="number"
                    min="0"
                    value={count}
                    onChange={(e) => setZoneForm({
                      ...zoneForm,
                      generatorsByType: {
                        ...zoneForm.generatorsByType,
                        [kva]: parseInt(e.target.value) || 0
                      }
                    })}
                    style={{ width: '60px', marginLeft: '10px' }}
                  />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddZoneModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateZone}>
                Create Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {showEditZoneModal && editingZone && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Zone: {editingZone.name}</h3>
            <div className="form-group">
              <label>Zone Name</label>
              <input
                type="text"
                className="form-control"
                value={zoneForm.zoneName}
                onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                placeholder="Enter zone name"
              />
            </div>
            <div className="form-group">
              <label>Assigned Operator</label>
              <select
                className="form-control"
                value={zoneForm.operatorId}
                onChange={(e) => setZoneForm({ ...zoneForm, operatorId: e.target.value })}
              >
                <option value="">No operator assigned</option>
                {operators.filter(op => !zones.some(z => z.assigned_operator_id === op.id) || op.id === editingZone.assigned_operator_id).map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name} ({operator.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Generators</label>
              {Object.entries(zoneForm.generatorsByType).map(([kva, count]) => (
                <div key={kva} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'inline-block', width: '80px' }}>{kva}kVA:</label>
                  <input
                    type="number"
                    min="0"
                    value={count}
                    onChange={(e) => setZoneForm({
                      ...zoneForm,
                      generatorsByType: {
                        ...zoneForm.generatorsByType,
                        [kva]: parseInt(e.target.value) || 0
                      }
                    })}
                    style={{ width: '60px', marginLeft: '10px' }}
                  />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditZoneModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateZone}>
                Update Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Previous Log Modal */}
      {showAddLogModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Previous Log</h3>
            <div className="form-group">
              <label>Generator</label>
              <select className="form-control" value={addLogForm.generatorId} onChange={e => setAddLogForm({ ...addLogForm, generatorId: e.target.value })}>
                <option value="">Select Generator</option>
                {generators.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({getZoneName(g.zone_id)})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Operator</label>
              <select className="form-control" value={addLogForm.operatorId} onChange={e => setAddLogForm({ ...addLogForm, operatorId: e.target.value })}>
                <option value="">Select Operator</option>
                {users.filter(u => u.role === 'operator').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Action</label>
              <select className="form-control" value={addLogForm.action} onChange={e => setAddLogForm({ ...addLogForm, action: e.target.value })}>
                <option value="">Select Action</option>
                <option value="start">Start</option>
                <option value="stop">Stop</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timestamp</label>
              <input type="datetime-local" className="form-control" value={addLogForm.timestamp} onChange={e => setAddLogForm({ ...addLogForm, timestamp: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddLogModal(false)} disabled={addLogLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddLog} disabled={addLogLoading}>
                {addLogLoading ? 'Adding...' : 'Add Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {editLogModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Log</h3>
            <div className="form-group">
              <label>Generator</label>
              <select className="form-control" value={editLogForm.generatorId} onChange={e => setEditLogForm({ ...editLogForm, generatorId: e.target.value })}>
                <option value="">Select Generator</option>
                {generators.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({getZoneName(g.zone_id)})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Operator</label>
              <select className="form-control" value={editLogForm.operatorId} onChange={e => setEditLogForm({ ...editLogForm, operatorId: e.target.value })}>
                <option value="">Select Operator</option>
                {users.filter(u => u.role === 'operator').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Action</label>
              <select className="form-control" value={editLogForm.action} onChange={e => setEditLogForm({ ...editLogForm, action: e.target.value })}>
                <option value="">Select Action</option>
                <option value="start">Start</option>
                <option value="stop">Stop</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timestamp</label>
              <input type="datetime-local" className="form-control" value={editLogForm.timestamp} onChange={e => setEditLogForm({ ...editLogForm, timestamp: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditLogModal({ open: false, log: null })} disabled={editLogLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditLog} disabled={editLogLoading}>
                {editLogLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 