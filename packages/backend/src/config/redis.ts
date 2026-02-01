import { createClient, RedisClientType } from 'redis';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
    if (redisClient) {
        return redisClient;
    }

    redisClient = createClient({
        url: config.redis.url,
    });

    redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
    });

    redisClient.on('connect', () => {
        logger.info('Connected to Redis');
    });

    redisClient.on('ready', () => {
        logger.debug('Redis client ready');
    });

    await redisClient.connect();
    return redisClient;
}

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('Redis connection closed');
    }
}

// Cache helpers
export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const client = await getRedisClient();
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    },

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const client = await getRedisClient();
        const stringValue = JSON.stringify(value);

        if (ttlSeconds) {
            await client.setEx(key, ttlSeconds, stringValue);
        } else {
            await client.set(key, stringValue);
        }
    },

    async del(key: string): Promise<void> {
        const client = await getRedisClient();
        await client.del(key);
    },

    async delPattern(pattern: string): Promise<void> {
        const client = await getRedisClient();
        const keys = await client.keys(pattern);

        if (keys.length > 0) {
            await client.del(keys);
        }
    },

    async exists(key: string): Promise<boolean> {
        const client = await getRedisClient();
        return (await client.exists(key)) === 1;
    },

    async ttl(key: string): Promise<number> {
        const client = await getRedisClient();
        return client.ttl(key);
    },

    async incr(key: string): Promise<number> {
        const client = await getRedisClient();
        return client.incr(key);
    },

    async expire(key: string, seconds: number): Promise<void> {
        const client = await getRedisClient();
        await client.expire(key, seconds);
    },
};

// Session store helpers
export const sessionStore = {
    async setSession(userId: string, sessionData: any, ttlSeconds = 86400): Promise<void> {
        await cache.set(`session:${userId}`, sessionData, ttlSeconds);
    },

    async getSession<T>(userId: string): Promise<T | null> {
        return cache.get<T>(`session:${userId}`);
    },

    async deleteSession(userId: string): Promise<void> {
        await cache.del(`session:${userId}`);
    },

    async setRefreshToken(userId: string, token: string, ttlSeconds = 604800): Promise<void> {
        await cache.set(`refresh:${userId}:${token}`, { valid: true }, ttlSeconds);
    },

    async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
        return cache.exists(`refresh:${userId}:${token}`);
    },

    async invalidateRefreshToken(userId: string, token: string): Promise<void> {
        await cache.del(`refresh:${userId}:${token}`);
    },

    async invalidateAllRefreshTokens(userId: string): Promise<void> {
        await cache.delPattern(`refresh:${userId}:*`);
    },
};

export default { getRedisClient, closeRedis, cache, sessionStore };
