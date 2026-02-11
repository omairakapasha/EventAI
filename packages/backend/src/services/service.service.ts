import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { AuditLogger } from '../middleware/audit.middleware.js';
import { ServiceCategory, Prisma, type Service } from '../generated/client';
import { CreateServiceInput, UpdateServiceInput } from '../schemas/index.js';

interface ServiceQueryOptions {
    vendorId: string;
    category?: ServiceCategory;
    isActive?: boolean;
    search?: string;
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

class ServiceService {
    async create(vendorId: string, userId: string, input: CreateServiceInput): Promise<Service> {
        const service = await prisma.service.create({
            data: {
                vendorId,
                name: input.name,
                category: input.category as ServiceCategory,
                description: input.description,
                shortDescription: input.shortDescription,
                unitType: input.unitType as any,
                minQuantity: input.minQuantity,
                maxQuantity: input.maxQuantity,
                capacity: input.capacity,
                isActive: input.isActive ?? true,
                availableFrom: input.availableFrom ? new Date(input.availableFrom as string) : null,
                availableUntil: input.availableUntil ? new Date(input.availableUntil as string) : null,
                leadTimeDays: input.leadTimeDays,
                images: input.images || [],
                featuredImage: input.featuredImage,
                requirements: (input.requirements || {}) as Prisma.InputJsonValue,
                inclusions: (input.inclusions || []) as Prisma.InputJsonValue,
                exclusions: (input.exclusions || []) as Prisma.InputJsonValue,
                tags: (input.tags || []) as string[],
            },
        });

        await AuditLogger.log(
            vendorId,
            userId,
            'create',
            'service',
            service.id,
            null,
            { name: input.name, category: input.category }
        );

        return service;
    }

    async findByVendor(options: ServiceQueryOptions): Promise<PaginatedResult<Service>> {
        const {
            vendorId,
            category,
            isActive,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const where: Prisma.ServiceWhereInput = { vendorId };

        if (category) {
            where.category = category;
        }

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.service.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.service.count({ where }),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id: string, vendorId: string): Promise<Service | null> {
        return prisma.service.findFirst({
            where: { id, vendorId },
        });
    }

    async update(id: string, vendorId: string, userId: string, input: UpdateServiceInput): Promise<Service> {
        const existing = await prisma.service.findFirst({
            where: { id, vendorId },
        });

        if (!existing) {
            throw new Error('Service not found');
        }

        const updateData: Prisma.ServiceUpdateInput = {};

        if (input.name !== undefined) updateData.name = input.name;
        if (input.category !== undefined) updateData.category = input.category as ServiceCategory;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.shortDescription !== undefined) updateData.shortDescription = input.shortDescription;
        if (input.unitType !== undefined) updateData.unitType = input.unitType as any;
        if (input.minQuantity !== undefined) updateData.minQuantity = input.minQuantity;
        if (input.maxQuantity !== undefined) updateData.maxQuantity = input.maxQuantity;
        if (input.capacity !== undefined) updateData.capacity = input.capacity;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.availableFrom !== undefined) {
            updateData.availableFrom = input.availableFrom ? new Date(input.availableFrom as string) : null;
        }
        if (input.availableUntil !== undefined) {
            updateData.availableUntil = input.availableUntil ? new Date(input.availableUntil as string) : null;
        }
        if (input.leadTimeDays !== undefined) updateData.leadTimeDays = input.leadTimeDays;
        if (input.images !== undefined) updateData.images = input.images;
        if (input.featuredImage !== undefined) updateData.featuredImage = input.featuredImage;
        if (input.requirements !== undefined) updateData.requirements = input.requirements as Prisma.InputJsonValue;
        if (input.inclusions !== undefined) updateData.inclusions = input.inclusions as Prisma.InputJsonValue;
        if (input.exclusions !== undefined) updateData.exclusions = input.exclusions as Prisma.InputJsonValue;
        if (input.tags !== undefined) updateData.tags = input.tags as string[];

        const service = await prisma.service.update({
            where: { id },
            data: updateData,
        });

        await AuditLogger.log(
            vendorId,
            userId,
            'update',
            'service',
            id,
            { name: existing.name, category: existing.category },
            { name: service.name, category: service.category }
        );

        return service;
    }

    async delete(id: string, vendorId: string, userId: string): Promise<void> {
        const existing = await prisma.service.findFirst({
            where: { id, vendorId },
        });

        if (!existing) {
            throw new Error('Service not found');
        }

        await prisma.service.delete({
            where: { id },
        });

        await AuditLogger.log(
            vendorId,
            userId,
            'delete',
            'service',
            id,
            { name: existing.name },
            null
        );

        logger.info('Service deleted', { serviceId: id, vendorId });
    }

    async bulkImport(
        vendorId: string,
        userId: string,
        services: CreateServiceInput[]
    ): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> {
        const results = { created: 0, errors: [] as Array<{ index: number; error: string }> };

        for (let i = 0; i < services.length; i++) {
            try {
                await this.create(vendorId, userId, services[i]);
                results.created++;
            } catch (error: any) {
                results.errors.push({ index: i, error: error.message });
            }
        }

        logger.info('Bulk import completed', {
            vendorId,
            created: results.created,
            errors: results.errors.length,
        });

        return results;
    }

    async findPublicServices(options: {
        category?: ServiceCategory;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResult<Service>> {
        const { category, search, page = 1, limit = 20 } = options;

        const where: Prisma.ServiceWhereInput = {
            isActive: true,
            vendor: { status: 'ACTIVE' },
        };

        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.service.findMany({
                where,
                orderBy: { ratingAverage: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    vendor: {
                        select: { id: true, name: true, rating: true },
                    },
                },
            }),
            prisma.service.count({ where }),
        ]);

        return {
            data: data as any,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}

export const serviceService = new ServiceService();
export default serviceService;
