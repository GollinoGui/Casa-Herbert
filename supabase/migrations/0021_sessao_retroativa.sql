-- Casa Herbert — registrar uma sessão de pacote que já aconteceu.
--
-- schedule_package_sessions (0018) recusa data passada, de propósito. Mas há a
-- exceção: a sessão foi feita antes de o sistema estar pronto (ou ninguém lançou
-- no dia). record_past_package_session grava direto como COMPLETED, numa data de
-- hoje para trás, ocupando uma vaga livre do pacote.
--
-- - Entra já concluída, então não passa pelo EXCLUDE de horário nem pelo
--   SLOT_BLOCKED (só valem para PENDING/CONFIRMED): é registro do que aconteceu.
-- - A comissão de quem atendeu é a mesma do trigger de 0019 (que só roda em UPDATE).
-- - O estoque só baixa se a pessoa marcar: quando o estoque foi contado depois
--   da sessão, ele já está sem o que foi usado, e baixar de novo contaria duas vezes.
--   A baixa sai de consume_service_products, a mesma do trigger de 0016.
--
-- O modo demonstração espelha em src/lib/demo/rpc.ts.

create or replace function public.consume_service_products(p_service_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_line record;
  v_total numeric;
  v_units int;
begin
  for v_line in
    select sp.product_id, sp.quantity
    from public.service_products sp
    where sp.service_id = p_service_id
  loop
    select open_usage + v_line.quantity into v_total from public.products where id = v_line.product_id for update;
    v_units := floor(v_total);
    update public.products
      set stock_quantity = greatest(0, stock_quantity - v_units),
          open_usage = v_total - v_units
      where id = v_line.product_id;
  end loop;
end $$;

create or replace function public.fn_consume_service_products() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.consume_service_products(new.service_id);
  return null;
end $$;

-- p: {customerPackageId, date, startTime, professionalId?, consumeStock?, notes?}
create or replace function public.record_past_package_session(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pkg     record;
  v_service record;
  v_counts  record;
  v_date    date := nullif(p->>'date', '')::date;
  v_start   time := nullif(p->>'startTime', '')::time;
  v_prof    uuid := nullif(p->>'professionalId', '')::uuid;
  v_notes   text := nullif(trim(p->>'notes'), '');
  v_today   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_id      uuid;
begin
  select * into v_pkg from public.customer_packages where id = nullif(p->>'customerPackageId', '')::uuid for update;
  if v_pkg is null then
    return jsonb_build_object('ok', false, 'error', 'Pacote não encontrado.');
  end if;
  if v_pkg.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Este pacote não está em andamento.');
  end if;
  if v_date is null or v_start is null then
    return jsonb_build_object('ok', false, 'error', 'Informe a data e o horário da sessão.');
  end if;
  if v_date > v_today then
    return jsonb_build_object('ok', false, 'error', 'Essa data ainda não chegou. Para sessão futura, use "Agendar sessões".');
  end if;
  if v_pkg.expires_on is not null and v_date > v_pkg.expires_on then
    return jsonb_build_object('ok', false, 'error',
      format('O pacote vale até %s: a data %s passa disso.', to_char(v_pkg.expires_on, 'DD/MM'), to_char(v_date, 'DD/MM')));
  end if;

  select * into v_counts from public.package_session_counts(v_pkg.id);
  if v_counts.used + v_counts.reserved >= v_pkg.sessions_total then
    return jsonb_build_object('ok', false, 'error',
      'Não sobra sessão livre neste pacote. Se a sessão já estava agendada, abra ela na agenda e conclua por lá.');
  end if;

  select * into v_service from public.services where id = v_pkg.service_id;

  insert into public.appointments (customer_id, service_id, appointment_date, start_time, end_time, status,
                                   price_cents, professional_id, confirmed_at, customer_package_id, admin_notes)
  values (v_pkg.customer_id, v_pkg.service_id, v_date, v_start,
          v_start + make_interval(mins => v_service.duration_minutes), 'COMPLETED',
          v_pkg.session_value_cents, v_prof, now(), v_pkg.id,
          concat_ws(E'\n', 'Sessão registrada depois de feita.', v_notes))
  returning id into v_id;

  -- Mesmo cálculo de fn_package_session_commission (0019), sobre o profissional
  -- já resolvido pelo trigger de profissional padrão (0012).
  update public.appointments a
    set commission_cents = round(v_pkg.session_value_cents
          * public.resolve_commission_bps(a.professional_id, 'service', a.service_id, null) / 10000.0)::int
    where a.id = v_id;

  if coalesce((p->>'consumeStock')::boolean, false) then
    perform public.consume_service_products(v_pkg.service_id);
  end if;

  perform public.refresh_customer_package_status(v_pkg.id);
  return jsonb_build_object('ok', true, 'appointmentId', v_id,
                            'remaining', v_pkg.sessions_total - v_counts.used - 1);
end $$;

revoke execute on function public.consume_service_products(uuid) from public, anon, authenticated;
revoke execute on function public.record_past_package_session(jsonb) from public, anon, authenticated;
