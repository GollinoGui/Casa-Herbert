-- Casa Herbert — sistema de gestão: vendas a prazo, contas a receber e a pagar,
-- compras, contas fixas, livro-caixa (saldo), código de barras, profissional e
-- desconto/produtos no agendamento.
--
-- O saldo vem SÓ de cash_entries (livro-caixa). Cada evento em que o dinheiro
-- realmente se move (venda paga, recebimento de uma pendência, conta paga, ajuste)
-- grava uma linha ali, dentro da mesma RPC que muda a origem. O livro-caixa é
-- só de inserção: correções viram lançamentos de estorno (reversal_of), nunca
-- UPDATE/DELETE — assim o saldo de um mês fechado não muda sozinho depois.
--
-- Contas a receber = vendas com status 'open'. A venda é registrada (e o estoque
-- baixa) no momento em que o produto sai; o dinheiro entra depois, em um ou mais
-- recebimentos (pagamento parcial = vários lançamentos ligados à mesma venda).

-- =========================================================
-- Profissionais (hoje só o Herbert — o agendamento já nasce com ele)
-- =========================================================
create table public.professionals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.professionals (name) values ('Herbert');

alter table public.appointments
  add column professional_id uuid references public.professionals(id),
  add column discount_cents  int not null default 0 check (discount_cents >= 0);

update public.appointments set professional_id = (select id from public.professionals order by created_at limit 1);

-- Agendamento sem profissional (ex.: pedido do site) fica com o primeiro ativo.
create or replace function public.fn_default_professional() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.professional_id is null then
    select id into new.professional_id from public.professionals where is_active order by created_at limit 1;
  end if;
  return new;
end $$;

create trigger trg_appointments_default_professional
  before insert on public.appointments
  for each row execute function public.fn_default_professional();

-- Produtos que o cliente já disse que vai levar — viram linhas da venda ao finalizar
-- o atendimento. O estoque só baixa na venda.
create table public.appointment_products (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  product_id     uuid not null references public.products(id),
  quantity       int not null default 1 check (quantity > 0),
  unique (appointment_id, product_id)
);

-- =========================================================
-- Código de barras e custo
-- =========================================================
alter table public.products
  add column barcode    text,
  add column cost_cents int check (cost_cents >= 0); -- último custo de compra
create unique index uq_products_barcode on public.products (barcode) where barcode is not null;

alter table public.services add column barcode text;
create unique index uq_services_barcode on public.services (barcode) where barcode is not null;

-- =========================================================
-- Vendas: aberta (a receber), paga ou cancelada
-- =========================================================
create type sale_status as enum ('open', 'paid', 'cancelled');

alter table public.sales alter column payment_method drop not null; -- venda em aberto ainda não tem forma de pagamento

alter table public.sales
  add column status         sale_status not null default 'paid',
  add column discount_cents int not null default 0 check (discount_cents >= 0),
  add column paid_cents     int not null default 0 check (paid_cents >= 0),
  add column sale_date      date not null default (now() at time zone 'America/Sao_Paulo')::date,
  add column due_date       date,
  add column paid_at        timestamptz,
  add column cancelled_at   timestamptz;

update public.sales
  set paid_cents = total_cents,
      paid_at = created_at,
      sale_date = (created_at at time zone 'America/Sao_Paulo')::date;

create index idx_sales_sale_date on public.sales (sale_date);
create index idx_sales_customer on public.sales (customer_id);
create index idx_sales_open on public.sales (status) where status = 'open';

-- =========================================================
-- Contas fixas (modelo) e contas a pagar
-- =========================================================
create type payable_status as enum ('open', 'paid', 'cancelled');

create table public.recurring_bills (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  category     text not null default 'outros',
  supplier     text,
  amount_cents int  not null check (amount_cents >= 0), -- valor estimado; ajustável na hora de pagar
  due_day      smallint not null check (due_day between 1 and 31),
  is_active    boolean not null default true,
  starts_on    date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_recurring_bills_touch_updated_at
  before update on public.recurring_bills
  for each row execute function public.fn_touch_updated_at();

create table public.purchases (
  id            uuid primary key default gen_random_uuid(),
  supplier      text,
  purchase_date date not null,
  total_cents   int  not null check (total_cents >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);
create index idx_purchases_date on public.purchases (purchase_date);

create table public.purchase_items (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid not null references public.purchases(id) on delete cascade,
  product_id      uuid references public.products(id), -- null = item sem cadastro (ex.: material de uso)
  description     text not null,
  quantity        int  not null check (quantity > 0),
  unit_cost_cents int  not null check (unit_cost_cents >= 0),
  total_cents     int  not null check (total_cents >= 0)
);
create index idx_purchase_items_purchase on public.purchase_items (purchase_id);

create table public.payables (
  id                uuid primary key default gen_random_uuid(),
  description       text not null,
  category          text not null default 'outros',
  supplier          text,
  amount_cents      int  not null check (amount_cents >= 0),
  due_date          date not null,
  status            payable_status not null default 'open',
  paid_on           date,
  payment_method    payment_method,
  recurring_bill_id uuid references public.recurring_bills(id) on delete set null,
  competence        date, -- 1º dia do mês da conta fixa que gerou esta linha
  purchase_id       uuid references public.purchases(id),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (recurring_bill_id, competence)
);
create index idx_payables_due on public.payables (due_date);
create index idx_payables_status on public.payables (status);

create trigger trg_payables_touch_updated_at
  before update on public.payables
  for each row execute function public.fn_touch_updated_at();

-- =========================================================
-- Livro-caixa
-- =========================================================
create type cash_direction as enum ('in', 'out');

create table public.cash_entries (
  id             uuid primary key default gen_random_uuid(),
  entry_date     date not null, -- dia do salão (America/Sao_Paulo), editável para lançar com atraso
  direction      cash_direction not null,
  amount_cents   int  not null check (amount_cents > 0),
  category       text not null, -- 'venda' | 'recebimento' | 'conta' | 'compra' | 'ajuste' | 'estorno'
  description    text not null,
  payment_method payment_method,
  sale_id        uuid references public.sales(id),
  payable_id     uuid references public.payables(id),
  customer_id    uuid references public.customers(id),
  receipt_txid   text, -- ID da transação do comprovante Pix: impede registrar o mesmo comprovante duas vezes
  reversal_of    uuid unique references public.cash_entries(id),
  created_at     timestamptz not null default now()
);
create index idx_cash_entries_date on public.cash_entries (entry_date);
create index idx_cash_entries_sale on public.cash_entries (sale_id);
create index idx_cash_entries_payable on public.cash_entries (payable_id);
create index idx_cash_entries_txid on public.cash_entries (receipt_txid) where receipt_txid is not null;

create or replace function public.fn_cash_entries_append_only() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'O livro-caixa não aceita alteração: lance um estorno.' using errcode = 'P0001';
end $$;

create trigger trg_cash_entries_append_only
  before update or delete on public.cash_entries
  for each row execute function public.fn_cash_entries_append_only();

-- Vendas que já existiam entram no caixa como recebidas no dia da venda.
insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method, sale_id, customer_id, created_at)
select s.sale_date, 'in', s.total_cents, 'venda', 'Venda', s.payment_method, s.id, s.customer_id, s.created_at
from public.sales s
where s.total_cents > 0;

-- Um comprovante já usado e não estornado?
create or replace function public.receipt_already_used(p_txid text) returns boolean
language sql stable set search_path = public as $$
  select p_txid is not null and exists (
    select 1 from public.cash_entries e
    where e.receipt_txid = p_txid
      and not exists (select 1 from public.cash_entries r where r.reversal_of = e.id)
  );
$$;

-- =========================================================
-- register_sale: venda completa numa transação só.
-- p: {
--   appointmentId?, customerId?, saleDate?, dueDate?, discountCents?, notes?,
--   items: [{type:'service', serviceId, unitPriceCents, quantity?}
--         | {type:'product', productId, quantity, unitPriceCents?}
--         | {type:'custom', description, unitPriceCents, quantity?}],
--   payment?: {amountCents, method, receiptTxid?}   -- ausente = tudo em aberto
-- }
-- =========================================================
create or replace function public.register_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appointment  record;
  v_product      record;
  v_service      record;
  v_item         jsonb;
  v_type         text;
  v_qty          int;
  v_price        int;
  v_desc         text;
  v_ref          uuid;
  v_sale_id      uuid;
  v_subtotal     int := 0;
  v_discount     int := coalesce((p->>'discountCents')::int, 0);
  v_total        int;
  v_paid         int := 0;
  v_customer_id  uuid := nullif(p->>'customerId', '')::uuid;
  v_appt_id      uuid := nullif(p->>'appointmentId', '')::uuid;
  v_date         date := coalesce(nullif(p->>'saleDate', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_method       payment_method := nullif(p->'payment'->>'method', '')::payment_method;
  v_txid         text := nullif(trim(p->'payment'->>'receiptTxid'), '');
  v_status       sale_status;
begin
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Adicione ao menos um item.');
  end if;
  if v_discount < 0 then
    return jsonb_build_object('ok', false, 'error', 'Desconto inválido.');
  end if;

  if v_appt_id is not null then
    select * into v_appointment from public.appointments where id = v_appt_id for update;
    if v_appointment is null then
      return jsonb_build_object('ok', false, 'error', 'Agendamento não encontrado.');
    end if;
    if v_appointment.status not in ('CONFIRMED', 'COMPLETED') then
      return jsonb_build_object('ok', false, 'error', 'Só é possível vender em atendimentos confirmados ou concluídos.');
    end if;
    v_customer_id := v_appointment.customer_id;
  end if;

  if v_txid is not null then
    perform pg_advisory_xact_lock(hashtext('receipt:' || v_txid));
    if public.receipt_already_used(v_txid) then
      return jsonb_build_object('ok', false, 'error', 'Este comprovante já foi registrado.');
    end if;
  end if;

  -- 1ª passada: valida tudo (estoque inclusive) antes de qualquer escrita.
  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_type := v_item->>'type';
    v_qty := coalesce((v_item->>'quantity')::int, 1);
    if v_qty <= 0 then
      return jsonb_build_object('ok', false, 'error', 'Quantidade inválida.');
    end if;
    if v_type = 'product' then
      select * into v_product from public.products where id = (v_item->>'productId')::uuid for update;
      if v_product is null then
        return jsonb_build_object('ok', false, 'error', 'Produto não encontrado.');
      end if;
      -- soma as linhas repetidas do mesmo produto
      if v_product.stock_quantity < (
        select sum(coalesce((i->>'quantity')::int, 1)) from jsonb_array_elements(p->'items') i
        where i->>'type' = 'product' and i->>'productId' = v_item->>'productId'
      ) then
        return jsonb_build_object('ok', false, 'error', format('Estoque insuficiente para "%s" (restam %s).', v_product.name, v_product.stock_quantity));
      end if;
      v_price := coalesce((v_item->>'unitPriceCents')::int, v_product.price_cents);
    elsif v_type = 'service' then
      select * into v_service from public.services where id = (v_item->>'serviceId')::uuid;
      if v_service is null then
        return jsonb_build_object('ok', false, 'error', 'Serviço não encontrado.');
      end if;
      v_price := coalesce((v_item->>'unitPriceCents')::int, v_service.price_cents);
      if v_price is null then
        return jsonb_build_object('ok', false, 'error', format('Informe o valor de "%s".', v_service.name));
      end if;
    elsif v_type = 'custom' then
      if coalesce(trim(v_item->>'description'), '') = '' then
        return jsonb_build_object('ok', false, 'error', 'Descreva o item avulso.');
      end if;
      v_price := (v_item->>'unitPriceCents')::int;
    else
      return jsonb_build_object('ok', false, 'error', 'Item inválido.');
    end if;
    if v_price is null or v_price < 0 then
      return jsonb_build_object('ok', false, 'error', 'Valor inválido.');
    end if;
    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if v_discount > v_subtotal then
    return jsonb_build_object('ok', false, 'error', 'O desconto é maior que o valor da venda.');
  end if;
  v_total := v_subtotal - v_discount;

  if p ? 'payment' and jsonb_typeof(p->'payment') = 'object' then
    v_paid := coalesce((p->'payment'->>'amountCents')::int, 0);
    if v_paid < 0 or v_paid > v_total then
      return jsonb_build_object('ok', false, 'error', 'O valor pago não pode passar do total.');
    end if;
    if v_paid > 0 and v_method is null then
      return jsonb_build_object('ok', false, 'error', 'Informe a forma de pagamento.');
    end if;
  end if;

  v_status := case when v_paid >= v_total then 'paid' else 'open' end;

  insert into public.sales (appointment_id, customer_id, total_cents, discount_cents, paid_cents, payment_method,
                            notes, status, sale_date, due_date, paid_at)
  values (v_appt_id, v_customer_id, v_total, v_discount, v_paid, case when v_paid > 0 then v_method end,
          nullif(trim(p->>'notes'), ''), v_status, v_date,
          case when v_status = 'open' then coalesce(nullif(p->>'dueDate', '')::date, v_date) end,
          case when v_status = 'paid' then now() end)
  returning id into v_sale_id;

  -- 2ª passada: grava itens e baixa estoque.
  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_type := v_item->>'type';
    v_qty := coalesce((v_item->>'quantity')::int, 1);
    if v_type = 'product' then
      update public.products set stock_quantity = stock_quantity - v_qty
        where id = (v_item->>'productId')::uuid
        returning * into v_product;
      v_price := coalesce((v_item->>'unitPriceCents')::int, v_product.price_cents);
      v_desc := v_product.name;
      v_ref := v_product.id;
    elsif v_type = 'service' then
      select * into v_service from public.services where id = (v_item->>'serviceId')::uuid;
      v_price := coalesce((v_item->>'unitPriceCents')::int, v_service.price_cents);
      v_desc := v_service.name;
      v_ref := v_service.id;
    else
      v_price := (v_item->>'unitPriceCents')::int;
      v_desc := trim(v_item->>'description');
      v_ref := null;
    end if;
    insert into public.sale_items (sale_id, item_type, ref_id, description, unit_price_cents, quantity, total_cents)
    values (v_sale_id, case when v_type = 'product' then 'product' else 'service' end::sale_item_type,
            v_ref, v_desc, v_price, v_qty, v_price * v_qty);
  end loop;

  if v_paid > 0 then
    insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                     sale_id, customer_id, receipt_txid)
    values (v_date, 'in', v_paid, 'venda',
            coalesce((select string_agg(description, ', ') from public.sale_items where sale_id = v_sale_id), 'Venda'),
            v_method, v_sale_id, v_customer_id, v_txid);
  end if;

  if v_appt_id is not null and v_appointment.status = 'CONFIRMED' then
    update public.appointments set status = 'COMPLETED' where id = v_appt_id;
  end if;

  return jsonb_build_object('ok', true, 'saleId', v_sale_id);
end $$;

-- =========================================================
-- receive_sale_payment: recebimento (total ou parcial) de uma venda em aberto
-- =========================================================
create or replace function public.receive_sale_payment(
  p_sale_id uuid, p_amount_cents int, p_method payment_method, p_date date, p_receipt_txid text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale record;
  v_txid text := nullif(trim(p_receipt_txid), '');
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale is null then
    return jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  end if;
  if v_sale.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'Esta venda não está em aberto.');
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_sale.total_cents - v_sale.paid_cents then
    return jsonb_build_object('ok', false, 'error',
      format('O valor deve ser entre R$ 0,01 e o que falta (R$ %s).', replace(to_char((v_sale.total_cents - v_sale.paid_cents) / 100.0, 'FM9999990.00'), '.', ',')));
  end if;
  if p_method is null then
    return jsonb_build_object('ok', false, 'error', 'Informe a forma de pagamento.');
  end if;
  if v_txid is not null then
    perform pg_advisory_xact_lock(hashtext('receipt:' || v_txid));
    if public.receipt_already_used(v_txid) then
      return jsonb_build_object('ok', false, 'error', 'Este comprovante já foi registrado.');
    end if;
  end if;

  insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                   sale_id, customer_id, receipt_txid)
  values (coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date), 'in', p_amount_cents, 'recebimento',
          'Recebimento: ' || coalesce((select string_agg(description, ', ') from public.sale_items where sale_id = p_sale_id), 'venda'),
          p_method, p_sale_id, v_sale.customer_id, v_txid);

  update public.sales
    set paid_cents = paid_cents + p_amount_cents,
        payment_method = p_method,
        status = case when paid_cents + p_amount_cents >= total_cents then 'paid'::sale_status else 'open'::sale_status end,
        paid_at = case when paid_cents + p_amount_cents >= total_cents then now() else null end
    where id = p_sale_id;

  return jsonb_build_object('ok', true);
end $$;

-- =========================================================
-- cancel_sale: devolve o estoque e estorna o que já entrou no caixa
-- =========================================================
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale  record;
  v_entry record;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale is null then
    return jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  end if;
  if v_sale.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'Esta venda já foi cancelada.');
  end if;

  update public.products p
    set stock_quantity = p.stock_quantity + i.quantity
    from public.sale_items i
    where i.sale_id = p_sale_id and i.item_type = 'product' and i.ref_id = p.id;

  for v_entry in
    select * from public.cash_entries e
    where e.sale_id = p_sale_id and e.reversal_of is null
      and not exists (select 1 from public.cash_entries r where r.reversal_of = e.id)
  loop
    insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                     sale_id, customer_id, reversal_of)
    values (v_today, case when v_entry.direction = 'in' then 'out' else 'in' end::cash_direction, v_entry.amount_cents,
            'estorno', 'Estorno: ' || v_entry.description, v_entry.payment_method, p_sale_id, v_entry.customer_id, v_entry.id);
  end loop;

  update public.sales
    set status = 'cancelled', cancelled_at = now(),
        notes = case when nullif(trim(p_reason), '') is null then notes
                     else concat_ws(E'\n', notes, 'Cancelada: ' || trim(p_reason)) end
    where id = p_sale_id;

  return jsonb_build_object('ok', true);
end $$;

-- =========================================================
-- Contas a pagar
-- =========================================================
create or replace function public.pay_payable(
  p_payable_id uuid, p_amount_cents int, p_method payment_method, p_date date
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_payable record;
begin
  select * into v_payable from public.payables where id = p_payable_id for update;
  if v_payable is null then
    return jsonb_build_object('ok', false, 'error', 'Conta não encontrada.');
  end if;
  if v_payable.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'Esta conta não está em aberto.');
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Informe o valor pago.');
  end if;

  update public.payables
    set status = 'paid', amount_cents = p_amount_cents, payment_method = p_method,
        paid_on = coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date)
    where id = p_payable_id;

  insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method, payable_id)
  values (coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date), 'out', p_amount_cents,
          case when v_payable.purchase_id is not null then 'compra' else 'conta' end,
          v_payable.description, p_method, p_payable_id);

  return jsonb_build_object('ok', true);
end $$;

-- Desfaz o pagamento (lançou errado): estorna no caixa e a conta volta a ficar em aberto.
create or replace function public.undo_payable_payment(p_payable_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_payable record;
  v_entry   record;
begin
  select * into v_payable from public.payables where id = p_payable_id for update;
  if v_payable is null or v_payable.status <> 'paid' then
    return jsonb_build_object('ok', false, 'error', 'Esta conta não está paga.');
  end if;

  for v_entry in
    select * from public.cash_entries e
    where e.payable_id = p_payable_id and e.reversal_of is null
      and not exists (select 1 from public.cash_entries r where r.reversal_of = e.id)
  loop
    insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                     payable_id, reversal_of)
    values ((now() at time zone 'America/Sao_Paulo')::date, 'in', v_entry.amount_cents, 'estorno',
            'Estorno: ' || v_entry.description, v_entry.payment_method, p_payable_id, v_entry.id);
  end loop;

  update public.payables set status = 'open', paid_on = null, payment_method = null where id = p_payable_id;
  return jsonb_build_object('ok', true);
end $$;

-- Cria as contas do mês a partir das contas fixas ativas. Idempotente: pode rodar
-- a cada abertura da tela (unique recurring_bill_id + competence).
create or replace function public.generate_recurring_payables(p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_first date := date_trunc('month', p_month)::date;
  v_last  date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_count int;
begin
  insert into public.payables (description, category, supplier, amount_cents, due_date, recurring_bill_id, competence)
  select b.description, b.category, b.supplier, b.amount_cents,
         make_date(extract(year from v_first)::int, extract(month from v_first)::int,
                   least(b.due_day, extract(day from v_last)::int)),
         b.id, v_first
  from public.recurring_bills b
  where b.is_active and b.starts_on <= v_last
  on conflict (recurring_bill_id, competence) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- =========================================================
-- register_purchase: entrada de mercadoria + conta a pagar (paga na hora ou não)
-- p: {supplier?, purchaseDate, dueDate?, notes?, paidNow: bool, method?,
--     items: [{productId?, description?, quantity, unitCostCents}]}
-- =========================================================
create or replace function public.register_purchase(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item        jsonb;
  v_product     record;
  v_qty         int;
  v_cost        int;
  v_desc        text;
  v_total       int := 0;
  v_purchase_id uuid;
  v_payable_id  uuid;
  v_date        date := coalesce(nullif(p->>'purchaseDate', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_supplier    text := nullif(trim(p->>'supplier'), '');
begin
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Adicione ao menos um item.');
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_qty := (v_item->>'quantity')::int;
    v_cost := (v_item->>'unitCostCents')::int;
    if v_qty is null or v_qty <= 0 or v_cost is null or v_cost < 0 then
      return jsonb_build_object('ok', false, 'error', 'Quantidade ou custo inválido.');
    end if;
    if nullif(v_item->>'productId', '') is null and coalesce(trim(v_item->>'description'), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Descreva o item comprado.');
    end if;
    v_total := v_total + v_qty * v_cost;
  end loop;

  insert into public.purchases (supplier, purchase_date, total_cents, notes)
  values (v_supplier, v_date, v_total, nullif(trim(p->>'notes'), ''))
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_qty := (v_item->>'quantity')::int;
    v_cost := (v_item->>'unitCostCents')::int;
    v_desc := nullif(trim(v_item->>'description'), '');
    if nullif(v_item->>'productId', '') is not null then
      update public.products
        set stock_quantity = stock_quantity + v_qty, cost_cents = v_cost
        where id = (v_item->>'productId')::uuid
        returning * into v_product;
      if v_product is null then
        raise exception 'Produto não encontrado.' using errcode = 'P0001';
      end if;
      v_desc := v_product.name;
    end if;
    insert into public.purchase_items (purchase_id, product_id, description, quantity, unit_cost_cents, total_cents)
    values (v_purchase_id, nullif(v_item->>'productId', '')::uuid, v_desc, v_qty, v_cost, v_qty * v_cost);
  end loop;

  insert into public.payables (description, category, supplier, amount_cents, due_date, purchase_id)
  values ('Compra' || coalesce(' — ' || v_supplier, ''), 'compra', v_supplier, v_total,
          coalesce(nullif(p->>'dueDate', '')::date, v_date), v_purchase_id)
  returning id into v_payable_id;

  if coalesce((p->>'paidNow')::boolean, false) and v_total > 0 then
    perform public.pay_payable(v_payable_id, v_total, nullif(p->>'method', '')::payment_method, v_date);
  end if;

  return jsonb_build_object('ok', true, 'purchaseId', v_purchase_id);
end $$;

-- =========================================================
-- RLS e permissões — mesmo padrão das outras tabelas: só o servidor acessa.
-- =========================================================
alter table public.professionals        enable row level security;
alter table public.appointment_products enable row level security;
alter table public.recurring_bills      enable row level security;
alter table public.purchases            enable row level security;
alter table public.purchase_items       enable row level security;
alter table public.payables             enable row level security;
alter table public.cash_entries         enable row level security;

alter table public.professionals        force row level security;
alter table public.appointment_products force row level security;
alter table public.recurring_bills      force row level security;
alter table public.purchases            force row level security;
alter table public.purchase_items       force row level security;
alter table public.payables             force row level security;
alter table public.cash_entries         force row level security;

create policy admin_full_access on public.professionals        for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.appointment_products for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.recurring_bills      for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.purchases            for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.purchase_items       for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.payables             for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.cash_entries         for all using (is_admin()) with check (is_admin());

revoke execute on function public.register_sale(jsonb) from public, anon, authenticated;
revoke execute on function public.receive_sale_payment(uuid, int, payment_method, date, text) from public, anon, authenticated;
revoke execute on function public.cancel_sale(uuid, text) from public, anon, authenticated;
revoke execute on function public.pay_payable(uuid, int, payment_method, date) from public, anon, authenticated;
revoke execute on function public.undo_payable_payment(uuid) from public, anon, authenticated;
revoke execute on function public.generate_recurring_payables(date) from public, anon, authenticated;
revoke execute on function public.register_purchase(jsonb) from public, anon, authenticated;
revoke execute on function public.receipt_already_used(text) from public, anon, authenticated;
