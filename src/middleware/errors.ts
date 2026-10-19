import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../logger';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 4 ignores the promise a handler returns; this forwards its rejection to `next`. */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    res.status(400).json({ error: 'invalid_request', issues });
    return;
  }
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.warn({ err, method: req.method, url: req.originalUrl }, 'upstream failure');
    }
    res.status(err.status).json({ error: err.code });
    return;
  }
  logger.error(
    { err, req: { method: req.method, url: req.originalUrl, headers: req.headers } },
    'request failed',
  );
  res.status(500).json({ error: 'internal_error' });
}
