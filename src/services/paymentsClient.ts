import { config } from '../config';
import { AppError } from '../lib/errors';
import { logger } from '../logger';

const PROVIDER_TIMEOUT_MS = 10_000;

export class PaymentProviderError extends AppError {
  constructor(readonly providerStatus: number) {
    super(502, 'payment_provider_error', `Payments provider answered with status ${providerStatus}`);
  }
}

interface ProviderObject {
  id: string;
}

/**
 * Captures the payment for an order and returns the provider's capture id.
 * The order id is the idempotency key, so a retried capture never charges twice.
 */
export async function capturePayment(orderId: string, amountCents: number): Promise<string> {
  logger.info({ orderId, amountCents }, 'capturing payment');
  const response = await fetch(`${config.paymentsBaseUrl}/captures`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paymentsApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': orderId,
    },
    body: JSON.stringify({ reference: orderId, amount_cents: amountCents }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new PaymentProviderError(response.status);
  }
  const capture = (await response.json()) as ProviderObject;
  return capture.id;
}

/**
 * Charges the card behind a payment token from the provider's checkout form and returns the
 * charge id. Tokens are single-use, so the provider rejects a second charge with the same token.
 */
export async function chargeCard(paymentToken: string, amountCents: number): Promise<string> {
  logger.info({ amountCents }, 'charging card');
  const response = await fetch(`${config.paymentsBaseUrl}/charges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paymentsApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: paymentToken, amount_cents: amountCents }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new PaymentProviderError(response.status);
  }
  const charge = (await response.json()) as ProviderObject;
  return charge.id;
}

/** Refunds a captured payment in full or in part and returns the provider's refund id. */
export async function refundPayment(providerRef: string, amountCents: number): Promise<string> {
  const url = `${config.paymentsBaseUrl}/captures/${encodeURIComponent(providerRef)}/refunds`;
  const headers = {
    Authorization: `Bearer ${config.paymentsApiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `refund-${providerRef}`,
  };
  const body = { amount_cents: amountCents };
  logger.info({ url, headers, body }, 'sending refund to payments provider');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new PaymentProviderError(response.status);
  }
  const refund = (await response.json()) as ProviderObject;
  return refund.id;
}
