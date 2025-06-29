'use client';

import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={{
      background: 'white',
      padding: '15px 0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div className="container">
        <div className="flex-between">
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>Generator Log App</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              {user.role === 'administrator' ? 'Administrator Dashboard' : 'Operator Dashboard'}
            </p>
          </div>
          <div className="flex" style={{ alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: '500', color: '#333' }}>{user.name}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
                {user.username} • {user.role}
              </p>
            </div>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 