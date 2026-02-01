import { query, queryOne, transaction } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Service, CreateServiceInput, UpdateServiceInput } from '../types/index.js';
import { AuditLogger } from '../middleware/audit.middleware.js';

export interface ServiceQueryOptions {
    vendorId: string;
    category?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

class ServiceService {
    // ============ CRUD OPERATIONS ============

    async create(vendorId: string, userId: string, input: CreateServiceInput): Promise<Service> {
        const result = await query<any>(
            `INSERT INTO services (
        vendor_id, name, category, description, short_description,
        unit_type, min_quantity, max_quantity, capacity, is_active,
        available_from, available_until, lead_time_days,
        images, featured_image, requirements, inclusions, exclusions, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
            [
                vendorId,
                input.name,
                input.category,
                input.description || null,
                input.shortDescription || null,
                input.unitType,
                input.minQuantity,
                input.maxQuantity || null,
                input.capacity || null,
                input.isActive,
                input.availableFrom || null,
                input.availableUntil || null,
                input.leadTimeDays,
                JSON.stringify(input.images),
                input.featuredImage || null,
                JSON.stringify(input.requirements || {}),
                JSON.stringify(input.inclusions),
                JSON.stringify(input.exclusions),
                input.tags,
            ]
        );

        const service = this.mapServiceRow(result[0]);

        await AuditLogger.log(
            vendorId,
            userId,
            'create',
            'service',
            service.id,
            null,
            { name: input.name, category: input.category }
        );

        logger.info('Service created', { serviceId: service.id, vendorId });

        return service;
    }

    async findById(id: string, vendorId: string): Promise<Service | null> {
        const result = await queryOne<any>(
            'SELECT * FROM services WHERE id = $1 AND vendor_id = $2',
            [id, vendorId]
        );

        return result ? this.mapServiceRow(result) : null;
    }

    async findAll(options: ServiceQueryOptions): Promise<PaginatedResult<Service>> {
        const {
            vendorId,
            category,
            isActive,
            search,
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = options;

        const offset = (page - 1) * limit;
        const params: any[] = [vendorId];
        let whereClause = 'WHERE vendor_id = $1';
        let paramIndex = 2;

        if (category) {
            whereClause += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (isActive !== undefined) {
            whereClause += ` AND is_active = $${paramIndex}`;
            params.push(isActive);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Validate sort column to prevent SQL injection
        const allowedSortColumns = ['name', 'category', 'created_at', 'updated_at', 'rating_average', 'booking_count'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Get total count
        const countResult = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM services ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0].count, 10);

        // Get paginated data
        const dataParams = [...params, limit, offset];
        const dataResult = await query<any>(
            `SELECT * FROM services ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            dataParams
        );

        return {
            data: dataResult.map((row) => this.mapServiceRow(row)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, vendorId: string, userId: string, input: UpdateServiceInput): Promise<Service | null> {
        // Get old value for audit
        const oldService = await this.findById(id, vendorId);
        if (!oldService) {
            return null;
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const fieldMappings: Record<string, string> = {
            name: 'name',
            category: 'category',
            description: 'description',
            shortDescription: 'short_description',
            unitType: 'unit_type',
            minQuantity: 'min_quantity',
            maxQuantity: 'max_quantity',
            capacity: 'capacity',
            isActive: 'is_active',
            availableFrom: 'available_from',
            availableUntil: 'available_until',
            leadTimeDays: 'lead_time_days',
            featuredImage: 'featured_image',
        };

        for (const [key, column] of Object.entries(fieldMappings)) {
            if (input[key as keyof UpdateServiceInput] !== undefined) {
                updates.push(`${column} = $${paramIndex}`);
                values.push(input[key as keyof UpdateServiceInput]);
                paramIndex++;
            }
        }

        // Handle JSON fields separately
        if (input.images !== undefined) {
            updates.push(`images = $${paramIndex}`);
            values.push(JSON.stringify(input.images));
            paramIndex++;
        }

        if (input.requirements !== undefined) {
            updates.push(`requirements = $${paramIndex}`);
            values.push(JSON.stringify(input.requirements));
            paramIndex++;
        }

        if (input.inclusions !== undefined) {
            updates.push(`inclusions = $${paramIndex}`);
            values.push(JSON.stringify(input.inclusions));
            paramIndex++;
        }

        if (input.exclusions !== undefined) {
            updates.push(`exclusions = $${paramIndex}`);
            values.push(JSON.stringify(input.exclusions));
            paramIndex++;
        }

        if (input.tags !== undefined) {
            updates.push(`tags = $${paramIndex}`);
            values.push(input.tags);
            paramIndex++;
        }

        if (updates.length === 0) {
            return oldService;
        }

        values.push(id, vendorId);
        const result = await query<any>(
            `UPDATE services SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND vendor_id = $${paramIndex + 1}
       RETURNING *`,
            values
        );

        if (result.length === 0) {
            return null;
        }

        const service = this.mapServiceRow(result[0]);

        await AuditLogger.log(
            vendorId,
            userId,
            'update',
            'service',
            service.id,
            { name: oldService.name },
            { name: service.name }
        );

        return service;
    }

    async delete(id: string, vendorId: string, userId: string): Promise<boolean> {
        const service = await this.findById(id, vendorId);
        if (!service) {
            return false;
        }

        const result = await query(
            'DELETE FROM services WHERE id = $1 AND vendor_id = $2 RETURNING id',
            [id, vendorId]
        );

        if (result.length > 0) {
            await AuditLogger.log(
                vendorId,
                userId,
                'delete',
                'service',
                id,
                { name: service.name },
                null
            );
            logger.info('Service deleted', { serviceId: id, vendorId });
            return true;
        }

        return false;
    }

    // ============ BULK OPERATIONS ============

    async bulkImport(vendorId: string, userId: string, services: CreateServiceInput[]): Promise<{ created: number; errors: string[] }> {
        const errors: string[] = [];
        let created = 0;

        for (let i = 0; i < services.length; i++) {
            try {
                await this.create(vendorId, userId, services[i]);
                created++;
            } catch (error: any) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        return { created, errors };
    }

    // ============ HELPER METHODS ============

    private mapServiceRow(row: any): Service {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            name: row.name,
            category: row.category,
            description: row.description,
            shortDescription: row.short_description,
            unitType: row.unit_type,
            minQuantity: row.min_quantity,
            maxQuantity: row.max_quantity,
            capacity: row.capacity,
            isActive: row.is_active,
            availableFrom: row.available_from,
            availableUntil: row.available_until,
            leadTimeDays: row.lead_time_days,
            images: row.images || [],
            featuredImage: row.featured_image,
            requirements: row.requirements || {},
            inclusions: row.inclusions || [],
            exclusions: row.exclusions || [],
            tags: row.tags || [],
            metadata: row.metadata || {},
            bookingCount: row.booking_count,
            ratingAverage: parseFloat(row.rating_average) || 0,
            ratingCount: row.rating_count,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export const serviceService = new ServiceService();
export default serviceService;
