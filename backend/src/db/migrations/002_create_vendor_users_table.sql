-- Migration: 002_create_vendor_users_table
-- Description: Create vendor_users table for authentication

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'staff', 'readonly');

CREATE TABLE vendor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role DEFAULT 'staff',
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  
  -- 2FA
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  two_factor_backup_codes TEXT[],
  
  -- Account status
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMPTZ,
  
  -- Password reset
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  
  -- Security
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_users_vendor_id ON vendor_users(vendor_id);
CREATE INDEX idx_vendor_users_email ON vendor_users(email);
CREATE INDEX idx_vendor_users_role ON vendor_users(role);
CREATE INDEX idx_vendor_users_email_verified ON vendor_users(email_verified);

-- Trigger for updated_at
CREATE TRIGGER update_vendor_users_updated_at
  BEFORE UPDATE ON vendor_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
