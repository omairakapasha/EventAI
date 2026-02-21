import { createClient, RedisClientType } from 'redis';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType | null = null;
let redisAvailable = false;
let redisAttempted = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
    // If we already have a working connection, return it
    if (redisClient && redisAvailable) {
        return redisClient;
    }

    // Don't retry if we already failed
    if (redisAttempted) {
        return null;
    }

    redisAttempted = true;

    try {
        const client = createClient({
            url: config.redis.url,
            socket: {
                connectTimeout: 3000,
                reconnectStrategy: false, // Don't auto-reconnect
            },
        });

        // Suppress error events so they don't crash the process
        client.on('error', () => { });

        await client.connect();
        redisClient = client as any;
        redisAvailable = true;
        logger.info('Connected to Redis');
        return redisClient;
    } catch (err: any) {
        logger.warn('Redis not available — running without cache/sessions', { error: err.message });
        redisAvailable = false;
        redisClient = null;
        return null;
    }
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
        if (!client) return null;
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    },

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const client = await getRedisClient();
        if (!client) return;
        const stringValue = JSON.stringify(value);

        if (ttlSeconds) {
            await client.setEx(key, ttlSeconds, stringValue);
        } else {
            await client.set(key, stringValue);
        }
    },

    async del(key: string): Promise<void> {
        const client = await getRedisClient();
        if (!client) return;
        await client.del(key);
    },

    async delPattern(pattern: string): Promise<void> {
        const client = await getRedisClient();
        if (!client) return;
        const keys = await client.keys(pattern);

        if (keys.length > 0) {
            await client.del(keys);
        }
    },

    async exists(key: string): Promise<boolean> {
        const client = await getRedisClient();
        if (!client) return false;
        return (await client.exists(key)) === 1;
    },

    async ttl(key: string): Promise<number> {
        const client = await getRedisClient();
        if (!client) return -1;
        return client.ttl(key);
    },

    async incr(key: string): Promise<number> {
        const client = await getRedisClient();
        if (!client) return 0;
        return client.incr(key);
    },

    async expire(key: string, seconds: number): Promise<void> {
        const client = await getRedisClient();
        if (!client) return;
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
