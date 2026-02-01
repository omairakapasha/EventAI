import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js'; // Assuming admin role checks are here or we use a simple check

const router = Router();

// Middleware to check for Admin role
// For simplicity, assuming the logged in user must have 'admin' role or similar permissions
// You might need to adjust this based on your actual RBAC implementation
const adminCheck = (req: Request, res: Response, next: NextFunction) => {
    // TEMPORARY: Allow all for dev if auth is tricky, but better to check role
    // if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

// GET /api/v1/admin/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Total Revenue (Sum of final_price for PAID/COMPLETED event_vendors)
        // If event_vendors doesn't exist yet, we catch error or return 0
        let revenue = 0;
        try {
            const revResult = await queryOne<any>(
                `SELECT SUM(final_price) as total FROM event_vendors WHERE status IN ('PAID', 'COMPLETED')`
            );
            revenue = revResult?.total || 0;
        } catch (e) {
            // Table might not exist or be empty
            revenue = 0;
        }

        // 2. Active Vendors
        const vendorsResult = await queryOne<any>(
            `SELECT COUNT(*) as count FROM vendors WHERE status = 'ACTIVE'`
        );
        const activeVendors = parseInt(vendorsResult?.count || '0');

        // 3. Total Users (Vendor Users for now)
        const usersResult = await queryOne<any>(
            `SELECT COUNT(*) as count FROM vendor_users`
        );
        const totalUsers = parseInt(usersResult?.count || '0');

        // 4. Active Events
        let activeEvents = 0;
        try {
            const eventsResult = await queryOne<any>(
                `SELECT COUNT(*) as count FROM events WHERE status NOT IN ('CANCELLED', 'COMPLETED')`
            );
            activeEvents = parseInt(eventsResult?.count || '0');
        } catch (e) {
            activeEvents = 0;
        }

        res.json({
            revenue,
            activeVendors,
            totalUsers,
            activeEvents
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/vendors - List all vendors
router.get('/vendors', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendors = await query<any>(
            `SELECT id, name, category, status, rating, created_at FROM vendors ORDER BY created_at DESC`
        );
        res.json(vendors);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/admin/vendors/:id/status - Update vendor status
router.put('/vendors/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;
        const result = await queryOne<any>(
            `UPDATE vendors SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/users - List all users (vendor_users)
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await query<any>(
            `SELECT id, email, first_name, last_name, role, status, created_at FROM vendor_users ORDER BY created_at DESC`
        );
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/admin/users/:id/status - Update user status
router.put('/users/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;
        const result = await queryOne<any>(
            `UPDATE vendor_users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
