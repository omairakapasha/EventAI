import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import axios from 'axios';

// Python service URL (configurable via env var ideally, defaulting to localhost:8000)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {

    // Proxy chat/plan request
    fastify.post(
        '/chat',
        // { onRequest: [authMiddleware] }, // Uncomment if auth required
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body;

                logger.info('Forwarding request to AI service', { url: `${AI_SERVICE_URL}/api/agent/plan` });

                const response = await axios.post(`${AI_SERVICE_URL}/api/agent/plan`, body);

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

    // Proxy booking confirmation
    fastify.post(
        '/book',
        // { onRequest: [authMiddleware] }, // Uncomment if auth required
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body;

                logger.info('Forwarding booking to AI service', { url: `${AI_SERVICE_URL}/api/agent/book` });

                const response = await axios.post(`${AI_SERVICE_URL}/api/agent/book`, body);

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
