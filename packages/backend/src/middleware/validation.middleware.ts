import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        try {
            const data = source === 'body' ? request.body
                : source === 'query' ? request.query
                    : request.params;

            const result = schema.parse(data);

            // Replace with parsed data (includes type coercion)
            if (source === 'body') {
                (request as any).body = result;
            } else if (source === 'query') {
                (request as any).query = result;
            } else {
                (request as any).params = result;
            }
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));

                reply.status(400).send({
                    error: 'Validation Error',
                    message: 'Request validation failed',
                    details: formattedErrors,
                });
                return;
            }

            reply.status(400).send({
                error: 'Validation Error',
                message: 'Invalid request data',
            });
        }
    };
}

export function validateBody(schema: ZodSchema) {
    return validate(schema, 'body');
}

export function validateQuery(schema: ZodSchema) {
    return validate(schema, 'query');
}

export function validateParams(schema: ZodSchema) {
    return validate(schema, 'params');
}

export const validateRequest = validate;

export default { validate, validateBody, validateQuery, validateParams, validateRequest };
