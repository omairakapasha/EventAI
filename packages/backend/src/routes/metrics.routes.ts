import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metrics } from '../utils/metrics.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { config } from '../config/env.js';

export default async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
    // Get metrics - admin only in production
    fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
        // In production, require admin authentication
        if (config.server.isProd) {
            try {
                await authMiddleware(request, reply);
                if (request.user?.role !== 'admin') {
                    return reply.status(403).send({
                        error: 'Forbidden',
                        message: 'Admin access required',
                    });
                }
            } catch (error) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
        }

        return reply.status(200).send(metrics.getMetrics());
    });

    // Reset metrics - admin only
    fastify.post('/metrics/reset', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await authMiddleware(request, reply);
            if (request.user?.role !== 'admin') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Admin access required',
                });
            }

            metrics.reset();
            return reply.status(200).send({
                message: 'Metrics reset successfully',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
    });
}
