// Load environment variables
require('dotenv').config();

const express = require('express');
const next = require('next');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Supabase configuration
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// JWT Secret
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
const initializeData = async () => {
  try {
    // Check if admin user exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (!existingAdmin) {
      // Create default admin user
      const adminPassword = bcrypt.hashSync('admin123', 10);
      const { error: adminError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          password: adminPassword,
          role: 'administrator',
          name: 'System Administrator',
          email: 'admin@generatorlog.com'
        });

      if (adminError) {
        console.error('Error creating admin user:', adminError);
      } else {
        console.log('✅ Default admin user created');
      }
    }

    // Check if operator user exists
    const { data: existingOperator } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'operator')
      .single();

    if (!existingOperator) {
      // Create default operator user
      const operatorPassword = bcrypt.hashSync('operator123', 10);
      const { error: operatorError } = await supabase
        .from('users')
        .insert({
          username: 'operator',
          password: operatorPassword,
          role: 'operator',
          name: 'John Operator',
          email: 'operator@generatorlog.com'
        });

      if (operatorError) {
        console.error('Error creating operator user:', operatorError);
      } else {
        console.log('✅ Default operator user created');
      }
    }

    // Check if zones exist
    const { data: existingZones } = await supabase
      .from('zones')
      .select('id')
      .limit(1);

    if (!existingZones || existingZones.length === 0) {
      // Pre-populate zones and generators
      const zoneData = [
        { name: 'HUSAINI MOHALLA', vendor: 'HORIZON', squareFeet: 11050, tons: 148, dg125: 5, dg65: 0 },
        { name: 'WAJHI MOHALLA', vendor: 'HORIZON', squareFeet: 10000, tons: 134, dg125: 4, dg65: 1 },
        { name: 'AL AQMAR', vendor: 'HORIZON', squareFeet: 9368, tons: 125, dg125: 4, dg65: 1 },
        { name: 'HAIDERY TOWNSHIP', vendor: 'SELF', squareFeet: 4000, tons: 54, dg125: 2, dg65: 0 },
        { name: 'HAKIMI VIAHR', vendor: 'PENDING', squareFeet: 5000, tons: 45, dg125: 2, dg65: 0 },
        { name: 'SAI PARADISE', vendor: 'ANAS', squareFeet: 5500, tons: 74, dg125: 3, dg65: 0 },
        { name: 'HASANJI NAGAR', vendor: 'ANAS', squareFeet: 21577, tons: 288, dg125: 9, dg65: 0 },
        { name: 'RAU', vendor: 'HORIZON', squareFeet: 6854, tons: 92, dg125: 3, dg65: 1 },
        { name: 'MHOW EZZY', vendor: 'PENDING', squareFeet: 3704, tons: 25, dg125: 1, dg65: 1 },
        { name: 'MHOW SAIFFE', vendor: 'SELF', squareFeet: null, tons: null, dg125: 0, dg65: 0 },
        { name: 'MASAKIN', vendor: 'SELF', squareFeet: null, tons: null, dg125: 0, dg65: 0 },
      ];

      for (const zoneInfo of zoneData) {
        // Create zone
        const { data: zone, error: zoneError } = await supabase
          .from('zones')
          .insert({
            name: zoneInfo.name,
            location: zoneInfo.vendor + (zoneInfo.squareFeet ? `, ${zoneInfo.squareFeet} sqft` : ''),
            vendor: zoneInfo.vendor,
            square_feet: zoneInfo.squareFeet,
            tons: zoneInfo.tons
          })
          .select()
          .single();

        if (zoneError) {
          console.error(`Error creating zone ${zoneInfo.name}:`, zoneError);
          continue;
        }

        // Add 125kVA generators
        for (let i = 1; i <= zoneInfo.dg125; i++) {
          const { error: genError } = await supabase
            .from('generators')
            .insert({
              name: `125kVA #${i}`,
              zone_id: zone.id,
              status: 'offline',
              kva: 125
            });

          if (genError) {
            console.error(`Error creating generator 125kVA #${i} for zone ${zoneInfo.name}:`, genError);
          }
        }

        // Add 65kVA generators
        for (let i = 1; i <= zoneInfo.dg65; i++) {
          const { error: genError } = await supabase
            .from('generators')
            .insert({
              name: `65kVA #${i}`,
              zone_id: zone.id,
              status: 'offline',
              kva: 65
            });

          if (genError) {
            console.error(`Error creating generator 65kVA #${i} for zone ${zoneInfo.name}:`, genError);
          }
        }
      }

      console.log('✅ Default zones and generators created');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  
  // Socket.IO setup
  const io = socketIo(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
        : "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Middleware
  expressApp.use(cors());
  expressApp.use(express.json());

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API Routes
  expressApp.post('/api/register', async (req, res) => {
    try {
      const { username, password, name, email, role = 'operator' } = req.body;

      if (!username || !password || !name || !email) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          username,
          password: hashedPassword,
          name,
          email,
          role
        })
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
      }

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  expressApp.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  expressApp.get('/api/generators', authenticateToken, async (req, res) => {
    try {
      let query = supabase
        .from('generators')
        .select(`
          *,
          zones (
            id,
            name,
            location,
            assigned_operator_id
          )
        `);

      // If user is operator, only show their assigned generators
      if (req.user.role === 'operator') {
        query = query.eq('zones.assigned_operator_id', req.user.id);
      }

      const { data: generators, error } = await query;

      if (error) {
        console.error('Error fetching generators:', error);
        return res.status(500).json({ error: 'Failed to fetch generators' });
      }

      res.json(generators);
    } catch (error) {
      console.error('Error fetching generators:', error);
      res.status(500).json({ error: 'Failed to fetch generators' });
    }
  });

  expressApp.post('/api/generators/:id/:action', authenticateToken, async (req, res) => {
    try {
      const { id, action } = req.params;
      const { location } = req.body;

      if (!['start', 'stop'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const newStatus = action === 'start' ? 'running' : 'offline';

      // Update generator status
      const { data: generator, error: genError } = await supabase
        .from('generators')
        .update({ 
          status: newStatus,
          last_operator_id: req.user.id
        })
        .eq('id', id)
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .single();

      if (genError) {
        console.error('Error updating generator:', genError);
        return res.status(500).json({ error: `Failed to ${action} generator` });
      }

      // Create log entry
      const { error: logError } = await supabase
        .from('logs')
        .insert({
          generator_id: id,
          operator_id: req.user.id,
          operator_name: req.user.username,
          action,
          location: location || 'Unknown',
          timestamp: new Date().toISOString()
        });

      if (logError) {
        console.error('Error creating log:', logError);
      }

      // Emit real-time update
      const logData = {
        generator: generator,
        log: {
          id: uuidv4(),
          generatorId: id,
          generatorName: generator.name,
          operatorId: req.user.id,
          operatorName: req.user.username,
          action,
          location: location || 'Unknown',
          timestamp: new Date().toISOString(),
          zoneName: generator.zones?.name
        }
      };

      io.emit('generatorUpdate', logData);

      res.json({ message: `Generator ${action}ed successfully` });
    } catch (error) {
      console.error(`Error ${req.params.action}ing generator:`, error);
      res.status(500).json({ error: `Failed to ${req.params.action} generator` });
    }
  });

  expressApp.get('/api/zones', authenticateToken, async (req, res) => {
    try {
      const { data: zones, error } = await supabase
        .from('zones')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching zones:', error);
        return res.status(500).json({ error: 'Failed to fetch zones' });
      }

      res.json(zones);
    } catch (error) {
      console.error('Error fetching zones:', error);
      res.status(500).json({ error: 'Failed to fetch zones' });
    }
  });

  expressApp.post('/api/zones/complete', authenticateToken, async (req, res) => {
    try {
      const { zoneName, generatorsByType, operatorId } = req.body;

      if (!zoneName) {
        return res.status(400).json({ error: 'Zone name is required' });
      }

      // Create zone
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .insert({
          name: zoneName,
          location: 'Location to be updated',
          assigned_operator_id: operatorId || null
        })
        .select()
        .single();

      if (zoneError) {
        console.error('Error creating zone:', zoneError);
        return res.status(500).json({ error: 'Failed to create zone' });
      }

      // Create generators
      for (const [kva, count] of Object.entries(generatorsByType)) {
        for (let i = 1; i <= count; i++) {
          const { error: genError } = await supabase
            .from('generators')
            .insert({
              name: `${kva}kVA #${i}`,
              zone_id: zone.id,
              status: 'offline',
              kva: parseInt(kva)
            });

          if (genError) {
            console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
          }
        }
      }

      res.status(201).json({ message: 'Zone created successfully', zone });
    } catch (error) {
      console.error('Error creating zone:', error);
      res.status(500).json({ error: 'Failed to create zone' });
    }
  });

  expressApp.put('/api/zones/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, generatorsByType, operatorId } = req.body;

      // Update zone
      const { error: zoneError } = await supabase
        .from('zones')
        .update({
          name,
          assigned_operator_id: operatorId || null
        })
        .eq('id', id);

      if (zoneError) {
        console.error('Error updating zone:', zoneError);
        return res.status(500).json({ error: 'Failed to update zone' });
      }

      // Update generators if provided
      if (generatorsByType) {
        // Delete existing generators
        await supabase
          .from('generators')
          .delete()
          .eq('zone_id', id);

        // Create new generators
        for (const [kva, count] of Object.entries(generatorsByType)) {
          for (let i = 1; i <= count; i++) {
            const { error: genError } = await supabase
              .from('generators')
              .insert({
                name: `${kva}kVA #${i}`,
                zone_id: id,
                status: 'offline',
                kva: parseInt(kva)
              });

            if (genError) {
              console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
            }
          }
        }
      }

      res.json({ message: 'Zone updated successfully' });
    } catch (error) {
      console.error('Error updating zone:', error);
      res.status(500).json({ error: 'Failed to update zone' });
    }
  });

  expressApp.get('/api/users', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, name, email, role')
        .order('name');

      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  expressApp.get('/api/logs', authenticateToken, async (req, res) => {
    try {
      let query = supabase
        .from('logs')
        .select(`
          *,
          generators (
            name,
            zones (
              name
            )
          )
        `)
        .order('timestamp', { ascending: false });

      // If user is operator, only show their logs
      if (req.user.role === 'operator') {
        query = query.eq('operator_id', req.user.id);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
        return res.status(500).json({ error: 'Failed to fetch logs' });
      }

      res.json(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Handle all other requests with Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO: http://localhost:${PORT}`);
    
    // Initialize default data
    await initializeData();
  });
}); 