-- Casa Herbert — ajustes para a entrada em produção (conexão do app ao Supabase).
--
-- O app acessa o banco só pelo servidor, com a chave secreta (service role),
-- depois de checar a sessão do admin (src/lib/auth/require-admin.ts). As
-- funções abaixo existem para operações que precisam ser atômicas — várias
-- escritas que devem acontecer todas ou nenhuma.

-- =========================================================
-- gallery: o painel cadastra itens antes de haver upload de imagem real
-- (placeholders com legenda — ver CLAUDE.md > Fotos)
-- =========================================================
alter table public.gallery alter column image_url drop not null;
alter table public.gallery alter column storage_path drop not null;

-- =========================================================
-- create_appointment: gravar o preço do serviço no agendamento, como o app faz
-- (appointments.price_cents veio em 0005_products_sales.sql, depois desta função)
-- =========================================================
create or replace function public.create_appointment(
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service        record;
  v_availability   jsonb;
  v_slot           jsonb;
  v_found          boolean := false;
  v_customer_id    uuid;
  v_normalized     text;
  v_end_time       time;
  v_appointment_id uuid;
begin
  select * into v_service from public.services where id = p_service_id and is_active;
  if v_service is null then
    return jsonb_build_object('ok', false, 'error', 'Serviço indisponível.');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text));

  v_availability := public.get_available_slots(p_date, p_service_id);
  if not (v_availability->>'bookable')::boolean then
    return jsonb_build_object('ok', false, 'error', 'SLOT_NO_LONGER_AVAILABLE');
  end if;

  for v_slot in select * from jsonb_array_elements(v_availability->'slots') loop
    if (v_slot->>'startTime') = to_char(p_start_time, 'HH24:MI') then
      v_found := true;
    end if;
  end loop;

  if not v_found then
    return jsonb_build_object('ok', false, 'error', 'SLOT_NO_LONGER_AVAILABLE');
  end if;

  v_normalized := regexp_replace(p_customer_phone, '\D', '', 'g');
  select id into v_customer_id from public.customers where normalized_phone = v_normalized;
  if v_customer_id is null then
    insert into public.customers (full_name, phone, email)
    values (p_customer_name, p_customer_phone, nullif(p_customer_email, ''))
    returning id into v_customer_id;
  else
    update public.customers
      set full_name = p_customer_name,
          email = coalesce(nullif(p_customer_email, ''), email)
      where id = v_customer_id;
  end if;

  v_end_time := p_start_time + (v_service.duration_minutes || ' minutes')::interval;

  begin
    insert into public.appointments (
      customer_id, service_id, appointment_date, start_time, end_time, status, customer_notes, price_cents
    ) values (
      v_customer_id, p_service_id, p_date, p_start_time, v_end_time, 'PENDING', nullif(p_notes, ''), v_service.price_cents
    ) returning id into v_appointment_id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'SLOT_NO_LONGER_AVAILABLE');
  end;

  return jsonb_build_object('ok', true, 'appointmentId', v_appointment_id);
end;
$$;

-- =========================================================
-- replace_business_hours: troca as janelas de um dia da semana de uma vez
-- (sem isso, um insert que falhasse depois do delete deixaria o dia fechado)
-- =========================================================
create or replace function public.replace_business_hours(p_weekday smallint, p_ranges jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.business_hours where weekday = p_weekday;
  insert into public.business_hours (weekday, start_time, end_time, is_active)
  select p_weekday, (r->>'startTime')::time, (r->>'endTime')::time, true
  from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) as r;
end;
$$;

-- =========================================================
-- upsert_special_hours: data especial + faixas numa transação só.
-- Garante a invariante de 0001_schema.sql: dia fechado não tem faixas.
-- =========================================================
create or replace function public.upsert_special_hours(
  p_date date,
  p_is_closed boolean,
  p_reason text,
  p_ranges jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.special_hours (special_date, is_closed, reason)
  values (p_date, p_is_closed, p_reason)
  on conflict (special_date) do update
    set is_closed = excluded.is_closed, reason = excluded.reason
  returning id into v_id;

  delete from public.special_hours_ranges where special_hours_id = v_id;

  if not p_is_closed then
    insert into public.special_hours_ranges (special_hours_id, start_time, end_time)
    select v_id, (r->>'startTime')::time, (r->>'endTime')::time
    from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) as r;
  end if;

  return v_id;
end;
$$;

-- =========================================================
-- checkout_sale: espelha checkout() de src/lib/data/sales.ts. Valida TODAS as
-- linhas de produto (existe, ativo, estoque suficiente) antes de baixar
-- qualquer estoque, grava venda + itens e conclui o agendamento — tudo ou nada.
-- p_product_lines: [{"productId": uuid, "quantity": int}, ...]
-- =========================================================
create or replace function public.checkout_sale(
  p_appointment_id uuid,
  p_customer_id uuid,
  p_service_unit_price_cents int,
  p_product_lines jsonb,
  p_payment_method payment_method,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment  record;
  v_service      record;
  v_product      record;
  v_line         jsonb;
  v_quantity     int;
  v_unit_price   int;
  v_sale_id      uuid;
  v_total        int := 0;
  v_item_count   int := 0;
  v_customer_id  uuid := p_customer_id;
begin
  if p_appointment_id is not null then
    select * into v_appointment from public.appointments where id = p_appointment_id for update;
    if v_appointment is null then
      return jsonb_build_object('ok', false, 'error', 'Agendamento não encontrado.');
    end if;
    if v_appointment.status <> 'CONFIRMED' then
      return jsonb_build_object('ok', false, 'error', 'Só é possível finalizar atendimentos confirmados.');
    end if;
    select * into v_service from public.services where id = v_appointment.service_id;
    if v_service is null then
      return jsonb_build_object('ok', false, 'error', 'Serviço indisponível.');
    end if;
    v_unit_price := coalesce(p_service_unit_price_cents, v_appointment.price_cents);
    if v_unit_price is null then
      return jsonb_build_object('ok', false, 'error', 'Informe o valor do serviço antes de finalizar.');
    end if;
    v_customer_id := v_appointment.customer_id;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_product_lines, '[]'::jsonb)) loop
    v_quantity := (v_line->>'quantity')::int;
    if v_quantity is null or v_quantity <= 0 then
      return jsonb_build_object('ok', false, 'error', 'Quantidade inválida.');
    end if;
    select * into v_product from public.products where id = (v_line->>'productId')::uuid for update;
    if v_product is null or not v_product.is_active then
      return jsonb_build_object('ok', false, 'error', 'Produto indisponível.');
    end if;
    if v_product.stock_quantity < v_quantity then
      return jsonb_build_object('ok', false, 'error', format('Estoque insuficiente para "%s".', v_product.name));
    end if;
  end loop;

  if p_appointment_id is null and jsonb_array_length(coalesce(p_product_lines, '[]'::jsonb)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nenhum item para finalizar a venda.');
  end if;

  insert into public.sales (appointment_id, customer_id, total_cents, payment_method, notes)
  values (p_appointment_id, v_customer_id, 0, p_payment_method, nullif(p_notes, ''))
  returning id into v_sale_id;

  if p_appointment_id is not null then
    insert into public.sale_items (sale_id, item_type, ref_id, description, unit_price_cents, quantity, total_cents)
    values (v_sale_id, 'service', v_service.id, v_service.name, v_unit_price, 1, v_unit_price);
    v_total := v_total + v_unit_price;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_product_lines, '[]'::jsonb)) loop
    v_quantity := (v_line->>'quantity')::int;
    update public.products
      set stock_quantity = stock_quantity - v_quantity
      where id = (v_line->>'productId')::uuid
      returning * into v_product;
    insert into public.sale_items (sale_id, item_type, ref_id, description, unit_price_cents, quantity, total_cents)
    values (v_sale_id, 'product', v_product.id, v_product.name, v_product.price_cents, v_quantity,
            v_product.price_cents * v_quantity);
    v_total := v_total + v_product.price_cents * v_quantity;
  end loop;

  update public.sales set total_cents = v_total where id = v_sale_id;

  if p_appointment_id is not null then
    update public.appointments
      set status = 'COMPLETED', price_cents = v_unit_price
      where id = p_appointment_id;
  end if;

  return jsonb_build_object('ok', true, 'saleId', v_sale_id);
end;
$$;

-- Funções administrativas: só o servidor (service role) chama. Tirar o EXECUTE
-- padrão de public/anon/authenticated para ninguém chamar pela API pública.
revoke execute on function public.replace_business_hours(smallint, jsonb) from public, anon, authenticated;
revoke execute on function public.upsert_special_hours(date, boolean, text, jsonb) from public, anon, authenticated;
revoke execute on function public.checkout_sale(uuid, uuid, int, jsonb, payment_method, text) from public, anon, authenticated;
revoke execute on function public.expire_pending_appointments() from public, anon, authenticated;

-- =========================================================
-- Expiração automática de PENDING (documentação.md > Casos de conflito),
-- a cada hora via pg_cron.
-- =========================================================
create extension if not exists pg_cron;

select cron.schedule(
  'expire-pending-appointments',
  '0 * * * *',
  $$select public.expire_pending_appointments()$$
);
