import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Middleware: require admin
const requireAdmin = (req: Request, res: Response, next: any) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};

// Get system statistics
router.get('/stats', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
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

        res.json({
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
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// List vendors
router.get('/vendors', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;

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

        res.json({
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
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

// Update vendor status
router.patch('/vendors/:id/status', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        // Validate status is a valid VendorStatus
        const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({
                error: 'Bad Request',
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
            return;
        }

        const vendor = await prisma.vendor.update({
            where: { id },
            data: { status },
        });

        logger.info('Vendor status updated', { vendorId: id, status });

        res.json({ data: vendor });
    } catch (error: any) {
        logger.error('Admin update vendor status error', { error: error.message });
        res.status(500).json({ error: 'Failed to update vendor status' });
    }
});

// List users
router.get('/users', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

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

        res.json({
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
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
