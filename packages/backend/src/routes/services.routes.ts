import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { serviceService } from '../services/service.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { createServiceSchema, updateServiceSchema, serviceQuerySchema } from '../schemas/index.js';

export default async function servicesRoutes(fastify: FastifyInstance): Promise<void> {

    // All routes require authentication
    fastify.addHook('onRequest', authMiddleware);

    // GET /
    fastify.get(
        '/',
        { preHandler: [requirePermission('service:read'), validateQuery(serviceQuerySchema)] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const query = request.query as any;
            const result = await serviceService.findByVendor({
                vendorId: request.user!.vendorId,
                category: query.category,
                isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
                search: query.search,
                page: query.page ? parseInt(query.page, 10) : undefined,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            });

            return reply.send(result);
        }
    );

    // GET /:id
    fastify.get<{ Params: { id: string } }>(
        '/:id',
        { preHandler: [requirePermission('service:read')] },
        async (request, reply) => {
            const service = await serviceService.findById(request.params.id, request.user!.vendorId);

            if (!service) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Service not found',
                });
            }

            return reply.send(service);
        }
    );

    // POST /
    fastify.post(
        '/',
        { preHandler: [requirePermission('service:write'), validateBody(createServiceSchema)] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const service = await serviceService.create(
                request.user!.vendorId,
                request.user!.userId,
                request.body as any
            );

            return reply.status(201).send(service);
        }
    );

    // PUT /:id
    fastify.put<{ Params: { id: string } }>(
        '/:id',
        { preHandler: [requirePermission('service:write'), validateBody(updateServiceSchema)] },
        async (request, reply) => {
            const service = await serviceService.update(
                request.params.id,
                request.user!.vendorId,
                request.user!.userId,
                request.body as any
            );

            if (!service) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Service not found',
                });
            }

            return reply.send(service);
        }
    );

    // DELETE /:id
    fastify.delete<{ Params: { id: string } }>(
        '/:id',
        { preHandler: [requirePermission('service:delete')] },
        async (request, reply) => {
            await serviceService.delete(
                request.params.id,
                request.user!.vendorId,
                request.user!.userId
            );

            return reply.status(204).send();
        }
    );

    // POST /import
    fastify.post(
        '/import',
        { preHandler: [requirePermission('service:write')] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { services } = request.body as any;

            if (!Array.isArray(services) || services.length === 0) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Services array is required',
                });
            }

            if (services.length > 100) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Maximum 100 services can be imported at once',
                });
            }

            const result = await serviceService.bulkImport(
                request.user!.vendorId,
                request.user!.userId,
                services
            );

            return reply.status(201).send({
                message: `Successfully imported ${result.created} services`,
                created: result.created,
                errors: result.errors,
            });
        }
    );
}
