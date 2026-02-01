import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { updateVendorSchema } from '../schemas/index.js';
import { AuditLogger } from '../middleware/audit.middleware.js';

const router = Router();

// GET /api/v1/vendors/me - Get current vendor profile
router.get(
    '/me',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const vendor = await queryOne<any>(
                'SELECT * FROM vendors WHERE id = $1',
                [req.user!.vendorId]
            );

            if (!vendor) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Vendor not found',
                });
                return;
            }

            const user = await queryOne<any>(
                `SELECT id, email, first_name, last_name, role, phone, avatar_url, 
                two_factor_enabled, email_verified, last_login_at, created_at
         FROM vendor_users WHERE id = $1`,
                [req.user!.userId]
            );

            res.json({
                vendor: {
                    id: vendor.id,
                    name: vendor.name,
                    businessType: vendor.business_type,
                    contactEmail: vendor.contact_email,
                    phone: vendor.phone,
                    address: vendor.address,
                    description: vendor.description,
                    logoUrl: vendor.logo_url,
                    website: vendor.website,
                    verified: vendor.verified,
                    status: vendor.status,
                    tier: vendor.tier,
                    apiEnabled: vendor.api_enabled,
                    serviceAreas: vendor.service_areas,
                    settings: vendor.settings,
                    createdAt: vendor.created_at,
                    updatedAt: vendor.updated_at,
                },
                user: user ? {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    phone: user.phone,
                    avatarUrl: user.avatar_url,
                    twoFactorEnabled: user.two_factor_enabled,
                    emailVerified: user.email_verified,
                    lastLoginAt: user.last_login_at,
                    createdAt: user.created_at,
                } : null,
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/v1/vendors/me - Update vendor profile
router.put(
    '/me',
    authMiddleware,
    requirePermission('vendor:write'),
    validateBody(updateVendorSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const vendorId = req.user!.vendorId;
            const userId = req.user!.userId;

            // Get old values for audit
            const oldVendor = await queryOne<any>(
                'SELECT name, business_type, phone, address, description, website FROM vendors WHERE id = $1',
                [vendorId]
            );

            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            const fieldMappings: Record<string, string> = {
                name: 'name',
                businessType: 'business_type',
                phone: 'phone',
                description: 'description',
                website: 'website',
            };

            for (const [key, column] of Object.entries(fieldMappings)) {
                if (req.body[key] !== undefined) {
                    updates.push(`${column} = $${paramIndex}`);
                    values.push(req.body[key]);
                    paramIndex++;
                }
            }

            if (req.body.address !== undefined) {
                updates.push(`address = $${paramIndex}`);
                values.push(JSON.stringify(req.body.address));
                paramIndex++;
            }

            if (req.body.serviceAreas !== undefined) {
                updates.push(`service_areas = $${paramIndex}`);
                values.push(JSON.stringify(req.body.serviceAreas));
                paramIndex++;
            }

            if (req.body.settings !== undefined) {
                updates.push(`settings = $${paramIndex}`);
                values.push(JSON.stringify(req.body.settings));
                paramIndex++;
            }

            if (updates.length === 0) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'No fields to update',
                });
                return;
            }

            values.push(vendorId);
            const result = await query<any>(
                `UPDATE vendors SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
                values
            );

            const vendor = result[0];

            await AuditLogger.log(
                vendorId,
                userId,
                'update',
                'vendor',
                vendorId,
                oldVendor,
                req.body
            );

            res.json({
                id: vendor.id,
                name: vendor.name,
                businessType: vendor.business_type,
                contactEmail: vendor.contact_email,
                phone: vendor.phone,
                address: vendor.address,
                description: vendor.description,
                logoUrl: vendor.logo_url,
                website: vendor.website,
                verified: vendor.verified,
                status: vendor.status,
                tier: vendor.tier,
                serviceAreas: vendor.service_areas,
                settings: vendor.settings,
                updatedAt: vendor.updated_at,
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/vendors/:id/public - Get public vendor profile
router.get(
    '/:id/public',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const vendor = await queryOne<any>(
                `SELECT id, name, business_type, description, logo_url, website, 
                verified, service_areas, created_at
         FROM vendors 
         WHERE id = $1 AND status = 'ACTIVE'`,
                [req.params.id]
            );

            if (!vendor) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Vendor not found',
                });
                return;
            }

            // Get vendor services
            const services = await query<any>(
                `SELECT id, name, category, short_description, featured_image, 
                rating_average, rating_count
         FROM services 
         WHERE vendor_id = $1 AND is_active = TRUE
         ORDER BY rating_average DESC
         LIMIT 10`,
                [req.params.id]
            );

            res.json({
                vendor: {
                    id: vendor.id,
                    name: vendor.name,
                    businessType: vendor.business_type,
                    description: vendor.description,
                    logoUrl: vendor.logo_url,
                    website: vendor.website,
                    verified: vendor.verified,
                    serviceAreas: vendor.service_areas,
                    createdAt: vendor.created_at,
                },
                services: services.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    shortDescription: s.short_description,
                    featuredImage: s.featured_image,
                    ratingAverage: parseFloat(s.rating_average) || 0,
                    ratingCount: s.rating_count,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
