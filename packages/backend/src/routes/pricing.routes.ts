import { Router, Request, Response, NextFunction } from 'express';
import { pricingService } from '../services/pricing.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { createPricingSchema, updatePricingSchema, bulkPricingSchema, pricingQuerySchema } from '../schemas/index.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/v1/vendors/me/pricing
router.get(
    '/',
    requirePermission('pricing:read'),
    validateQuery(pricingQuerySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await pricingService.findByVendor({
                vendorId: req.user!.vendorId,
                serviceId: req.query.serviceId as string,
                activeOnly: req.query.activeOnly === 'true',
                status: req.query.status as any,
                page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/vendors/me/pricing/history
router.get(
    '/history',
    requirePermission('pricing:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serviceId, page, limit } = req.query;

            const result = await pricingService.getHistory(req.user!.vendorId, {
                serviceId: serviceId as string,
                page: page ? parseInt(page as string, 10) : undefined,
                limit: limit ? parseInt(limit as string, 10) : undefined,
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/me/pricing
router.post(
    '/',
    requirePermission('pricing:write'),
    validateBody(createPricingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pricing = await pricingService.create(
                req.user!.vendorId,
                req.user!.userId,
                req.body
            );

            res.status(201).json(pricing);
        } catch (error: any) {
            if (error.message.includes('validation failed')) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }
);

// POST /api/v1/vendors/me/pricing/bulk
router.post(
    '/bulk',
    requirePermission('pricing:write'),
    validateBody(bulkPricingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await pricingService.bulkCreate(
                req.user!.vendorId,
                req.user!.userId,
                req.body.prices
            );

            res.status(201).json({
                message: `Successfully created ${result.created} prices`,
                created: result.created,
                errors: result.errors,
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/vendors/me/pricing/:id
router.put(
    '/:id',
    requirePermission('pricing:write'),
    validateBody(updatePricingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pricing = await pricingService.update(
                req.params.id as string,
                req.user!.vendorId,
                req.user!.userId,
                req.body
            );

            if (!pricing) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Pricing not found',
                });
                return;
            }

            res.json(pricing);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/me/pricing/validate
router.post(
    '/validate',
    requirePermission('pricing:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serviceId, price, effectiveDate } = req.body;

            if (!serviceId || !price || !effectiveDate) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'serviceId, price, and effectiveDate are required',
                });
                return;
            }

            const validation = await pricingService.validatePricing({
                serviceId,
                price,
                effectiveDate,
            } as any);

            res.json(validation);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
