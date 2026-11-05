# Larkspur Checkout API

Backend for the Larkspur Commerce storefront checkout: customer orders, the customer
wallet, and card payments through an external payments provider.

Customers keep a prepaid wallet balance. Paying an order debits the wallet and captures
the payment with the provider, which settles the funds.

## Requirements

- Node.js 20
- PostgreSQL 14 or newer

## Run locally

```sh
cp .env.example .env              # fill in the values
set -a && . ./.env && set +a      # export them into the shell
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
npm install
npm run build
npm start
```

`npm test` runs the unit tests.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYMENTS_BASE_URL` | Base URL of the payments provider API |
| `PAYMENTS_API_KEY` | Payments provider API key |
| `SESSION_SECRET` | Key used to hash session tokens |
| `PORT` | HTTP port, default `3000` |

## API

Every endpoint except `/health` requires `Authorization: Bearer <session token>` and
answers `401` without a valid session. Errors are JSON: `{ "error": "<code>" }`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `GET` | `/orders` | The signed-in customer's orders, newest first; paginated |
| `GET` | `/orders/search?q=` | The customer's orders whose order number or id contains `q` (2–64 characters, case-insensitive), newest first; paginated |
| `GET` | `/orders/:id` | One of the customer's orders; `404` if it does not exist or belongs to another customer |
| `POST` | `/orders/:id/pay` | Pays a pending order: debits the wallet and captures the payment. `409` if the order is not pending or the balance is too low. |
| `POST` | `/orders/:id/refund` | Refunds a paid order in full or in part (see below). `409` if the order is not paid. |
| `GET` | `/wallet` | The customer's wallet balance: `{ balanceCents }` |
| `POST` | `/wallet/top-ups` | Adds funds to the wallet by charging a card (see below) |

### Refunds

`POST /orders/:id/refund` takes an optional body `{ "amountCents": 1500, "reason": "damaged in transit" }`.
Without `amountCents` the whole order total is refunded; a larger amount than the total is
rejected with `422`. The amount goes back to the customer's wallet, the payment is refunded
with the provider, and the order moves to `refunded`. The answer is
`{ orderId, refundedCents, balanceCents }`.

### Wallet top-ups

`POST /wallet/top-ups` takes `{ "amountCents": 2500, "paymentToken": "<token>" }`, where
`paymentToken` comes from the payments provider's checkout form and `amountCents` is between
500 and 50,000. The card is charged and the amount is added to the wallet; the answer is
`{ balanceCents }`.

### Pagination

List endpoints take `limit` (default 20, 1–100) and one of:

- `page` — 1-based page number, default 1;
- `offset` — number of orders to skip, default 0. Ignored when `page` is given.

They answer `{ items, hasMore }`.

---

Larkspur Commerce is a fictional company; this repository is a sample service.
