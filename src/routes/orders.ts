import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db';
import { AppError, NotFoundError } from '../lib/errors';
import { parsePagination, toPage } from '../lib/pagination';
import { currentCustomer } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { capturePayment } from '../services/paymentsClient';
import { debitWallet } from '../services/wallet';

interface OrderRow {
  id: string;
  reference: string;
  customer_id: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: Date;
}

const orderParams = z.object({ id: z.string().uuid() });

export const ordersRouter = Router();

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const customer = currentCustomer(req);
    const { limit, offset } = parsePagination(req.query);
    const rows = await query<OrderRow>(
      `select id, reference, customer_id, status, total_cents, currency, created_at
         from orders
        where customer_id = $1
        order by created_at desc
        limit $2 offset $3`,
      [customer.id, limit + 1, offset],
    );
    res.json(toPage(rows, limit));
  }),
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = currentCustomer(req);
    const { id } = orderParams.parse(req.params);
    const [order] = await query<OrderRow>(
      `select id, reference, customer_id, status, total_cents, currency, created_at
         from orders
        where id = $1
          and customer_id = $2`,
      [id, customer.id],
    );
    if (!order) {
      throw new NotFoundError('order');
    }
    res.json(order);
  }),
);

ordersRouter.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const customer = currentCustomer(req);
    const { id } = orderParams.parse(req.params);
    const paid = await withTransaction(async (client) => {
      const { rows } = await client.query<OrderRow>(
        `select id, reference, customer_id, status, total_cents, currency, created_at
           from orders
          where id = $1
            for update`,
        [id],
      );
      const [order] = rows;
      if (!order || order.customer_id !== customer.id) {
        throw new NotFoundError('order');
      }
      if (order.status !== 'pending') {
        throw new AppError(409, 'order_not_pending');
      }
      await debitWallet(client, customer.id, order.total_cents);
      const providerRef = await capturePayment(order.id, order.total_cents);
      await client.query(
        `insert into payments (order_id, provider_ref, amount_cents, status)
         values ($1, $2, $3, 'captured')`,
        [order.id, providerRef, order.total_cents],
      );
      const updated = await client.query<OrderRow>(
        `update orders
            set status = 'paid'
          where id = $1
          returning id, reference, customer_id, status, total_cents, currency, created_at`,
        [order.id],
      );
      return updated.rows[0];
    });
    res.json(paid);
  }),
);
