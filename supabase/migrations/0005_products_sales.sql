-- Casa Herbert — estoque de produtos, checkout e financeiro (fase de produção;
-- ainda NÃO aplicado ao protótipo atual, que roda sobre dados mockados em
-- arquivo — ver documentação.md > Roadmap). Espelha o modelo já em uso em
-- src/lib/data/products.ts e src/lib/data/sales.ts.
--
-- Diferente de 0001-0004, este arquivo combina schema + RLS num único lugar:
-- é uma feature nova e autocontida, não uma revisão do schema já existente
-- particionado por preocupação (schema/RLS/funções/seed).

-- =========================================================
-- appointments: valor combinado para o atendimento
-- =========================================================
alter table public.appointments
  add column price_cents int check (price_cents >= 0); -- null = ainda não definido

-- =========================================================
-- products (estoque preenchido manualmente pelo admin)
-- =========================================================
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  price_cents    int  not null check (price_cents >= 0), -- diferente de services.price_cents: não é nullable
  stock_quantity int  not null default 0 check (stock_quantity >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_products_active on public.products (is_active);

create trigger trg_products_touch_updated_at
  before update on public.products
  for each row execute function public.fn_touch_updated_at();

-- =========================================================
-- sales (checkout: vinculado a um agendamento ou venda avulsa)
-- =========================================================
create type payment_method as enum
  ('dinheiro','pix','cartao_credito','cartao_debito','outro');

create type sale_item_type as enum ('service','product');

create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id), -- null = venda avulsa
  customer_id    uuid references public.customers(id),    -- null = venda avulsa sem cliente identificado
  total_cents    int not null check (total_cents >= 0),
  payment_method payment_method not null,
  notes          text,
  created_at     timestamptz not null default now()
);
create index idx_sales_appointment on public.sales (appointment_id);
create index idx_sales_created_at on public.sales (created_at);

-- Normalizado à parte (mesmo padrão de special_hours -> special_hours_ranges em
-- 0001_schema.sql), em vez de um jsonb — o mock guarda `Sale.items` embutido
-- por simplicidade de arquivo único, mas o schema real fica normalizado.
create table public.sale_items (
  id                uuid primary key default gen_random_uuid(),
  sale_id           uuid not null references public.sales(id) on delete cascade,
  item_type         sale_item_type not null,
  ref_id            uuid, -- service_id ou product_id conforme item_type; null = linha sem vínculo de catálogo
  description       text not null, -- snapshot do nome no momento da venda — sobrevive a renomeação/alteração de preço depois
  unit_price_cents  int not null check (unit_price_cents >= 0),
  quantity          int not null default 1 check (quantity > 0),
  total_cents       int not null check (total_cents >= 0)
);
create index idx_sale_items_sale on public.sale_items (sale_id);

-- Nota: um checkout atômico de verdade (validar+decrementar estoque, inserir
-- sale/sale_items e concluir o agendamento numa única transação) vai precisar
-- de uma função SECURITY DEFINER, no molde de create_appointment() em
-- 0003_booking_functions.sql — não escrita nesta migration.

-- =========================================================
-- RLS — mesmo padrão admin_full_access de 0002_rls_policies.sql;
-- sem policy de leitura para anon (não há catálogo público de produtos nem
-- visibilidade pública de vendas).
-- =========================================================
alter table public.products    enable row level security;
alter table public.sales       enable row level security;
alter table public.sale_items  enable row level security;

alter table public.products    force row level security;
alter table public.sales       force row level security;
alter table public.sale_items  force row level security;

create policy admin_full_access on public.products
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.sales
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.sale_items
  for all using (is_admin()) with check (is_admin());
