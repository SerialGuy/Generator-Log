'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [generators, setGenerators] = useState([]);
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');

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
      
      // Fetch generators
      const generatorsResponse = await fetch('/api/generators', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (generatorsResponse.ok) {
        const generatorsData = await generatorsResponse.json();
        setGenerators(generatorsData);
      }

      // Fetch zones
      const zonesResponse = await fetch('/api/zones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json();
        setZones(zonesData);
      }

      // Fetch logs
      const logsResponse = await fetch('/api/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
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
        body: JSON.stringify({ location })
      });

      if (response.ok) {
        // Refresh data after action
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Action failed');
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
        <div className="stat-card">
          <h3>{zones.length}</h3>
          <p>Assigned Zones</p>
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#dc3545' }}>No Zones Assigned</h3>
          <p style={{ textAlign: 'center', color: '#666' }}>
            You don't have any zones assigned to you yet. Please contact an administrator to assign you to a zone.
          </p>
        </div>
      ) : (
        <>
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
                No generators are currently assigned to your zones. Contact an administrator to add generators to your assigned zones.
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
        </>
      )}
    </div>
  );
} 