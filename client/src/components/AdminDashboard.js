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

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getOperatorName = (operatorId) => {
    const operator = users.find(u => u.id === operatorId);
    return operator ? operator.name : 'Unassigned';
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  const runningGenerators = generators.filter(g => g.status === 'running');
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

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Zone Management</h3>
          {zones.map(zone => (
            <div key={zone.id} style={{ 
              border: '1px solid #eee', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <div className="flex-between">
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{zone.name}</h4>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    Location: {zone.location}
                  </p>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                    Operator: {getOperatorName(zone.assignedOperator)}
                  </p>
                </div>
                <div style={{ minWidth: '200px' }}>
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
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAssignOperator(zone.id)}
                    disabled={!selectedOperator}
                    style={{ width: '100%' }}
                  >
                    Assign Operator
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Real-time Generator Status</h3>
          <div className="grid grid-2">
            {generators.map(generator => (
              <div key={generator.id} className="generator-card">
                <div className="generator-header">
                  <div>
                    <div className="generator-name">{generator.name}</div>
                    <div className="generator-zone">
                      Zone: {getZoneName(generator.zoneId)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Operator: {getOperatorName(generator.lastOperator)}
                    </div>
                  </div>
                  <span className={`status-badge status-${generator.status}`}>
                    {generator.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Recent Activity Log</h3>
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No activity yet.</p>
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
              {logs.slice(0, 20).map(log => (
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

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Operator Management</h3>
        <div className="grid grid-3">
          {operators.map(operator => (
            <div key={operator.id} style={{ 
              border: '1px solid #eee', 
              borderRadius: '6px', 
              padding: '15px' 
            }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{operator.name}</h4>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                Username: {operator.username}
              </p>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                Email: {operator.email}
              </p>
              <p style={{ margin: 0, color: '#007bff', fontSize: '14px' }}>
                Assigned Zone: {zones.find(z => z.assignedOperator === operator.id)?.name || 'None'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 