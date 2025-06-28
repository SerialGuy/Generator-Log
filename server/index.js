const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase');

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
      // Pre-populate zones and generators from the provided table
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

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
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

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        name,
        email,
        role
      })
      .select('id, username, name, role')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Registration failed' });
    }

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
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
app.get('/api/zones', authenticateToken, async (req, res) => {
  try {
    const { data: zones, error } = await supabase
      .from('zones')
      .select(`
        *,
        assigned_operator:users!zones_assigned_operator_id_fkey(id, name, username)
      `);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch zones' });
    }

    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// Get generators
app.get('/api/generators', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('generators')
      .select(`
        *,
        zone:zones!generators_zone_id_fkey(id, name, assigned_operator_id),
        last_operator:users!generators_last_operator_id_fkey(id, name, username)
      `);

    // If user is not admin, filter by assigned zones
    if (req.user.role !== 'administrator') {
      const { data: userZones } = await supabase
        .from('zones')
        .select('id')
        .eq('assigned_operator_id', req.user.id);

      if (userZones && userZones.length > 0) {
        const zoneIds = userZones.map(z => z.id);
        query = query.in('zone_id', zoneIds);
      } else {
        // No zones assigned, return empty array
        return res.json([]);
      }
    }

    const { data: generators, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch generators' });
    }

    res.json(generators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generators' });
  }
});

// Get logs
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false });

    // If user is not admin, filter by operator
    if (req.user.role !== 'administrator') {
      query = query.eq('operator_id', req.user.id);
    }

    const { data: logs, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Log generator start
app.post('/api/generators/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    
    // Get generator with zone info
    const { data: generator, error: genError } = await supabase
      .from('generators')
      .select(`
        *,
        zone:zones!generators_zone_id_fkey(id, name, assigned_operator_id)
      `)
      .eq('id', id)
      .single();

    if (genError || !generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    // Check if operator has access to this generator
    if (req.user.role !== 'administrator') {
      if (!generator.zone || generator.zone.assigned_operator_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (generator.status === 'running') {
      return res.status(400).json({ error: 'Generator is already running' });
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('logs')
      .insert({
        generator_id: id,
        generator_name: generator.name,
        zone_id: generator.zone_id,
        zone_name: generator.zone ? generator.zone.name : 'Unknown Zone',
        operator_id: req.user.id,
        operator_name: req.user.name,
        action: 'start',
        location: location || 'Unknown',
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: 'Failed to create log entry' });
    }

    // Update generator status
    const { error: updateError } = await supabase
      .from('generators')
      .update({ 
        status: 'running',
        last_operator_id: req.user.id
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update generator status' });
    }

    // Emit real-time update
    io.emit('generatorUpdate', { generator: { ...generator, status: 'running' }, log: logEntry });

    res.json({ message: 'Generator started successfully', log: logEntry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start generator' });
  }
});

// Log generator stop
app.post('/api/generators/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    
    // Get generator with zone info
    const { data: generator, error: genError } = await supabase
      .from('generators')
      .select(`
        *,
        zone:zones!generators_zone_id_fkey(id, name, assigned_operator_id)
      `)
      .eq('id', id)
      .single();

    if (genError || !generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    // Check if operator has access to this generator
    if (req.user.role !== 'administrator') {
      if (!generator.zone || generator.zone.assigned_operator_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (generator.status === 'offline') {
      return res.status(400).json({ error: 'Generator is already offline' });
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('logs')
      .insert({
        generator_id: id,
        generator_name: generator.name,
        zone_id: generator.zone_id,
        zone_name: generator.zone ? generator.zone.name : 'Unknown Zone',
        operator_id: req.user.id,
        operator_name: req.user.name,
        action: 'stop',
        location: location || 'Unknown',
        status: 'offline'
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: 'Failed to create log entry' });
    }

    // Update generator status
    const { error: updateError } = await supabase
      .from('generators')
      .update({ status: 'offline' })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update generator status' });
    }

    // Emit real-time update
    io.emit('generatorUpdate', { generator: { ...generator, status: 'offline' }, log: logEntry });

    res.json({ message: 'Generator stopped successfully', log: logEntry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop generator' });
  }
});

// Assign operator to zone (admin only)
app.post('/api/zones/:id/assign-operator', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { operatorId } = req.body;

    // Check if zone exists
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id')
      .eq('id', id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Check if operator exists
    const { data: operator, error: operatorError } = await supabase
      .from('users')
      .select('id')
      .eq('id', operatorId)
      .eq('role', 'operator')
      .single();

    if (operatorError || !operator) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    // Remove operator from any other zones first
    await supabase
      .from('zones')
      .update({ assigned_operator_id: null })
      .eq('assigned_operator_id', operatorId);

    // Assign operator to this zone
    const { data: updatedZone, error: updateError } = await supabase
      .from('zones')
      .update({ assigned_operator_id: operatorId })
      .eq('id', id)
      .select(`
        *,
        assigned_operator:users!zones_assigned_operator_id_fkey(id, name, username)
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to assign operator' });
    }

    res.json({ message: 'Operator assigned successfully', zone: updatedZone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign operator' });
  }
});

// Create new zone (admin only)
app.post('/api/zones', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const { data: newZone, error } = await supabase
      .from('zones')
      .insert({
        name,
        location
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create zone' });
    }

    res.status(201).json({ message: 'Zone created successfully', zone: newZone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// Update zone (admin only)
app.put('/api/zones/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, generatorsByType, operatorId } = req.body;

    // Check if zone exists
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id')
      .eq('id', id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Update zone name if provided
    if (name) {
      const { error: updateError } = await supabase
        .from('zones')
        .update({ name })
        .eq('id', id);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update zone' });
      }
    }

    // Update operator assignment if provided
    if (typeof operatorId !== 'undefined') {
      if (operatorId) {
        // Check if operator exists
        const { data: operator, error: operatorError } = await supabase
          .from('users')
          .select('id')
          .eq('id', operatorId)
          .eq('role', 'operator')
          .single();

        if (operatorError || !operator) {
          return res.status(404).json({ error: 'Operator not found' });
        }

        // Remove operator from any other zones first
        await supabase
          .from('zones')
          .update({ assigned_operator_id: null })
          .eq('assigned_operator_id', operatorId);
      }

      const { error: updateError } = await supabase
        .from('zones')
        .update({ assigned_operator_id: operatorId || null })
        .eq('id', id);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update operator assignment' });
      }
    }

    // Update generators if provided
    if (generatorsByType && typeof generatorsByType === 'object') {
      // Remove existing generators for this zone
      await supabase
        .from('generators')
        .delete()
        .eq('zone_id', id);

      // Add new generators by type
      for (const [kva, count] of Object.entries(generatorsByType)) {
        for (let i = 1; i <= count; i++) {
          const { error: genError } = await supabase
            .from('generators')
            .insert({
              name: `${kva}kVA #${i}`,
              zone_id: id,
              status: 'offline',
              kva: Number(kva)
            });

          if (genError) {
            console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
          }
        }
      }
    }

    // Get updated zone
    const { data: updatedZone, error: fetchError } = await supabase
      .from('zones')
      .select(`
        *,
        assigned_operator:users!zones_assigned_operator_id_fkey(id, name, username)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch updated zone' });
    }

    res.json({ message: 'Zone updated successfully', zone: updatedZone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// Delete zone (admin only)
app.delete('/api/zones/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;

    // Check if zone has generators
    const { data: zoneGenerators, error: genError } = await supabase
      .from('generators')
      .select('id')
      .eq('zone_id', id);

    if (genError) {
      return res.status(500).json({ error: 'Failed to check zone generators' });
    }

    if (zoneGenerators && zoneGenerators.length > 0) {
      return res.status(400).json({ error: 'Cannot delete zone with assigned generators' });
    }

    const { error: deleteError } = await supabase
      .from('zones')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete zone' });
    }

    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// Create new generator (admin only)
app.post('/api/generators', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, zoneId } = req.body;

    if (!name || !zoneId) {
      return res.status(400).json({ error: 'Name and zoneId are required' });
    }

    // Check if zone exists
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const { data: newGenerator, error } = await supabase
      .from('generators')
      .insert({
        name,
        zone_id: zoneId,
        status: 'offline'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create generator' });
    }

    res.status(201).json({ message: 'Generator created successfully', generator: newGenerator });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create generator' });
  }
});

// Update generator (admin only)
app.put('/api/generators/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, zoneId } = req.body;

    // Check if generator exists
    const { data: generator, error: genError } = await supabase
      .from('generators')
      .select('id')
      .eq('id', id)
      .single();

    if (genError || !generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (zoneId) {
      // Check if zone exists
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .select('id')
        .eq('id', zoneId)
        .single();

      if (zoneError || !zone) {
        return res.status(404).json({ error: 'Zone not found' });
      }
      updateData.zone_id = zoneId;
    }

    const { data: updatedGenerator, error: updateError } = await supabase
      .from('generators')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update generator' });
    }

    res.json({ message: 'Generator updated successfully', generator: updatedGenerator });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update generator' });
  }
});

// Delete generator (admin only)
app.delete('/api/generators/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;

    const { error: deleteError } = await supabase
      .from('generators')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete generator' });
    }

    res.json({ message: 'Generator deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete generator' });
  }
});

// Get logs by zone (admin only)
app.get('/api/logs/zone/:zoneId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { zoneId } = req.params;

    const { data: logs, error } = await supabase
      .from('logs')
      .select('*')
      .eq('zone_id', zoneId)
      .order('timestamp', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch zone logs' });
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch zone logs' });
  }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, name, email, role')
      .order('name');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Combined zone creation with generator and operator assignment (admin only)
app.post('/api/zones/complete', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { zoneName, generatorsByType, operatorId } = req.body;

    if (!zoneName || !generatorsByType) {
      return res.status(400).json({ error: 'Zone name and generator counts are required' });
    }

    // If operatorId is provided, enforce unique assignment
    if (operatorId) {
      const { data: operator, error: operatorError } = await supabase
        .from('users')
        .select('id')
        .eq('id', operatorId)
        .eq('role', 'operator')
        .single();

      if (operatorError || !operator) {
        return res.status(404).json({ error: 'Operator not found' });
      }

      // Remove operator from any other zones first
      await supabase
        .from('zones')
        .update({ assigned_operator_id: null })
        .eq('assigned_operator_id', operatorId);
    }

    // Create new zone
    const { data: newZone, error: zoneError } = await supabase
      .from('zones')
      .insert({
        name: zoneName,
        assigned_operator_id: operatorId || null
      })
      .select()
      .single();

    if (zoneError) {
      return res.status(500).json({ error: 'Failed to create zone' });
    }

    // Create generators for this zone by type
    const newGenerators = [];
    for (const [kva, count] of Object.entries(generatorsByType)) {
      for (let i = 1; i <= count; i++) {
        const { data: generator, error: genError } = await supabase
          .from('generators')
          .insert({
            name: `${kva}kVA #${i}`,
            zone_id: newZone.id,
            status: 'offline',
            kva: Number(kva)
          })
          .select()
          .single();

        if (genError) {
          console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
        } else {
          newGenerators.push(generator);
        }
      }
    }

    res.status(201).json({
      message: 'Zone created successfully',
      zone: newZone,
      generators: newGenerators
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize data and start server
initializeData().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Default admin credentials: admin / admin123`);
    console.log(`👤 Default operator credentials: operator / operator123`);
    console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
    console.log(`🌐 Frontend should be available at: http://localhost:3000`);
  });
}).catch(error => {
  console.error('Failed to initialize data:', error);
  process.exit(1);
}); 