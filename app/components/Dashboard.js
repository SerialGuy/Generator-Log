'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Dashboard = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');

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
      const [generatorsRes, zonesRes, logsRes] = await Promise.all([
        axios.get('/api/generators', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/zones', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/logs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setGenerators(generatorsRes.data);
      setZones(zonesRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratorAction = async (generatorId, action) => {
    try {
      await axios.post(`/api/generators/${generatorId}/${action}`, 
        { location },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success(`Generator ${action}ed successfully`);
      setLocation('');
    } catch (error) {
      const message = error.response?.data?.error || `Failed to ${action} generator`;
      toast.error(message);
    }
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <h1>Operator Dashboard</h1>
        <p>Welcome back, {user.name}! Manage your assigned generators.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{generators.length}</h3>
          <p>Assigned Generators</p>
        </div>
        <div className="stat-card">
          <h3>{generators.filter(g => g.status === 'running').length}</h3>
          <p>Currently Running</p>
        </div>
        <div className="stat-card">
          <h3>{logs.length}</h3>
          <p>Total Actions</p>
        </div>
      </div>

      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Location Input</h3>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="Enter your current location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Your Generators</h3>
        {generators.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            No generators assigned to you yet. Contact an administrator.
          </p>
        ) : (
          <div className="grid-2">
            {generators.map(generator => (
              <div key={generator.id} className={`generator-card ${generator.status}`}>
                <div className="generator-header">
                  <div>
                    <div className="generator-name">{generator.name}</div>
                    <div className="generator-zone">Zone: {getZoneName(generator.zone_id)}</div>
                  </div>
                  <span className={`status-badge status-${generator.status}`} style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    backgroundColor: generator.status === 'running' ? '#d4edda' : '#f8d7da',
                    color: generator.status === 'running' ? '#155724' : '#721c24'
                  }}>
                    {generator.status}
                  </span>
                </div>
                <div className="generator-actions">
                  {generator.status === 'offline' ? (
                    <button
                      className="btn btn-success"
                      onClick={() => handleGeneratorAction(generator.id, 'start')}
                    >
                      Start Generator
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleGeneratorAction(generator.id, 'stop')}
                    >
                      Stop Generator
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No activity yet.</p>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Generator</th>
                <th>Zone</th>
                <th>Action</th>
                <th>Location</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map(log => (
                <tr key={log.id}>
                  <td>{log.generator_name || log.generator_id}</td>
                  <td>{log.zone_name || getZoneName(log.zone_id)}</td>
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
    </div>
  );
};

export default Dashboard; 