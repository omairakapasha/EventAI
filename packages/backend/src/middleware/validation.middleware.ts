import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = req[source];
            const result = schema.parse(data);

            // Replace with parsed data (includes type coercion)
            req[source] = result;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));

                res.status(400).json({
                    error: 'Validation Error',
                    message: 'Request validation failed',
                    details: formattedErrors,
                });
                return;
            }

            res.status(400).json({
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

export default { validate, validateBody, validateQuery, validateParams };
