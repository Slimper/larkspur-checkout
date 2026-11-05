import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { AppError, NotFoundError } from '../lib/errors';
import { refundPayment } from '../services/paymentsClient';
import { creditWallet } from '../services/wallet';

interface PaidOrderRow {
  id: string;
  customer_id: string;
  status: string;
  total_cents: number;
  provider_ref: string;
}

const refundParams = z.object({ id: z.string().uuid() });

const refundBody = z.object({
  amountCents: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const refundsRouter = Router();

refundsRouter.post('/orders/:id/refund', async (req, res) => {
  const { id } = refundParams.parse(req.params);
  const { amountCents, reason } = refundBody.parse(req.body);

  const [order] = await query<PaidOrderRow>(
    `select o.id, o.customer_id, o.status, o.total_cents, p.provider_ref
       from orders o
       join payments p on p.order_id = o.id and p.status = 'captured'
      where o.id = $1`,
    [id],
  );
  if (!order) {
    throw new NotFoundError('order');
  }
  if (order.status !== 'paid') {
    throw new AppError(409, 'order_not_paid');
  }
  const refundCents = amountCents ?? order.total_cents;
  if (refundCents > order.total_cents) {
    throw new AppError(422, 'refund_exceeds_total');
  }

  await query(`update orders set status = 'refunded' where id = $1`, [order.id]);
  const balanceCents = await creditWallet(order.customer_id, refundCents);
  const refundRef = await refundPayment(order.provider_ref, refundCents);
  await query(
    `insert into refunds (order_id, amount_cents, reason, provider_ref)
     values ($1, $2, $3, $4)`,
    [order.id, refundCents, reason ?? null, refundRef],
  );

  res.status(201).json({ orderId: order.id, refundedCents: refundCents, balanceCents });
});
