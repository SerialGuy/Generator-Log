-- =====================================================
-- CLEAN DATABASE SCHEMA - DROP AND RECREATE ALL TABLES
-- Use this for development when you want to start fresh
-- =====================================================

-- Step 1: Drop all existing tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS billing_details CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS fuel_prices CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS generators CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Drop all functions
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS calculate_runtime_hours(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS generate_bill_number() CASCADE;
DROP FUNCTION IF EXISTS set_current_user(UUID) CASCADE;

-- Step 3: Create users table with correct role constraint
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CLIENT', 'OPERATOR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true
);

-- Step 4: Create clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create zones table
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create generators table
CREATE TABLE generators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  kva DECIMAL(8,2) NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'fault')),
  fuel_type VARCHAR(50) DEFAULT 'diesel',
  fuel_capacity_liters DECIMAL(10,2),
  current_fuel_level DECIMAL(10,2),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  total_runtime_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create logs table
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  runtime_hours DECIMAL(5,2),
  fuel_consumed_liters DECIMAL(8,2),
  fuel_added_liters DECIMAL(8,2),
  fuel_level_before DECIMAL(8,2),
  fuel_level_after DECIMAL(8,2),
  remarks TEXT,
  fault_description TEXT,
  maintenance_actions TEXT,
  attachments JSONB
);

-- Step 8: Create fuel prices table
CREATE TABLE fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(8,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Create billing table
CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_fuel_consumed DECIMAL(10,2) DEFAULT 0,
  total_runtime_hours DECIMAL(10,2) DEFAULT 0,
  fuel_cost DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue')),
  bill_number VARCHAR(50) UNIQUE,
  sent_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 10: Create billing details table
CREATE TABLE billing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id UUID REFERENCES billing(id) ON DELETE CASCADE,
  generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
  generator_name VARCHAR(255),
  fuel_consumed DECIMAL(8,2),
  runtime_hours DECIMAL(8,2),
  fuel_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 11: Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) CHECK (type IN ('alert', 'reminder', 'fault', 'maintenance', 'billing')),
  is_read BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 12: Create audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 13: Create system settings table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 14: Create maintenance schedules table
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(100) NOT NULL,
  frequency_hours INTEGER,
  frequency_days INTEGER,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 15: Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_zones_assigned_operator ON zones(assigned_operator_id);
CREATE INDEX idx_zones_client ON zones(client_id);
CREATE INDEX idx_generators_zone_id ON generators(zone_id);
CREATE INDEX idx_generators_status ON generators(status);
CREATE INDEX idx_logs_generator_id ON logs(generator_id);
CREATE INDEX idx_logs_operator_id ON logs(operator_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_fuel_prices_effective_date ON fuel_prices(effective_date);
CREATE INDEX idx_billing_zone_id ON billing(zone_id);
CREATE INDEX idx_billing_client_id ON billing(client_id);
CREATE INDEX idx_billing_status ON billing(status);
CREATE INDEX idx_billing_period ON billing(billing_period_start, billing_period_end);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Step 16: Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Step 17: Create policies for all tables
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on zones" ON zones FOR ALL USING (true);
CREATE POLICY "Allow all operations on generators" ON generators FOR ALL USING (true);
CREATE POLICY "Allow all operations on logs" ON logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on fuel_prices" ON fuel_prices FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing" ON billing FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing_details" ON billing_details FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true);

-- Step 18: Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_fuel_price', '1.50', 'decimal', 'Default fuel price per liter', true),
('billing_cycle_days', '30', 'integer', 'Billing cycle in days', true),
('maintenance_reminder_days', '7', 'integer', 'Days before maintenance to send reminder', true),
('fault_notification_emails', '', 'string', 'Comma-separated emails for fault notifications', false),
('system_name', 'Generator Log System', 'string', 'System display name', true),
('timezone', 'UTC', 'string', 'System timezone', true),
('currency', 'INR', 'string', 'System currency', true),
('service_fee_percentage', '5.0', 'decimal', 'Service fee percentage', true);

-- Step 19: Insert default fuel price
INSERT INTO fuel_prices (price_per_liter, effective_date, is_active) VALUES (1.50, CURRENT_DATE, true);

-- Step 20: Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (current_setting('app.current_user_id')::UUID, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (current_setting('app.current_user_id')::UUID, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (current_setting('app.current_user_id')::UUID, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 21: Create audit triggers for billing table
CREATE TRIGGER audit_billing_trigger AFTER INSERT OR UPDATE OR DELETE ON billing
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Step 22: Create utility functions
CREATE OR REPLACE FUNCTION calculate_runtime_hours(generator_uuid UUID, start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600;
END;
$$ LANGUAGE plpgsql;

-- Step 23: Create function to generate bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  bill_number VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM billing
  WHERE bill_number LIKE 'BILL%';
  
  bill_number := 'BILL' || LPAD(next_number::TEXT, 6, '0');
  RETURN bill_number;
END;
$$ LANGUAGE plpgsql;

-- Step 24: Create function to set current user for audit logs
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Step 25: Insert a default admin user (password: admin123)
INSERT INTO users (username, password, name, email, role) VALUES 
('admin', '$2a$10$XoAZWgefbeatvfMTY.ywCertl9FL7sybPwXxwr/Mb6ZJUHzUKJoSi', 'System Administrator', 'admin@generatorlog.com', 'ADMIN');

-- Step 26: Verify the setup
SELECT 'Clean database schema created successfully' as status;
SELECT 'Default admin user created:' as info;
SELECT username, name, email, role FROM users WHERE role = 'ADMIN';
SELECT 'Total tables created:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'; 