-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'administrator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  vendor VARCHAR(255),
  square_feet INTEGER,
  tons INTEGER,
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generators table
CREATE TABLE IF NOT EXISTS generators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  kva INTEGER,
  status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('running', 'offline')),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  last_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
  generator_name VARCHAR(255),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  zone_name VARCHAR(255),
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name VARCHAR(255),
  action VARCHAR(50) NOT NULL CHECK (action IN ('start', 'stop')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location VARCHAR(255),
  status VARCHAR(50) CHECK (status IN ('running', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_zones_assigned_operator ON zones(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_generators_zone_id ON generators(zone_id);
CREATE INDEX IF NOT EXISTS idx_generators_status ON generators(status);
CREATE INDEX IF NOT EXISTS idx_logs_generator_id ON logs(generator_id);
CREATE INDEX IF NOT EXISTS idx_logs_operator_id ON logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies (basic - you may want to customize these based on your needs)
-- For now, we'll allow all operations (the application will handle authorization)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on zones" ON zones FOR ALL USING (true);
CREATE POLICY "Allow all operations on generators" ON generators FOR ALL USING (true);
CREATE POLICY "Allow all operations on logs" ON logs FOR ALL USING (true); 