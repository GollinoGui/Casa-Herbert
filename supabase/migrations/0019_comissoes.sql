-- Casa Herbert — comissão por profissional e repasse de marcas consignadas.
--
-- 1. Quem vendeu: sales.professional_id (padrão: o profissional do atendimento) e
--    sale_items.professional_id. Na venda, cada item grava em CENTAVOS a comissão
--    cheia (commission_cents) e, se o produto é de marca consignada, o que é devido
--    à marca (brand_due_cents). O desconto da venda é rateado entre os itens antes
--    (o último item leva o resto do arredondamento), então a marca também recebe
--    sobre o valor com desconto. A comissão do profissional incide sobre o valor do
--    item, consignado ou não. Mudar uma regra depois não mexe em venda antiga.
-- 2. Regra do percentual (commission_rules): a mais específica vale — item
--    (serviço/produto) > marca > padrão do tipo; em cada nível, a regra do
--    profissional antes da regra "todos". Sem regra = 0%.
-- 3. Comissão só é devida quando o dinheiro entra: devido = comissão cheia × fração
--    já recebida da venda (soma do caixa ligado à venda, estornos negativos),
--    arredondado UMA vez sobre o acumulado (nunca lançamento a lançamento, para
--    não sobrar centavo). Venda cancelada depois do pagamento deixa o saldo
--    negativo: abate no próximo pagamento.
-- 4. Pacote: a linha do pacote não gera comissão. Cada sessão concluída grava em
--    appointments.commission_cents a comissão de quem atendeu sobre o valor da
--    sessão (trigger), devida na proporção do que o pacote já recebeu.
-- 5. Pagar = saída no livro-caixa (category 'comissao' com professional_id, ou
--    'repasse' com brand_id). Pago = soma desses lançamentos menos seus estornos.
--    Contagem, nunca contador.
--
-- O modo demonstração espelha tudo em src/lib/demo/rpc.ts e src/lib/demo/client.ts.

create table public.brands (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  -- consignada: o produto é da marca; o salão recebe e repassa o valor menos commission_bps
  is_consigned   boolean not null default true,
  commission_bps int not null default 0 check (commission_bps between 0 and 10000),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.products add column brand_id uuid references public.brands(id);

create table public.commission_rules (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete cascade, -- null = todos
  scope           text not null check (scope in ('service_default', 'product_default', 'service', 'product', 'brand')),
  ref_id          uuid, -- serviço, produto ou marca conforme scope; null nos padrões
  rate_bps        int not null check (rate_bps between 0 and 10000),
  created_at      timestamptz not null default now(),
  check ((scope like '%_default') = (ref_id is null))
);
create unique index uq_commission_rules on public.commission_rules (
  coalesce(professional_id, '00000000-0000-0000-0000-000000000000'::uuid), scope,
  coalesce(ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

alter table public.sales add column professional_id uuid references public.professionals(id);
update public.sales s set professional_id = a.professional_id
  from public.appointments a where a.id = s.appointment_id;

alter table public.sale_items
  add column professional_id  uuid references public.professionals(id),
  add column commission_cents int not null default 0 check (commission_cents >= 0),
  add column brand_id         uuid references public.brands(id),
  add column brand_due_cents  int not null default 0 check (brand_due_cents >= 0),
  add column net_cents        int check (net_cents >= 0); -- valor do item já com o desconto rateado; null = venda anterior
create index idx_sale_items_professional on public.sale_items (professional_id) where professional_id is not null;
create index idx_sale_items_brand on public.sale_items (brand_id) where brand_id is not null;

alter table public.appointments
  add column commission_cents int not null default 0 check (commission_cents >= 0);

alter table public.cash_entries
  add column professional_id uuid references public.professionals(id),
  add column brand_id        uuid references public.brands(id);
create index idx_cash_entries_professional on public.cash_entries (professional_id) where professional_id is not null;
create index idx_cash_entries_brand on public.cash_entries (brand_id) where brand_id is not null;

-- p_item_type: 'service' | 'product'. Linha avulsa = 'service' sem ref.
create or replace function public.resolve_commission_bps(
  p_professional_id uuid, p_item_type text, p_ref_id uuid, p_brand_id uuid
) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select rate_bps from public.commission_rules
    where (professional_id = p_professional_id or professional_id is null)
      and ((scope = p_item_type and ref_id = p_ref_id)
        or (scope = 'brand' and ref_id = p_brand_id)
        or scope = p_item_type || '_default')
    order by case when scope = p_item_type then 0 when scope = 'brand' then 1 else 2 end,
             (professional_id is null)
    limit 1
  ), 0);
$$;

-- Sessão de pacote concluída: comissão de quem atendeu sobre o valor da sessão.
create or replace function public.fn_package_session_commission() returns trigger
language plpgsql set search_path = public as $$
declare
  v_value int;
begin
  if new.status = 'COMPLETED' and new.customer_package_id is not null then
    if old.status is distinct from 'COMPLETED' or old.customer_package_id is distinct from new.customer_package_id then
      select session_value_cents into v_value from public.customer_packages where id = new.customer_package_id;
      new.commission_cents := round(coalesce(v_value, 0)
        * public.resolve_commission_bps(new.professional_id, 'service', new.service_id, null) / 10000.0)::int;
    end if;
  else
    new.commission_cents := 0;
  end if;
  return new;
end $$;

create trigger trg_appointments_package_commission
  before update on public.appointments
  for each row execute function public.fn_package_session_commission();

-- =========================================================
-- register_sale de 0012 com profissional, rateio do desconto e snapshot de comissão.
-- p ganha: professionalId? (padrão: o do atendimento), e por item professionalId? e
-- noCommission? (a linha do pacote).
-- =========================================================
create or replace function public.register_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appointment  record;
  v_product      record;
  v_service      record;
  v_brand        record;
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
  v_sale_prof    uuid := nullif(p->>'professionalId', '')::uuid;
  v_item_prof    uuid;
  v_n_items      int := jsonb_array_length(coalesce(p->'items', '[]'::jsonb));
  v_index        int := 0;
  v_net          int;
  v_allocated    int := 0;
  v_commission   int;
  v_brand_id     uuid;
  v_brand_due    int;
  v_pkg_service  uuid; -- serviço da sessão de pacote, quando a venda é dela
begin
  if v_n_items = 0 then
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
    v_sale_prof := coalesce(v_sale_prof, v_appointment.professional_id);
    if v_appointment.customer_package_id is not null then
      v_pkg_service := v_appointment.service_id;
    end if;
  end if;

  if v_sale_prof is not null and not exists (select 1 from public.professionals where id = v_sale_prof) then
    return jsonb_build_object('ok', false, 'error', 'Profissional não encontrado.');
  end if;
  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_item_prof := nullif(v_item->>'professionalId', '')::uuid;
    if v_item_prof is not null and not exists (select 1 from public.professionals where id = v_item_prof) then
      return jsonb_build_object('ok', false, 'error', 'Profissional não encontrado.');
    end if;
  end loop;

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
                            notes, status, sale_date, due_date, paid_at, professional_id)
  values (v_appt_id, v_customer_id, v_total, v_discount, v_paid, case when v_paid > 0 then v_method end,
          nullif(trim(p->>'notes'), ''), v_status, v_date,
          case when v_status = 'open' then coalesce(nullif(p->>'dueDate', '')::date, v_date) end,
          case when v_status = 'paid' then now() end, v_sale_prof)
  returning id into v_sale_id;

  -- 2ª passada: grava itens (com comissão) e baixa estoque.
  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_index := v_index + 1;
    v_type := v_item->>'type';
    v_qty := coalesce((v_item->>'quantity')::int, 1);
    v_brand_id := null;
    if v_type = 'product' then
      update public.products set stock_quantity = stock_quantity - v_qty
        where id = (v_item->>'productId')::uuid
        returning * into v_product;
      v_price := coalesce((v_item->>'unitPriceCents')::int, v_product.price_cents);
      v_desc := v_product.name;
      v_ref := v_product.id;
      v_brand_id := v_product.brand_id;
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

    v_net := case when v_index = v_n_items then v_total - v_allocated
                  when v_subtotal = 0 then 0
                  else round((v_price * v_qty)::numeric * v_total / v_subtotal)::int end;
    v_allocated := v_allocated + v_net;

    v_item_prof := coalesce(nullif(v_item->>'professionalId', '')::uuid, v_sale_prof);
    -- Sessão de pacote: a comissão do serviço vem da sessão (trigger), não da venda.
    if v_item_prof is null or coalesce((v_item->>'noCommission')::boolean, false)
       or (v_type = 'service' and v_ref = v_pkg_service) then
      v_commission := 0;
    else
      v_commission := round(v_net * public.resolve_commission_bps(
        v_item_prof, case when v_type = 'product' then 'product' else 'service' end, v_ref, v_brand_id) / 10000.0)::int;
    end if;

    v_brand_due := 0;
    if v_brand_id is not null then
      select * into v_brand from public.brands where id = v_brand_id;
      if v_brand.is_consigned then
        v_brand_due := v_net - round(v_net * v_brand.commission_bps / 10000.0)::int;
      else
        v_brand_id := null;
      end if;
    end if;

    insert into public.sale_items (sale_id, item_type, ref_id, description, unit_price_cents, quantity, total_cents,
                                   professional_id, commission_cents, brand_id, brand_due_cents, net_cents)
    values (v_sale_id, case when v_type = 'product' then 'product' else 'service' end::sale_item_type,
            v_ref, v_desc, v_price, v_qty, v_price * v_qty,
            v_item_prof, v_commission, v_brand_id, v_brand_due, v_net);
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

-- sell_package de 0017: a linha do pacote não gera comissão (vem por sessão).
create or replace function public.sell_package(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pkg      record;
  v_customer uuid := nullif(p->>'customerId', '')::uuid;
  v_discount int  := coalesce((p->>'discountCents')::int, 0);
  v_date     date := coalesce(nullif(p->>'saleDate', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_result   jsonb;
  v_sale_id  uuid;
  v_cp_id    uuid;
begin
  if v_customer is null or not exists (select 1 from public.customers where id = v_customer) then
    return jsonb_build_object('ok', false, 'error', 'Escolha a cliente do pacote.');
  end if;
  select * into v_pkg from public.service_packages where id = nullif(p->>'packageId', '')::uuid;
  if v_pkg is null or not v_pkg.is_active then
    return jsonb_build_object('ok', false, 'error', 'Pacote não encontrado.');
  end if;

  v_result := public.register_sale(jsonb_strip_nulls(jsonb_build_object(
    'customerId', v_customer,
    'saleDate', v_date,
    'dueDate', nullif(p->>'dueDate', ''),
    'discountCents', v_discount,
    'notes', nullif(trim(p->>'notes'), ''),
    'professionalId', nullif(p->>'professionalId', ''),
    'items', jsonb_build_array(jsonb_build_object(
      'type', 'custom',
      'description', format('Pacote: %s (%s sessões)', v_pkg.name, v_pkg.sessions),
      'unitPriceCents', v_pkg.price_cents,
      'noCommission', true)),
    'payment', p->'payment'
  )));
  if not coalesce((v_result->>'ok')::boolean, false) then
    return v_result;
  end if;
  v_sale_id := (v_result->>'saleId')::uuid;

  insert into public.customer_packages (customer_id, service_id, package_id, name, sessions_total,
                                        session_value_cents, sale_id, expires_on)
  values (v_customer, v_pkg.service_id, v_pkg.id, v_pkg.name, v_pkg.sessions,
          round((v_pkg.price_cents - v_discount)::numeric / v_pkg.sessions)::int, v_sale_id,
          case when v_pkg.valid_days is not null then v_date + v_pkg.valid_days end)
  returning id into v_cp_id;

  return jsonb_build_object('ok', true, 'saleId', v_sale_id, 'customerPackageId', v_cp_id);
end $$;

-- =========================================================
-- Extrato: uma linha por (venda ou sessão) × beneficiário, com o devido até p_until.
-- kind: 'professional' | 'brand'. base = valor vendido sobre o qual a linha incide
-- (na marca, base − devido = o que fica com o salão/Herbert).
-- =========================================================
create or replace function public.commission_lines(p_until date)
returns table (kind text, ref_id uuid, sale_id uuid, appointment_id uuid, line_date date,
               description text, base_cents int, full_cents int, earned_base_cents int, earned_cents int)
language sql stable security definer set search_path = public as $$
  with received as (
    select e.sale_id, sum(case when e.direction = 'in' then e.amount_cents else -e.amount_cents end) as net
    from public.cash_entries e
    where e.sale_id is not null and e.entry_date <= p_until
    group by e.sale_id
  ),
  -- fração já recebida, entre 0 e 1
  sale_ratio as (
    select s.id, s.sale_date,
           case when s.total_cents = 0 then 1
                else least(greatest(coalesce(r.net, 0), 0), s.total_cents)::numeric / s.total_cents end as ratio
    from public.sales s left join received r on r.sale_id = s.id
  ),
  item_lines as (
    select 'professional'::text as kind, i.professional_id as ref_id, i.sale_id,
           string_agg(i.description, ', ') as description,
           sum(coalesce(i.net_cents, i.total_cents))::int as base_cents, sum(i.commission_cents)::int as full_cents
    from public.sale_items i
    where i.professional_id is not null and i.commission_cents > 0
    group by i.professional_id, i.sale_id
    union all
    select 'brand', i.brand_id, i.sale_id, string_agg(i.description, ', '),
           sum(coalesce(i.net_cents, i.total_cents))::int, sum(i.brand_due_cents)::int
    from public.sale_items i
    where i.brand_id is not null and i.brand_due_cents > 0
    group by i.brand_id, i.sale_id
  )
  select l.kind, l.ref_id, l.sale_id, null::uuid, sr.sale_date, l.description, l.base_cents, l.full_cents,
         round(l.base_cents * sr.ratio)::int, round(l.full_cents * sr.ratio)::int
  from item_lines l join sale_ratio sr on sr.id = l.sale_id
  where sr.sale_date <= p_until
  union all
  select 'professional', a.professional_id, cp.sale_id, a.id, a.appointment_date,
         'Sessão: ' || cp.name, cp.session_value_cents, a.commission_cents,
         round(cp.session_value_cents * sr.ratio)::int, round(a.commission_cents * sr.ratio)::int
  from public.appointments a
  join public.customer_packages cp on cp.id = a.customer_package_id
  join sale_ratio sr on sr.id = cp.sale_id
  where a.status = 'COMPLETED' and a.commission_cents > 0 and a.professional_id is not null
    and a.appointment_date <= p_until;
$$;

-- Devido e pago acumulados até p_until, por beneficiário.
create or replace function public.commission_balances(p_until date)
returns table (kind text, ref_id uuid, earned_cents int, paid_cents int)
language sql stable security definer set search_path = public as $$
  with earned as (
    select l.kind, l.ref_id, sum(l.earned_cents)::int as cents
    from public.commission_lines(p_until) l group by l.kind, l.ref_id
  ),
  paid as (
    select case when e.professional_id is not null then 'professional' else 'brand' end as kind,
           coalesce(e.professional_id, e.brand_id) as ref_id,
           sum(case when e.direction = 'out' then e.amount_cents else -e.amount_cents end)::int as cents
    from public.cash_entries e
    where (e.professional_id is not null or e.brand_id is not null) and e.entry_date <= p_until
    group by 1, 2
  )
  select coalesce(e.kind, p.kind), coalesce(e.ref_id, p.ref_id), coalesce(e.cents, 0), coalesce(p.cents, 0)
  from earned e full join paid p on p.kind = e.kind and p.ref_id = e.ref_id;
$$;

-- p: {kind: 'professional'|'brand', refId, amountCents, method, date?, notes?}
create or replace function public.pay_commission(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_kind   text := p->>'kind';
  v_ref    uuid := nullif(p->>'refId', '')::uuid;
  v_amount int  := coalesce((p->>'amountCents')::int, 0);
  v_method payment_method := nullif(p->>'method', '')::payment_method;
  v_date   date := coalesce(nullif(p->>'date', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_name   text;
  v_owed   int;
  v_id     uuid;
begin
  if v_kind = 'professional' then
    select name into v_name from public.professionals where id = v_ref;
  elsif v_kind = 'brand' then
    select name into v_name from public.brands where id = v_ref;
  end if;
  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'Profissional ou marca não encontrado.');
  end if;
  if v_method is null then
    return jsonb_build_object('ok', false, 'error', 'Informe a forma de pagamento.');
  end if;
  perform pg_advisory_xact_lock(hashtext('commission:' || v_ref));
  select coalesce(sum(b.earned_cents - b.paid_cents), 0) into v_owed
    from public.commission_balances((now() at time zone 'America/Sao_Paulo')::date) b
    where b.kind = v_kind and b.ref_id = v_ref;
  if v_amount <= 0 or v_amount > v_owed then
    return jsonb_build_object('ok', false, 'error',
      format('O valor deve ser entre R$ 0,01 e o devido (R$ %s).', replace(to_char(greatest(v_owed, 0) / 100.0, 'FM9999990.00'), '.', ',')));
  end if;

  insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                   professional_id, brand_id)
  values (v_date, 'out', v_amount,
          case when v_kind = 'professional' then 'comissao' else 'repasse' end,
          case when v_kind = 'professional' then 'Comissão: ' else 'Repasse: ' end || v_name
            || coalesce(' — ' || nullif(trim(p->>'notes'), ''), ''),
          v_method,
          case when v_kind = 'professional' then v_ref end,
          case when v_kind = 'brand' then v_ref end)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'entryId', v_id);
end $$;

create or replace function public.undo_commission_payment(p_entry_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_entry record;
begin
  select * into v_entry from public.cash_entries where id = p_entry_id for update;
  if v_entry is null or v_entry.category not in ('comissao', 'repasse') then
    return jsonb_build_object('ok', false, 'error', 'Pagamento não encontrado.');
  end if;
  if exists (select 1 from public.cash_entries where reversal_of = p_entry_id) then
    return jsonb_build_object('ok', false, 'error', 'Este pagamento já foi desfeito.');
  end if;
  insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method,
                                   professional_id, brand_id, reversal_of)
  values ((now() at time zone 'America/Sao_Paulo')::date, 'in', v_entry.amount_cents, 'estorno',
          'Estorno: ' || v_entry.description, v_entry.payment_method,
          v_entry.professional_id, v_entry.brand_id, v_entry.id);
  return jsonb_build_object('ok', true);
end $$;

alter table public.brands           enable row level security;
alter table public.commission_rules enable row level security;
alter table public.brands           force row level security;
alter table public.commission_rules force row level security;

create policy admin_full_access on public.brands           for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.commission_rules for all using (is_admin()) with check (is_admin());

revoke execute on function public.resolve_commission_bps(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.register_sale(jsonb) from public, anon, authenticated;
revoke execute on function public.sell_package(jsonb) from public, anon, authenticated;
revoke execute on function public.commission_lines(date) from public, anon, authenticated;
revoke execute on function public.commission_balances(date) from public, anon, authenticated;
revoke execute on function public.pay_commission(jsonb) from public, anon, authenticated;
revoke execute on function public.undo_commission_payment(uuid) from public, anon, authenticated;
