import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pricingService } from '../services/pricing.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { createPricingSchema, updatePricingSchema, bulkPricingSchema, pricingQuerySchema } from '../schemas/index.js';

export default async function pricingRoutes(fastify: FastifyInstance): Promise<void> {

    fastify.addHook('onRequest', authMiddleware);

    // GET /
    fastify.get(
        '/',
        { preHandler: [requirePermission('pricing:read'), validateQuery(pricingQuerySchema)] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const query = request.query as any;
            const result = await pricingService.findByVendor({
                vendorId: request.user!.vendorId,
                serviceId: query.serviceId,
                activeOnly: query.activeOnly === 'true',
                status: query.status,
                page: query.page ? parseInt(query.page, 10) : undefined,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            });

            return reply.send(result);
        }
    );

    // GET /history
    fastify.get(
        '/history',
        { preHandler: [requirePermission('pricing:read')] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const query = request.query as any;

            const result = await pricingService.getHistory(request.user!.vendorId, {
                serviceId: query.serviceId,
                page: query.page ? parseInt(query.page, 10) : undefined,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
            });

            return reply.send(result);
        }
    );

    // POST /
    fastify.post(
        '/',
        { preHandler: [requirePermission('pricing:write'), validateBody(createPricingSchema)] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const pricing = await pricingService.create(
                    request.user!.vendorId,
                    request.user!.userId,
                    request.body as any
                );

                return reply.status(201).send(pricing);
            } catch (error: any) {
                if (error.message.includes('validation failed')) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: error.message,
                    });
                }
                throw error;
            }
        }
    );

    // POST /bulk
    fastify.post(
        '/bulk',
        { preHandler: [requirePermission('pricing:write'), validateBody(bulkPricingSchema)] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const body = request.body as any;
            const result = await pricingService.bulkCreate(
                request.user!.vendorId,
                request.user!.userId,
                body.prices
            );

            return reply.status(201).send({
                message: `Successfully created ${result.created} prices`,
                created: result.created,
                errors: result.errors,
            });
        }
    );

    // PUT /:id
    fastify.put<{ Params: { id: string } }>(
        '/:id',
        { preHandler: [requirePermission('pricing:write'), validateBody(updatePricingSchema)] },
        async (request, reply) => {
            const pricing = await pricingService.update(
                request.params.id,
                request.user!.vendorId,
                request.user!.userId,
                request.body as any
            );

            if (!pricing) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Pricing not found',
                });
            }

            return reply.send(pricing);
        }
    );

    // POST /validate
    fastify.post(
        '/validate',
        { preHandler: [requirePermission('pricing:read')] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { serviceId, price, effectiveDate } = request.body as any;

            if (!serviceId || !price || !effectiveDate) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'serviceId, price, and effectiveDate are required',
                });
            }

            const validation = await pricingService.validatePricing({
                serviceId,
                price,
                effectiveDate,
            } as any);

            return reply.send(validation);
        }
    );
}
