-- Migration: 006_create_audit_logs_table
-- Description: Create audit_logs table for tracking all mutations

CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'login', 'logout', 
  'password_change', 'settings_change', 'api_key_generate',
  'document_upload', 'document_verify', 'status_change'
);

CREATE TYPE entity_type AS ENUM (
  'vendor', 'vendor_user', 'service', 'pricing', 
  'document', 'booking', 'api_key', 'webhook'
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  user_id UUID REFERENCES vendor_users(id) ON DELETE SET NULL,
  
  -- Action details
  action audit_action NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id UUID,
  
  -- Changes
  old_value JSONB,
  new_value JSONB,
  changes JSONB,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  
  -- Additional info
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_vendor_id ON audit_logs(vendor_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_vendor_entity ON audit_logs(vendor_id, entity_type, created_at DESC);

-- Partition by month for better performance (optional, implement if high volume)
-- CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
