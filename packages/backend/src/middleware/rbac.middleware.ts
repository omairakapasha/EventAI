import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

// Role hierarchy: owner > admin > staff > readonly
const roleHierarchy: Record<UserRole, number> = {
    owner: 4,
    admin: 3,
    staff: 2,
    readonly: 1,
};

// Permission definitions
type Permission =
    | 'vendor:read' | 'vendor:write' | 'vendor:delete'
    | 'user:read' | 'user:write' | 'user:delete' | 'user:invite'
    | 'service:read' | 'service:write' | 'service:delete'
    | 'pricing:read' | 'pricing:write' | 'pricing:delete' | 'pricing:approve'
    | 'document:read' | 'document:write' | 'document:delete'
    | 'booking:read' | 'booking:write' | 'booking:delete' | 'booking:confirm'
    | 'api:read' | 'api:write' | 'api:delete'
    | 'webhook:read' | 'webhook:write' | 'webhook:delete'
    | 'audit:read'
    | 'settings:read' | 'settings:write';

const rolePermissions: Record<UserRole, Permission[]> = {
    owner: [
        'vendor:read', 'vendor:write', 'vendor:delete',
        'user:read', 'user:write', 'user:delete', 'user:invite',
        'service:read', 'service:write', 'service:delete',
        'pricing:read', 'pricing:write', 'pricing:delete', 'pricing:approve',
        'document:read', 'document:write', 'document:delete',
        'booking:read', 'booking:write', 'booking:delete', 'booking:confirm',
        'api:read', 'api:write', 'api:delete',
        'webhook:read', 'webhook:write', 'webhook:delete',
        'audit:read',
        'settings:read', 'settings:write',
    ],
    admin: [
        'vendor:read', 'vendor:write',
        'user:read', 'user:write', 'user:invite',
        'service:read', 'service:write', 'service:delete',
        'pricing:read', 'pricing:write', 'pricing:delete',
        'document:read', 'document:write', 'document:delete',
        'booking:read', 'booking:write', 'booking:confirm',
        'api:read', 'api:write',
        'webhook:read', 'webhook:write',
        'audit:read',
        'settings:read', 'settings:write',
    ],
    staff: [
        'vendor:read',
        'user:read',
        'service:read', 'service:write',
        'pricing:read', 'pricing:write',
        'document:read', 'document:write',
        'booking:read', 'booking:write', 'booking:confirm',
        'webhook:read',
        'settings:read',
    ],
    readonly: [
        'vendor:read',
        'user:read',
        'service:read',
        'pricing:read',
        'document:read',
        'booking:read',
        'settings:read',
    ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Middleware factory for role-based access
export function requireRole(minRole: UserRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        if (!hasRole(req.user.role, minRole)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `This action requires at least ${minRole} role`,
            });
            return;
        }

        next();
    };
}

// Middleware factory for permission-based access
export function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        const hasAllPermissions = permissions.every((permission) =>
            hasPermission(req.user!.role, permission)
        );

        if (!hasAllPermissions) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to perform this action',
                requiredPermissions: permissions,
            });
            return;
        }

        next();
    };
}

// Middleware to ensure user can only access their own vendor's data
export function requireVendorAccess(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
        });
        return;
    }

    const vendorId = req.params.vendorId || req.vendorId;

    if (!vendorId) {
        next();
        return;
    }

    if (req.user.vendorId !== vendorId) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own vendor data',
        });
        return;
    }

    next();
}

export default {
    requireRole,
    requirePermission,
    requireVendorAccess,
    hasPermission,
    hasRole,
};
