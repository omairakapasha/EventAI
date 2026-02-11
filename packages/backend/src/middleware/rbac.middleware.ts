import { FastifyRequest, FastifyReply } from 'fastify';
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

// Middleware factory for role-based access (Fastify preHandler hook)
export function requireRole(minRole: UserRole) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!request.user) {
            reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        if (!hasRole(request.user.role, minRole)) {
            reply.status(403).send({
                error: 'Forbidden',
                message: `This action requires at least ${minRole} role`,
            });
            return;
        }
    };
}

// Middleware factory for permission-based access (Fastify preHandler hook)
export function requirePermission(...permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!request.user) {
            reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        const hasAllPermissions = permissions.every((permission) =>
            hasPermission(request.user!.role, permission)
        );

        if (!hasAllPermissions) {
            reply.status(403).send({
                error: 'Forbidden',
                message: 'You do not have permission to perform this action',
                requiredPermissions: permissions,
            });
            return;
        }
    };
}

// Middleware to ensure user can only access their own vendor's data
export async function requireVendorAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
        reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
        });
        return;
    }

    const params = request.params as Record<string, string>;
    const vendorId = params.vendorId || request.vendorId;

    if (!vendorId) {
        return;
    }

    if (request.user.vendorId !== vendorId) {
        reply.status(403).send({
            error: 'Forbidden',
            message: 'You can only access your own vendor data',
        });
        return;
    }
}

export default {
    requireRole,
    requirePermission,
    requireVendorAccess,
    hasPermission,
    hasRole,
};
