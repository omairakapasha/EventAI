import winston from 'winston';
import { config } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

// Context store for request tracking
const requestContext = new Map<string, any>();

const customFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    customFormat
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

// Enhanced format with correlation ID and request context
const enhancedProdFormat = combine(
    timestamp(),
    errors({ stack: true }),
    winston.format((info) => {
        const context = requestContext.get('current') || {};
        return {
            ...info,
            correlationId: context.correlationId,
            requestId: context.requestId,
            userId: context.userId,
            vendorId: context.vendorId,
            path: context.path,
            method: context.method,
            environment: config.server.env,
            service: 'event-ai-backend',
            version: process.env.npm_package_version || '1.0.0',
            ...context.metadata,
        };
    })(),
    json()
);

export const logger = winston.createLogger({
    level: config.logging.level,
    format: config.server.isDev ? devFormat : enhancedProdFormat,
    defaultMeta: { service: 'event-ai-backend' },
    transports: [
        new winston.transports.Console(),
    ],
});

// Add file transports in production
if (config.server.isProd) {
    logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
    logger.add(new winston.transports.File({ filename: 'logs/audit.log', level: 'info' }));
}

// Request context management
export const setRequestContext = (context: any) => {
    requestContext.set('current', context);
};

export const clearRequestContext = () => {
    requestContext.delete('current');
};

export const getRequestContext = () => {
    return requestContext.get('current') || {};
};

// Audit logging for security events
export const auditLog = (action: string, details: any) => {
    logger.info(`[AUDIT] ${action}`, {
        type: 'audit',
        action,
        timestamp: new Date().toISOString(),
        ...details,
    });
};

// Security event logging
export const securityLog = (event: string, details: any) => {
    logger.warn(`[SECURITY] ${event}`, {
        type: 'security',
        event,
        timestamp: new Date().toISOString(),
        ...details,
    });
};

export default logger;
