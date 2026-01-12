-- Migration: 001_create_vendors_table
-- Description: Create vendors table for business registration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE vendor_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD');
CREATE TYPE vendor_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  contact_email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address JSONB DEFAULT '{}',
  description TEXT,
  logo_url VARCHAR(500),
  website VARCHAR(500),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  status vendor_status DEFAULT 'PENDING',
  tier vendor_tier DEFAULT 'BRONZE',
  api_enabled BOOLEAN DEFAULT FALSE,
  api_config JSONB DEFAULT '{}',
  service_areas JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_vendors_email ON vendors(contact_email);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_tier ON vendors(tier);
CREATE INDEX idx_vendors_verified ON vendors(verified);
CREATE INDEX idx_vendors_api_enabled ON vendors(api_enabled);
CREATE INDEX idx_vendors_created_at ON vendors(created_at DESC);

-- Full-text search index on name and description
CREATE INDEX idx_vendors_search ON vendors USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
