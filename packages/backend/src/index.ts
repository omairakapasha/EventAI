import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import { config } from './config/env.js';
import { healthCheck, connectDatabase, closePool } from './config/database.js';
import { getRedisClient, closeRedis } from './config/redis.js';
import { logger } from './utils/logger.js';

// Prevent unhandled rejections (e.g. from Redis) from crashing the process
process.on('unhandledRejection', (reason: any) => {
    logger.warn('Unhandled rejection (suppressed)', { error: reason?.message || String(reason) });
});
import { requestIdMiddleware, auditMiddleware } from './middleware/audit.middleware.js';
import { defaultRateLimitConfig } from './middleware/rateLimit.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import servicesRoutes from './routes/services.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import adminRoutes from './routes/admin.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import aiRoutes from './routes/ai.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import eventsRoutes from './routes/events.routes.js';
import publicVendorRoutes from './routes/public-vendors.routes.js';

const app = Fastify({
    logger: false, // We use Winston for logging
    bodyLimit: 10 * 1024 * 1024, // 10mb
});

const startServer = async () => {
    // ============ PLUGINS ============

    // Security headers
    await app.register(fastifyHelmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
        },
    });

    // CORS
    const corsOrigin = config.cors.origin.includes(',')
        ? config.cors.origin.split(',').map(s => s.trim())
        : config.cors.origin;
    await app.register(fastifyCors, {
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    });

    // Compression
    await app.register(fastifyCompress);

    // Rate limiting
    await app.register(fastifyRateLimit, {
        global: true,
        ...defaultRateLimitConfig,
    });

    // Multipart/file upload support
    await app.register(fastifyMultipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        },
    });

    // ============ HOOKS ============

    // Request ID
    app.addHook('onRequest', requestIdMiddleware);

    // Request logging
    app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
        const duration = reply.elapsedTime;
        logger.info('Request completed', {
            method: request.method,
            path: request.url,
            statusCode: reply.statusCode,
            duration: `${Math.round(duration)}ms`,
            requestId: request.requestId,
        });
    });

    // Audit logging (onResponse)
    app.addHook('onResponse', auditMiddleware);

    // ============ ROUTES ============

    const API_PREFIX = `/api/${config.server.apiVersion}`;

    // Health check
    app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
        const dbHealthy = await healthCheck();
        let redisHealthy = false;

        try {
            const redis = await getRedisClient();
            if (redis) {
                await redis.ping();
                redisHealthy = true;
            }
        } catch (error) {
            logger.warn('Redis health check failed (non-critical)', { error });
        }

        // Server is healthy as long as DB is up — Redis is optional
        const status = dbHealthy ? 'healthy' : 'unhealthy';
        const statusCode = dbHealthy ? 200 : 503;

        return reply.status(statusCode).send({
            status,
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealthy ? 'up' : 'down',
                redis: redisHealthy ? 'up' : 'down (optional)',
            },
        });
    });

    // API routes
    await app.register(authRoutes, { prefix: `${API_PREFIX}/auth` });
    await app.register(profileRoutes, { prefix: `${API_PREFIX}/vendors` });
    await app.register(servicesRoutes, { prefix: `${API_PREFIX}/vendors/me/services` });
    await app.register(pricingRoutes, { prefix: `${API_PREFIX}/vendors/me/pricing` });
    await app.register(vendorRoutes, { prefix: `${API_PREFIX}/vendors/me` });
    await app.register(adminRoutes, { prefix: `${API_PREFIX}/admin` });

    // Message routes
    await app.register(messagesRoutes, { prefix: `${API_PREFIX}/messages` });

    // AI Agent routes
    await app.register(aiRoutes, { prefix: `${API_PREFIX}/ai` });

    // Bookings routes (agent + user)
    await app.register(bookingsRoutes, { prefix: `${API_PREFIX}/bookings` });

    // Events routes (agent + user)
    await app.register(eventsRoutes, { prefix: `${API_PREFIX}/events` });

    // Public vendor routes (no auth, used by chatbot)
    await app.register(publicVendorRoutes, { prefix: `${API_PREFIX}/marketplace` });

    // 404 handler
    app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
        return reply.status(404).send({
            error: 'Not Found',
            message: `Route ${request.method} ${request.url} not found`,
        });
    });

    // Error handler
    app.setErrorHandler((err: Error & { statusCode?: number }, request: FastifyRequest, reply: FastifyReply) => {
        logger.error('Unhandled error', {
            error: err.message,
            stack: err.stack,
            requestId: request.requestId,
            path: request.url,
        });

        // Don't expose internal errors in production
        const message = config.server.isProd
            ? 'An internal error occurred'
            : err.message;

        const statusCode = err.statusCode || 500;

        return reply.status(statusCode).send({
            error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
            message,
            requestId: request.requestId,
        });
    });

    // Connect to database
    await connectDatabase();

    // Start server
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
    logger.info(`Server started`, {
        port: config.server.port,
        env: config.server.env,
        apiVersion: config.server.apiVersion,
        framework: 'Fastify',
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
        logger.info(`${signal} received. Starting graceful shutdown...`);

        try {
            await app.close();
            logger.info('HTTP server closed');
        } catch (error) {
            logger.error('Error closing HTTP server', { error });
        }

        try {
            await closePool();
            logger.info('Database connection closed');
        } catch (error) {
            logger.error('Error closing database', { error });
        }

        try {
            await closeRedis();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis', { error });
        }

        logger.info('Graceful shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
});
