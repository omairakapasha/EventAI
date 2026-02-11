// Re-export all types from Prisma generated client
// This file is kept for backwards compatibility — existing imports from './types'
// will continue to work, but now point to Prisma-generated types.

export {
    // Enums
    VendorTier,
    VendorStatus,
    UserRole,
    ServiceCategory,
    UnitType,
    CurrencyCode,
    PricingStatus,
    DocumentType,
    DocumentStatus,
    AuditAction,
    EntityType,
    BookingStatus,
    PaymentStatus,
    ApiKeyStatus,
    ApiScope,
    WebhookEvent,
    WebhookStatus,
    AvailabilityStatus,
    PriceUploadStatus,
    EventStatus,

    // Model types
    type Vendor,
    type VendorUser,
    type Service,
    type Pricing,
    type PriceHistory,
    type VendorDocument,
    type AuditLog,
    type Booking,
    type BookingMessage,
    type ApiKey,
    type Webhook,
    type WebhookDelivery,
    type Event,
    type EventVendor,
    type VendorAvailability,
    type PriceUpload,
    type PriceUploadRecord,
    type QueryPerformanceLog,
} from '../generated/client';
