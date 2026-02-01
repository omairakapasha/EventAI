-- Migration: 008_create_api_keys_table
-- Description: Create API keys and webhooks tables for integrations

CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE api_scope AS ENUM ('read', 'write', 'admin');

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Key info
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
  key_hash VARCHAR(255) NOT NULL, -- SHA-256 of the full key
  
  -- Permissions
  scopes api_scope[] DEFAULT '{read}',
  
  -- Status
  status api_key_status DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES vendor_users(id),
  revoke_reason TEXT,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INT DEFAULT 0,
  
  -- Rate limiting
  rate_limit_per_minute INT DEFAULT 60,
  rate_limit_per_day INT DEFAULT 10000,
  
  -- Metadata
  description TEXT,
  allowed_ips TEXT[], -- IP whitelist
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES vendor_users(id)
);

-- Indexes
CREATE INDEX idx_api_keys_vendor_id ON api_keys(vendor_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- Webhooks Table
CREATE TYPE webhook_event AS ENUM (
  'booking.created', 'booking.confirmed', 'booking.cancelled',
  'booking.completed', 'message.received',
  'pricing.updated', 'service.updated'
);

CREATE TYPE webhook_status AS ENUM ('active', 'inactive', 'failing');

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Webhook config
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events webhook_event[] NOT NULL,
  secret VARCHAR(255), -- For signature verification
  
  -- Status
  status webhook_status DEFAULT 'active',
  
  -- Retry config
  max_retries INT DEFAULT 5,
  retry_delay_seconds INT DEFAULT 60,
  
  -- Health tracking
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INT DEFAULT 0,
  total_deliveries INT DEFAULT 0,
  failed_deliveries INT DEFAULT 0,
  
  -- Headers
  custom_headers JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES vendor_users(id)
);

-- Indexes
CREATE INDEX idx_webhooks_vendor_id ON webhooks(vendor_id);
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- Webhook Deliveries Log
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  event webhook_event NOT NULL,
  payload JSONB NOT NULL,
  
  -- Response
  response_status INT,
  response_body TEXT,
  response_time_ms INT,
  
  -- Status
  success BOOLEAN,
  attempt_number INT DEFAULT 1,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Indexes for webhook_deliveries
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_success ON webhook_deliveries(success);

-- Trigger for webhooks updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
