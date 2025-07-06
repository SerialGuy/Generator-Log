-- Add new columns to existing users table (only if they don't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add new columns to existing zones table (only if they don't exist)
ALTER TABLE zones 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add new columns to existing generators table (only if they don't exist)
ALTER TABLE generators 
ADD COLUMN IF NOT EXISTS fuel_capacity_liters DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS current_fuel_level DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS total_runtime_hours DECIMAL(10,2) DEFAULT 0;

-- Add new columns to existing logs table (only if they don't exist)
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

-- Create fuel prices table
CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(8,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing table
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Create billing details table
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

-- Create notifications table
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

-- Create audit logs table
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

-- Create system settings table
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

-- Create maintenance schedules table
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

-- Create indexes for better performance (only if they don't exist)
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

-- Enable Row Level Security (RLS) on new tables only
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables only
CREATE POLICY "Allow all operations on fuel_prices" ON fuel_prices FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing" ON billing FOR ALL USING (true);
CREATE POLICY "Allow all operations on billing_details" ON billing_details FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true);

-- Insert default system settings (only if they don't exist)
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_fuel_price', '1.50', 'decimal', 'Default fuel price per liter', true),
('billing_cycle_days', '30', 'integer', 'Billing cycle in days', true),
('maintenance_reminder_days', '7', 'integer', 'Days before maintenance to send reminder', true),
('fault_notification_emails', '', 'string', 'Comma-separated emails for fault notifications', false),
('system_name', 'Generator Log System', 'string', 'System display name', true),
('timezone', 'UTC', 'string', 'System timezone', true),
('currency', 'USD', 'string', 'System currency', true),
('service_fee_percentage', '5.0', 'decimal', 'Service fee percentage', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default fuel price (only if none exists)
INSERT INTO fuel_prices (price_per_liter, effective_date, is_active, created_by) 
SELECT 1.50, CURRENT_DATE, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM fuel_prices WHERE is_active = true);

-- Create functions for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (current_setting('app.current_user_id')::uuid, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (current_setting('app.current_user_id')::uuid, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (current_setting('app.current_user_id')::uuid, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging (only for new tables)
CREATE TRIGGER audit_billing_trigger AFTER INSERT OR UPDATE OR DELETE ON billing
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to calculate runtime hours
CREATE OR REPLACE FUNCTION calculate_runtime_hours(generator_uuid UUID, start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
DECLARE
    runtime DECIMAL;
BEGIN
    SELECT EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 INTO runtime;
    RETURN runtime;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS VARCHAR AS $$
DECLARE
    bill_number VARCHAR;
    year_part VARCHAR;
    sequence_part VARCHAR;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM billing
    WHERE bill_number LIKE 'BILL-' || year_part || '-%';
    
    bill_number := 'BILL-' || year_part || '-' || LPAD(sequence_part::VARCHAR, 6, '0');
    RETURN bill_number;
END;
$$ LANGUAGE plpgsql; 