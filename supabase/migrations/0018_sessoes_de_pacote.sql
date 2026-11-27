-- Casa Herbert — sessões de pacote agendadas na venda.
--
-- Antes (0017) a sessão só se ligava ao pacote ao concluir ("Usar sessão do
-- pacote" = COMPLETED na hora). Usado num agendamento futuro, travava: atendimento
-- concluído não remarca nem cancela, e a sessão já contava como usada.
--
-- Agora:
-- 1. As sessões nascem ligadas ao pacote (schedule_package_sessions), CONFIRMED,
--    e aparecem na agenda e nos lembretes de véspera como qualquer atendimento.
--    Ligada e PENDING/CONFIRMED = reservada. Remarcar não mexe no vínculo.
-- 2. Desmarcou ou faltou: cancel_package_session cancela e grava a decisão do
--    Herbert em appointments.package_outcome — 'counted' (a sessão é descontada)
--    ou 'returned' (volta para o pacote, para marcar a reposição). O banco não
--    aceita sessão de pacote cancelada sem decisão. Contar a sessão não conclui o
--    atendimento, então o trigger de consumo (0016) não baixa produto.
--    appointments.no_show só registra que foi falta (e não aviso de desmarcação).
-- 3. Sessões usadas = ligadas COMPLETED + canceladas 'counted'.
--    Livres = total − usadas − reservadas. Contagem, nunca contador.
-- 4. use_package_session (concluir) recusa data futura.
-- 5. reopen_package_session desfaz o "usar sessão" feito antes do dia (o erro
--    antigo): volta para CONFIRMED e devolve a receita ao estoque.
--
-- O modo demonstração espelha tudo em src/lib/demo/rpc.ts.

alter table public.appointments
  add column package_outcome text check (package_outcome in ('counted', 'returned')),
  add column no_show boolean not null default false;

alter table public.appointments
  add constraint chk_appt_package_outcome check (
    package_outcome is null or (status = 'CANCELLED' and customer_package_id is not null)
  ),
  add constraint chk_appt_package_cancel_decided check (
    customer_package_id is null or status not in ('CANCELLED', 'REJECTED') or package_outcome is not null
  ),
  add constraint chk_appt_no_show check (not no_show or status = 'CANCELLED');

create or replace function public.package_session_counts(p_customer_package_id uuid, out used int, out reserved int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where status = 'COMPLETED' or (status = 'CANCELLED' and package_outcome = 'counted'))::int,
    count(*) filter (where status in ('PENDING', 'CONFIRMED'))::int
  from public.appointments
  where customer_package_id = p_customer_package_id;
$$;

-- active <-> finished acompanha as sessões usadas; cancelado não muda.
create or replace function public.refresh_customer_package_status(p_customer_package_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_used int;
begin
  select used into v_used from public.package_session_counts(p_customer_package_id);
  update public.customer_packages
    set status = case when v_used >= sessions_total then 'finished' else 'active' end::customer_package_status
    where id = p_customer_package_id and status <> 'cancelled';
end $$;

-- p: {customerPackageId, sessions: [{date, startTime}], professionalId?}
-- Tudo ou nada. Quem confere horário de funcionamento, bloqueio e conflito antes é o
-- app (lib/booking/engine.ts); aqui o EXCLUDE e o trigger SLOT_BLOCKED garantem.
create or replace function public.schedule_package_sessions(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pkg      record;
  v_service  record;
  v_counts   record;
  v_session  jsonb;
  v_date     date;
  v_start    time;
  v_n        int := coalesce(jsonb_array_length(p->'sessions'), 0);
  v_today    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_prof     uuid := nullif(p->>'professionalId', '')::uuid;
  v_ids      uuid[] := '{}';
  v_id       uuid;
begin
  select * into v_pkg from public.customer_packages where id = nullif(p->>'customerPackageId', '')::uuid for update;
  if v_pkg is null then
    return jsonb_build_object('ok', false, 'error', 'Pacote não encontrado.');
  end if;
  if v_pkg.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Este pacote não está em andamento.');
  end if;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'Escolha ao menos uma data.');
  end if;

  select * into v_counts from public.package_session_counts(v_pkg.id);
  if v_counts.used + v_counts.reserved + v_n > v_pkg.sessions_total then
    return jsonb_build_object('ok', false, 'error',
      format('O pacote só tem %s sessão(ões) livre(s) para agendar.',
             greatest(v_pkg.sessions_total - v_counts.used - v_counts.reserved, 0)));
  end if;

  select * into v_service from public.services where id = v_pkg.service_id;

  for v_session in select value from jsonb_array_elements(p->'sessions') loop
    v_date := (v_session->>'date')::date;
    v_start := (v_session->>'startTime')::time;
    if v_date < v_today then
      return jsonb_build_object('ok', false, 'error', format('A data %s já passou.', to_char(v_date, 'DD/MM')));
    end if;
    if v_pkg.expires_on is not null and v_date > v_pkg.expires_on then
      return jsonb_build_object('ok', false, 'error',
        format('O pacote vale até %s: a data %s passa disso.', to_char(v_pkg.expires_on, 'DD/MM'), to_char(v_date, 'DD/MM')));
    end if;
    insert into public.appointments (customer_id, service_id, appointment_date, start_time, end_time, status,
                                     price_cents, professional_id, confirmed_at, customer_package_id)
    values (v_pkg.customer_id, v_pkg.service_id, v_date, v_start,
            v_start + make_interval(mins => v_service.duration_minutes), 'CONFIRMED',
            v_pkg.session_value_cents, v_prof, now(), v_pkg.id)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  return jsonb_build_object('ok', true, 'appointmentIds', to_jsonb(v_ids));
end $$;

-- p_outcome: 'counted' | 'returned'. Também troca a decisão de uma sessão já cancelada.
create or replace function public.cancel_package_session(
  p_appointment_id uuid, p_outcome text, p_no_show boolean default false, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt   record;
  v_pkg    record;
  v_counts record;
begin
  if p_outcome is null or p_outcome not in ('counted', 'returned') then
    return jsonb_build_object('ok', false, 'error', 'Escolha se a sessão conta ou volta para o pacote.');
  end if;
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null or v_appt.customer_package_id is null then
    return jsonb_build_object('ok', false, 'error', 'Sessão de pacote não encontrada.');
  end if;
  select * into v_pkg from public.customer_packages where id = v_appt.customer_package_id for update;

  if v_appt.status = 'CANCELLED' then
    if v_appt.package_outcome = p_outcome then
      return jsonb_build_object('ok', true);
    end if;
    -- 'returned' -> 'counted' ocupa de novo uma vaga que pode já ter virado reposição.
    if p_outcome = 'counted' then
      select * into v_counts from public.package_session_counts(v_pkg.id);
      if v_counts.used + v_counts.reserved >= v_pkg.sessions_total then
        return jsonb_build_object('ok', false, 'error',
          'Não sobra sessão para descontar: a vaga já foi usada numa reposição. Desmarque a reposição antes.');
      end if;
    end if;
    update public.appointments set package_outcome = p_outcome where id = p_appointment_id;
  elsif v_appt.status in ('PENDING', 'CONFIRMED') then
    update public.appointments
      set status = 'CANCELLED',
          cancelled_at = now(),
          package_outcome = p_outcome,
          no_show = coalesce(p_no_show, false),
          admin_notes = case when nullif(trim(p_reason), '') is null then admin_notes
                             else concat_ws(E'\n', admin_notes, trim(p_reason)) end
      where id = p_appointment_id;
  else
    return jsonb_build_object('ok', false, 'error', 'Só dá para desmarcar uma sessão que ainda vai acontecer.');
  end if;

  perform public.refresh_customer_package_status(v_pkg.id);
  return jsonb_build_object('ok', true);
end $$;

-- 0017 com: data futura recusada, sessão já reservada aceita, vaga contando as reservas.
create or replace function public.use_package_session(p_appointment_id uuid, p_customer_package_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt   record;
  v_pkg    record;
  v_counts record;
  v_today  date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null then
    return jsonb_build_object('ok', false, 'error', 'Agendamento não encontrado.');
  end if;
  if v_appt.status <> 'CONFIRMED' then
    return jsonb_build_object('ok', false, 'error', 'Só dá para usar o pacote em um atendimento confirmado.');
  end if;
  if v_appt.appointment_date > v_today then
    return jsonb_build_object('ok', false, 'error',
      'A sessão só é concluída no dia do atendimento. Até lá ela fica reservada no pacote.');
  end if;
  if v_appt.customer_package_id is not null and v_appt.customer_package_id <> p_customer_package_id then
    return jsonb_build_object('ok', false, 'error', 'Este atendimento é de outro pacote.');
  end if;

  select * into v_pkg from public.customer_packages where id = p_customer_package_id for update;
  if v_pkg is null or v_pkg.customer_id <> v_appt.customer_id then
    return jsonb_build_object('ok', false, 'error', 'Pacote não encontrado para esta cliente.');
  end if;
  if v_pkg.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Este pacote não está ativo.');
  end if;
  if v_pkg.service_id <> v_appt.service_id then
    return jsonb_build_object('ok', false, 'error', 'O pacote é de outro serviço.');
  end if;
  if v_pkg.expires_on is not null and v_appt.appointment_date > v_pkg.expires_on then
    return jsonb_build_object('ok', false, 'error', 'O pacote venceu antes da data deste atendimento.');
  end if;

  select * into v_counts from public.package_session_counts(v_pkg.id);
  -- Atendimento avulso precisa de vaga livre; o já reservado já está nas contas.
  if v_appt.customer_package_id is null and v_counts.used + v_counts.reserved >= v_pkg.sessions_total then
    return jsonb_build_object('ok', false, 'error', 'Não sobra sessão livre neste pacote.');
  end if;

  update public.appointments
    set customer_package_id = v_pkg.id, status = 'COMPLETED'
    where id = p_appointment_id;

  perform public.refresh_customer_package_status(v_pkg.id);
  return jsonb_build_object('ok', true, 'remaining', v_pkg.sessions_total - v_counts.used - 1);
end $$;

-- Desfaz o "usar sessão" feito antes do dia do atendimento: volta a ser sessão
-- reservada e devolve ao estoque a receita que o trigger de 0016 baixou (inverso
-- exato, salvo quando o estoque tinha zerado por falta de produto).
create or replace function public.reopen_package_session(p_appointment_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt  record;
  v_line  record;
  v_usage numeric;
  v_units int;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null or v_appt.customer_package_id is null or v_appt.status <> 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'Só dá para reabrir uma sessão de pacote concluída.');
  end if;
  if v_appt.appointment_date <= v_today then
    return jsonb_build_object('ok', false, 'error', 'Esta sessão já aconteceu.');
  end if;
  if exists (select 1 from public.sales where appointment_id = p_appointment_id and status <> 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'Este atendimento tem venda ligada: cancele a venda antes.');
  end if;

  -- O EXCLUDE recusa se outro atendimento ocupou o horário nesse meio-tempo.
  update public.appointments set status = 'CONFIRMED' where id = p_appointment_id;

  for v_line in select product_id, quantity from public.service_products where service_id = v_appt.service_id loop
    select open_usage - v_line.quantity into v_usage from public.products where id = v_line.product_id for update;
    v_units := greatest(ceil(-v_usage), 0)::int;
    update public.products
      set stock_quantity = stock_quantity + v_units,
          open_usage = v_usage + v_units
      where id = v_line.product_id;
  end loop;

  perform public.refresh_customer_package_status(v_appt.customer_package_id);
  return jsonb_build_object('ok', true);
end $$;

-- cancel_sale de 0017: "usada" agora inclui sessão cancelada que contou, e as
-- sessões ainda reservadas são desmarcadas junto (voltam, o pacote some).
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale   record;
  v_entry  record;
  v_pkg    record;
  v_counts record;
  v_today  date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale is null then
    return jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  end if;
  if v_sale.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'Esta venda já foi cancelada.');
  end if;

  select * into v_pkg from public.customer_packages where sale_id = p_sale_id for update;
  if v_pkg is not null then
    select * into v_counts from public.package_session_counts(v_pkg.id);
    if v_counts.used > 0 then
      return jsonb_build_object('ok', false, 'error',
        'Este pacote já tem sessões usadas e não pode ser cancelado. Para devolver parte do valor, lance um ajuste de saída em Saldo e extrato.');
    end if;
    update public.appointments
      set status = 'CANCELLED', cancelled_at = now(), package_outcome = 'returned'
      where customer_package_id = v_pkg.id and status in ('PENDING', 'CONFIRMED');
    update public.customer_packages set status = 'cancelled' where id = v_pkg.id;
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

revoke execute on function public.package_session_counts(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_customer_package_status(uuid) from public, anon, authenticated;
revoke execute on function public.schedule_package_sessions(jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_package_session(uuid, text, boolean, text) from public, anon, authenticated;
revoke execute on function public.use_package_session(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.reopen_package_session(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_sale(uuid, text) from public, anon, authenticated;
