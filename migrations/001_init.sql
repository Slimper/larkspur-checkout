create table customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table sessions (
  token_hash text primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  expires_at timestamptz not null
);

create table wallets (
  customer_id uuid primary key references customers (id) on delete cascade,
  balance_cents bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint wallets_balance_non_negative check (balance_cents >= 0)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references customers (id),
  status text not null default 'pending',
  total_cents bigint not null,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending', 'paid', 'cancelled')),
  constraint orders_total_positive check (total_cents > 0)
);

create index orders_customer_created_idx on orders (customer_id, created_at desc);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  provider_ref text not null,
  amount_cents bigint not null,
  status text not null,
  created_at timestamptz not null default now()
);

create index payments_order_idx on payments (order_id);
