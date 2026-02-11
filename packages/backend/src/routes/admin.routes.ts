import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {

    // Require admin middleware
    const requireAdmin = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'owner')) {
            reply.status(403).send({ error: 'Admin access required' });
            return;
        }
    };

    // Get system statistics
    fastify.get(
        '/stats',
        { onRequest: [authMiddleware], preHandler: [requireAdmin] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const [
                    totalVendors,
                    activeVendors,
                    pendingVendors,
                    totalUsers,
                    totalServices,
                    totalBookings,
                ] = await Promise.all([
                    prisma.vendor.count(),
                    prisma.vendor.count({ where: { status: 'ACTIVE' } }),
                    prisma.vendor.count({ where: { status: 'PENDING' } }),
                    prisma.vendorUser.count(),
                    prisma.service.count(),
                    prisma.booking.count(),
                ]);

                return reply.send({
                    data: {
                        totalVendors,
                        activeVendors,
                        pendingVendors,
                        totalUsers,
                        totalServices,
                        totalBookings,
                    },
                });
            } catch (error: any) {
                logger.error('Admin stats error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch stats' });
            }
        }
    );

    // List vendors
    fastify.get(
        '/vendors',
        { onRequest: [authMiddleware], preHandler: [requireAdmin] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const query = request.query as any;
                const page = parseInt(query.page) || 1;
                const limit = parseInt(query.limit) || 20;
                const status = query.status;

                const where: any = {};
                if (status) {
                    where.status = status;
                }

                const [vendors, total] = await Promise.all([
                    prisma.vendor.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        skip: (page - 1) * limit,
                        take: limit,
                        include: {
                            _count: {
                                select: { users: true, services: true },
                            },
                        },
                    }),
                    prisma.vendor.count({ where }),
                ]);

                return reply.send({
                    data: vendors,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            } catch (error: any) {
                logger.error('Admin list vendors error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch vendors' });
            }
        }
    );

    // Update vendor status
    fastify.patch<{ Params: { id: string } }>(
        '/vendors/:id/status',
        { onRequest: [authMiddleware], preHandler: [requireAdmin] },
        async (request, reply) => {
            try {
                const id = request.params.id;
                const { status } = request.body as any;

                const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
                if (!status || !validStatuses.includes(status)) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                    });
                }

                const vendor = await prisma.vendor.update({
                    where: { id },
                    data: { status },
                });

                logger.info('Vendor status updated', { vendorId: id, status });

                return reply.send({ data: vendor });
            } catch (error: any) {
                logger.error('Admin update vendor status error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to update vendor status' });
            }
        }
    );

    // List users
    fastify.get(
        '/users',
        { onRequest: [authMiddleware], preHandler: [requireAdmin] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const query = request.query as any;
                const page = parseInt(query.page) || 1;
                const limit = parseInt(query.limit) || 20;

                const [users, total] = await Promise.all([
                    prisma.vendorUser.findMany({
                        orderBy: { createdAt: 'desc' },
                        skip: (page - 1) * limit,
                        take: limit,
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                            emailVerified: true,
                            lastLoginAt: true,
                            createdAt: true,
                            vendor: {
                                select: { id: true, name: true, status: true },
                            },
                        },
                    }),
                    prisma.vendorUser.count(),
                ]);

                return reply.send({
                    data: users,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            } catch (error: any) {
                logger.error('Admin list users error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch users' });
            }
        }
    );
}
