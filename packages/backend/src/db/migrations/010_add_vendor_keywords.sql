-- Migration: 010_add_vendor_keywords
-- Description: Add keywords and pricing fields for vendor discovery
-- Used by the Python VendorDiscoveryAgent

-- Add keywords and discovery fields to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pricing_min DECIMAL(15,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pricing_max DECIMAL(15,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Index for keyword search
CREATE INDEX IF NOT EXISTS idx_vendors_keywords ON vendors USING GIN (keywords);

-- Index for category
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

-- Index for rating
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating DESC);

-- Update service_areas to be an array for easier searching
-- (Already JSONB, but let's add a GIN index)
CREATE INDEX IF NOT EXISTS idx_vendors_service_areas ON vendors USING GIN (service_areas);

-- Comments
COMMENT ON COLUMN vendors.keywords IS 'Keywords for simple text-based vendor matching';
COMMENT ON COLUMN vendors.pricing_min IS 'Minimum pricing in PKR';
COMMENT ON COLUMN vendors.pricing_max IS 'Maximum pricing in PKR';
COMMENT ON COLUMN vendors.rating IS 'Average vendor rating (0-5)';
COMMENT ON COLUMN vendors.category IS 'Primary vendor category (catering, venue, photography, etc.)';

-- Insert sample Pakistani vendors for testing
INSERT INTO vendors (
  name, business_type, contact_email, phone, description, 
  status, tier, category, keywords, service_areas,
  pricing_min, pricing_max, rating, total_reviews
) VALUES 
(
  'Lahore Catering Excellence',
  'Catering',
  'lahore.catering@example.com',
  '+92-300-1234567',
  'Premium Pakistani cuisine for weddings and events. Traditional mehndi and walima food.',
  'ACTIVE',
  'GOLD',
  'catering',
  ARRAY['wedding', 'mehndi', 'walima', 'catering', 'food', 'traditional'],
  '["Lahore", "Islamabad"]',
  50000,
  500000,
  4.50,
  120
),
(
  'Royal Marquee Lahore',
  'Venue',
  'royal.marquee@example.com',
  '+92-300-2345678',
  'Luxury wedding venue with lawns and marquees. Capacity up to 1500 guests.',
  'ACTIVE',
  'GOLD',
  'venue',
  ARRAY['wedding', 'venue', 'marquee', 'hall', 'lawn', 'mehndi', 'baraat'],
  '["Lahore"]',
  200000,
  800000,
  4.80,
  85
),
(
  'Moments Photography',
  'Photography',
  'moments.photo@example.com',
  '+92-300-3456789',
  'Wedding photography and videography. Drone coverage and cinematic videos.',
  'ACTIVE',
  'SILVER',
  'photography',
  ARRAY['photography', 'video', 'drone', 'wedding', 'photo', 'album'],
  '["Lahore", "Islamabad", "Karachi"]',
  100000,
  400000,
  4.70,
  200
),
(
  'Floral Dreams Decoration',
  'Decoration',
  'floral.dreams@example.com',
  '+92-300-4567890',
  'Event decoration and floral arrangements. Traditional and modern themes.',
  'ACTIVE',
  'SILVER',
  'decoration',
  ARRAY['decoration', 'flowers', 'decor', 'wedding', 'theme', 'stage'],
  '["Lahore", "Islamabad"]',
  80000,
  350000,
  4.60,
  95
),
(
  'Beat Masters DJ',
  'Entertainment',
  'beat.masters@example.com',
  '+92-300-5678901',
  'DJ services and live band entertainment. Bollywood, Punjabi, and international music.',
  'ACTIVE',
  'BRONZE',
  'music',
  ARRAY['dj', 'music', 'band', 'entertainment', 'sound', 'party'],
  '["Lahore", "Karachi", "Islamabad"]',
  40000,
  150000,
  4.40,
  150
),
(
  'Karachi BBQ House',
  'Catering',
  'karachi.bbq@example.com',
  '+92-300-6789012',
  'BBQ and street food catering. Perfect for casual parties and outdoor events.',
  'ACTIVE',
  'BRONZE',
  'catering',
  ARRAY['bbq', 'catering', 'party', 'birthday', 'casual', 'outdoor'],
  '["Karachi"]',
  25000,
  200000,
  4.30,
  75
)
ON CONFLICT (contact_email) DO NOTHING;
