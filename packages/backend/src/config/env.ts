import { z } from 'zod';

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform(Number),
    API_VERSION: z.string().default('v1'),

    // Database
    DATABASE_URL: z.string().optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().default('5432').transform(Number),
    DB_NAME: z.string().default('event_ai'),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),
    DB_POOL_SIZE: z.string().default('20').transform(Number),

    // Redis
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379').transform(Number),

    // JWT
    JWT_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // 2FA
    TWO_FACTOR_APP_NAME: z.string().default('VendorManagement'),
    TWO_FACTOR_ISSUER: z.string().default('VendorManagementSystem'),

    // Email
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).optional(),
    SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default('noreply@vendormanagement.com'),

    // File Upload
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
    ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,application/pdf'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missing = error.issues.map((e) => e.path.join('.')).join(', ');
            throw new Error(`Missing or invalid environment variables: ${missing}`);
        }
        throw error;
    }
}

export const env = validateEnv();

export const config = {
    server: {
        env: env.NODE_ENV,
        port: env.PORT,
        apiVersion: env.API_VERSION,
        isDev: env.NODE_ENV === 'development',
        isProd: env.NODE_ENV === 'production',
        isTest: env.NODE_ENV === 'test',
    },
    database: {
        url: env.DATABASE_URL || `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
        host: env.DB_HOST,
        port: env.DB_PORT,
        name: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        poolSize: env.DB_POOL_SIZE,
    },
    redis: {
        url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
    jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    twoFactor: {
        appName: env.TWO_FACTOR_APP_NAME,
        issuer: env.TWO_FACTOR_ISSUER,
    },
    email: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.EMAIL_FROM,
    },
    upload: {
        dir: env.UPLOAD_DIR,
        maxSize: env.MAX_FILE_SIZE,
        allowedTypes: env.ALLOWED_FILE_TYPES.split(','),
    },
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
    cors: {
        origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
    },
    logging: {
        level: env.LOG_LEVEL,
        format: env.LOG_FORMAT,
    },
};

export default config;
