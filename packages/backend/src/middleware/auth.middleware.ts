import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            vendorId?: string;
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided',
            });
            return;
        }

        const token = authHeader.substring(7);

        try {
            const payload = authService.verifyAccessToken(token);

            if (payload.type !== 'access') {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token type',
                });
                return;
            }

            req.user = payload;
            req.vendorId = payload.vendorId;

            next();
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED',
                });
                return;
            }

            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token',
            });
        }
    } catch (error) {
        logger.error('Auth middleware error', { error });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed',
        });
    }
}

// Optional auth - doesn't fail if no token
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);

        try {
            const payload = authService.verifyAccessToken(token);
            req.user = payload;
            req.vendorId = payload.vendorId;
        } catch (error) {
            // Ignore token errors for optional auth
        }

        next();
    } catch (error) {
        next();
    }
}

export default authMiddleware;
