import { FastifyRequest } from 'fastify';
import { config } from '../config/env.js';

// Rate limit configuration objects for @fastify/rate-limit
// These are used as route-level config: { config: { rateLimit: authRateLimitConfig } }

export const defaultRateLimitConfig = {
    max: config.rateLimit.maxRequests,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request: FastifyRequest) => {
        return request.user?.vendorId || request.ip || 'unknown';
    },
    errorResponseBuilder: () => ({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    }),
};

export const authRateLimitConfig = {
    max: 10,
    timeWindow: 15 * 60 * 1000, // 15 minutes
    errorResponseBuilder: () => ({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: 900,
    }),
};

export const passwordResetRateLimitConfig = {
    max: 3,
    timeWindow: 60 * 60 * 1000, // 1 hour
    errorResponseBuilder: () => ({
        error: 'Too Many Requests',
        message: 'Too many password reset attempts. Please try again in 1 hour.',
        retryAfter: 3600,
    }),
};

export const apiKeyRateLimitConfig = {
    max: 60,
    timeWindow: 60 * 1000, // 1 minute
    keyGenerator: (request: FastifyRequest) => {
        return request.user?.vendorId || request.ip || 'unknown';
    },
    errorResponseBuilder: () => ({
        error: 'Rate Limit Exceeded',
        message: 'API rate limit exceeded. Please slow down your requests.',
        retryAfter: 60,
    }),
};

export const uploadRateLimitConfig = {
    max: 50,
    timeWindow: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: FastifyRequest) => {
        return request.user?.vendorId || request.ip || 'unknown';
    },
    errorResponseBuilder: () => ({
        error: 'Too Many Uploads',
        message: 'Upload limit reached. Please try again later.',
        retryAfter: 3600,
    }),
};

// Public API rate limits (for marketplace, events, bookings)
export const publicApiRateLimitConfig = {
    max: 100,
    timeWindow: 60 * 1000, // 1 minute
    keyGenerator: (request: FastifyRequest) => {
        return request.ip || 'unknown';
    },
    errorResponseBuilder: (req: FastifyRequest, context: any) => ({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please slow down.',
        retryAfter: Math.ceil(context.after),
    }),
    addHeadersOnExceeding: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
    },
};

// AI service rate limits (more restrictive due to cost)
export const aiRateLimitConfig = {
    max: 30,
    timeWindow: 60 * 1000, // 1 minute
    keyGenerator: (request: FastifyRequest) => {
        return request.ip || 'unknown';
    },
    errorResponseBuilder: (req: FastifyRequest, context: any) => ({
        error: 'AI Rate Limit Exceeded',
        message: 'AI service rate limit reached. Please wait before sending more requests.',
        retryAfter: Math.ceil(context.after),
    }),
    addHeadersOnExceeding: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
    },
};

// Booking creation rate limit (prevent spam)
export const bookingRateLimitConfig = {
    max: 10,
    timeWindow: 60 * 1000, // 1 minute
    keyGenerator: (request: FastifyRequest) => {
        const body = request.body as any;
        return body?.clientEmail || request.ip || 'unknown';
    },
    errorResponseBuilder: (req: FastifyRequest, context: any) => ({
        error: 'Booking Rate Limit Exceeded',
        message: 'Too many booking attempts. Please wait before creating more bookings.',
        retryAfter: Math.ceil(context.after),
    }),
};

export default {
    defaultRateLimitConfig,
    authRateLimitConfig,
    passwordResetRateLimitConfig,
    apiKeyRateLimitConfig,
    uploadRateLimitConfig,
    publicApiRateLimitConfig,
    aiRateLimitConfig,
    bookingRateLimitConfig,
};
