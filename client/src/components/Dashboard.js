import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { AuthContext, SocketContext } from '../App';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [generators, setGenerators] = useState([]);
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
      const [generatorsRes, logsRes] = await Promise.all([
        axios.get('/api/generators', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/logs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setGenerators(generatorsRes.data);
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

      <div className="card">
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

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Your Generators</h3>
        {generators.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            No generators assigned to you yet. Contact an administrator.
          </p>
        ) : (
          <div className="grid grid-2">
            {generators.map(generator => (
              <div key={generator.id} className="generator-card">
                <div className="generator-header">
                  <div>
                    <div className="generator-name">{generator.name}</div>
                    <div className="generator-zone">Zone: {generator.zoneId}</div>
                  </div>
                  <span className={`status-badge status-${generator.status}`}>
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

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No activity yet.</p>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Generator</th>
                <th>Action</th>
                <th>Location</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map(log => (
                <tr key={log.id}>
                  <td>{log.generatorId}</td>
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