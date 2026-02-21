import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { publicApiRateLimitConfig, bookingRateLimitConfig } from '../middleware/rateLimit.middleware.js';
import { 
    createBookingSchema, 
    bookingListQuerySchema, 
    cancelBookingSchema,
    uuidSchema 
} from '../schemas/index.js';
import { 
    successResponse, 
    paginatedResponse, 
    errorResponse, 
    ErrorCode, 
    getStatusCode 
} from '../utils/response.js';
import { 
    acquireAvailabilityLock, 
    releaseAvailabilityLock, 
    confirmBookingAvailability 
} from '../services/booking-lock.service.js';

export default async function bookingsRoutes(fastify: FastifyInstance): Promise<void> {

    // Create a new booking (from agent or user)
    fastify.post(
        '/',
        { 
            config: { rateLimit: bookingRateLimitConfig },
            preHandler: [validateBody(createBookingSchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const {
                    vendorId,
                    serviceId,
                    eventDate,
                    clientName,
                    clientEmail,
                    clientPhone,
                    guestCount,
                    notes,
                    specialRequirements,
                    eventName,
                } = request.body as any;

                if (!vendorId || !serviceId || !eventDate) {
                    return reply.status(400).send({
                        error: 'Missing required fields: vendorId, serviceId, eventDate',
                    });
                }

                // Look up service pricing
                const service = await prisma.service.findFirst({
                    where: { id: serviceId, vendorId },
                    include: {
                        pricings: {
                            where: { isActive: true },
                            orderBy: { effectiveDate: 'desc' },
                            take: 1,
                        },
                    },
                });

                if (!service) {
                    return reply.status(404).send({ error: 'Service not found for this vendor' });
                }

                const pricing = service.pricings[0];
                const unitPrice = pricing ? Number(pricing.price) : 0;
                const quantity = guestCount || 1;
                const totalPrice = unitPrice * quantity;

                const booking = await prisma.booking.create({
                    data: {
                        vendorId,
                        serviceId,
                        eventDate: new Date(eventDate),
                        eventName: eventName || null,
                        clientName: clientName || null,
                        clientEmail: clientEmail || null,
                        clientPhone: clientPhone || null,
                        guestCount: guestCount || null,
                        notes: notes || null,
                        specialRequirements: specialRequirements || null,
                        unitPrice,
                        totalPrice,
                        currency: 'PKR',
                        status: 'pending',
                        paymentStatus: 'pending',
                    },
                    include: {
                        vendor: { select: { id: true, name: true, contactEmail: true } },
                        service: { select: { id: true, name: true, category: true } },
                    },
                });

                logger.info('Booking created', { bookingId: booking.id, vendorId, serviceId });

                return reply.status(201).send(successResponse(booking));
            } catch (error: any) {
                logger.error('Error creating booking', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to create booking')
                );
            }
        }
    );

    // List bookings (filter by email or all)
    fastify.get(
        '/',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateQuery(bookingListQuerySchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { email, status, page, limit } = request.query as any;

                const where: any = {};
                if (email) where.clientEmail = email;
                if (status) where.status = status;

                const skip = (page - 1) * limit;

                const [bookings, total] = await Promise.all([
                    prisma.booking.findMany({
                        where,
                        include: {
                            vendor: { select: { id: true, name: true } },
                            service: { select: { id: true, name: true, category: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit,
                    }),
                    prisma.booking.count({ where }),
                ]);

                return reply.send(paginatedResponse(bookings, total, page, limit));
            } catch (error: any) {
                logger.error('Error listing bookings', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to list bookings')
                );
            }
        }
    );

    // Get booking details
    fastify.get<{ Params: { id: string } }>(
        '/:id',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateParams(z.object({ id: uuidSchema }))] 
        },
        async (request, reply) => {
            try {
                const { id } = request.params;

                const booking = await prisma.booking.findUnique({
                    where: { id },
                    include: {
                        vendor: { select: { id: true, name: true, contactEmail: true, phone: true } },
                        service: { select: { id: true, name: true, category: true, description: true } },
                        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
                    },
                });

                if (!booking) {
                    return reply.status(404).send(
                        errorResponse(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found')
                    );
                }

                return reply.send(successResponse(booking));
            } catch (error: any) {
                logger.error('Error getting booking', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to get booking')
                );
            }
        }
    );

    // Cancel a booking
    fastify.patch<{ Params: { id: string } }>(
        '/:id/cancel',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [
                validateParams(z.object({ id: uuidSchema })),
                validateBody(cancelBookingSchema)
            ] 
        },
        async (request, reply) => {
            try {
                const { id } = request.params;
                const { reason } = request.body as any;

                const booking = await prisma.booking.findUnique({ where: { id } });
                
                if (!booking) {
                    return reply.status(404).send(
                        errorResponse(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found')
                    );
                }

                if (booking.status === 'cancelled') {
                    return reply.status(400).send(
                        errorResponse(ErrorCode.RESOURCE_CONFLICT, 'Booking is already cancelled')
                    );
                }

                const updated = await prisma.booking.update({
                    where: { id },
                    data: {
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancellationReason: reason || 'Cancelled by user',
                    },
                    include: {
                        vendor: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                    },
                });

                logger.info('Booking cancelled', { bookingId: id, reason });

                return reply.send(successResponse(updated));
            } catch (error: any) {
                logger.error('Error cancelling booking', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to cancel booking')
                );
            }
        }
    );
}
