import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/).optional();
export const urlSchema = z.string().url().optional();
export const dateSchema = z.string().datetime().or(z.date());

// Address schema
export const addressSchema = z.object({
    street: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============ AUTH SCHEMAS ============

export const registerSchema = z.object({
    // Vendor info
    vendorName: z.string().min(2).max(255),
    businessType: z.string().max(100).optional(),
    contactEmail: emailSchema,
    phone: phoneSchema,
    address: addressSchema.optional(),
    website: urlSchema,

    // User info
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: emailSchema,
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    twoFactorCode: z.string().length(6).optional(),
    rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const verify2FASchema = z.object({
    email: z.string().email(),
    password: z.string(),
    code: z.string().length(6),
});

export const enable2FASchema = z.object({
    password: z.string().min(1),
});

export const confirm2FASchema = z.object({
    code: z.string().length(6),
    secret: z.string().min(1),
});

// ============ VENDOR SCHEMAS ============

export const updateVendorSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    businessType: z.string().max(100).optional(),
    phone: phoneSchema,
    address: addressSchema.optional(),
    description: z.string().max(5000).optional(),
    website: urlSchema,
    serviceAreas: z.array(z.string()).optional(),
    settings: z.record(z.string(), z.any()).optional(),
});

// ============ SERVICE SCHEMAS ============

export const serviceCategories = [
    'venue', 'catering', 'photography', 'videography',
    'music', 'decoration', 'transportation', 'accommodation',
    'planning', 'entertainment', 'equipment', 'staffing', 'other'
] as const;

export const unitTypes = [
    'per_hour', 'per_day', 'per_event', 'per_person',
    'per_unit', 'flat_rate', 'custom'
] as const;

export const createServiceSchema = z.object({
    name: z.string().min(2).max(255),
    category: z.enum(serviceCategories),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(500).optional(),
    unitType: z.enum(unitTypes).default('per_event'),
    minQuantity: z.number().int().positive().default(1),
    maxQuantity: z.number().int().positive().optional(),
    capacity: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
    availableFrom: dateSchema.optional(),
    availableUntil: dateSchema.optional(),
    leadTimeDays: z.number().int().nonnegative().default(0),
    images: z.array(z.string().url()).default([]),
    featuredImage: urlSchema,
    requirements: z.record(z.string(), z.any()).optional(),
    inclusions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
});

export const updateServiceSchema = createServiceSchema.partial();

export const serviceQuerySchema = paginationSchema.extend({
    category: z.enum(serviceCategories).optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().optional(),
});

// ============ PRICING SCHEMAS ============

export const currencyCodes = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED'] as const;

export const createPricingSchema = z.object({
    serviceId: uuidSchema,
    price: z.number().positive().multipleOf(0.01),
    currency: z.enum(currencyCodes).default('USD'),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    holidaySurchargePercent: z.number().min(0).max(100).default(0),
    weekendSurchargePercent: z.number().min(0).max(100).default(0),
    rushSurchargePercent: z.number().min(0).max(100).default(0),
    minQuantityForDiscount: z.number().int().positive().optional(),
    bulkDiscountPercent: z.number().min(0).max(100).default(0),
    notes: z.string().max(1000).optional(),
});

export const bulkPricingSchema = z.object({
    prices: z.array(createPricingSchema).min(1).max(100),
});

export const updatePricingSchema = createPricingSchema.partial().omit({ serviceId: true });

export const pricingQuerySchema = paginationSchema.extend({
    serviceId: uuidSchema.optional(),
    activeOnly: z.coerce.boolean().default(true),
    status: z.enum(['draft', 'pending_approval', 'active', 'expired', 'rejected']).optional(),
});

// ============ DOCUMENT SCHEMAS ============

export const documentTypes = [
    'business_license', 'tax_certificate', 'insurance',
    'identity', 'bank_details', 'portfolio', 'contract', 'other'
] as const;

export const uploadDocumentSchema = z.object({
    documentType: z.enum(documentTypes),
    documentName: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ============ BOOKING SCHEMAS ============

export const bookingStatusValues = [
    'pending', 'confirmed', 'in_progress', 'completed',
    'cancelled', 'rejected', 'no_show'
] as const;

export const updateBookingStatusSchema = z.object({
    status: z.enum(bookingStatusValues),
    reason: z.string().max(500).optional(),
});

export const bookingMessageSchema = z.object({
    message: z.string().min(1).max(5000),
    attachments: z.array(z.string().url()).default([]),
});

export const bookingQuerySchema = paginationSchema.extend({
    status: z.enum(bookingStatusValues).optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    serviceId: uuidSchema.optional(),
});

// ============ API KEY SCHEMAS ============

export const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1),
    description: z.string().max(500).optional(),
    expiresAt: dateSchema.optional(),
    allowedIps: z.array(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address')).optional(),
    rateLimitPerMinute: z.number().int().positive().default(60),
    rateLimitPerDay: z.number().int().positive().default(10000),
});

// ============ WEBHOOK SCHEMAS ============

export const webhookEvents = [
    'booking.created', 'booking.confirmed', 'booking.cancelled',
    'booking.completed', 'message.received',
    'pricing.updated', 'service.updated'
] as const;

export const createWebhookSchema = z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    events: z.array(z.enum(webhookEvents)).min(1),
    maxRetries: z.number().int().min(0).max(10).default(5),
    retryDelaySeconds: z.number().int().min(10).max(3600).default(60),
    customHeaders: z.record(z.string(), z.string()).optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();

// Export types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreatePricingInput = z.infer<typeof createPricingSchema>;
export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;
export type BulkPricingInput = z.infer<typeof bulkPricingSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type BookingMessageInput = z.infer<typeof bookingMessageSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
