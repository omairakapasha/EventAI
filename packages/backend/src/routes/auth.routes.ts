import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authRateLimitConfig, passwordResetRateLimitConfig } from '../middleware/rateLimit.middleware.js';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verify2FASchema,
    enable2FASchema,
    confirm2FASchema,
} from '../schemas/index.js';
import { logger } from '../utils/logger.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {

    // POST /register
    fastify.post(
        '/register',
        {
            config: { rateLimit: authRateLimitConfig },
            preHandler: [validateBody(registerSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const result = await authService.register(request.body as any);

                logger.info('Vendor registered, verification email should be sent', {
                    vendorId: result.vendor.id,
                    email: result.user.email,
                });

                return reply.status(201).send({
                    message: 'Registration successful. Please verify your email.',
                    vendor: {
                        id: result.vendor.id,
                        name: result.vendor.name,
                    },
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                    },
                });
            } catch (error: any) {
                if (error.message.includes('already registered')) {
                    return reply.status(409).send({
                        error: 'Conflict',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // POST /login
    fastify.post(
        '/login',
        {
            config: { rateLimit: authRateLimitConfig },
            preHandler: [validateBody(loginSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const result = await authService.login(request.body as any, request.ip);

                if (result.requiresTwoFactor) {
                    return reply.status(200).send({
                        message: 'Two-factor authentication required',
                        requiresTwoFactor: true,
                    });
                }

                return reply.send({
                    message: 'Login successful',
                    user: result.user,
                    vendor: result.vendor,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                });
            } catch (error: any) {
                if (error.message.includes('Invalid') || error.message.includes('locked')) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: error.message,
                    });
                }
                if (error.message.includes('verify your email')) {
                    return reply.status(403).send({
                        error: 'Forbidden',
                        message: error.message,
                        code: 'EMAIL_NOT_VERIFIED',
                    });
                }
                if (error.message.includes('suspended') || error.message.includes('deactivated')) {
                    return reply.status(403).send({
                        error: 'Forbidden',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // POST /logout
    fastify.post(
        '/logout',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const body = request.body as any;
            const refreshToken = body.refreshToken;
            await authService.logout(request.user!.userId, refreshToken);

            return reply.send({
                message: 'Logout successful',
            });
        }
    );

    // POST /refresh-token
    fastify.post(
        '/refresh-token',
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { refreshToken } = request.body as any;

                if (!refreshToken) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Refresh token is required',
                    });
                }

                const tokens = await authService.refreshTokens(refreshToken);

                return reply.send({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                });
            } catch (error: any) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: error.message,
                });
            }
        }
    );

    // POST /forgot-password
    fastify.post(
        '/forgot-password',
        {
            config: { rateLimit: passwordResetRateLimitConfig },
            preHandler: [validateBody(forgotPasswordSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            await authService.forgotPassword((request.body as any).email);

            return reply.send({
                message: 'If the email exists, a password reset link has been sent.',
            });
        }
    );

    // POST /reset-password
    fastify.post(
        '/reset-password',
        {
            config: { rateLimit: passwordResetRateLimitConfig },
            preHandler: [validateBody(resetPasswordSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body as any;
                await authService.resetPassword(body.token, body.password);

                return reply.send({
                    message: 'Password reset successful. Please login with your new password.',
                });
            } catch (error: any) {
                if (error.message.includes('Invalid') || error.message.includes('expired')) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // GET /verify-email/:token
    fastify.get<{ Params: { token: string } }>(
        '/verify-email/:token',
        async (request, reply) => {
            try {
                await authService.verifyEmail(request.params.token);

                return reply.send({
                    message: 'Email verified successfully. You can now login.',
                });
            } catch (error: any) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: error.message,
                });
            }
        }
    );

    // ============ 2FA ROUTES ============

    // POST /2fa/setup
    fastify.post(
        '/2fa/setup',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const setup = await authService.setup2FA(request.user!.userId);

            return reply.send({
                message: 'Scan the QR code with your authenticator app',
                secret: setup.secret,
                qrCode: setup.qrCode,
                backupCodes: setup.backupCodes,
            });
        }
    );

    // POST /2fa/enable
    fastify.post(
        '/2fa/enable',
        {
            onRequest: [authMiddleware],
            preHandler: [validateBody(confirm2FASchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body as any;
                await authService.enable2FA(request.user!.userId, body.secret, body.code);

                return reply.send({
                    message: 'Two-factor authentication enabled successfully',
                });
            } catch (error: any) {
                if (error.message.includes('Invalid')) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // POST /2fa/disable
    fastify.post(
        '/2fa/disable',
        {
            onRequest: [authMiddleware],
            preHandler: [validateBody(enable2FASchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const body = request.body as any;
                await authService.disable2FA(request.user!.userId, body.password);

                return reply.send({
                    message: 'Two-factor authentication disabled',
                });
            } catch (error: any) {
                if (error.message.includes('Invalid')) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // POST /verify-2fa
    fastify.post(
        '/verify-2fa',
        {
            config: { rateLimit: authRateLimitConfig },
            preHandler: [validateBody(verify2FASchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { email, password, code } = request.body as any;

                const result = await authService.login(
                    { email, password, twoFactorCode: code, rememberMe: false },
                    request.ip
                );

                return reply.send({
                    message: 'Login successful',
                    user: result.user,
                    vendor: result.vendor,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                });
            } catch (error: any) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: error.message,
                });
            }
        }
    );
}
