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
