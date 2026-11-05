alter table orders drop constraint orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'cancelled', 'refunded'));

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  amount_cents bigint not null,
  reason text,
  provider_ref text not null,
  created_at timestamptz not null default now(),
  constraint refunds_amount_positive check (amount_cents > 0)
);

create index refunds_order_idx on refunds (order_id);
