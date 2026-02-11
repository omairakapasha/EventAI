import { FastifyRequest, FastifyReply } from 'fastify';
import { authService, TokenPayload } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

// Extend Fastify Request type
declare module 'fastify' {
    interface FastifyRequest {
        user?: TokenPayload;
        vendorId?: string;
    }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.status(401).send({
                error: 'Unauthorized',
                message: 'No token provided',
            });
            return;
        }

        const token = authHeader.substring(7);

        try {
            const payload = authService.verifyAccessToken(token);

            if (payload.type !== 'access') {
                reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Invalid token type',
                });
                return;
            }

            request.user = payload;
            request.vendorId = payload.vendorId;
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED',
                });
                return;
            }

            reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid token',
            });
        }
    } catch (error) {
        logger.error('Auth middleware error', { error });
        reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Authentication failed',
        });
    }
}

// Optional auth - doesn't fail if no token
export async function optionalAuthMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return;
        }

        const token = authHeader.substring(7);

        try {
            const payload = authService.verifyAccessToken(token);
            request.user = payload;
            request.vendorId = payload.vendorId;
        } catch (error) {
            // Ignore token errors for optional auth
        }
    } catch (error) {
        // Ignore errors for optional auth
    }
}

export default authMiddleware;
