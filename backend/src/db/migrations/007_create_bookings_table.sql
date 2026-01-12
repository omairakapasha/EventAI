-- Migration: 007_create_bookings_table
-- Description: Create bookings and booking_messages tables

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'in_progress', 'completed', 
  'cancelled', 'rejected', 'no_show'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'partial', 'paid', 'refunded', 'failed'
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Event details
  event_id UUID, -- Reference to orchestrator event
  event_name VARCHAR(255),
  event_date DATE NOT NULL,
  event_start_time TIME,
  event_end_time TIME,
  event_location JSONB,
  
  -- Client info
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  guest_count INT,
  
  -- Booking details
  status booking_status DEFAULT 'pending',
  quantity INT DEFAULT 1,
  special_requirements TEXT,
  notes TEXT,
  
  -- Pricing
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  currency currency_code DEFAULT 'USD',
  
  -- Payment
  payment_status payment_status DEFAULT 'pending',
  deposit_amount DECIMAL(12,2),
  deposit_paid_at TIMESTAMPTZ,
  
  -- Workflow
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES vendor_users(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES vendor_users(id),
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_vendor_id ON bookings(vendor_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Composite index for calendar views
CREATE INDEX idx_bookings_vendor_date ON bookings(vendor_id, event_date);

-- Trigger for updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Booking Messages Table
CREATE TABLE booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES vendor_users(id),
  sender_type VARCHAR(20) NOT NULL, -- 'vendor', 'client', 'system'
  
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for booking_messages
CREATE INDEX idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender_id ON booking_messages(sender_id);
CREATE INDEX idx_booking_messages_created_at ON booking_messages(created_at DESC);
