import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import os from 'os';

// Service health status
interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    checks: {
        database: ComponentHealth;
        redis: ComponentHealth;
        memory: ComponentHealth;
        disk?: ComponentHealth;
    };
    metrics?: {
        responseTime: number;
        activeConnections: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
    };
}

interface ComponentHealth {
    status: 'up' | 'down' | 'warning';
    responseTime?: number;
    message?: string;
    lastChecked: string;
}

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    // Basic health check - lightweight
    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.status(200).send({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    // Comprehensive health check with component status
    fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
        const startTime = Date.now();
        const checks: HealthStatus['checks'] = {
            database: { status: 'down', lastChecked: new Date().toISOString() },
            redis: { status: 'down', lastChecked: new Date().toISOString() },
            memory: { status: 'up', lastChecked: new Date().toISOString() },
        };

        // Check database
        try {
            const dbStart = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            checks.database = {
                status: 'up',
                responseTime: Date.now() - dbStart,
                lastChecked: new Date().toISOString(),
            };
        } catch (error) {
            checks.database = {
                status: 'down',
                message: 'Database connection failed',
                lastChecked: new Date().toISOString(),
            };
            logger.error('Health check: Database failed', { error });
        }

        // Check Redis
        try {
            const redisStart = Date.now();
            const redisClient = await getRedisClient();
            if (redisClient) {
                await redisClient.ping();
                checks.redis = {
                    status: 'up',
                    responseTime: Date.now() - redisStart,
                    lastChecked: new Date().toISOString(),
                };
            } else {
                checks.redis = {
                    status: 'down',
                    message: 'Redis not available',
                    lastChecked: new Date().toISOString(),
                };
            }
        } catch (error) {
            checks.redis = {
                status: 'down',
                message: 'Redis connection failed',
                lastChecked: new Date().toISOString(),
            };
            logger.error('Health check: Redis failed', { error });
        }

        // Check memory
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const memPercent = (memUsage.heapUsed / totalMem) * 100;

        if (memPercent > 90) {
            checks.memory = {
                status: 'down',
                message: `Memory usage critical: ${memPercent.toFixed(2)}%`,
                lastChecked: new Date().toISOString(),
            };
        } else if (memPercent > 75) {
            checks.memory = {
                status: 'warning',
                message: `Memory usage high: ${memPercent.toFixed(2)}%`,
                lastChecked: new Date().toISOString(),
            };
        } else {
            checks.memory = {
                status: 'up',
                message: `Memory usage: ${memPercent.toFixed(2)}%`,
                lastChecked: new Date().toISOString(),
            };
        }

        // Determine overall status - only database is critical, Redis is optional
        let overallStatus: HealthStatus['status'] = 'healthy';
        if (checks.database.status === 'down') {
            overallStatus = 'unhealthy';
        } else if (checks.memory.status === 'warning' || checks.database.status === 'warning') {
            overallStatus = 'degraded';
        }

        const responseTime = Date.now() - startTime;

        const healthStatus: HealthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            checks,
            metrics: {
                responseTime,
                activeConnections: 0, // Would need to track this
                memoryUsage: memUsage,
                cpuUsage: process.cpuUsage(),
            },
        };

        const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

        return reply.status(statusCode).send(healthStatus);
    });

    // Readiness probe - for Kubernetes
    fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return reply.status(200).send({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Readiness check failed', { error });
            return reply.status(503).send({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                reason: 'Database connection failed',
            });
        }
    });

    // Liveness probe - for Kubernetes
    fastify.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
        // Simple check - if we can respond, we're alive
        return reply.status(200).send({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
}
