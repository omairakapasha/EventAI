import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const SALT_ROUNDS = 12;

export async function userAuthRoutes(fastify: FastifyInstance) {
    // User Registration - creates user with pending status
    fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = registerSchema.parse(request.body);

            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: body.email },
            });

            if (existingUser) {
                return reply.status(409).send({
                    success: false,
                    error: 'Email already registered',
                    code: 'EMAIL_EXISTS',
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(body.password, 10);

            // Create user with pending status
            const user = await prisma.user.create({
                data: {
                    email: body.email,
                    passwordHash,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                    status: 'pending',
                    emailVerified: false,
                },
            });

            logger.info('User registered with pending status', { userId: user.id, email: user.email });

            return reply.status(201).send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        status: user.status,
                    },
                    message: 'Registration successful. Waiting for admin approval.',
                },
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid input data',
                    details: error.issues,
                });
            }

            logger.error('User registration failed', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Registration failed',
            });
        }
    });

    // User Login - only approved users can login
    fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = loginSchema.parse(request.body);

            // Find user
            const user = await prisma.user.findUnique({
                where: { email: body.email },
            });

            if (!user) {
                return reply.status(401).send({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                });
            }

            // Check if user is approved
            if (user.status === 'pending') {
                return reply.status(403).send({
                    success: false,
                    error: 'Account pending approval. Please wait for admin approval.',
                    code: 'PENDING_APPROVAL',
                });
            }

            if (user.status === 'rejected') {
                return reply.status(403).send({
                    success: false,
                    error: 'Account has been rejected. Contact support for assistance.',
                    code: 'ACCOUNT_REJECTED',
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

            if (!isValidPassword) {
                return reply.status(401).send({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                });
            }

            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: 'user',
                    type: 'user',
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            logger.info('User logged in', { userId: user.id, email: user.email });

            return reply.send({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        status: user.status,
                    },
                },
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid input data',
                    details: error.issues,
                });
            }

            logger.error('User login failed', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Login failed',
            });
        }
    });

    // Get current user profile
    fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({
                    success: false,
                    error: 'Unauthorized',
                    code: 'UNAUTHORIZED',
                });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, config.jwt.secret) as any;

            if (decoded.type !== 'user') {
                return reply.status(403).send({
                    success: false,
                    error: 'Forbidden - User access only',
                    code: 'FORBIDDEN',
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    avatarUrl: true,
                    status: true,
                    createdAt: true,
                },
            });

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND',
                });
            }

            return reply.send({
                success: true,
                data: { user },
            });
        } catch (error: any) {
            if (error.name === 'JsonWebTokenError') {
                return reply.status(401).send({
                    success: false,
                    error: 'Invalid token',
                    code: 'INVALID_TOKEN',
                });
            }

            logger.error('Get user profile failed', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Failed to get profile',
            });
        }
    });
}
