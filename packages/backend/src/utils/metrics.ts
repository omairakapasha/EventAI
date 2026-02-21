/**
 * Simple metrics collection for Event-AI backend
 * Tracks request counts, response times, error rates, and business metrics
 */

interface MetricValue {
    count: number;
    sum: number;
    min: number;
    max: number;
    values: number[];
}

interface MetricsStore {
    requests: {
        total: number;
        byMethod: Map<string, number>;
        byPath: Map<string, number>;
        byStatus: Map<number, number>;
    };
    responseTimes: Map<string, MetricValue>;
    errors: {
        total: number;
        byCode: Map<string, number>;
        byPath: Map<string, number>;
    };
    business: {
        bookingsCreated: number;
        bookingsCancelled: number;
        eventsCreated: number;
        vendorsRegistered: number;
        usersRegistered: number;
    };
    lastReset: Date;
}

class MetricsCollector {
    private metrics: MetricsStore;
    private maxValuesToKeep: number = 100;

    constructor() {
        this.metrics = this.initializeMetrics();
    }

    private initializeMetrics(): MetricsStore {
        return {
            requests: {
                total: 0,
                byMethod: new Map(),
                byPath: new Map(),
                byStatus: new Map(),
            },
            responseTimes: new Map(),
            errors: {
                total: 0,
                byCode: new Map(),
                byPath: new Map(),
            },
            business: {
                bookingsCreated: 0,
                bookingsCancelled: 0,
                eventsCreated: 0,
                vendorsRegistered: 0,
                usersRegistered: 0,
            },
            lastReset: new Date(),
        };
    }

    // Record HTTP request
    recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
        // Total requests
        this.metrics.requests.total++;

        // By method
        const methodCount = this.metrics.requests.byMethod.get(method) || 0;
        this.metrics.requests.byMethod.set(method, methodCount + 1);

        // By path (group similar paths)
        const normalizedPath = this.normalizePath(path);
        const pathCount = this.metrics.requests.byPath.get(normalizedPath) || 0;
        this.metrics.requests.byPath.set(normalizedPath, pathCount + 1);

        // By status code
        const statusCount = this.metrics.requests.byStatus.get(statusCode) || 0;
        this.metrics.requests.byStatus.set(statusCode, statusCount + 1);

        // Response time
        this.recordResponseTime(normalizedPath, durationMs);

        // Error tracking
        if (statusCode >= 400) {
            this.recordError(statusCode.toString(), normalizedPath);
        }
    }

    // Record response time
    recordResponseTime(path: string, durationMs: number): void {
        let metric = this.metrics.responseTimes.get(path);
        if (!metric) {
            metric = {
                count: 0,
                sum: 0,
                min: Infinity,
                max: 0,
                values: [],
            };
        }

        metric.count++;
        metric.sum += durationMs;
        metric.min = Math.min(metric.min, durationMs);
        metric.max = Math.max(metric.max, durationMs);
        metric.values.push(durationMs);

        // Keep only last N values for memory efficiency
        if (metric.values.length > this.maxValuesToKeep) {
            metric.values.shift();
        }

        this.metrics.responseTimes.set(path, metric);
    }

    // Record error
    recordError(code: string, path: string): void {
        this.metrics.errors.total++;

        const codeCount = this.metrics.errors.byCode.get(code) || 0;
        this.metrics.errors.byCode.set(code, codeCount + 1);

        const pathCount = this.metrics.errors.byPath.get(path) || 0;
        this.metrics.errors.byPath.set(path, pathCount + 1);
    }

    // Business metrics
    recordBookingCreated(): void {
        this.metrics.business.bookingsCreated++;
    }

    recordBookingCancelled(): void {
        this.metrics.business.bookingsCancelled++;
    }

    recordEventCreated(): void {
        this.metrics.business.eventsCreated++;
    }

    recordVendorRegistered(): void {
        this.metrics.business.vendorsRegistered++;
    }

    recordUserRegistered(): void {
        this.metrics.business.usersRegistered++;
    }

    // Get metrics snapshot
    getMetrics(): object {
        const responseTimeStats: Record<string, any> = {};
        this.metrics.responseTimes.forEach((metric, path) => {
            responseTimeStats[path] = this.calculateStats(metric);
        });

        return {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            requests: {
                total: this.metrics.requests.total,
                byMethod: Object.fromEntries(this.metrics.requests.byMethod),
                byPath: Object.fromEntries(this.metrics.requests.byPath),
                byStatus: Object.fromEntries(this.metrics.requests.byStatus),
            },
            responseTimes: responseTimeStats,
            errors: {
                total: this.metrics.errors.total,
                byCode: Object.fromEntries(this.metrics.errors.byCode),
                byPath: Object.fromEntries(this.metrics.errors.byPath),
            },
            business: { ...this.metrics.business },
            period: {
                start: this.metrics.lastReset.toISOString(),
                end: new Date().toISOString(),
            },
        };
    }

    // Calculate statistics for a metric
    private calculateStats(metric: MetricValue): object {
        if (metric.count === 0) {
            return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
        }

        const sorted = [...metric.values].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);

        return {
            count: metric.count,
            avg: Math.round((metric.sum / metric.count) * 100) / 100,
            min: metric.min,
            max: metric.max,
            p95: sorted[p95Index] || metric.max,
            p99: sorted[p99Index] || metric.max,
        };
    }

    // Normalize path for grouping
    private normalizePath(path: string): string {
        // Replace IDs with placeholders for grouping
        return path
            .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id')
            .replace(/\/[0-9]+/g, '/:id');
    }

    // Reset metrics
    reset(): void {
        this.metrics = this.initializeMetrics();
    }
}

// Singleton instance
const metrics = new MetricsCollector();

export { metrics, MetricsCollector };
export default metrics;
