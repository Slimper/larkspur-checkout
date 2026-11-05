import type { PoolClient } from 'pg';
import { query } from '../db';
import { AppError } from '../lib/errors';
import { chargeCard } from './paymentsClient';

export class InsufficientFundsError extends AppError {
  constructor() {
    super(409, 'insufficient_funds', 'Wallet balance is too low for this payment');
  }
}

interface WalletRow {
  balance_cents: number;
}

/**
 * Takes `amountCents` from the customer's wallet. Call it inside `withTransaction`:
 * the wallet row stays locked until the surrounding transaction commits.
 */
export async function debitWallet(client: PoolClient, customerId: string, amountCents: number): Promise<void> {
  const { rows } = await client.query<WalletRow>(
    'select balance_cents from wallets where customer_id = $1 for update',
    [customerId],
  );
  const [wallet] = rows;
  if (!wallet || wallet.balance_cents < amountCents) {
    throw new InsufficientFundsError();
  }
  await client.query(
    `update wallets
        set balance_cents = balance_cents - $2,
            updated_at = now()
      where customer_id = $1`,
    [customerId, amountCents],
  );
}

export async function getBalance(customerId: string): Promise<number> {
  const [wallet] = await query<WalletRow>('select balance_cents from wallets where customer_id = $1', [customerId]);
  return wallet?.balance_cents ?? 0;
}

/** Adds `amountCents` to the customer's wallet, creating the wallet on first use. Returns the new balance. */
export async function creditWallet(customerId: string, amountCents: number): Promise<number> {
  const [wallet] = await query<WalletRow>('select balance_cents from wallets where customer_id = $1', [customerId]);
  const balanceCents = (wallet?.balance_cents ?? 0) + amountCents;
  await query(
    `insert into wallets (customer_id, balance_cents)
     values ($1, $2)
     on conflict (customer_id)
     do update set balance_cents = excluded.balance_cents,
                   updated_at = now()`,
    [customerId, balanceCents],
  );
  return balanceCents;
}

/** Charges the card behind `paymentToken` and adds the amount to the wallet. Returns the new balance. */
export async function topUpWallet(customerId: string, amountCents: number, paymentToken: string): Promise<number> {
  await chargeCard(paymentToken, amountCents);
  return creditWallet(customerId, amountCents);
}
