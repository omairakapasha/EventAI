import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { AuditAction, EntityType } from '../types/index.js';

interface AuditContext {
    action: AuditAction;
    entityType: EntityType;
    entityId?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    description?: string;
}

// Extend Express Request to include audit context
declare global {
    namespace Express {
        interface Request {
            auditContext?: AuditContext;
            requestId?: string;
        }
    }
}

// Add request ID to every request
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}

// Create audit log entry
export async function createAuditLog(
    vendorId: string | null,
    userId: string | null,
    action: AuditAction,
    entityType: EntityType,
    entityId: string | null,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    req: Request
): Promise<void> {
    try {
        // Calculate changes
        let changes: Record<string, any> | null = null;
        if (oldValue && newValue) {
            changes = {};
            for (const key of Object.keys(newValue)) {
                if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
                    changes[key] = {
                        from: oldValue[key],
                        to: newValue[key],
                    };
                }
            }
        }

        await query(
            `INSERT INTO audit_logs (
        vendor_id, user_id, action, entity_type, entity_id,
        old_value, new_value, changes, ip_address, user_agent, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                vendorId,
                userId,
                action,
                entityType,
                entityId,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                changes ? JSON.stringify(changes) : null,
                req.ip,
                req.headers['user-agent'],
                req.requestId,
            ]
        );
    } catch (error) {
        logger.error('Failed to create audit log', { error, action, entityType, entityId });
    }
}

// Middleware that logs after response is sent
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (body: any) {
        // Log audit after response
        if (req.auditContext && req.user) {
            createAuditLog(
                req.user.vendorId,
                req.user.userId,
                req.auditContext.action,
                req.auditContext.entityType,
                req.auditContext.entityId || null,
                req.auditContext.oldValue || null,
                req.auditContext.newValue || null,
                req
            ).catch((err) => {
                logger.error('Audit log failed', { error: err });
            });
        }

        return originalJson(body);
    };

    next();
}

// Helper to set audit context
export function setAuditContext(
    req: Request,
    action: AuditAction,
    entityType: EntityType,
    entityId?: string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>
): void {
    req.auditContext = {
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
    };
}

// Convenience wrapper for creating audit logs in services
export class AuditLogger {
    static async log(
        vendorId: string | null,
        userId: string | null,
        action: AuditAction,
        entityType: EntityType,
        entityId: string | null,
        oldValue: Record<string, any> | null,
        newValue: Record<string, any> | null,
        ipAddress?: string,
        userAgent?: string,
        requestId?: string
    ): Promise<void> {
        try {
            let changes: Record<string, any> | null = null;
            if (oldValue && newValue) {
                changes = {};
                for (const key of Object.keys(newValue)) {
                    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
                        changes[key] = {
                            from: oldValue[key],
                            to: newValue[key],
                        };
                    }
                }
            }

            await query(
                `INSERT INTO audit_logs (
          vendor_id, user_id, action, entity_type, entity_id,
          old_value, new_value, changes, ip_address, user_agent, request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    vendorId,
                    userId,
                    action,
                    entityType,
                    entityId,
                    oldValue ? JSON.stringify(oldValue) : null,
                    newValue ? JSON.stringify(newValue) : null,
                    changes ? JSON.stringify(changes) : null,
                    ipAddress || null,
                    userAgent || null,
                    requestId || null,
                ]
            );
        } catch (error) {
            logger.error('AuditLogger.log failed', { error, action, entityType, entityId });
        }
    }
}

export default {
    requestIdMiddleware,
    auditMiddleware,
    createAuditLog,
    setAuditContext,
    AuditLogger,
};
