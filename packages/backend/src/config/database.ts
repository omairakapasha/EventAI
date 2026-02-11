import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';

// Re-export the prisma client for convenience
export { prisma };

// Health check using Prisma
export async function healthCheck(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        logger.error('Database health check failed', { error });
        return false;
    }
}

// Connect to the database
export async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info('Database connected successfully via Prisma');
    } catch (error) {
        logger.error('Failed to connect to database', { error });
        throw error;
    }
}

// Disconnect from the database
export async function closePool(): Promise<void> {
    try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
    } catch (error) {
        logger.error('Error disconnecting from database', { error });
    }
}

export default { prisma, healthCheck, connectDatabase, closePool };
