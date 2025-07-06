-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA UPDATE
-- Fixes role inconsistencies and updates existing data
-- =====================================================

-- Step 1: Update existing users from 'technician' to 'OPERATOR'
UPDATE users 
SET role = 'OPERATOR' 
WHERE role = 'technician';

-- Step 2: Update existing users from 'administrator' to 'ADMIN'
UPDATE users 
SET role = 'ADMIN' 
WHERE role = 'administrator';

-- Step 3: Update existing users from 'client' to 'CLIENT'
UPDATE users 
SET role = 'CLIENT' 
WHERE role = 'client';

-- Step 4: Update existing users from 'operator' to 'OPERATOR'
UPDATE users 
SET role = 'OPERATOR' 
WHERE role = 'operator';

-- Step 5: Update existing users from 'commercial' to 'CLIENT'
UPDATE users 
SET role = 'CLIENT' 
WHERE role = 'commercial';

-- Step 6: Add constraint to ensure only valid roles are used
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'CLIENT', 'OPERATOR'));

-- Step 7: Update zones table to reference clients table instead of users
-- First, create a temporary column
ALTER TABLE zones 
ADD COLUMN IF NOT EXISTS temp_client_id UUID;

-- Update the temporary column with client IDs from users table
UPDATE zones 
SET temp_client_id = client_id 
WHERE client_id IS NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE zones 
DROP CONSTRAINT IF EXISTS zones_client_id_fkey;

-- Drop the old column
ALTER TABLE zones 
DROP COLUMN IF EXISTS client_id;

-- Add the new column referencing clients table
ALTER TABLE zones 
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Update the new column with data from clients table
-- This assumes clients table has been populated with data from users table
UPDATE zones 
SET client_id = (
  SELECT c.id 
  FROM clients c 
  WHERE c.name = (
    SELECT u.name 
    FROM users u 
    WHERE u.id = zones.temp_client_id
  )
)
WHERE temp_client_id IS NOT NULL;

-- Drop the temporary column
ALTER TABLE zones 
DROP COLUMN temp_client_id;

-- Step 8: Add new columns to existing users table (only if they don't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 9: Add new columns to existing zones table (only if they don't exist)
ALTER TABLE zones 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 10: Add new columns to existing generators table (only if they don't exist)
ALTER TABLE generators 
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'diesel',
ADD COLUMN IF NOT EXISTS fuel_capacity_liters DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS current_fuel_level DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS total_runtime_hours DECIMAL(10,2) DEFAULT 0;

-- Step 11: Add new columns to existing logs table (only if they don't exist)
ALTER TABLE logs 
ADD COLUMN IF NOT EXISTS runtime_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumed_liters DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS fuel_added_liters DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS fuel_level_before DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS fuel_level_after DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS fault_description TEXT,
ADD COLUMN IF NOT EXISTS maintenance_actions TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Step 12: Create fuel prices table
CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(8,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 13: Create billing table
CREATE TABLE IF NOT EXISTS billing (
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

-- Step 14: Create billing details table
CREATE TABLE IF NOT EXISTS billing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id UUID REFERENCES billing(id) ON DELETE CASCADE,
  generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
  generator_name VARCHAR(255),
  fuel_consumed DECIMAL(8,2),
  runtime_hours DECIMAL(8,2),
  fuel_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 15: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
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

-- Step 16: Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Step 17: Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 18: Create maintenance schedules table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
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

-- Step 19: Create clients table (if not exists)
CREATE TABLE IF NOT EXISTS clients (
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

-- Step 20: Populate clients table from users with CLIENT role
INSERT INTO clients (name, location, description, contact_person, contact_email, contact_phone)
SELECT 
  name,
  'Location to be updated' as location,
  'Client migrated from users table' as description,
  name as contact_person,
  email as contact_email,
  phone as contact_phone
FROM users 
WHERE role = 'CLIENT'
ON CONFLICT (name) DO NOTHING;

-- Step 21: Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_zones_assigned_operator ON zones(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_zones_client ON zones(client_id);
CREATE INDEX IF NOT EXISTS idx_generators_zone_id ON generators(zone_id);
CREATE INDEX IF NOT EXISTS idx_generators_status ON generators(status);
CREATE INDEX IF NOT EXISTS idx_logs_generator_id ON logs(generator_id);
CREATE INDEX IF NOT EXISTS idx_logs_operator_id ON logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_effective_date ON fuel_prices(effective_date);
CREATE INDEX IF NOT EXISTS idx_billing_zone_id ON billing(zone_id);
CREATE INDEX IF NOT EXISTS idx_billing_client_id ON billing(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);
CREATE INDEX IF NOT EXISTS idx_billing_period ON billing(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Step 22: Enable Row Level Security (RLS) on new tables only
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Step 23: Create policies for new tables only
CREATE POLICY "Allow all operations on fuel_prices" ON fuel_prices FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing" ON billing FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing_details" ON billing_details FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true);
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);

-- Step 24: Insert default system settings (only if they don't exist)
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_fuel_price', '1.50', 'decimal', 'Default fuel price per liter', true),
('billing_cycle_days', '30', 'integer', 'Billing cycle in days', true),
('maintenance_reminder_days', '7', 'integer', 'Days before maintenance to send reminder', true),
('fault_notification_emails', '', 'string', 'Comma-separated emails for fault notifications', false),
('system_name', 'Generator Log System', 'string', 'System display name', true),
('timezone', 'UTC', 'string', 'System timezone', true),
('currency', 'INR', 'string', 'System currency', true),
('service_fee_percentage', '5.0', 'decimal', 'Service fee percentage', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Step 25: Insert default fuel price (only if none exists)
INSERT INTO fuel_prices (price_per_liter, effective_date, is_active)
SELECT 1.50, CURRENT_DATE, true
WHERE NOT EXISTS (SELECT 1 FROM fuel_prices WHERE is_active = true);

-- Step 26: Create audit trigger function
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

-- Step 27: Create audit triggers for billing table
CREATE TRIGGER audit_billing_trigger AFTER INSERT OR UPDATE OR DELETE ON billing
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Step 28: Create utility functions
CREATE OR REPLACE FUNCTION calculate_runtime_hours(generator_uuid UUID, start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600;
END;
$$ LANGUAGE plpgsql;

-- Step 29: Create function to generate bill numbers
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

-- Step 30: Create function to set current user for audit logs
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Step 31: Verify the updates
SELECT 'Database schema update completed successfully' as status;
SELECT 'Updated users with new roles:' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;
SELECT 'Total clients created:' as info, COUNT(*) as count FROM clients; 