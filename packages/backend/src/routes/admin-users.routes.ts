import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

// Validation schemas
const approveUserSchema = z.object({
    userId: z.string().uuid(),
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
});

const listUsersQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.string().optional().transform(Number).default('1'),
    limit: z.string().optional().transform(Number).default('20'),
});

export async function adminUserRoutes(fastify: FastifyInstance) {
    // Apply auth middleware to all routes
    fastify.addHook('onRequest', requireAuth);
    fastify.addHook('onRequest', requireRole(['admin', 'super_admin']));

    // List all users with optional status filter
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = listUsersQuerySchema.parse(request.query);
            const { status, page, limit } = query;
            const skip = (page - 1) * limit;

            const where = status ? { status } : {};

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        status: true,
                        emailVerified: true,
                        approvedBy: true,
                        approvedAt: true,
                        rejectedAt: true,
                        rejectionReason: true,
                        createdAt: true,
                        lastLoginAt: true,
                        admin: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.user.count({ where }),
            ]);

            return reply.send({
                success: true,
                data: {
                    users,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid query parameters',
                    details: error.issues,
                });
            }

            logger.error('Failed to list users', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Failed to list users',
            });
        }
    });

    // Get user details by ID
    fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };

            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    status: true,
                    emailVerified: true,
                    approvedBy: true,
                    approvedAt: true,
                    rejectedAt: true,
                    rejectionReason: true,
                    createdAt: true,
                    updatedAt: true,
                    lastLoginAt: true,
                    events: {
                        select: {
                            id: true,
                            eventName: true,
                            eventDate: true,
                            status: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    bookings: {
                        select: {
                            id: true,
                            eventName: true,
                            status: true,
                            createdAt: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    admin: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
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
            logger.error('Failed to get user details', { error: error.message, userId: (request.params as any).id });
            return reply.status(500).send({
                success: false,
                error: 'Failed to get user details',
            });
        }
    });

    // Approve or reject user
    fastify.post('/approve', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = approveUserSchema.parse(request.body);
            const { userId, action, reason } = body;
            const adminId = (request as any).user?.userId;

            if (!adminId) {
                return reply.status(401).send({
                    success: false,
                    error: 'Admin authentication required',
                    code: 'UNAUTHORIZED',
                });
            }

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND',
                });
            }

            // Check if user is already approved or rejected
            if (user.status !== 'pending') {
                return reply.status(400).send({
                    success: false,
                    error: `User is already ${user.status}`,
                    code: 'USER_ALREADY_PROCESSED',
                });
            }

            // Update user status
            const updateData = action === 'approve'
                ? {
                    status: 'approved' as const,
                    approvedBy: adminId,
                    approvedAt: new Date(),
                }
                : {
                    status: 'rejected' as const,
                    approvedBy: adminId,
                    rejectedAt: new Date(),
                    rejectionReason: reason || 'No reason provided',
                };

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    approvedBy: true,
                    approvedAt: true,
                    rejectedAt: true,
                    rejectionReason: true,
                },
            });

            logger.info(`User ${action}d`, {
                userId,
                adminId,
                action,
                reason: reason || null,
            });

            return reply.send({
                success: true,
                data: {
                    user: updatedUser,
                    message: `User ${action}d successfully`,
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

            logger.error('Failed to approve/reject user', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Failed to process user approval',
            });
        }
    });

    // Get pending users count (for dashboard)
    fastify.get('/stats/pending', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const [pendingCount, approvedCount, rejectedCount, totalCount] = await Promise.all([
                prisma.user.count({ where: { status: 'pending' } }),
                prisma.user.count({ where: { status: 'approved' } }),
                prisma.user.count({ where: { status: 'rejected' } }),
                prisma.user.count(),
            ]);

            return reply.send({
                success: true,
                data: {
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                    total: totalCount,
                },
            });
        } catch (error: any) {
            logger.error('Failed to get user stats', { error: error.message });
            return reply.status(500).send({
                success: false,
                error: 'Failed to get user statistics',
            });
        }
    });
}
