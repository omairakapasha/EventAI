// Booking conflict prevention service
// Implements optimistic locking for booking time slots

import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const LOCK_DURATION_MS = 30 * 1000; // 30 seconds lock during booking creation

export interface LockResult {
    success: boolean;
    lockId?: string;
    error?: string;
}

/**
 * Attempt to acquire a lock on a vendor's availability for a specific date
 * This prevents double-booking during the booking creation process
 */
export async function acquireAvailabilityLock(
    vendorId: string,
    serviceId: string,
    eventDate: Date,
    lockReason: string = 'booking_creation'
): Promise<LockResult> {
    const lockId = crypto.randomUUID();
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);

    try {
        // Use transaction to ensure atomic check-and-set
        const result = await prisma.$transaction(async (tx) => {
            // Check if there's an existing lock
            const existingAvailability = await tx.vendorAvailability.findFirst({
                where: {
                    vendorId,
                    serviceId,
                    date: eventDate,
                    OR: [
                        // Check if already booked
                        { status: 'booked' },
                        // Check if locked and lock hasn't expired
                        {
                            lockedUntil: {
                                gt: new Date(),
                            },
                        },
                    ],
                },
            });

            if (existingAvailability) {
                if (existingAvailability.status === 'booked') {
                    return { success: false, error: 'Date already booked' };
                }
                if (existingAvailability.lockedUntil && existingAvailability.lockedUntil > new Date()) {
                    return { success: false, error: 'Date is being processed by another user' };
                }
            }

            // Create or update availability record with lock
            await tx.vendorAvailability.upsert({
                where: {
                    vendor_date_service: {
                        vendorId,
                        date: eventDate,
                        serviceId,
                    },
                },
                update: {
                    lockedUntil,
                    lockedBy: lockId,
                    lockedReason: lockReason,
                    status: 'blocked',
                },
                create: {
                    vendorId,
                    serviceId,
                    date: eventDate,
                    lockedUntil,
                    lockedBy: lockId,
                    lockedReason: lockReason,
                    status: 'blocked',
                },
            });

            return { success: true, lockId };
        }, {
            isolationLevel: 'Serializable',
        });

        if (result.success) {
            logger.info('Availability lock acquired', {
                vendorId,
                serviceId,
                date: eventDate,
                lockId,
            });
        }

        return result;
    } catch (error: any) {
        logger.error('Error acquiring availability lock', {
            error: error.message,
            vendorId,
            serviceId,
            date: eventDate,
        });
        return { success: false, error: 'Failed to check availability' };
    }
}

/**
 * Release the lock on a vendor's availability
 * Called after booking is created or if booking fails
 */
export async function releaseAvailabilityLock(
    vendorId: string,
    serviceId: string,
    eventDate: Date,
    lockId: string
): Promise<boolean> {
    try {
        await prisma.vendorAvailability.updateMany({
            where: {
                vendorId,
                serviceId,
                date: eventDate,
                lockedBy: lockId,
            },
            data: {
                lockedUntil: null,
                lockedBy: null,
                lockedReason: null,
                status: 'available',
            },
        });

        logger.info('Availability lock released', {
            vendorId,
            serviceId,
            date: eventDate,
            lockId,
        });

        return true;
    } catch (error: any) {
        logger.error('Error releasing availability lock', {
            error: error.message,
            vendorId,
            serviceId,
            date: eventDate,
            lockId,
        });
        return false;
    }
}

/**
 * Confirm booking by updating availability status to booked
 * Called after successful booking creation
 */
export async function confirmBookingAvailability(
    vendorId: string,
    serviceId: string,
    eventDate: Date,
    bookingId: string,
    lockId: string
): Promise<boolean> {
    try {
        await prisma.vendorAvailability.updateMany({
            where: {
                vendorId,
                serviceId,
                date: eventDate,
                lockedBy: lockId,
            },
            data: {
                status: 'booked',
                bookingId,
                lockedUntil: null,
                lockedBy: null,
                lockedReason: null,
            },
        });

        logger.info('Booking availability confirmed', {
            vendorId,
            serviceId,
            date: eventDate,
            bookingId,
        });

        return true;
    } catch (error: any) {
        logger.error('Error confirming booking availability', {
            error: error.message,
            vendorId,
            serviceId,
            date: eventDate,
            bookingId,
        });
        return false;
    }
}

/**
 * Clean up expired locks (should be run periodically)
 */
export async function cleanupExpiredLocks(): Promise<number> {
    try {
        const result = await prisma.vendorAvailability.updateMany({
            where: {
                lockedUntil: {
                    lt: new Date(),
                },
                status: 'blocked',
            },
            data: {
                lockedUntil: null,
                lockedBy: null,
                lockedReason: null,
                status: 'available',
            },
        });

        logger.info('Cleaned up expired locks', { count: result.count });
        return result.count;
    } catch (error: any) {
        logger.error('Error cleaning up expired locks', { error: error.message });
        return 0;
    }
}

/**
 * Check if a date is available for booking
 */
export async function checkAvailability(
    vendorId: string,
    serviceId: string,
    eventDate: Date
): Promise<{ available: boolean; reason?: string }> {
    try {
        const availability = await prisma.vendorAvailability.findFirst({
            where: {
                vendorId,
                serviceId,
                date: eventDate,
            },
        });

        if (!availability) {
            return { available: true };
        }

        if (availability.status === 'booked') {
            return { available: false, reason: 'Date already booked' };
        }

        if (availability.lockedUntil && availability.lockedUntil > new Date()) {
            return { available: false, reason: 'Date is being processed' };
        }

        if (availability.status === 'blocked') {
            return { available: false, reason: 'Vendor not available on this date' };
        }

        return { available: true };
    } catch (error: any) {
        logger.error('Error checking availability', {
            error: error.message,
            vendorId,
            serviceId,
            date: eventDate,
        });
        return { available: false, reason: 'Error checking availability' };
    }
}
