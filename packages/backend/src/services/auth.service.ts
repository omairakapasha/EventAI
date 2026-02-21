import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { sessionStore } from '../config/redis.js';
import { emailService } from './email.service.js';
import { logger } from '../utils/logger.js';
import { UserRole, type Vendor, type VendorUser } from '../generated/client';
import { RegisterInput, LoginInput } from '../schemas/index.js';

const SALT_ROUNDS = 12;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export interface TokenPayload {
    userId: string;
    vendorId: string;
    email: string;
    role: UserRole;
    type: 'access' | 'refresh';
}

export interface AuthResult {
    user: Omit<VendorUser, 'passwordHash' | 'twoFactorSecret' | 'twoFactorBackupCodes'>;
    vendor: Vendor;
    accessToken: string;
    refreshToken: string;
    requiresTwoFactor?: boolean;
}

export interface TwoFactorSetup {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

class AuthService {
    // ============ PASSWORD HASHING ============

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    // ============ TOKEN GENERATION ============

    generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
        return jwt.sign(
            { ...payload, type: 'access' },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
        );
    }

    generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
        return jwt.sign(
            { ...payload, type: 'refresh' },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
        );
    }

    verifyAccessToken(token: string): TokenPayload {
        return jwt.verify(token, config.jwt.secret) as TokenPayload;
    }

    verifyRefreshToken(token: string): TokenPayload {
        return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
    }

    // ============ REGISTRATION ============

    async register(input: RegisterInput): Promise<{ vendor: Vendor; user: VendorUser }> {
        return prisma.$transaction(async (tx) => {
            // Check if email exists
            const existingUser = await tx.vendorUser.findUnique({
                where: { email: input.email },
            });

            if (existingUser) {
                throw new Error('Email already registered');
            }

            const existingVendor = await tx.vendor.findUnique({
                where: { contactEmail: input.contactEmail },
            });

            if (existingVendor) {
                throw new Error('Business email already registered');
            }

            // Create vendor
            const vendor = await tx.vendor.create({
                data: {
                    name: input.vendorName,
                    businessType: input.businessType || null,
                    contactEmail: input.contactEmail,
                    phone: input.phone || null,
                    address: input.address || {},
                    website: input.website || null,
                },
            });

            // Hash password
            const passwordHash = await this.hashPassword(input.password);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Create user as owner
            const user = await tx.vendorUser.create({
                data: {
                    vendorId: vendor.id,
                    email: input.email,
                    passwordHash,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    role: 'owner',
                    emailVerified: true, // Auto-verify (no email service configured)
                    emailVerificationToken,
                    emailVerificationExpires,
                },
            });

            // Send verification email
            try {
                await emailService.sendVerificationEmail(input.email, emailVerificationToken);
                logger.info('Verification email sent', { email: input.email });
            } catch (error) {
                logger.error('Failed to send verification email', { error, email: input.email });
                // Don't throw - registration is still successful
            }

            logger.info('Vendor registered', { vendorId: vendor.id, email: input.email });

            return { vendor, user };
        });
    }

    // ============ LOGIN ============

    async login(input: LoginInput, ipAddress?: string): Promise<AuthResult> {
        const user = await prisma.vendorUser.findUnique({
            where: { email: input.email },
            include: {
                vendor: {
                    select: { name: true, status: true },
                },
            },
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            const unlockTime = new Date(user.lockedUntil).toISOString();
            throw new Error(`Account locked until ${unlockTime}. Too many failed login attempts.`);
        }

        // Verify password
        const isValidPassword = await this.verifyPassword(input.password, user.passwordHash);

        if (!isValidPassword) {
            await this.handleFailedLogin(user.id, user.failedLoginAttempts);
            throw new Error('Invalid email or password');
        }

        // Check 2FA
        if (user.twoFactorEnabled) {
            if (!input.twoFactorCode) {
                return {
                    requiresTwoFactor: true,
                } as AuthResult;
            }

            const isValid2FA = this.verify2FACode(user.twoFactorSecret!, input.twoFactorCode);
            if (!isValid2FA) {
                throw new Error('Invalid 2FA code');
            }
        }

        // Check email verification
        if (!user.emailVerified) {
            throw new Error('Please verify your email before logging in');
        }

        // Check vendor status
        if (user.vendor.status === 'SUSPENDED') {
            throw new Error('Your vendor account has been suspended');
        }

        if (user.vendor.status === 'DEACTIVATED') {
            throw new Error('Your vendor account has been deactivated');
        }

        // Update login info and reset failed attempts
        await prisma.vendorUser.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress || null,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        // Get full vendor data
        const vendor = await prisma.vendor.findUniqueOrThrow({
            where: { id: user.vendorId },
        });

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            vendorId: user.vendorId,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.generateAccessToken(tokenPayload);
        const refreshToken = this.generateRefreshToken(tokenPayload);

        // Store refresh token in Redis
        await sessionStore.setRefreshToken(user.id, refreshToken);

        logger.info('User logged in', { userId: user.id, email: user.email });

        // Omit sensitive fields
        const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = user;

        return {
            user: safeUser as any,
            vendor,
            accessToken,
            refreshToken,
        };
    }

    // ============ TOKEN REFRESH ============

    async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        try {
            const payload = this.verifyRefreshToken(refreshToken);

            // Check if token is valid in Redis
            const isValid = await sessionStore.isRefreshTokenValid(payload.userId, refreshToken);
            if (!isValid) {
                throw new Error('Invalid refresh token');
            }

            // Invalidate old refresh token
            await sessionStore.invalidateRefreshToken(payload.userId, refreshToken);

            // Generate new tokens
            const tokenPayload = {
                userId: payload.userId,
                vendorId: payload.vendorId,
                email: payload.email,
                role: payload.role,
            };

            const newAccessToken = this.generateAccessToken(tokenPayload);
            const newRefreshToken = this.generateRefreshToken(tokenPayload);

            // Store new refresh token
            await sessionStore.setRefreshToken(payload.userId, newRefreshToken);

            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    // ============ LOGOUT ============

    async logout(userId: string, refreshToken?: string): Promise<void> {
        if (refreshToken) {
            await sessionStore.invalidateRefreshToken(userId, refreshToken);
        } else {
            await sessionStore.invalidateAllRefreshTokens(userId);
        }
        logger.info('User logged out', { userId });
    }

    // ============ PASSWORD RESET ============

    async forgotPassword(email: string): Promise<void> {
        const user = await prisma.vendorUser.findUnique({
            where: { email },
            select: { id: true, email: true },
        });

        if (!user) {
            // Don't reveal if email exists
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.vendorUser.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: resetExpires,
            },
        });

        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken);
            logger.info('Password reset email sent', { userId: user.id });
        } catch (error) {
            logger.error('Failed to send password reset email', { error, userId: user.id });
            // Don't throw - we still generated the token
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const user = await prisma.vendorUser.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { gt: new Date() },
            },
            select: { id: true },
        });

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        const passwordHash = await this.hashPassword(newPassword);

        await prisma.vendorUser.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });

        // Invalidate all sessions
        await sessionStore.invalidateAllRefreshTokens(user.id);

        logger.info('Password reset successful', { userId: user.id });
    }

    // ============ EMAIL VERIFICATION ============

    async verifyEmail(token: string): Promise<void> {
        const user = await prisma.vendorUser.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationExpires: { gt: new Date() },
            },
            select: { id: true },
        });

        if (!user) {
            throw new Error('Invalid or expired verification token');
        }

        await prisma.vendorUser.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });

        // Send welcome email
        try {
            const user = await prisma.vendorUser.findUnique({
                where: { id: user.id },
                select: { email: true, firstName: true, lastName: true },
            });
            if (user) {
                await emailService.sendWelcomeEmail(
                    user.email,
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
                );
            }
        } catch (error) {
            logger.error('Failed to send welcome email', { error, userId: user.id });
        }

        logger.info('Email verified', { userId: user.id });
    }

    // ============ 2FA ============

    async setup2FA(userId: string): Promise<TwoFactorSetup> {
        const user = await prisma.vendorUser.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const secret = speakeasy.generateSecret({
            name: `${config.twoFactor.appName}:${user.email}`,
            issuer: config.twoFactor.issuer,
            length: 32,
        });

        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
        const backupCodes = this.generateBackupCodes();

        return {
            secret: secret.base32,
            qrCode,
            backupCodes,
        };
    }

    async enable2FA(userId: string, secret: string, code: string): Promise<void> {
        const isValid = this.verify2FACode(secret, code);

        if (!isValid) {
            throw new Error('Invalid 2FA code');
        }

        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = await Promise.all(
            backupCodes.map((code) => this.hashPassword(code))
        );

        await prisma.vendorUser.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
                twoFactorBackupCodes: hashedBackupCodes,
            },
        });

        logger.info('2FA enabled', { userId });
    }

    async disable2FA(userId: string, password: string): Promise<void> {
        const user = await prisma.vendorUser.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await this.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        await prisma.vendorUser.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: [],
            },
        });

        logger.info('2FA disabled', { userId });
    }

    verify2FACode(secret: string, code: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: code,
            window: 1,
        });
    }

    private generateBackupCodes(): string[] {
        return Array.from({ length: 8 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );
    }

    // ============ HELPER METHODS ============

    private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
        const newAttempts = currentAttempts + 1;
        let lockedUntil: Date | null = null;

        if (newAttempts >= LOCKOUT_THRESHOLD) {
            lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
            logger.warn('Account locked due to failed login attempts', { userId });
        }

        await prisma.vendorUser.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: newAttempts,
                lockedUntil,
            },
        });
    }
}

export const authService = new AuthService();
export default authService;
