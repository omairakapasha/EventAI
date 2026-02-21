import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { publicApiRateLimitConfig, bookingRateLimitConfig } from '../middleware/rateLimit.middleware.js';
import { 
    createEventSchema, 
    eventListQuerySchema, 
    updateEventStatusSchema,
    uuidSchema 
} from '../schemas/index.js';
import { 
    successResponse, 
    paginatedResponse, 
    errorResponse, 
    ErrorCode, 
    getStatusCode 
} from '../utils/response.js';

export default async function eventsRoutes(fastify: FastifyInstance): Promise<void> {

    // Create a new event
    fastify.post(
        '/',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateBody(createEventSchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const {
                    eventType,
                    eventName,
                    eventDate,
                    eventTime,
                    eventEndDate,
                    eventEndTime,
                    location,
                    clientName,
                    clientEmail,
                    clientPhone,
                    attendees,
                    budget,
                    preferences,
                    requirements,
                } = request.body as any;

                if (!eventType || !eventDate) {
                    return reply.status(400).send({
                        error: 'Missing required fields: eventType, eventDate',
                    });
                }

                const event = await prisma.event.create({
                    data: {
                        eventType,
                        eventName: eventName || `${eventType} Event`,
                        eventDate: new Date(eventDate),
                        eventTime: eventTime ? new Date(`1970-01-01T${eventTime}`) : null,
                        eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
                        eventEndTime: eventEndTime ? new Date(`1970-01-01T${eventEndTime}`) : null,
                        location: location || null,
                        clientName: clientName || null,
                        clientEmail: clientEmail || null,
                        clientPhone: clientPhone || null,
                        attendees: attendees ? parseInt(attendees) : null,
                        budget: budget ? parseFloat(budget) : null,
                        currency: 'PKR',
                        preferences: preferences || [],
                        requirements: requirements || null,
                        status: 'draft',
                    },
                });

                logger.info('Event created', { eventId: event.id, eventType });

                return reply.status(201).send(successResponse(event));
            } catch (error: any) {
                logger.error('Error creating event', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to create event')
                );
            }
        }
    );

    // List events (filter by client_email)
    fastify.get(
        '/',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateQuery(eventListQuerySchema)] 
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { email, status, page, limit } = request.query as any;

                const where: any = {};
                if (email) where.clientEmail = email;
                if (status) where.status = status;

                const skip = (page - 1) * limit;

                const [events, total] = await Promise.all([
                    prisma.event.findMany({
                        where,
                        include: {
                            eventVendors: {
                                include: {
                                    vendor: { select: { id: true, name: true, category: true } },
                                    service: { select: { id: true, name: true } },
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit,
                    }),
                    prisma.event.count({ where }),
                ]);

                return reply.send(paginatedResponse(events, total, page, limit));
            } catch (error: any) {
                logger.error('Error listing events', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to list events')
                );
            }
        }
    );

    // Get event details with linked vendors
    fastify.get<{ Params: { id: string } }>(
        '/:id',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [validateParams(z.object({ id: uuidSchema }))] 
        },
        async (request, reply) => {
            try {
                const { id } = request.params;

                const event = await prisma.event.findUnique({
                    where: { id },
                    include: {
                        eventVendors: {
                            include: {
                                vendor: {
                                    select: {
                                        id: true,
                                        name: true,
                                        category: true,
                                        contactEmail: true,
                                        phone: true,
                                        rating: true,
                                    },
                                },
                                service: {
                                    select: { id: true, name: true, category: true, description: true },
                                },
                            },
                        },
                    },
                });

                if (!event) {
                    return reply.status(404).send(
                        errorResponse(ErrorCode.EVENT_NOT_FOUND, 'Event not found')
                    );
                }

                return reply.send(successResponse(event));
            } catch (error: any) {
                logger.error('Error getting event', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to get event')
                );
            }
        }
    );

    // Update event status  
    fastify.patch<{ Params: { id: string } }>(
        '/:id/status',
        { 
            config: { rateLimit: publicApiRateLimitConfig },
            preHandler: [
                validateParams(z.object({ id: uuidSchema })),
                validateBody(updateEventStatusSchema)
            ] 
        },
        async (request, reply) => {
            try {
                const { id } = request.params;
                const { status } = request.body as any;

                const validStatuses = ['draft', 'planning', 'quoted', 'approved', 'confirmed', 'completed', 'cancelled'];
                if (!validStatuses.includes(status)) {
                    return reply.status(400).send({
                        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                    });
                }

                const event = await prisma.event.update({
                    where: { id },
                    data: { status },
                });

                logger.info('Event status updated', { eventId: id, status });

                return reply.send(successResponse(event));
            } catch (error: any) {
                logger.error('Error updating event status', { error: error.message });
                return reply.status(getStatusCode(ErrorCode.DATABASE_ERROR)).send(
                    errorResponse(ErrorCode.DATABASE_ERROR, 'Failed to update event status')
                );
            }
        }
    );
}
