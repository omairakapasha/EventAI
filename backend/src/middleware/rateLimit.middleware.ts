import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { Request, Response } from 'express';

// Default rate limiter
export const defaultLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use vendor ID if authenticated, otherwise IP
        return req.user?.vendorId || req.ip || 'unknown';
    },
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// Very strict limiter for password reset
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
        error: 'Too Many Requests',
        message: 'Too many password reset attempts. Please try again in 1 hour.',
        retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// API key rate limiter (per vendor)
export const apiKeyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        error: 'Rate Limit Exceeded',
        message: 'API rate limit exceeded. Please slow down your requests.',
        retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        return req.user?.vendorId || req.ip || 'unknown';
    },
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: {
        error: 'Too Many Uploads',
        message: 'Upload limit reached. Please try again later.',
        retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        return req.user?.vendorId || req.ip || 'unknown';
    },
});

export default {
    defaultLimiter,
    authLimiter,
    passwordResetLimiter,
    apiKeyLimiter,
    uploadLimiter,
};
