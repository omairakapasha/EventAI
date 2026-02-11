import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        // Initialize transporter if SMTP config is available
        if (config.email.host && config.email.user && config.email.password) {
            this.transporter = nodemailer.createTransport({
                host: config.email.host,
                port: config.email.port || 587,
                secure: config.email.secure,
                auth: {
                    user: config.email.user,
                    pass: config.email.password,
                },
            });
        } else {
            logger.warn('Email service not configured - emails will be logged only');
        }
    }

    private async sendEmail(options: {
        to: string;
        subject: string;
        html: string;
        text?: string;
    }): Promise<void> {
        if (!this.transporter) {
            // Log email content for development
            logger.info('Email would be sent (SMTP not configured):', {
                to: options.to,
                subject: options.subject,
            });
            return;
        }

        try {
            await this.transporter.sendMail({
                from: config.email.from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            logger.info('Email sent', { to: options.to, subject: options.subject });
        } catch (error) {
            logger.error('Failed to send email', { error, to: options.to });
            throw new Error('Failed to send email');
        }
    }

    async sendVerificationEmail(email: string, token: string): Promise<void> {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

        await this.sendEmail({
            to: email,
            subject: 'Verify your email - Event-AI',
            html: `
                <h1>Welcome to Event-AI!</h1>
                <p>Please verify your email address by clicking the link below:</p>
                <a href="${verificationUrl}" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 16px 0;
                ">Verify Email</a>
                <p>Or copy and paste this link:</p>
                <p>${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            `,
            text: `Welcome to Event-AI! Please verify your email by visiting: ${verificationUrl}`,
        });
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        await this.sendEmail({
            to: email,
            subject: 'Password Reset - Event-AI',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 16px 0;
                ">Reset Password</a>
                <p>Or copy and paste this link:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            `,
            text: `Password reset requested. Visit: ${resetUrl} to reset your password.`,
        });
    }

    async sendWelcomeEmail(email: string, name: string): Promise<void> {
        await this.sendEmail({
            to: email,
            subject: 'Welcome to Event-AI!',
            html: `
                <h1>Welcome, ${name}!</h1>
                <p>Thank you for joining Event-AI. Your account has been verified successfully.</p>
                <p>You can now:</p>
                <ul>
                    <li>Create and manage your vendor profile</li>
                    <li>Add services and pricing</li>
                    <li>Receive and manage bookings</li>
                    <li>Connect with event planners</li>
                </ul>
                <p>Get started by logging into your dashboard:</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 16px 0;
                ">Go to Dashboard</a>
            `,
            text: `Welcome, ${name}! Your Event-AI account is now active.`,
        });
    }
}

export const emailService = new EmailService();
export default emailService;
