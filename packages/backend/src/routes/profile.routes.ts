import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { updateVendorSchema } from '../schemas/index.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Get current vendor profile
router.get('/vendor', authMiddleware, async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;

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
            res.status(404).json({ error: 'Vendor not found' });
            return;
        }

        res.json({ data: vendor });
    } catch (error: any) {
        logger.error('Get vendor profile error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch vendor profile' });
    }
});

// Get current user profile
router.get('/user', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;

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
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ data: user });
    } catch (error: any) {
        logger.error('Get user profile error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update vendor profile
router.put('/vendor', authMiddleware, requirePermission('vendor:write'), validateRequest(updateVendorSchema), async (req: Request, res: Response) => {
    try {
        const vendorId = req.user!.vendorId;

        const vendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                name: req.body.name,
                businessType: req.body.businessType,
                phone: req.body.phone,
                address: req.body.address || undefined,
                description: req.body.description,
                website: req.body.website,
                serviceAreas: req.body.serviceAreas || undefined,
                settings: req.body.settings || undefined,
            },
        });

        res.json({ data: vendor });
    } catch (error: any) {
        logger.error('Update vendor profile error', { error: error.message });
        res.status(500).json({ error: 'Failed to update vendor profile' });
    }
});

// Get public vendor profile
router.get('/public/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

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
            res.status(404).json({ error: 'Vendor not found' });
            return;
        }

        res.json({ data: vendor });
    } catch (error: any) {
        logger.error('Get public vendor profile error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch vendor profile' });
    }
});

export default router;
