import { PrismaClient } from '../generated/client';
import { logger } from '../utils/logger.js';

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['warn', 'error'],
    });

// Log queries in development
if (process.env.NODE_ENV === 'development') {
    (prisma as any).$on('query', (e: any) => {
        logger.debug('Prisma Query', {
            query: e.query?.substring(0, 200),
            duration: e.duration,
        });
    });
}

// Prevent multiple instances in dev (hot-reload)
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
