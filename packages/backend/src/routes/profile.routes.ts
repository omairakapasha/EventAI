import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { updateVendorSchema } from '../schemas/index.js';
import { logger } from '../utils/logger.js';

export default async function profileRoutes(fastify: FastifyInstance): Promise<void> {

    // Get current vendor profile (me endpoint - matches frontend expectation)
    fastify.get(
        '/me',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const userId = request.user!.userId;

                const [vendor, user] = await Promise.all([
                    prisma.vendor.findUnique({
                        where: { id: vendorId },
                        include: {
                            _count: {
                                select: {
                                    services: true,
                                    users: true,
                                    bookings: true,
                                },
                            },
                        },
                    }),
                    prisma.vendorUser.findUnique({
                        where: { id: userId },
                        select: {
                            id: true,
                            vendorId: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                            phone: true,
                            avatarUrl: true,
                            twoFactorEnabled: true,
                            emailVerified: true,
                            lastLoginAt: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    }),
                ]);

                if (!vendor || !user) {
                    return reply.status(404).send({ error: 'Vendor or user not found' });
                }

                return reply.send({ vendor, user });
            } catch (error: any) {
                logger.error('Get /me profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch profile' });
            }
        }
    );

    // Update current vendor profile (me endpoint)
    fastify.put(
        '/me',
        {
            onRequest: [authMiddleware],
            preHandler: [requirePermission('vendor:write'), validateRequest(updateVendorSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const body = request.body as any;

                const vendor = await prisma.vendor.update({
                    where: { id: vendorId },
                    data: {
                        name: body.name,
                        businessType: body.businessType,
                        phone: body.phone,
                        address: body.address || undefined,
                        description: body.description,
                        website: body.website,
                        serviceAreas: body.serviceAreas || undefined,
                        settings: body.settings || undefined,
                    },
                });

                return reply.send({ data: vendor });
            } catch (error: any) {
                logger.error('Update /me profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to update profile' });
            }
        }
    );

    // Get current vendor profile (legacy endpoint)
    fastify.get(
        '/vendor',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;

                const vendor = await prisma.vendor.findUnique({
                    where: { id: vendorId },
                    include: {
                        _count: {
                            select: {
                                services: true,
                                users: true,
                                bookings: true,
                            },
                        },
                    },
                });

                if (!vendor) {
                    return reply.status(404).send({ error: 'Vendor not found' });
                }

                return reply.send({ data: vendor });
            } catch (error: any) {
                logger.error('Get vendor profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch vendor profile' });
            }
        }
    );

    // Get current user profile
    fastify.get(
        '/user',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user!.userId;

                const user = await prisma.vendorUser.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        vendorId: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        phone: true,
                        avatarUrl: true,
                        twoFactorEnabled: true,
                        emailVerified: true,
                        emailVerifiedAt: true,
                        lastLoginAt: true,
                        preferences: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                if (!user) {
                    return reply.status(404).send({ error: 'User not found' });
                }

                return reply.send({ data: user });
            } catch (error: any) {
                logger.error('Get user profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch user profile' });
            }
        }
    );

    // Update vendor profile
    fastify.put(
        '/vendor',
        {
            onRequest: [authMiddleware],
            preHandler: [requirePermission('vendor:write'), validateRequest(updateVendorSchema)],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const body = request.body as any;

                const vendor = await prisma.vendor.update({
                    where: { id: vendorId },
                    data: {
                        name: body.name,
                        businessType: body.businessType,
                        phone: body.phone,
                        address: body.address || undefined,
                        description: body.description,
                        website: body.website,
                        serviceAreas: body.serviceAreas || undefined,
                        settings: body.settings || undefined,
                    },
                });

                return reply.send({ data: vendor });
            } catch (error: any) {
                logger.error('Update vendor profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to update vendor profile' });
            }
        }
    );

    // Get public vendor profile
    fastify.get<{ Params: { id: string } }>(
        '/public/:id',
        async (request, reply) => {
            try {
                const id = request.params.id;

                const vendor = await prisma.vendor.findFirst({
                    where: { id, status: 'ACTIVE' },
                    select: {
                        id: true,
                        name: true,
                        businessType: true,
                        description: true,
                        logoUrl: true,
                        website: true,
                        rating: true,
                        totalReviews: true,
                        serviceAreas: true,
                        category: true,
                        services: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                shortDescription: true,
                                featuredImage: true,
                                ratingAverage: true,
                                ratingCount: true,
                            },
                        },
                    },
                });

                if (!vendor) {
                    return reply.status(404).send({ error: 'Vendor not found' });
                }

                return reply.send({ data: vendor });
            } catch (error: any) {
                logger.error('Get public vendor profile error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch vendor profile' });
            }
        }
    );
}
