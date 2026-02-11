-- ============================================
-- Migration: 011_database_optimizations
-- Description: Performance optimizations and index additions
-- Author: Database Optimization Script
-- ============================================

-- ============================================
-- 1. Add Missing Indexes for Common Queries
-- ============================================

-- Index for vendor status + tier queries (common for filtering active vendors)
CREATE INDEX IF NOT EXISTS idx_vendors_status_tier ON vendors(status, tier) WHERE status = 'ACTIVE';

-- Index for vendor search by business name (partial match support)
CREATE INDEX IF NOT EXISTS idx_vendors_business_name ON vendors(business_name);

-- Index for vendor location-based queries
CREATE INDEX IF NOT EXISTS idx_vendors_address_gin ON vendors USING GIN (address);

-- Index for service availability queries
CREATE INDEX IF NOT EXISTS idx_services_vendor_active ON services(vendor_id, status) WHERE status = 'ACTIVE';

-- Index for service category lookups
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Index for pricing lookups
CREATE INDEX IF NOT EXISTS idx_pricing_service_active ON pricing(service_id, is_active, status) WHERE is_active = TRUE;

-- Index for pricing date range queries
CREATE INDEX IF NOT EXISTS idx_pricing_effective_date ON pricing(effective_date, expiry_date);

-- Index for booking date queries
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);

-- Index for booking status queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Index for event date queries
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- Index for event status queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- ============================================
-- 2. Add Composite Indexes for Join Queries
-- ============================================

-- Composite index for vendor user lookups
CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor_role ON vendor_users(vendor_id, role);

-- Composite index for event vendor lookups
CREATE INDEX IF NOT EXISTS idx_event_vendors_composite ON event_vendors(event_id, vendor_id, status);

-- ============================================
-- 3. Add Partial Indexes for Common Filters
-- ============================================

-- Index for unverified vendors (admin approval queue)
CREATE INDEX IF NOT EXISTS idx_vendors_pending ON vendors(status) WHERE status = 'PENDING';

-- Index for active API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(status) WHERE status = 'active';

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ============================================
-- 4. Add Table for Vendor Availability Tracking
-- ============================================

CREATE TYPE availability_status AS ENUM ('available', 'booked', 'blocked', 'tentative');

CREATE TABLE IF NOT EXISTS vendor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    
    -- Date range for availability
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    
    -- Status
    status availability_status DEFAULT 'available',
    
    -- If booked, link to booking
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Notes (e.g., "Partially available - only morning slot")
    notes TEXT,
    
    -- Who blocked this slot (for manual blocks)
    blocked_by UUID REFERENCES vendor_users(id) ON DELETE SET NULL,
    blocked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for availability table
CREATE INDEX IF NOT EXISTS idx_vendor_availability_vendor_date ON vendor_availability(vendor_id, date);
CREATE INDEX IF NOT EXISTS idx_vendor_availability_status ON vendor_availability(status);
CREATE INDEX IF NOT EXISTS idx_vendor_availability_date_range ON vendor_availability(date, start_time, end_time);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_availability_updated_at
    BEFORE UPDATE ON vendor_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Add Table for Bulk Price Uploads
-- ============================================

CREATE TYPE price_upload_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');

CREATE TABLE IF NOT EXISTS price_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES vendor_users(id) ON DELETE SET NULL,
    
    -- Upload details
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    file_size INT,
    
    -- Processing status
    status price_upload_status DEFAULT 'pending',
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    
    -- Error details
    error_log JSONB DEFAULT '[]',
    
    -- Processing metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price uploads
CREATE INDEX IF NOT EXISTS idx_price_uploads_vendor ON price_uploads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_price_uploads_status ON price_uploads(status);

CREATE TRIGGER update_price_uploads_updated_at
    BEFORE UPDATE ON price_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Add Table for Price Upload Records (Individual rows from bulk upload)
-- ============================================

CREATE TABLE IF NOT EXISTS price_upload_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL REFERENCES price_uploads(id) ON DELETE CASCADE,
    
    -- Service being priced
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255), -- In case service doesn't exist yet
    
    -- Pricing details
    price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'PKR',
    unit_type VARCHAR(50), -- per_hour, per_day, per_event, per_person
    
    -- Validity
    effective_date DATE,
    expiry_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, applied, failed
    error_message TEXT,
    
    -- Raw data
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_price_upload_records_upload ON price_upload_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_price_upload_records_status ON price_upload_records(status);

-- ============================================
-- 7. Add Materialized View for Vendor Search
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS vendor_search_view AS
SELECT 
    v.id,
    v.business_name,
    v.business_type,
    v.description,
    v.status,
    v.tier,
    v.rating,
    v.review_count,
    v.service_areas,
    v.address,
    v.keywords,
    v.verified,
    v.created_at,
    -- Aggregate service categories
    COALESCE(
        (SELECT jsonb_agg(DISTINCT s.category) 
         FROM services s 
         WHERE s.vendor_id = v.id AND s.status = 'ACTIVE'),
        '[]'::jsonb
    ) as service_categories,
    -- Min/Max pricing
    COALESCE(
        (SELECT MIN(p.price) 
         FROM pricing p 
         JOIN services s ON p.service_id = s.id 
         WHERE s.vendor_id = v.id AND p.is_active = TRUE),
        0
    ) as min_price,
    COALESCE(
        (SELECT MAX(p.price) 
         FROM pricing p 
         JOIN services s ON p.service_id = s.id 
         WHERE s.vendor_id = v.id AND p.is_active = TRUE),
        0
    ) as max_price,
    -- Full text search vector
    to_tsvector('english', 
        COALESCE(v.business_name, '') || ' ' ||
        COALESCE(v.description, '') || ' ' ||
        COALESCE(v.business_type, '') || ' ' ||
        COALESCE(array_to_string(v.keywords, ' '), '')
    ) as search_vector
FROM vendors v
WHERE v.status = 'ACTIVE';

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_search_view_id ON vendor_search_view(id);
CREATE INDEX IF NOT EXISTS idx_vendor_search_view_vector ON vendor_search_view USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_vendor_search_view_rating ON vendor_search_view(rating DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_search_view_tier ON vendor_search_view(tier);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_vendor_search_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_search_view;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Add Query Performance Statistics Table
-- ============================================

CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type VARCHAR(100) NOT NULL,
    query_text TEXT,
    execution_time_ms INT,
    rows_affected INT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_perf_type ON query_performance_log(query_type);
CREATE INDEX IF NOT EXISTS idx_query_perf_created ON query_performance_log(created_at);

-- ============================================
-- 9. Comments for Documentation
-- ============================================

COMMENT ON TABLE vendor_availability IS 'Tracks vendor availability by date and time slots';
COMMENT ON TABLE price_uploads IS 'Tracks bulk price upload jobs from vendors';
COMMENT ON TABLE price_upload_records IS 'Individual records from bulk price uploads';
COMMENT ON MATERIALIZED VIEW vendor_search_view IS 'Optimized view for vendor search with full-text search support';

-- ============================================
-- 10. Grant Permissions (if using roles)
-- ============================================

-- Note: Uncomment and modify if using specific database roles
-- GRANT SELECT ON vendor_search_view TO eventai_app;
-- GRANT ALL ON vendor_availability TO eventai_app;
-- GRANT ALL ON price_uploads TO eventai_app;
-- GRANT ALL ON price_upload_records TO eventai_app;
