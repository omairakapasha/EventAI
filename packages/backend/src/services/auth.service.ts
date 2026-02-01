import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { query, queryOne, transaction } from '../config/database.js';
import { sessionStore } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { VendorUser, Vendor, UserRole } from '../types/index.js';
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
            { expiresIn: config.jwt.expiresIn }
        );
    }

    generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
        return jwt.sign(
            { ...payload, type: 'refresh' },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiresIn }
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
        return transaction(async (client) => {
            // Check if email exists
            const existingUser = await queryOne<VendorUser>(
                'SELECT id FROM vendor_users WHERE email = $1',
                [input.email]
            );

            if (existingUser) {
                throw new Error('Email already registered');
            }

            const existingVendor = await queryOne<Vendor>(
                'SELECT id FROM vendors WHERE contact_email = $1',
                [input.contactEmail]
            );

            if (existingVendor) {
                throw new Error('Business email already registered');
            }

            // Create vendor
            const vendorResult = await client.query(
                `INSERT INTO vendors (name, business_type, contact_email, phone, address, website)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [
                    input.vendorName,
                    input.businessType || null,
                    input.contactEmail,
                    input.phone || null,
                    JSON.stringify(input.address || {}),
                    input.website || null,
                ]
            );
            const vendor = this.mapVendorRow(vendorResult.rows[0]);

            // Hash password
            const passwordHash = await this.hashPassword(input.password);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Create user as owner
            const userResult = await client.query(
                `INSERT INTO vendor_users (vendor_id, email, password_hash, first_name, last_name, role, email_verification_token, email_verification_expires)
         VALUES ($1, $2, $3, $4, $5, 'owner', $6, $7)
         RETURNING *`,
                [
                    vendor.id,
                    input.email,
                    passwordHash,
                    input.firstName,
                    input.lastName,
                    emailVerificationToken,
                    emailVerificationExpires,
                ]
            );
            const user = this.mapUserRow(userResult.rows[0]);

            logger.info('Vendor registered', { vendorId: vendor.id, email: input.email });

            return { vendor, user };
        });
    }

    // ============ LOGIN ============

    async login(input: LoginInput, ipAddress?: string): Promise<AuthResult> {
        const user = await queryOne<any>(
            `SELECT vu.*, v.name as vendor_name, v.status as vendor_status
       FROM vendor_users vu
       JOIN vendors v ON vu.vendor_id = v.id
       WHERE vu.email = $1`,
            [input.email]
        );

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const unlockTime = new Date(user.locked_until).toISOString();
            throw new Error(`Account locked until ${unlockTime}. Too many failed login attempts.`);
        }

        // Verify password
        const isValidPassword = await this.verifyPassword(input.password, user.password_hash);

        if (!isValidPassword) {
            await this.handleFailedLogin(user.id, user.failed_login_attempts);
            throw new Error('Invalid email or password');
        }

        // Check 2FA
        if (user.two_factor_enabled) {
            if (!input.twoFactorCode) {
                return {
                    requiresTwoFactor: true,
                } as AuthResult;
            }

            const isValid2FA = this.verify2FACode(user.two_factor_secret, input.twoFactorCode);
            if (!isValid2FA) {
                throw new Error('Invalid 2FA code');
            }
        }

        // Check email verification
        if (!user.email_verified) {
            throw new Error('Please verify your email before logging in');
        }

        // Check vendor status
        if (user.vendor_status === 'SUSPENDED') {
            throw new Error('Your vendor account has been suspended');
        }

        if (user.vendor_status === 'DEACTIVATED') {
            throw new Error('Your vendor account has been deactivated');
        }

        // Update login info and reset failed attempts
        await query(
            `UPDATE vendor_users 
       SET last_login_at = NOW(), last_login_ip = $1, failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
            [ipAddress, user.id]
        );

        // Get full vendor data
        const vendor = await queryOne<any>(
            'SELECT * FROM vendors WHERE id = $1',
            [user.vendor_id]
        );

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            vendorId: user.vendor_id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.generateAccessToken(tokenPayload);
        const refreshToken = this.generateRefreshToken(tokenPayload);

        // Store refresh token in Redis
        await sessionStore.setRefreshToken(user.id, refreshToken);

        logger.info('User logged in', { userId: user.id, email: user.email });

        return {
            user: this.mapUserRow(user),
            vendor: this.mapVendorRow(vendor),
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

    async forgotPassword(email: string): Promise<string> {
        const user = await queryOne<VendorUser>(
            'SELECT id FROM vendor_users WHERE email = $1',
            [email]
        );

        if (!user) {
            // Don't reveal if email exists
            return 'If the email exists, a reset link has been sent';
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await query(
            `UPDATE vendor_users 
       SET password_reset_token = $1, password_reset_expires = $2
       WHERE id = $3`,
            [resetToken, resetExpires, user.id]
        );

        // TODO: Send email with reset link
        logger.info('Password reset requested', { userId: user.id });

        return resetToken; // In production, send via email
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const user = await queryOne<VendorUser>(
            `SELECT id FROM vendor_users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
            [token]
        );

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        const passwordHash = await this.hashPassword(newPassword);

        await query(
            `UPDATE vendor_users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
            [passwordHash, user.id]
        );

        // Invalidate all sessions
        await sessionStore.invalidateAllRefreshTokens(user.id);

        logger.info('Password reset successful', { userId: user.id });
    }

    // ============ EMAIL VERIFICATION ============

    async verifyEmail(token: string): Promise<void> {
        const result = await query(
            `UPDATE vendor_users 
       SET email_verified = TRUE, email_verified_at = NOW(), 
           email_verification_token = NULL, email_verification_expires = NULL
       WHERE email_verification_token = $1 AND email_verification_expires > NOW()
       RETURNING id`,
            [token]
        );

        if (result.length === 0) {
            throw new Error('Invalid or expired verification token');
        }

        logger.info('Email verified', { userId: result[0].id });
    }

    // ============ 2FA ============

    async setup2FA(userId: string): Promise<TwoFactorSetup> {
        const user = await queryOne<VendorUser>(
            'SELECT email FROM vendor_users WHERE id = $1',
            [userId]
        );

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

        await query(
            `UPDATE vendor_users 
       SET two_factor_enabled = TRUE, two_factor_secret = $1, two_factor_backup_codes = $2
       WHERE id = $3`,
            [secret, hashedBackupCodes, userId]
        );

        logger.info('2FA enabled', { userId });
    }

    async disable2FA(userId: string, password: string): Promise<void> {
        const user = await queryOne<any>(
            'SELECT password_hash FROM vendor_users WHERE id = $1',
            [userId]
        );

        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await this.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        await query(
            `UPDATE vendor_users 
       SET two_factor_enabled = FALSE, two_factor_secret = NULL, two_factor_backup_codes = NULL
       WHERE id = $1`,
            [userId]
        );

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
        let lockedUntil = null;

        if (newAttempts >= LOCKOUT_THRESHOLD) {
            lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
            logger.warn('Account locked due to failed login attempts', { userId });
        }

        await query(
            `UPDATE vendor_users 
       SET failed_login_attempts = $1, locked_until = $2
       WHERE id = $3`,
            [newAttempts, lockedUntil, userId]
        );
    }

    private mapVendorRow(row: any): Vendor {
        return {
            id: row.id,
            name: row.name,
            businessType: row.business_type,
            contactEmail: row.contact_email,
            phone: row.phone,
            address: row.address || {},
            description: row.description,
            logoUrl: row.logo_url,
            website: row.website,
            verified: row.verified,
            verifiedAt: row.verified_at,
            verifiedBy: row.verified_by,
            status: row.status,
            tier: row.tier,
            apiEnabled: row.api_enabled,
            apiConfig: row.api_config || {},
            serviceAreas: row.service_areas || [],
            settings: row.settings || {},
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapUserRow(row: any): Omit<VendorUser, 'passwordHash' | 'twoFactorSecret' | 'twoFactorBackupCodes'> {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            phone: row.phone,
            avatarUrl: row.avatar_url,
            twoFactorEnabled: row.two_factor_enabled,
            emailVerified: row.email_verified,
            emailVerifiedAt: row.email_verified_at,
            emailVerificationToken: row.email_verification_token,
            emailVerificationExpires: row.email_verification_expires,
            passwordResetToken: row.password_reset_token,
            passwordResetExpires: row.password_reset_expires,
            lastLoginAt: row.last_login_at,
            lastLoginIp: row.last_login_ip,
            failedLoginAttempts: row.failed_login_attempts,
            lockedUntil: row.locked_until,
            preferences: row.preferences || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        } as Omit<VendorUser, 'passwordHash' | 'twoFactorSecret' | 'twoFactorBackupCodes'>;
    }
}

export const authService = new AuthService();
export default authService;
