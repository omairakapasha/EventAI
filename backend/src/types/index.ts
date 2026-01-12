// Core type definitions for Vendor Management System

// Enums matching database types
export type VendorTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type VendorStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type UserRole = 'owner' | 'admin' | 'staff' | 'readonly';
export type ServiceCategory =
    | 'venue' | 'catering' | 'photography' | 'videography'
    | 'music' | 'decoration' | 'transportation' | 'accommodation'
    | 'planning' | 'entertainment' | 'equipment' | 'staffing' | 'other';
export type UnitType = 'per_hour' | 'per_day' | 'per_event' | 'per_person' | 'per_unit' | 'flat_rate' | 'custom';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'PKR' | 'INR' | 'AED';
export type PricingStatus = 'draft' | 'pending_approval' | 'active' | 'expired' | 'rejected';
export type DocumentType = 'business_license' | 'tax_certificate' | 'insurance' | 'identity' | 'bank_details' | 'portfolio' | 'contract' | 'other';
export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'no_show';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'password_change' | 'settings_change' | 'api_key_generate' | 'document_upload' | 'document_verify' | 'status_change';
export type EntityType = 'vendor' | 'vendor_user' | 'service' | 'pricing' | 'document' | 'booking' | 'api_key' | 'webhook';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export type ApiScope = 'read' | 'write' | 'admin';
export type WebhookEvent = 'booking.created' | 'booking.confirmed' | 'booking.cancelled' | 'booking.completed' | 'message.received' | 'pricing.updated' | 'service.updated';
export type WebhookStatus = 'active' | 'inactive' | 'failing';

// Address type
export interface Address {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

// Vendor
export interface Vendor {
    id: string;
    name: string;
    businessType: string | null;
    contactEmail: string;
    phone: string | null;
    address: Address;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    verified: boolean;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    status: VendorStatus;
    tier: VendorTier;
    apiEnabled: boolean;
    apiConfig: Record<string, any>;
    serviceAreas: string[];
    settings: Record<string, any>;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// VendorUser
export interface VendorUser {
    id: string;
    vendorId: string;
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    phone: string | null;
    avatarUrl: string | null;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorBackupCodes: string[];
    emailVerified: boolean;
    emailVerifiedAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationExpires: Date | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    preferences: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// Service
export interface Service {
    id: string;
    vendorId: string;
    name: string;
    category: ServiceCategory;
    description: string | null;
    shortDescription: string | null;
    unitType: UnitType;
    minQuantity: number;
    maxQuantity: number | null;
    capacity: number | null;
    isActive: boolean;
    availableFrom: Date | null;
    availableUntil: Date | null;
    leadTimeDays: number;
    images: string[];
    featuredImage: string | null;
    requirements: Record<string, any>;
    inclusions: string[];
    exclusions: string[];
    tags: string[];
    metadata: Record<string, any>;
    bookingCount: number;
    ratingAverage: number;
    ratingCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Pricing
export interface Pricing {
    id: string;
    serviceId: string;
    vendorId: string;
    price: number;
    currency: CurrencyCode;
    effectiveDate: Date;
    expiryDate: Date | null;
    isActive: boolean;
    status: PricingStatus;
    requiresApproval: boolean;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    holidaySurchargePercent: number;
    weekendSurchargePercent: number;
    rushSurchargePercent: number;
    minQuantityForDiscount: number | null;
    bulkDiscountPercent: number;
    notes: string | null;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
}

// PriceHistory
export interface PriceHistory {
    id: string;
    pricingId: string;
    serviceId: string;
    vendorId: string;
    oldPrice: number;
    newPrice: number;
    priceChangePercent: number;
    changedBy: string | null;
    changeReason: string | null;
    createdAt: Date;
}

// VendorDocument
export interface VendorDocument {
    id: string;
    vendorId: string;
    documentType: DocumentType;
    documentName: string;
    documentUrl: string;
    fileSize: number | null;
    mimeType: string | null;
    status: DocumentStatus;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    expiryDate: Date | null;
    description: string | null;
    metadata: Record<string, any>;
    uploadedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// AuditLog
export interface AuditLog {
    id: string;
    vendorId: string | null;
    userId: string | null;
    action: AuditAction;
    entityType: EntityType;
    entityId: string | null;
    oldValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
    changes: Record<string, any> | null;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    description: string | null;
    metadata: Record<string, any>;
    createdAt: Date;
}

// Booking
export interface Booking {
    id: string;
    vendorId: string;
    serviceId: string;
    eventId: string | null;
    eventName: string | null;
    eventDate: Date;
    eventStartTime: string | null;
    eventEndTime: string | null;
    eventLocation: Record<string, any> | null;
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    guestCount: number | null;
    status: BookingStatus;
    quantity: number;
    specialRequirements: string | null;
    notes: string | null;
    unitPrice: number;
    totalPrice: number;
    currency: CurrencyCode;
    paymentStatus: PaymentStatus;
    depositAmount: number | null;
    depositPaidAt: Date | null;
    confirmedAt: Date | null;
    confirmedBy: string | null;
    cancelledAt: Date | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// BookingMessage
export interface BookingMessage {
    id: string;
    bookingId: string;
    senderId: string | null;
    senderType: 'vendor' | 'client' | 'system';
    message: string;
    attachments: string[];
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
}

// ApiKey
export interface ApiKey {
    id: string;
    vendorId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: ApiScope[];
    status: ApiKeyStatus;
    expiresAt: Date | null;
    revokedAt: Date | null;
    revokedBy: string | null;
    revokeReason: string | null;
    lastUsedAt: Date | null;
    usageCount: number;
    rateLimitPerMinute: number;
    rateLimitPerDay: number;
    description: string | null;
    allowedIps: string[];
    createdAt: Date;
    createdBy: string | null;
}

// Webhook
export interface Webhook {
    id: string;
    vendorId: string;
    name: string;
    url: string;
    events: WebhookEvent[];
    secret: string | null;
    status: WebhookStatus;
    maxRetries: number;
    retryDelaySeconds: number;
    lastTriggeredAt: Date | null;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    consecutiveFailures: number;
    totalDeliveries: number;
    failedDeliveries: number;
    customHeaders: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
}

// WebhookDelivery
export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: Record<string, any>;
    responseStatus: number | null;
    responseBody: string | null;
    responseTimeMs: number | null;
    success: boolean | null;
    attemptNumber: number;
    errorMessage: string | null;
    createdAt: Date;
    deliveredAt: Date | null;
}
