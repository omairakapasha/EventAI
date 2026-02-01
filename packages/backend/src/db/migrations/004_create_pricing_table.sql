-- Migration: 004_create_pricing_table
-- Description: Create pricing and price_history tables

CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED');
CREATE TYPE pricing_status AS ENUM ('draft', 'pending_approval', 'active', 'expired', 'rejected');

CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Pricing
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  currency currency_code DEFAULT 'USD',
  
  -- Validity
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  status pricing_status DEFAULT 'active',
  
  -- Approval
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES vendor_users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Surcharges
  holiday_surcharge_percent DECIMAL(5,2) DEFAULT 0,
  weekend_surcharge_percent DECIMAL(5,2) DEFAULT 0,
  rush_surcharge_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Discounts
  min_quantity_for_discount INT,
  bulk_discount_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES vendor_users(id)
);

-- Indexes
CREATE INDEX idx_pricing_service_id ON pricing(service_id);
CREATE INDEX idx_pricing_vendor_id ON pricing(vendor_id);
CREATE INDEX idx_pricing_is_active ON pricing(is_active);
CREATE INDEX idx_pricing_status ON pricing(status);
CREATE INDEX idx_pricing_effective_date ON pricing(effective_date);
CREATE INDEX idx_pricing_expiry_date ON pricing(expiry_date);

-- Unique constraint for active pricing per service
CREATE UNIQUE INDEX idx_pricing_active_service ON pricing(service_id) 
  WHERE is_active = TRUE AND status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_pricing_updated_at
  BEFORE UPDATE ON pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Price History Table
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_id UUID NOT NULL REFERENCES pricing(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  old_price DECIMAL(12,2) NOT NULL,
  new_price DECIMAL(12,2) NOT NULL,
  price_change_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN old_price > 0 THEN ((new_price - old_price) / old_price * 100) ELSE 0 END
  ) STORED,
  
  changed_by UUID REFERENCES vendor_users(id),
  change_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price_history
CREATE INDEX idx_price_history_pricing_id ON price_history(pricing_id);
CREATE INDEX idx_price_history_service_id ON price_history(service_id);
CREATE INDEX idx_price_history_vendor_id ON price_history(vendor_id);
CREATE INDEX idx_price_history_created_at ON price_history(created_at DESC);
