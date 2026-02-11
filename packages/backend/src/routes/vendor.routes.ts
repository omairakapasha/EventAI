import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { logger } from '../utils/logger.js';

export default async function vendorRoutes(fastify: FastifyInstance): Promise<void> {

    // Get vendor dashboard stats
    fastify.get(
        '/dashboard',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;

                const [
                    totalServices,
                    activeServices,
                    totalBookings,
                    pendingBookings,
                    recentActivity,
                ] = await Promise.all([
                    prisma.service.count({ where: { vendorId } }),
                    prisma.service.count({ where: { vendorId, isActive: true } }),
                    prisma.booking.count({ where: { vendorId } }),
                    prisma.booking.count({ where: { vendorId, status: 'pending' } }),
                    prisma.auditLog.findMany({
                        where: { vendorId },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    }),
                ]);

                return reply.send({
                    stats: {
                        totalServices,
                        activeServices,
                        totalBookings,
                        pendingBookings,
                    },
                    recentActivity,
                });
            } catch (error: any) {
                logger.error('Dashboard fetch error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch dashboard data' });
            }
        }
    );

    // Get vendor availability
    fastify.get(
        '/availability',
        { onRequest: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const query = request.query as any;
                const { startDate, endDate, serviceId } = query;

                const where: any = { vendorId };

                if (startDate && endDate) {
                    where.date = {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    };
                }

                if (serviceId) {
                    where.serviceId = serviceId;
                }

                const availability = await prisma.vendorAvailability.findMany({
                    where,
                    orderBy: { date: 'asc' },
                });

                return reply.send({ data: availability });
            } catch (error: any) {
                logger.error('Availability fetch error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch availability' });
            }
        }
    );

    // Set vendor availability
    fastify.post(
        '/availability',
        {
            onRequest: [authMiddleware],
            preHandler: [requirePermission('vendor:write')],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const body = request.body as any;
                const { date, startTime, endTime, status, serviceId, notes } = body;

                const availability = await prisma.vendorAvailability.upsert({
                    where: {
                        vendor_date_service: {
                            vendorId,
                            date: new Date(date),
                            serviceId: serviceId || null,
                        },
                    },
                    update: {
                        startTime: startTime || null,
                        endTime: endTime || null,
                        status: status || 'available',
                        notes: notes || null,
                    },
                    create: {
                        vendorId,
                        serviceId: serviceId || null,
                        date: new Date(date),
                        startTime: startTime || null,
                        endTime: endTime || null,
                        status: status || 'available',
                        notes: notes || null,
                        blockedBy: request.user!.userId,
                    },
                });

                return reply.send({ data: availability });
            } catch (error: any) {
                logger.error('Set availability error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to set availability' });
            }
        }
    );

    // Bulk price upload (using @fastify/multipart)
    fastify.post(
        '/prices/upload',
        {
            onRequest: [authMiddleware],
            preHandler: [requirePermission('pricing:write')],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;
                const userId = request.user!.userId;

                const data = await request.file();

                if (!data) {
                    return reply.status(400).send({ error: 'No file uploaded' });
                }

                const allowed = ['text/csv', 'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
                if (!allowed.includes(data.mimetype)) {
                    return reply.status(400).send({ error: 'Only CSV and Excel files are allowed' });
                }

                // Read file buffer
                const chunks: Buffer[] = [];
                for await (const chunk of data.file) {
                    chunks.push(chunk);
                }
                const fileBuffer = Buffer.concat(chunks);

                if (fileBuffer.length > 10 * 1024 * 1024) {
                    return reply.status(400).send({ error: 'File size exceeds 10MB limit' });
                }

                // Create upload record
                const uploadRecord = await prisma.priceUpload.create({
                    data: {
                        vendorId,
                        uploadedBy: userId,
                        fileName: data.filename,
                        fileSize: fileBuffer.length,
                        status: 'pending',
                    },
                });

                // Process CSV content
                const content = fileBuffer.toString('utf8');
                const lines = content.split('\n').filter((l) => l.trim());
                const header = lines[0].split(',');

                let processedRecords = 0;
                let failedRecords = 0;
                const errorLog: any[] = [];

                for (let i = 1; i < lines.length; i++) {
                    try {
                        const values = lines[i].split(',');
                        const rawData: Record<string, string> = {};
                        header.forEach((h, idx) => {
                            rawData[h.trim()] = values[idx]?.trim() || '';
                        });

                        await prisma.priceUploadRecord.create({
                            data: {
                                uploadId: uploadRecord.id,
                                serviceName: rawData['service_name'] || rawData['name'],
                                price: rawData['price'] ? parseFloat(rawData['price']) : null,
                                currency: rawData['currency'] || 'PKR',
                                unitType: rawData['unit_type'],
                                effectiveDate: rawData['effective_date'] ? new Date(rawData['effective_date']) : null,
                                expiryDate: rawData['expiry_date'] ? new Date(rawData['expiry_date']) : null,
                                status: 'pending',
                                rawData,
                            },
                        });

                        processedRecords++;
                    } catch (err: any) {
                        failedRecords++;
                        errorLog.push({ row: i, error: err.message });
                    }
                }

                // Update upload record
                await prisma.priceUpload.update({
                    where: { id: uploadRecord.id },
                    data: {
                        status: failedRecords === 0 ? 'completed' : failedRecords === lines.length - 1 ? 'failed' : 'partial',
                        totalRecords: lines.length - 1,
                        processedRecords,
                        failedRecords,
                        errorLog,
                        completedAt: new Date(),
                    },
                });

                return reply.send({
                    data: {
                        uploadId: uploadRecord.id,
                        totalRecords: lines.length - 1,
                        processedRecords,
                        failedRecords,
                        errorLog,
                    },
                });
            } catch (error: any) {
                logger.error('Price upload error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to process price upload' });
            }
        }
    );

    // Get upload history
    fastify.get(
        '/prices/uploads',
        {
            onRequest: [authMiddleware],
            preHandler: [requirePermission('pricing:read')],
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const vendorId = request.user!.vendorId;

                const uploads = await prisma.priceUpload.findMany({
                    where: { vendorId },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                });

                return reply.send({ data: uploads });
            } catch (error: any) {
                logger.error('Upload history error', { error: error.message });
                return reply.status(500).send({ error: 'Failed to fetch upload history' });
            }
        }
    );
}
