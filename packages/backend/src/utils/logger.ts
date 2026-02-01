import winston from 'winston';
import { config } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    customFormat
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

export const logger = winston.createLogger({
    level: config.logging.level,
    format: config.server.isDev ? devFormat : prodFormat,
    defaultMeta: { service: 'vendor-management' },
    transports: [
        new winston.transports.Console(),
    ],
});

// Add file transports in production
if (config.server.isProd) {
    logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export default logger;
