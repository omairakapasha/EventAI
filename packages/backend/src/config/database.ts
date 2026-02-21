import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';

// Re-export the prisma client for convenience
export { prisma };

// Connection retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

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

// Connect to the database with retry logic
export async function connectDatabase(): Promise<void> {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
        try {
            await prisma.$connect();
            logger.info('Database connected successfully via Prisma');
            return;
        } catch (error) {
            retries++;
            const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
            
            logger.error(`Failed to connect to database (attempt ${retries}/${MAX_RETRIES})`, { error });
            
            if (retries >= MAX_RETRIES) {
                logger.error('Max database connection retries reached');
                throw error;
            }
            
            logger.info(`Retrying database connection in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
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
