-- Migration: 005_create_vendor_documents_table
-- Description: Create vendor_documents table for document verification

CREATE TYPE document_type AS ENUM (
  'business_license', 'tax_certificate', 'insurance', 
  'identity', 'bank_details', 'portfolio', 'contract', 'other'
);

CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected', 'expired');

CREATE TABLE vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Document info
  document_type document_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  
  -- Verification
  status document_status DEFAULT 'pending',
  verified_by UUID REFERENCES vendor_users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expiry_date DATE,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  uploaded_by UUID REFERENCES vendor_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_type ON vendor_documents(document_type);
CREATE INDEX idx_vendor_documents_status ON vendor_documents(status);
CREATE INDEX idx_vendor_documents_expiry ON vendor_documents(expiry_date);

-- Trigger for updated_at
CREATE TRIGGER update_vendor_documents_updated_at
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
