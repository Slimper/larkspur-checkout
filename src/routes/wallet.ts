import { Router } from 'express';
import { z } from 'zod';
import { currentCustomer } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { getBalance, topUpWallet } from '../services/wallet';

const topUpBody = z.object({
  amountCents: z.number().int().min(500).max(50_000),
  paymentToken: z.string().min(1),
});

export const walletRouter = Router();

walletRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const customer = currentCustomer(req);
    res.json({ balanceCents: await getBalance(customer.id) });
  }),
);

walletRouter.post(
  '/top-ups',
  asyncHandler(async (req, res) => {
    const customer = currentCustomer(req);
    const { amountCents, paymentToken } = topUpBody.parse(req.body);
    const balanceCents = await topUpWallet(customer.id, amountCents, paymentToken);
    res.status(201).json({ balanceCents });
  }),
);
