import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { config } from '../config';
import { query } from '../db';
import { AppError } from '../lib/errors';
import { asyncHandler } from './errors';

export interface AuthenticatedCustomer {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      customer?: AuthenticatedCustomer;
    }
  }
}

function bearerToken(req: Request): string | undefined {
  const match = req.get('authorization')?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

function hashToken(token: string): string {
  return createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

/** Resolves the session behind the bearer token and sets `req.customer`; 401 otherwise. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) {
    throw new AppError(401, 'unauthorized');
  }
  const [customer] = await query<AuthenticatedCustomer>(
    `select c.id, c.email
       from sessions s
       join customers c on c.id = s.customer_id
      where s.token_hash = $1
        and s.expires_at > now()`,
    [hashToken(token)],
  );
  if (!customer) {
    throw new AppError(401, 'unauthorized');
  }
  req.customer = customer;
  next();
});

/** The signed-in customer of a route mounted behind `requireAuth`. */
export function currentCustomer(req: Request): AuthenticatedCustomer {
  if (!req.customer) {
    throw new Error('currentCustomer() called on a route without requireAuth');
  }
  return req.customer;
}
