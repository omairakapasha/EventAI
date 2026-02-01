-- Migration: 009_create_events_table
-- Description: Create events table for orchestrated event planning
-- Currency: PKR (Pakistani Rupees)

CREATE TYPE event_status AS ENUM (
  'draft', 'planning', 'quoted', 'approved', 
  'confirmed', 'completed', 'cancelled'
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(255),
  event_date DATE NOT NULL,
  event_time TIME,
  event_end_date DATE,
  event_end_time TIME,
  
  -- Location
  location VARCHAR(255),
  venue_details JSONB DEFAULT '{}',
  
  -- Client Info
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  attendees INT,
  
  -- Budget (PKR)
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'PKR',
  total_quoted DECIMAL(15,2),
  total_paid DECIMAL(15,2) DEFAULT 0,
  
  -- Planning
  status event_status DEFAULT 'draft',
  preferences JSONB DEFAULT '[]',
  requirements TEXT,
  
  -- AI Agent Fields
  agent_session_id VARCHAR(255),
  agent_plan JSONB DEFAULT '{}',
  agent_logs JSONB DEFAULT '[]',
  
  -- User Approval Workflow
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_client_email ON events(client_email);
CREATE INDEX idx_events_agent_session ON events(agent_session_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Location search
CREATE INDEX idx_events_location ON events(location);

-- Full-text search on event details
CREATE INDEX idx_events_search ON events USING GIN (
  to_tsvector('english', 
    COALESCE(event_name, '') || ' ' || 
    COALESCE(event_type, '') || ' ' || 
    COALESCE(location, '')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Event Vendors Junction Table (Many-to-Many)
CREATE TABLE event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  
  -- Selection details
  selected_by VARCHAR(50) DEFAULT 'agent', -- 'agent', 'user', 'admin'
  selection_reason TEXT,
  match_score DECIMAL(5,4), -- 0.0000 to 1.0000
  
  -- Pricing (PKR)
  quoted_price DECIMAL(15,2),
  final_price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'PKR',
  
  -- Status
  status VARCHAR(50) DEFAULT 'proposed', -- proposed, accepted, rejected, confirmed
  vendor_response TEXT,
  responded_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, vendor_id)
);

-- Indexes for event_vendors
CREATE INDEX idx_event_vendors_event_id ON event_vendors(event_id);
CREATE INDEX idx_event_vendors_vendor_id ON event_vendors(vendor_id);
CREATE INDEX idx_event_vendors_status ON event_vendors(status);

-- Trigger for updated_at
CREATE TRIGGER update_event_vendors_updated_at
  BEFORE UPDATE ON event_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE events IS 'Events planned through the Agentic Event Orchestrator';
COMMENT ON TABLE event_vendors IS 'Vendors selected/proposed for each event';
COMMENT ON COLUMN events.budget IS 'Total budget in PKR';
COMMENT ON COLUMN events.agent_plan IS 'JSON containing the AI-generated event plan';
