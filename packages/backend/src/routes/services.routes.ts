import { Router, Request, Response, NextFunction } from 'express';
import { serviceService } from '../services/service.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { createServiceSchema, updateServiceSchema, serviceQuerySchema } from '../schemas/index.js';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/vendors/me/services
router.get(
    '/',
    requirePermission('service:read'),
    validateQuery(serviceQuerySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await serviceService.findByVendor({
                vendorId: req.user!.vendorId,
                category: req.query.category as any,
                isActive: req.query.isActive === 'true',
                search: req.query.search as string,
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

// GET /api/v1/vendors/me/services/:id
router.get(
    '/:id',
    requirePermission('service:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const service = await serviceService.findById(req.params.id as string, req.user!.vendorId);

            if (!service) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Service not found',
                });
                return;
            }

            res.json(service);
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/me/services
router.post(
    '/',
    requirePermission('service:write'),
    validateBody(createServiceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const service = await serviceService.create(
                req.user!.vendorId,
                req.user!.userId,
                req.body
            );

            res.status(201).json(service);
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/vendors/me/services/:id
router.put(
    '/:id',
    requirePermission('service:write'),
    validateBody(updateServiceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const service = await serviceService.update(
                req.params.id as string,
                req.user!.vendorId,
                req.user!.userId,
                req.body
            );

            if (!service) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Service not found',
                });
                return;
            }

            res.json(service);
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/v1/vendors/me/services/:id
router.delete(
    '/:id',
    requirePermission('service:delete'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await serviceService.delete(
                req.params.id as string,
                req.user!.vendorId,
                req.user!.userId
            );

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/v1/vendors/me/services/import
router.post(
    '/import',
    requirePermission('service:write'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { services } = req.body;

            if (!Array.isArray(services) || services.length === 0) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Services array is required',
                });
                return;
            }

            if (services.length > 100) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Maximum 100 services can be imported at once',
                });
                return;
            }

            const result = await serviceService.bulkImport(
                req.user!.vendorId,
                req.user!.userId,
                services
            );

            res.status(201).json({
                message: `Successfully imported ${result.created} services`,
                created: result.created,
                errors: result.errors,
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
