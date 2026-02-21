// Standardized API response utilities

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ResponseMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
}

export interface ResponseMeta {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
    timestamp?: string;
    requestId?: string;
}

// Success response builder
export function successResponse<T>(
    data: T,
    meta?: Omit<ResponseMeta, 'timestamp'>
): ApiResponse<T> {
    return {
        success: true,
        data,
        meta: {
            ...meta,
            timestamp: new Date().toISOString(),
        },
    };
}

// Paginated success response
export function paginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
): ApiResponse<T[]> {
    return {
        success: true,
        data: items,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            timestamp: new Date().toISOString(),
        },
    };
}

// Error response builder
export function errorResponse(
    code: string,
    message: string,
    details?: any
): ApiResponse {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };
}

// Common error codes
export const ErrorCode = {
    // 400 Bad Request
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    
    // 401 Unauthorized
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    AUTH_2FA_REQUIRED: 'AUTH_2FA_REQUIRED',
    AUTH_2FA_INVALID: 'AUTH_2FA_INVALID',
    
    // 403 Forbidden
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    
    // 404 Not Found
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    VENDOR_NOT_FOUND: 'VENDOR_NOT_FOUND',
    SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    
    // 409 Conflict
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    BOOKING_CONFLICT: 'BOOKING_CONFLICT',
    DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
    VENDOR_ALREADY_EXISTS: 'VENDOR_ALREADY_EXISTS',
    
    // 429 Too Many Requests
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    
    // 500 Internal Server Error
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// HTTP status code mapping
export const statusCodeMap: Record<string, number> = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.AUTH_UNAUTHORIZED]: 401,
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
    [ErrorCode.AUTH_INVALID_TOKEN]: 401,
    [ErrorCode.AUTH_2FA_REQUIRED]: 401,
    [ErrorCode.AUTH_2FA_INVALID]: 401,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.ACCOUNT_LOCKED]: 403,
    [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.VENDOR_NOT_FOUND]: 404,
    [ErrorCode.SERVICE_NOT_FOUND]: 404,
    [ErrorCode.BOOKING_NOT_FOUND]: 404,
    [ErrorCode.EVENT_NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.RESOURCE_CONFLICT]: 409,
    [ErrorCode.BOOKING_CONFLICT]: 409,
    [ErrorCode.DUPLICATE_EMAIL]: 409,
    [ErrorCode.VENDOR_ALREADY_EXISTS]: 409,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.AI_SERVICE_ERROR]: 503,
};

// Get HTTP status code for error code
export function getStatusCode(errorCode: string): number {
    return statusCodeMap[errorCode] || 500;
}
