import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { AuditAction, EntityType } from '../generated/client';

interface AuditContext {
    action: AuditAction;
    entityType: EntityType;
    entityId?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    description?: string;
}

// Extend Fastify Request to include audit context
declare module 'fastify' {
    interface FastifyRequest {
        auditContext?: AuditContext;
        requestId?: string;
    }
}

// Add request ID to every request
export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Fastify auto-generates request.id, but we also support X-Request-ID header
    request.requestId = (request.headers['x-request-id'] as string) || request.id || uuidv4();
    reply.header('X-Request-ID', request.requestId);
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
    request: FastifyRequest
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

        await prisma.auditLog.create({
            data: {
                vendorId,
                userId,
                action,
                entityType,
                entityId,
                oldValue: oldValue || undefined,
                newValue: newValue || undefined,
                changes: changes || undefined,
                ipAddress: request.ip || null,
                userAgent: request.headers['user-agent'] || null,
                requestId: request.requestId || null,
            },
        });
    } catch (error) {
        logger.error('Failed to create audit log', { error, action, entityType, entityId });
    }
}

// Hook that logs after response is sent (onResponse hook)
export async function auditMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (request.auditContext && request.user) {
        createAuditLog(
            request.user.vendorId,
            request.user.userId,
            request.auditContext.action,
            request.auditContext.entityType,
            request.auditContext.entityId || null,
            request.auditContext.oldValue || null,
            request.auditContext.newValue || null,
            request
        ).catch((err) => {
            logger.error('Audit log failed', { error: err });
        });
    }
}

// Helper to set audit context
export function setAuditContext(
    request: FastifyRequest,
    action: AuditAction,
    entityType: EntityType,
    entityId?: string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>
): void {
    request.auditContext = {
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

            await prisma.auditLog.create({
                data: {
                    vendorId,
                    userId,
                    action,
                    entityType,
                    entityId,
                    oldValue: oldValue || undefined,
                    newValue: newValue || undefined,
                    changes: changes || undefined,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    requestId: requestId || null,
                },
            });
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
