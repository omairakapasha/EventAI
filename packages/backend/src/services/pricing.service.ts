import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { AuditLogger } from '../middleware/audit.middleware.js';
import { PricingStatus, CurrencyCode, Prisma, type Pricing } from '../generated/client';
import { CreatePricingInput, UpdatePricingInput } from '../schemas/index.js';

interface PricingQueryOptions {
    vendorId: string;
    serviceId?: string;
    activeOnly?: boolean;
    status?: PricingStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

class PricingService {
    async create(vendorId: string, userId: string, input: CreatePricingInput): Promise<Pricing> {
        // Validate service belongs to vendor
        const service = await prisma.service.findFirst({
            where: { id: input.serviceId, vendorId },
        });

        if (!service) {
            throw new Error('Service not found or does not belong to vendor');
        }

        // Check for existing active pricing for this service  
        if (input.serviceId) {
            const existingActive = await prisma.pricing.findFirst({
                where: {
                    serviceId: input.serviceId,
                    isActive: true,
                    status: 'active',
                },
            });

            if (existingActive) {
                // Deactivate previous pricing
                await prisma.pricing.update({
                    where: { id: existingActive.id },
                    data: { isActive: false, status: 'expired' },
                });
            }
        }

        const pricing = await prisma.pricing.create({
            data: {
                serviceId: input.serviceId,
                vendorId,
                price: input.price,
                currency: (input.currency || 'USD') as CurrencyCode,
                effectiveDate: new Date(input.effectiveDate),
                expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
                isActive: true,
                status: 'active',
                holidaySurchargePercent: input.holidaySurchargePercent ?? 0,
                weekendSurchargePercent: input.weekendSurchargePercent ?? 0,
                rushSurchargePercent: input.rushSurchargePercent ?? 0,
                minQuantityForDiscount: input.minQuantityForDiscount,
                bulkDiscountPercent: input.bulkDiscountPercent ?? 0,
                notes: input.notes,
                createdBy: userId,
            },
        });

        await AuditLogger.log(
            vendorId,
            userId,
            'create',
            'pricing',
            pricing.id,
            null,
            { price: input.price, serviceId: input.serviceId }
        );

        return pricing;
    }

    async findByVendor(options: PricingQueryOptions): Promise<PaginatedResult<Pricing>> {
        const {
            vendorId,
            serviceId,
            activeOnly = true,
            status,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const where: Prisma.PricingWhereInput = { vendorId };

        if (serviceId) {
            where.serviceId = serviceId;
        }

        if (activeOnly) {
            where.isActive = true;
        }

        if (status) {
            where.status = status;
        }

        const [data, total] = await Promise.all([
            prisma.pricing.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    service: {
                        select: { id: true, name: true, category: true },
                    },
                },
            }),
            prisma.pricing.count({ where }),
        ]);

        return {
            data: data as any,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id: string, vendorId: string): Promise<Pricing | null> {
        return prisma.pricing.findFirst({
            where: { id, vendorId },
            include: {
                service: {
                    select: { id: true, name: true, category: true },
                },
            },
        });
    }

    async update(id: string, vendorId: string, userId: string, input: UpdatePricingInput): Promise<Pricing> {
        const existing = await prisma.pricing.findFirst({
            where: { id, vendorId },
        });

        if (!existing) {
            throw new Error('Pricing not found');
        }

        const oldPrice = Number(existing.price);

        const updateData: Prisma.PricingUpdateInput = {};

        if (input.price !== undefined) updateData.price = input.price;
        if (input.currency !== undefined) updateData.currency = input.currency as CurrencyCode;
        if (input.effectiveDate !== undefined) updateData.effectiveDate = new Date(input.effectiveDate);
        if (input.expiryDate !== undefined) {
            updateData.expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;
        }
        if (input.holidaySurchargePercent !== undefined) updateData.holidaySurchargePercent = input.holidaySurchargePercent;
        if (input.weekendSurchargePercent !== undefined) updateData.weekendSurchargePercent = input.weekendSurchargePercent;
        if (input.rushSurchargePercent !== undefined) updateData.rushSurchargePercent = input.rushSurchargePercent;
        if (input.minQuantityForDiscount !== undefined) updateData.minQuantityForDiscount = input.minQuantityForDiscount;
        if (input.bulkDiscountPercent !== undefined) updateData.bulkDiscountPercent = input.bulkDiscountPercent;
        if (input.notes !== undefined) updateData.notes = input.notes;

        const pricing = await prisma.pricing.update({
            where: { id },
            data: updateData,
        });

        // Record price history if price changed
        if (input.price !== undefined && input.price !== oldPrice) {
            const changePercent = oldPrice > 0 ? ((input.price - oldPrice) / oldPrice) * 100 : 0;

            await prisma.priceHistory.create({
                data: {
                    pricingId: id,
                    serviceId: existing.serviceId,
                    vendorId,
                    oldPrice: oldPrice,
                    newPrice: input.price,
                    priceChangePercent: parseFloat(changePercent.toFixed(2)),
                    changedBy: userId,
                },
            });
        }

        await AuditLogger.log(
            vendorId,
            userId,
            'update',
            'pricing',
            id,
            { price: oldPrice },
            { price: Number(pricing.price) }
        );

        return pricing;
    }

    async getHistory(
        vendorId: string,
        options: {
            pricingId?: string;
            serviceId?: string;
            page?: number;
            limit?: number;
        }
    ) {
        const { pricingId, serviceId, page = 1, limit = 20 } = options;

        const where: Prisma.PriceHistoryWhereInput = { vendorId };

        if (pricingId) {
            where.pricingId = pricingId;
        }

        if (serviceId) {
            where.serviceId = serviceId;
        }

        const [data, total] = await Promise.all([
            prisma.priceHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.priceHistory.count({ where }),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async validatePricing(input: CreatePricingInput): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        if (input.price <= 0) {
            errors.push('Price must be greater than 0');
        }

        if (input.expiryDate && input.effectiveDate) {
            if (new Date(input.expiryDate) <= new Date(input.effectiveDate)) {
                errors.push('Expiry date must be after effective date');
            }
        }

        if (input.bulkDiscountPercent && input.bulkDiscountPercent > 0 && !input.minQuantityForDiscount) {
            errors.push('Min quantity for discount is required when bulk discount is set');
        }

        return { valid: errors.length === 0, errors };
    }

    async bulkCreate(
        vendorId: string,
        userId: string,
        pricings: CreatePricingInput[]
    ): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> {
        const results = { created: 0, errors: [] as Array<{ index: number; error: string }> };

        for (let i = 0; i < pricings.length; i++) {
            try {
                const validation = await this.validatePricing(pricings[i]);
                if (!validation.valid) {
                    results.errors.push({ index: i, error: validation.errors.join(', ') });
                    continue;
                }

                await this.create(vendorId, userId, pricings[i]);
                results.created++;
            } catch (error: any) {
                results.errors.push({ index: i, error: error.message });
            }
        }

        logger.info('Bulk pricing create completed', {
            vendorId,
            created: results.created,
            errors: results.errors.length,
        });

        return results;
    }
}

export const pricingService = new PricingService();
export default pricingService;
