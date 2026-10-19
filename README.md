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
| `GET` | `/orders?limit=&offset=` | The signed-in customer's orders, newest first. `limit` defaults to 20 (1–100), `offset` to 0. Returns `{ items, hasMore }`. |
| `GET` | `/orders/:id` | One of the customer's orders; `404` if it does not exist or belongs to another customer |
| `POST` | `/orders/:id/pay` | Pays a pending order: debits the wallet and captures the payment. `409` if the order is not pending or the balance is too low. |

---

Larkspur Commerce is a fictional company; this repository is a sample service.
