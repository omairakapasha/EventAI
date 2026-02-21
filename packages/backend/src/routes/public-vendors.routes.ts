import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { publicApiRateLimitConfig } from '../middleware/rateLimit.middleware.js';
import { vendorListQuerySchema, uuidSchema } from '../schemas/index.js';
import { 
    successResponse, 
    paginatedResponse, 
    errorResponse, 
    ErrorCode, 
    getStatusCode 
} from '../utils/response.js';

export default async function publicVendorRoutes(fastify: FastifyInstance): Promise<void> {

    // Public listing of active vendors (no auth required — used by chatbot agent)
    fastify.get(
        '/',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateQuery(vendorListQuerySchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const {
                    category,
                    location,
                    search,
                    minRating,
                    maxPrice,
                    page,
                    limit,
                } = request.query as any;

                const where: any = {
                    status: 'ACTIVE',
                };

                if (category) {
                    where.category = category;
                }

                if (search) {
                    where.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { keywords: { hasSome: [search.toLowerCase()] } },
                    ];
                }

                if (location) {
                    where.serviceAreas = {
                        path: '$',
                        array_contains: location,
                    };
                }

                if (minRating) {
                    where.rating = { gte: parseFloat(minRating) };
                }

                if (maxPrice) {
                    where.pricingMax = { lte: parseFloat(maxPrice) };
                }

                const skip = (page - 1) * limit;

                const [vendors, total] = await Promise.all([
                    prisma.vendor.findMany({
                        where,
                        select: {
                            id: true,
                            name: true,
                            businessType: true,
                            description: true,
                            category: true,
                            rating: true,
                            totalReviews: true,
                            pricingMin: true,
                            pricingMax: true,
                            serviceAreas: true,
                            keywords: true,
                            logoUrl: true,
                            services: {
                                where: { isActive: true },
                                select: {
                                    id: true,
                                    name: true,
                                    category: true,
                                    shortDescription: true,
                                    unitType: true,
                                    capacity: true,
                                    pricings: {
                                        where: { isActive: true },
                                        select: {
                                            price: true,
                                            currency: true,
                                        },
                                        take: 1,
                                        orderBy: { effectiveDate: 'desc' },
                                    },
                                },
                            },
                        },
                        orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
                        skip,
                        take: limit,
                    }),
                    prisma.vendor.count({ where }),
                ]);

                return reply.send(paginatedResponse(vendors, total, page, limit));
            } catch (error: any) {
                logger.error('Error listing public vendors', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to list vendors')
                );
            }
        }
    );

    // Get public vendor details by ID (no auth)
    fastify.get<{ Params: { id: string } }>(
        '/:id',
        { preHandler: [validateParams(z.object({ id: uuidSchema }))] },
        async (request, reply) => {
            try {
                const { id } = request.params;

                const vendor = await prisma.vendor.findFirst({
                    where: { id, status: 'ACTIVE' },
                    select: {
                        id: true,
                        name: true,
                        businessType: true,
                        description: true,
                        category: true,
                        rating: true,
                        totalReviews: true,
                        pricingMin: true,
                        pricingMax: true,
                        serviceAreas: true,
                        keywords: true,
                        logoUrl: true,
                        website: true,
                        services: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                description: true,
                                shortDescription: true,
                                unitType: true,
                                capacity: true,
                                minQuantity: true,
                                maxQuantity: true,
                                ratingAverage: true,
                                ratingCount: true,
                                pricings: {
                                    where: { isActive: true },
                                    select: {
                                        id: true,
                                        price: true,
                                        currency: true,
                                        effectiveDate: true,
                                    },
                                    take: 1,
                                    orderBy: { effectiveDate: 'desc' },
                                },
                            },
                        },
                    },
                });

                if (!vendor) {
                    return reply.status(404).send(
                        errorResponse(ErrorCode.VENDOR_NOT_FOUND, 'Vendor not found')
                    );
                }

                return reply.send(successResponse(vendor));
            } catch (error: any) {
                logger.error('Error getting public vendor', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to get vendor details')
                );
            }
        }
    );
}
