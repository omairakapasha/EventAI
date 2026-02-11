import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['text/csv', 'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    },
});

// Get vendor dashboard stats
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;

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

        res.json({
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
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get vendor availability
router.get('/availability', authMiddleware, async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;
        const { startDate, endDate, serviceId } = req.query;

        const where: any = { vendorId };

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        if (serviceId) {
            where.serviceId = serviceId as string;
        }

        const availability = await prisma.vendorAvailability.findMany({
            where,
            orderBy: { date: 'asc' },
        });

        res.json({ data: availability });
    } catch (error: any) {
        logger.error('Availability fetch error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Set vendor availability
router.post('/availability', authMiddleware, requirePermission('vendor:write'), async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;
        const { date, startTime, endTime, status, serviceId, notes } = req.body;

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
                blockedBy: req.user!.userId,
            },
        });

        res.json({ data: availability });
    } catch (error: any) {
        logger.error('Set availability error', { error: error.message });
        res.status(500).json({ error: 'Failed to set availability' });
    }
});

// Bulk price upload
router.post('/prices/upload', authMiddleware, requirePermission('pricing:write'), upload.single('file'), async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;
        const userId = req.user!.userId;

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Create upload record
        const uploadRecord = await prisma.priceUpload.create({
            data: {
                vendorId,
                uploadedBy: userId,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                status: 'pending',
            },
        });

        // Process CSV content
        const content = req.file.buffer.toString('utf8');
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

        res.json({
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
        res.status(500).json({ error: 'Failed to process price upload' });
    }
});

// Get upload history
router.get('/prices/uploads', authMiddleware, requirePermission('pricing:read'), async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;

        const uploads = await prisma.priceUpload.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        res.json({ data: uploads });
    } catch (error: any) {
        logger.error('Upload history error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch upload history' });
    }
});

export default router;
