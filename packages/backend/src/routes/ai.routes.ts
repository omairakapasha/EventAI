import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { aiRateLimitConfig } from '../middleware/rateLimit.middleware.js';
import { aiChatSchema } from '../schemas/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import axios from 'axios';

// Python service URL (configurable via env var ideally, defaulting to localhost:8000)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {

    // Proxy chat/plan request - requires user authentication
    fastify.post(
        '/chat',
        { 
            config: { rateLimit: aiRateLimitConfig },
            preHandler: [requireAuth, validateBody(aiChatSchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body as any;
                const userId = request.user?.userId;

                logger.info('Forwarding request to AI service', { 
                    url: `${AI_SERVICE_URL}/api/agent/plan`,
                    userId 
                });

                const response = await axios.post(`${AI_SERVICE_URL}/api/agent/plan`, {
                    ...body,
                    userId
                });

                return reply.send(response.data);
            } catch (error: any) {
                logger.error('AI Service Error', { error: error.message, response: error.response?.data });

                if (error.code === 'ECONNREFUSED') {
                    return reply.status(503).send({
                        error: 'AI Service Unavailable',
                        message: 'The AI agent service is not running.'
                    });
                }

                return reply.status(error.response?.status || 500).send(error.response?.data || { error: 'Internal AI Service Error' });
            }
        }
    );

    // Proxy booking confirmation - requires user authentication
    fastify.post(
        '/book',
        { 
            config: { rateLimit: aiRateLimitConfig },
            preHandler: [requireAuth, validateBody(aiChatSchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body as any;
                const userId = request.user?.userId;

                logger.info('Forwarding booking to AI service', { 
                    url: `${AI_SERVICE_URL}/api/agent/book`,
                    userId 
                });

                const response = await axios.post(`${AI_SERVICE_URL}/api/agent/book`, {
                    ...body,
                    userId
                });

                return reply.send(response.data);
            } catch (error: any) {
                logger.error('AI Service Booking Error', { error: error.message });

                if (error.code === 'ECONNREFUSED') {
                    return reply.status(503).send({
                        error: 'AI Service Unavailable',
                        message: 'The AI agent service is not running.'
                    });
                }

                return reply.status(error.response?.status || 500).send(error.response?.data || { error: 'Internal AI Service Error' });
            }
        }
    );
}
