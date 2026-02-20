import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export default async function bookingsRoutes(fastify: FastifyInstance): Promise<void> {

    // Create a new booking (from agent or user)
    fastify.post(
        '/',
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

                return reply.status(201).send({
                    success: true,
                    booking,
                });
            } catch (error: any) {
                logger.error('Error creating booking', { error: error.message });
                return reply.status(500).send({ error: 'Failed to create booking' });
            }
        }
    );

    // List bookings (filter by email or all)
    fastify.get(
        '/',
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { email, status, page = '1', limit = '20' } = request.query as any;

                const where: any = {};
                if (email) where.clientEmail = email;
                if (status) where.status = status;

                const skip = (parseInt(page) - 1) * parseInt(limit);

                const [bookings, total] = await Promise.all([
                    prisma.booking.findMany({
                        where,
                        include: {
                            vendor: { select: { id: true, name: true } },
                            service: { select: { id: true, name: true, category: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: parseInt(limit),
                    }),
                    prisma.booking.count({ where }),
                ]);

                return reply.send({
                    bookings,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(total / parseInt(limit)),
                    },
                });
            } catch (error: any) {
                logger.error('Error listing bookings', { error: error.message });
                return reply.status(500).send({ error: 'Failed to list bookings' });
            }
        }
    );

    // Get booking details
    fastify.get(
        '/:id',
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as any;

                const booking = await prisma.booking.findUnique({
                    where: { id },
                    include: {
                        vendor: { select: { id: true, name: true, contactEmail: true, phone: true } },
                        service: { select: { id: true, name: true, category: true, description: true } },
                        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
                    },
                });

                if (!booking) {
                    return reply.status(404).send({ error: 'Booking not found' });
                }

                return reply.send({ booking });
            } catch (error: any) {
                logger.error('Error getting booking', { error: error.message });
                return reply.status(500).send({ error: 'Failed to get booking' });
            }
        }
    );

    // Cancel a booking
    fastify.patch(
        '/:id/cancel',
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as any;
                const { reason } = request.body as any;

                const booking = await prisma.booking.findUnique({ where: { id } });
                if (!booking) {
                    return reply.status(404).send({ error: 'Booking not found' });
                }

                if (booking.status === 'cancelled') {
                    return reply.status(400).send({ error: 'Booking is already cancelled' });
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

                return reply.send({ success: true, booking: updated });
            } catch (error: any) {
                logger.error('Error cancelling booking', { error: error.message });
                return reply.status(500).send({ error: 'Failed to cancel booking' });
            }
        }
    );
}
