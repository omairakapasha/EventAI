import { query, queryOne, transaction } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Pricing, PriceHistory, CreatePricingInput, UpdatePricingInput } from '../types/index.js';
import { AuditLogger } from '../middleware/audit.middleware.js';
import { PaginatedResult } from './service.service.js';

// Pricing validation rules
const PRICING_RULES = {
    maxPriceIncreasePerDay: 0.5, // 50% max increase
    minPrice: 1.0,
    priceRounding: 2,
    effectiveDateFutureLimit: 90, // Days in future
    requireApprovalThreshold: 0.25, // 25% increase requires approval
};

export interface PricingQueryOptions {
    vendorId: string;
    serviceId?: string;
    activeOnly?: boolean;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

class PricingService {
    // ============ VALIDATION ============

    async validatePricing(
        vendorId: string,
        serviceId: string,
        newPrice: number,
        effectiveDate: string
    ): Promise<{ valid: boolean; errors: string[]; requiresApproval: boolean }> {
        const errors: string[] = [];
        let requiresApproval = false;

        // Check minimum price
        if (newPrice < PRICING_RULES.minPrice) {
            errors.push(`Price must be at least ${PRICING_RULES.minPrice}`);
        }

        // Check effective date is in the future
        const effectiveDateObj = new Date(effectiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (effectiveDateObj < today) {
            errors.push('Effective date must be in the future');
        }

        // Check effective date limit
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + PRICING_RULES.effectiveDateFutureLimit);

        if (effectiveDateObj > maxDate) {
            errors.push(`Effective date cannot be more than ${PRICING_RULES.effectiveDateFutureLimit} days in the future`);
        }

        // Check price increase percentage
        const currentPricing = await queryOne<any>(
            `SELECT price FROM pricing 
       WHERE service_id = $1 AND vendor_id = $2 AND is_active = TRUE AND status = 'active'
       ORDER BY effective_date DESC LIMIT 1`,
            [serviceId, vendorId]
        );

        if (currentPricing) {
            const currentPrice = parseFloat(currentPricing.price);
            const priceChange = (newPrice - currentPrice) / currentPrice;

            if (priceChange > PRICING_RULES.maxPriceIncreasePerDay) {
                errors.push(`Price increase cannot exceed ${PRICING_RULES.maxPriceIncreasePerDay * 100}%`);
            }

            if (priceChange > PRICING_RULES.requireApprovalThreshold) {
                requiresApproval = true;
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            requiresApproval,
        };
    }

    // ============ CRUD OPERATIONS ============

    async create(vendorId: string, userId: string, input: CreatePricingInput): Promise<Pricing> {
        // Validate pricing
        const validation = await this.validatePricing(
            vendorId,
            input.serviceId,
            input.price,
            input.effectiveDate
        );

        if (!validation.valid) {
            throw new Error(`Pricing validation failed: ${validation.errors.join(', ')}`);
        }

        // Determine status based on approval requirement
        const status = validation.requiresApproval ? 'pending_approval' : 'active';

        const result = await query<any>(
            `INSERT INTO pricing (
        service_id, vendor_id, price, currency, effective_date, expiry_date,
        is_active, status, requires_approval,
        holiday_surcharge_percent, weekend_surcharge_percent, rush_surcharge_percent,
        min_quantity_for_discount, bulk_discount_percent, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
            [
                input.serviceId,
                vendorId,
                input.price,
                input.currency,
                input.effectiveDate,
                input.expiryDate || null,
                true,
                status,
                validation.requiresApproval,
                input.holidaySurchargePercent,
                input.weekendSurchargePercent,
                input.rushSurchargePercent,
                input.minQuantityForDiscount || null,
                input.bulkDiscountPercent,
                input.notes || null,
                userId,
            ]
        );

        const pricing = this.mapPricingRow(result[0]);

        await AuditLogger.log(
            vendorId,
            userId,
            'create',
            'pricing',
            pricing.id,
            null,
            { price: input.price, serviceId: input.serviceId }
        );

        logger.info('Pricing created', { pricingId: pricing.id, vendorId, requiresApproval: validation.requiresApproval });

        return pricing;
    }

    async findAll(options: PricingQueryOptions): Promise<PaginatedResult<Pricing>> {
        const {
            vendorId,
            serviceId,
            activeOnly = true,
            status,
            page = 1,
            limit = 20,
            sortBy = 'effective_date',
            sortOrder = 'desc',
        } = options;

        const offset = (page - 1) * limit;
        const params: any[] = [vendorId];
        let whereClause = 'WHERE vendor_id = $1';
        let paramIndex = 2;

        if (serviceId) {
            whereClause += ` AND service_id = $${paramIndex}`;
            params.push(serviceId);
            paramIndex++;
        }

        if (activeOnly) {
            whereClause += ` AND is_active = TRUE`;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const allowedSortColumns = ['price', 'effective_date', 'expiry_date', 'created_at'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'effective_date';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

        const countResult = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM pricing ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0].count, 10);

        const dataParams = [...params, limit, offset];
        const dataResult = await query<any>(
            `SELECT p.*, s.name as service_name 
       FROM pricing p
       LEFT JOIN services s ON p.service_id = s.id
       ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            dataParams
        );

        return {
            data: dataResult.map((row) => this.mapPricingRow(row)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, vendorId: string, userId: string, input: UpdatePricingInput): Promise<Pricing | null> {
        const oldPricing = await queryOne<any>(
            'SELECT * FROM pricing WHERE id = $1 AND vendor_id = $2',
            [id, vendorId]
        );

        if (!oldPricing) {
            return null;
        }

        // If price is being updated, validate and potentially record history
        if (input.price !== undefined && input.price !== parseFloat(oldPricing.price)) {
            // Record price history
            await query(
                `INSERT INTO price_history (pricing_id, service_id, vendor_id, old_price, new_price, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, oldPricing.service_id, vendorId, oldPricing.price, input.price, userId]
            );
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const fieldMappings: Record<string, string> = {
            price: 'price',
            currency: 'currency',
            effectiveDate: 'effective_date',
            expiryDate: 'expiry_date',
            holidaySurchargePercent: 'holiday_surcharge_percent',
            weekendSurchargePercent: 'weekend_surcharge_percent',
            rushSurchargePercent: 'rush_surcharge_percent',
            minQuantityForDiscount: 'min_quantity_for_discount',
            bulkDiscountPercent: 'bulk_discount_percent',
            notes: 'notes',
        };

        for (const [key, column] of Object.entries(fieldMappings)) {
            if (input[key as keyof UpdatePricingInput] !== undefined) {
                updates.push(`${column} = $${paramIndex}`);
                values.push(input[key as keyof UpdatePricingInput]);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return this.mapPricingRow(oldPricing);
        }

        values.push(id, vendorId);
        const result = await query<any>(
            `UPDATE pricing SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND vendor_id = $${paramIndex + 1}
       RETURNING *`,
            values
        );

        const pricing = this.mapPricingRow(result[0]);

        await AuditLogger.log(
            vendorId,
            userId,
            'update',
            'pricing',
            pricing.id,
            { price: parseFloat(oldPricing.price) },
            { price: pricing.price }
        );

        return pricing;
    }

    // ============ BULK OPERATIONS ============

    async bulkCreate(
        vendorId: string,
        userId: string,
        prices: CreatePricingInput[]
    ): Promise<{ created: Pricing[]; errors: string[] }> {
        const created: Pricing[] = [];
        const errors: string[] = [];

        for (let i = 0; i < prices.length; i++) {
            try {
                const pricing = await this.create(vendorId, userId, prices[i]);
                created.push(pricing);
            } catch (error: any) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        return { created, errors };
    }

    // ============ HISTORY ============

    async getHistory(vendorId: string, options: { serviceId?: string; page?: number; limit?: number }): Promise<PaginatedResult<PriceHistory>> {
        const { serviceId, page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE ph.vendor_id = $1';
        const params: any[] = [vendorId];
        let paramIndex = 2;

        if (serviceId) {
            whereClause += ` AND ph.service_id = $${paramIndex}`;
            params.push(serviceId);
            paramIndex++;
        }

        const countResult = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM price_history ph ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0].count, 10);

        params.push(limit, offset);
        const dataResult = await query<any>(
            `SELECT ph.*, s.name as service_name, vu.email as changed_by_email
       FROM price_history ph
       LEFT JOIN services s ON ph.service_id = s.id
       LEFT JOIN vendor_users vu ON ph.changed_by = vu.id
       ${whereClause}
       ORDER BY ph.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        return {
            data: dataResult.map((row) => this.mapHistoryRow(row)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // ============ HELPER METHODS ============

    private mapPricingRow(row: any): Pricing {
        return {
            id: row.id,
            serviceId: row.service_id,
            vendorId: row.vendor_id,
            price: parseFloat(row.price),
            currency: row.currency,
            effectiveDate: row.effective_date,
            expiryDate: row.expiry_date,
            isActive: row.is_active,
            status: row.status,
            requiresApproval: row.requires_approval,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            rejectionReason: row.rejection_reason,
            holidaySurchargePercent: parseFloat(row.holiday_surcharge_percent) || 0,
            weekendSurchargePercent: parseFloat(row.weekend_surcharge_percent) || 0,
            rushSurchargePercent: parseFloat(row.rush_surcharge_percent) || 0,
            minQuantityForDiscount: row.min_quantity_for_discount,
            bulkDiscountPercent: parseFloat(row.bulk_discount_percent) || 0,
            notes: row.notes,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }

    private mapHistoryRow(row: any): PriceHistory {
        return {
            id: row.id,
            pricingId: row.pricing_id,
            serviceId: row.service_id,
            vendorId: row.vendor_id,
            oldPrice: parseFloat(row.old_price),
            newPrice: parseFloat(row.new_price),
            priceChangePercent: parseFloat(row.price_change_percent) || 0,
            changedBy: row.changed_by,
            changeReason: row.change_reason,
            createdAt: row.created_at,
        };
    }
}

export const pricingService = new PricingService();
export default pricingService;
