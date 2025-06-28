const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data storage (in production, use a database)
const users = [];
const zones = [];
const generators = [];
const logs = [];

// JWT Secret - use environment variable or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'generator-log-secret-key-2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Initialize default data
const initializeData = () => {
  // Create default admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  users.push({
    id: uuidv4(),
    username: 'admin',
    password: adminPassword,
    role: 'administrator',
    name: 'System Administrator',
    email: 'admin@generatorlog.com'
  });

  // Create sample zones
  zones.push(
    { id: uuidv4(), name: 'Zone A', location: 'Building 1', assignedOperator: null },
    { id: uuidv4(), name: 'Zone B', location: 'Building 2', assignedOperator: null },
    { id: uuidv4(), name: 'Zone C', location: 'Building 3', assignedOperator: null }
  );

  // Create sample generators
  generators.push(
    { id: uuidv4(), name: 'Generator A1', zoneId: zones[0].id, status: 'offline', lastOperator: null },
    { id: uuidv4(), name: 'Generator A2', zoneId: zones[0].id, status: 'offline', lastOperator: null },
    { id: uuidv4(), name: 'Generator B1', zoneId: zones[1].id, status: 'offline', lastOperator: null },
    { id: uuidv4(), name: 'Generator B2', zoneId: zones[1].id, status: 'offline', lastOperator: null },
    { id: uuidv4(), name: 'Generator C1', zoneId: zones[2].id, status: 'offline', lastOperator: null }
  );
};

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, name, email, role = 'operator' } = req.body;

    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      name,
      email,
      role
    };

    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get zones
app.get('/api/zones', authenticateToken, (req, res) => {
  res.json(zones);
});

// Get generators
app.get('/api/generators', authenticateToken, (req, res) => {
  const userGenerators = req.user.role === 'administrator' 
    ? generators 
    : generators.filter(g => {
        const zone = zones.find(z => z.id === g.zoneId);
        return zone && zone.assignedOperator === req.user.id;
      });
  
  res.json(userGenerators);
});

// Get logs
app.get('/api/logs', authenticateToken, (req, res) => {
  const userLogs = req.user.role === 'administrator' 
    ? logs 
    : logs.filter(log => log.operatorId === req.user.id);
  
  res.json(userLogs);
});

// Log generator start
app.post('/api/generators/:id/start', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    
    const generator = generators.find(g => g.id === id);
    if (!generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    // Check if operator has access to this generator
    if (req.user.role !== 'administrator') {
      const zone = zones.find(z => z.id === generator.zoneId);
      if (!zone || zone.assignedOperator !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (generator.status === 'running') {
      return res.status(400).json({ error: 'Generator is already running' });
    }

    const logEntry = {
      id: uuidv4(),
      generatorId: id,
      operatorId: req.user.id,
      operatorName: req.user.name,
      action: 'start',
      timestamp: new Date().toISOString(),
      location: location || 'Unknown',
      status: 'running'
    };

    logs.push(logEntry);
    generator.status = 'running';
    generator.lastOperator = req.user.id;

    // Emit real-time update
    io.emit('generatorUpdate', { generator, log: logEntry });

    res.json({ message: 'Generator started successfully', log: logEntry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start generator' });
  }
});

// Log generator stop
app.post('/api/generators/:id/stop', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    
    const generator = generators.find(g => g.id === id);
    if (!generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    // Check if operator has access to this generator
    if (req.user.role !== 'administrator') {
      const zone = zones.find(z => z.id === generator.zoneId);
      if (!zone || zone.assignedOperator !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (generator.status === 'offline') {
      return res.status(400).json({ error: 'Generator is already offline' });
    }

    const logEntry = {
      id: uuidv4(),
      generatorId: id,
      operatorId: req.user.id,
      operatorName: req.user.name,
      action: 'stop',
      timestamp: new Date().toISOString(),
      location: location || 'Unknown',
      status: 'offline'
    };

    logs.push(logEntry);
    generator.status = 'offline';

    // Emit real-time update
    io.emit('generatorUpdate', { generator, log: logEntry });

    res.json({ message: 'Generator stopped successfully', log: logEntry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop generator' });
  }
});

// Assign operator to zone (admin only)
app.post('/api/zones/:id/assign-operator', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { operatorId } = req.body;

  const zone = zones.find(z => z.id === id);
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  const operator = users.find(u => u.id === operatorId && u.role === 'operator');
  if (!operator) {
    return res.status(404).json({ error: 'Operator not found' });
  }

  // Remove operator from any other zones first
  zones.forEach(z => {
    if (z.assignedOperator === operatorId) {
      z.assignedOperator = null;
    }
  });

  zone.assignedOperator = operatorId;
  res.json({ message: 'Operator assigned successfully', zone });
});

// Create new zone (admin only)
app.post('/api/zones', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, location } = req.body;

  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  const newZone = {
    id: uuidv4(),
    name,
    location,
    assignedOperator: null
  };

  zones.push(newZone);
  res.status(201).json({ message: 'Zone created successfully', zone: newZone });
});

// Update zone (admin only)
app.put('/api/zones/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { name, location } = req.body;

  const zone = zones.find(z => z.id === id);
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  if (name) zone.name = name;
  if (location) zone.location = location;

  res.json({ message: 'Zone updated successfully', zone });
});

// Delete zone (admin only)
app.delete('/api/zones/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const zoneIndex = zones.findIndex(z => z.id === id);
  
  if (zoneIndex === -1) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  // Check if zone has generators
  const zoneGenerators = generators.filter(g => g.zoneId === id);
  if (zoneGenerators.length > 0) {
    return res.status(400).json({ error: 'Cannot delete zone with assigned generators' });
  }

  zones.splice(zoneIndex, 1);
  res.json({ message: 'Zone deleted successfully' });
});

// Create new generator (admin only)
app.post('/api/generators', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, zoneId } = req.body;

  if (!name || !zoneId) {
    return res.status(400).json({ error: 'Name and zoneId are required' });
  }

  const zone = zones.find(z => z.id === zoneId);
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  const newGenerator = {
    id: uuidv4(),
    name,
    zoneId,
    status: 'offline',
    lastOperator: null
  };

  generators.push(newGenerator);
  res.status(201).json({ message: 'Generator created successfully', generator: newGenerator });
});

// Update generator (admin only)
app.put('/api/generators/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { name, zoneId } = req.body;

  const generator = generators.find(g => g.id === id);
  if (!generator) {
    return res.status(404).json({ error: 'Generator not found' });
  }

  if (name) generator.name = name;
  if (zoneId) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    generator.zoneId = zoneId;
  }

  res.json({ message: 'Generator updated successfully', generator });
});

// Delete generator (admin only)
app.delete('/api/generators/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const generatorIndex = generators.findIndex(g => g.id === id);
  
  if (generatorIndex === -1) {
    return res.status(404).json({ error: 'Generator not found' });
  }

  generators.splice(generatorIndex, 1);
  
  // Remove related logs
  const logIndexes = logs.map((log, index) => log.generatorId === id ? index : -1).filter(index => index !== -1);
  for (let i = logIndexes.length - 1; i >= 0; i--) {
    logs.splice(logIndexes[i], 1);
  }

  res.json({ message: 'Generator deleted successfully' });
});

// Get logs by zone (admin only)
app.get('/api/logs/zone/:zoneId', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { zoneId } = req.params;
  const zoneGenerators = generators.filter(g => g.zoneId === zoneId);
  const zoneLogs = logs.filter(log => zoneGenerators.some(g => g.id === log.generatorId));
  
  res.json(zoneLogs);
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const userList = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role
  }));

  res.json(userList);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize data and start server
initializeData();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Default admin credentials: admin / admin123`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
  console.log(`🌐 Frontend should be available at: http://localhost:3000`);
}); 