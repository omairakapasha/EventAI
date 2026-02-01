import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env.js';
import { healthCheck } from './config/database.js';
import { getRedisClient, closeRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware, auditMiddleware } from './middleware/audit.middleware.js';
import { defaultLimiter } from './middleware/rateLimit.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import servicesRoutes from './routes/services.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
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
}));

// CORS
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID
app.use(requestIdMiddleware);

// Rate limiting
app.use(defaultLimiter);

// Audit logging
app.use(auditMiddleware);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            requestId: req.requestId,
        });
    });

    next();
});

// ============ ROUTES ============

const API_PREFIX = `/api/${config.server.apiVersion}`;

// Health check
app.get('/health', async (req: Request, res: Response) => {
    const dbHealthy = await healthCheck();
    let redisHealthy = false;

    try {
        const redis = await getRedisClient();
        await redis.ping();
        redisHealthy = true;
    } catch (error) {
        logger.error('Redis health check failed', { error });
    }

    const status = dbHealthy && redisHealthy ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        services: {
            database: dbHealthy ? 'up' : 'down',
            redis: redisHealthy ? 'up' : 'down',
        },
    });
});

// API routes
app.use(`${API_PREFIX}/vendors`, authRoutes);
app.use(`${API_PREFIX}/vendors`, profileRoutes);
app.use(`${API_PREFIX}/vendors/me/services`, servicesRoutes);
app.use(`${API_PREFIX}/vendors/me/pricing`, pricingRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        requestId: req.requestId,
        path: req.path,
    });

    // Don't expose internal errors in production
    const message = config.server.isProd
        ? 'An internal error occurred'
        : err.message;

    res.status(500).json({
        error: 'Internal Server Error',
        message,
        requestId: req.requestId,
    });
});

// ============ SERVER ============

const server = app.listen(config.server.port, () => {
    logger.info(`Server started`, {
        port: config.server.port,
        env: config.server.env,
        apiVersion: config.server.apiVersion,
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await closeRedis();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis', { error });
        }

        logger.info('Graceful shutdown complete');
        process.exit(0);
    });

    // Force close after 30s
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
