import { Pool, PoolConfig } from 'pg';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const poolConfig: PoolConfig = {
    connectionString: config.database.url,
    max: config.database.poolSize,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
    logger.debug('New client connected to PostgreSQL');
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed query', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount,
    });

    return result.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function healthCheck(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

export async function closePool(): Promise<void> {
    await pool.end();
    logger.info('PostgreSQL pool closed');
}

export default { pool, query, queryOne, transaction, healthCheck, closePool };
