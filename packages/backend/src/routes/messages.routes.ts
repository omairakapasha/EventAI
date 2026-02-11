import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

export default async function messagesRoutes(fastify: FastifyInstance): Promise<void> {

    // Get all conversations (bookings with messages)
    fastify.get(
        '/',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const user = request.user!;
                const isVendor = !!user.vendorId;

                // Find bookings related to this user/vendor
                const where: any = {};
                if (isVendor) {
                    where.vendorId = user.vendorId;
                } else {
                    // Assuming for now client identification is via email/phone in user object or similar
                    // But typically client side might need different auth or we assume vendor user for now
                    // If this is strictly for vendor portal:
                    where.vendorId = user.vendorId;
                }

                const bookings = await prisma.booking.findMany({
                    where,
                    include: {
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                        service: {
                            select: { name: true }
                        },
                        vendor: {
                            select: { name: true, logoUrl: true }
                        }
                    },
                    orderBy: { updatedAt: 'desc' }
                });

                // Filter to only those with messages or active bookings
                const conversations = bookings.map(b => ({
                    bookingId: b.id,
                    clientName: b.clientName,
                    serviceName: b.service.name,
                    vendorName: b.vendor.name,
                    lastMessage: b.messages[0] || null,
                    updatedAt: b.updatedAt,
                    status: b.status
                }));

                return reply.send({ data: conversations });
            } catch (error: any) {
                logger.error('Fetch conversations error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch messages' });
            }
        }
    );

    // Get messages for a specific booking
    fastify.get(
        '/:bookingId',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { bookingId } = request.params as { bookingId: string };

                const messages = await prisma.bookingMessage.findMany({
                    where: { bookingId },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                role: true
                            }
                        }
                    }
                });

                return reply.send({ data: messages });
            } catch (error: any) {
                logger.error('Fetch messages error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch chat history' });
            }
        }
    );

    // Send a message
    fastify.post(
        '/',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { bookingId, message, attachments } = request.body as any;
                const user = request.user!;

                if (!bookingId || !message) {
                    return reply.status(400).send({ error: 'Booking ID and message are required' });
                }

                // Verify booking existence and access
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId }
                });

                if (!booking) {
                    return reply.status(404).send({ error: 'Booking not found' });
                }

                // Create message
                const newMessage = await prisma.bookingMessage.create({
                    data: {
                        bookingId,
                        senderId: user.userId, // Assuming logged in user is sender
                        senderType: 'vendor', // identifying as vendor user
                        message,
                        attachments: attachments || [],
                        isRead: false
                    }
                });

                // Update booking updated_at to bump conversation
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { updatedAt: new Date() }
                });

                return reply.send({ data: newMessage });
            } catch (error: any) {
                logger.error('Send message error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to send message' });
            }
        }
    );
}
