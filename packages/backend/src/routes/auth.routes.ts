import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';
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

const router = Router();

// POST /api/v1/vendors/register
router.post(
    '/register',
    authLimiter,
    validateBody(registerSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.register(req.body);

            // TODO: Send verification email
            logger.info('Vendor registered, verification email should be sent', {
                vendorId: result.vendor.id,
                email: result.user.email,
            });

            res.status(201).json({
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
                res.status(409).json({
                    error: 'Conflict',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// POST /api/v1/vendors/login
router.post(
    '/login',
    authLimiter,
    validateBody(loginSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.login(req.body, req.ip);

            if (result.requiresTwoFactor) {
                res.status(200).json({
                    message: 'Two-factor authentication required',
                    requiresTwoFactor: true,
                });
                return;
            }

            res.json({
                message: 'Login successful',
                user: result.user,
                vendor: result.vendor,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        } catch (error: any) {
            if (error.message.includes('Invalid') || error.message.includes('locked')) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: error.message,
                });
                return;
            }
            if (error.message.includes('verify your email')) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: error.message,
                    code: 'EMAIL_NOT_VERIFIED',
                });
                return;
            }
            if (error.message.includes('suspended') || error.message.includes('deactivated')) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// POST /api/v1/vendors/logout
router.post(
    '/logout',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.body.refreshToken;
            await authService.logout(req.user!.userId, refreshToken);

            res.json({
                message: 'Logout successful',
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/refresh-token
router.post(
    '/refresh-token',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Refresh token is required',
                });
                return;
            }

            const tokens = await authService.refreshTokens(refreshToken);

            res.json({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        } catch (error: any) {
            res.status(401).json({
                error: 'Unauthorized',
                message: error.message,
            });
        }
    }
);

// POST /api/v1/vendors/forgot-password
router.post(
    '/forgot-password',
    passwordResetLimiter,
    validateBody(forgotPasswordSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.forgotPassword(req.body.email);

            // Always return success to prevent email enumeration
            res.json({
                message: 'If the email exists, a password reset link has been sent.',
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/reset-password
router.post(
    '/reset-password',
    passwordResetLimiter,
    validateBody(resetPasswordSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.resetPassword(req.body.token, req.body.password);

            res.json({
                message: 'Password reset successful. Please login with your new password.',
            });
        } catch (error: any) {
            if (error.message.includes('Invalid') || error.message.includes('expired')) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// GET /api/v1/vendors/verify-email/:token
router.get(
    '/verify-email/:token',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.verifyEmail(req.params.token);

            res.json({
                message: 'Email verified successfully. You can now login.',
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Bad Request',
                message: error.message,
            });
        }
    }
);

// ============ 2FA ROUTES ============

// POST /api/v1/vendors/2fa/setup
router.post(
    '/2fa/setup',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const setup = await authService.setup2FA(req.user!.userId);

            res.json({
                message: 'Scan the QR code with your authenticator app',
                secret: setup.secret,
                qrCode: setup.qrCode,
                backupCodes: setup.backupCodes,
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/2fa/enable
router.post(
    '/2fa/enable',
    authMiddleware,
    validateBody(confirm2FASchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.enable2FA(req.user!.userId, req.body.secret, req.body.code);

            res.json({
                message: 'Two-factor authentication enabled successfully',
            });
        } catch (error: any) {
            if (error.message.includes('Invalid')) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// POST /api/v1/vendors/2fa/disable
router.post(
    '/2fa/disable',
    authMiddleware,
    validateBody(enable2FASchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authService.disable2FA(req.user!.userId, req.body.password);

            res.json({
                message: 'Two-factor authentication disabled',
            });
        } catch (error: any) {
            if (error.message.includes('Invalid')) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// POST /api/v1/vendors/verify-2fa
router.post(
    '/verify-2fa',
    authLimiter,
    validateBody(verify2FASchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // This endpoint is for verifying 2FA during login
            // The login endpoint returns requiresTwoFactor: true
            // Frontend then calls this endpoint with the 2FA code
            const { email, password, code } = req.body;

            const result = await authService.login(
                { email, password, twoFactorCode: code, rememberMe: false },
                req.ip
            );

            res.json({
                message: 'Login successful',
                user: result.user,
                vendor: result.vendor,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        } catch (error: any) {
            res.status(401).json({
                error: 'Unauthorized',
                message: error.message,
            });
        }
    }
);

export default router;
