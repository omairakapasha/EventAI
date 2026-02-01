-- Migration: 003_create_services_table
-- Description: Create services table for vendor offerings

CREATE TYPE service_category AS ENUM (
  'venue', 'catering', 'photography', 'videography', 
  'music', 'decoration', 'transportation', 'accommodation',
  'planning', 'entertainment', 'equipment', 'staffing', 'other'
);

CREATE TYPE unit_type AS ENUM (
  'per_hour', 'per_day', 'per_event', 'per_person', 
  'per_unit', 'flat_rate', 'custom'
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category service_category NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  
  -- Capacity & Quantities
  unit_type unit_type DEFAULT 'per_event',
  min_quantity INT DEFAULT 1,
  max_quantity INT,
  capacity INT,
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  lead_time_days INT DEFAULT 0,
  
  -- Media
  images JSONB DEFAULT '[]',
  featured_image VARCHAR(500),
  
  -- Requirements
  requirements JSONB DEFAULT '{}',
  inclusions JSONB DEFAULT '[]',
  exclusions JSONB DEFAULT '[]',
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Stats
  booking_count INT DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_vendor_id ON services(vendor_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_services_unit_type ON services(unit_type);
CREATE INDEX idx_services_rating ON services(rating_average DESC);
CREATE INDEX idx_services_tags ON services USING GIN(tags);
CREATE INDEX idx_services_search ON services USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Trigger for updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
