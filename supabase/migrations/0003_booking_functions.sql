-- Casa Herbert — funções de disponibilidade e criação de agendamento.
-- Espelham exatamente src/lib/booking/engine.ts e src/lib/data/availability.ts
-- do protótipo (mesma árvore de decisão, mesmos motivos de indisponibilidade).
-- SECURITY DEFINER: só assim `anon` consegue calcular disponibilidade e criar
-- um agendamento sem ter select direto em appointments/customers (ver
-- 0002_rls_policies.sql).

create or replace function public.get_available_slots(p_date date, p_service_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_service  record;
  v_today    date;
  v_now_time time;
  v_slots    jsonb := '[]'::jsonb;
  w          record;
  candidate_start time;
  candidate_end   time;
  has_special boolean;
  has_business boolean;
begin
  select * into v_settings from public.settings where id = 1;
  select * into v_service from public.services where id = p_service_id and is_active;

  if v_service is null then
    return jsonb_build_object('bookable', false, 'reason', 'CLOSED', 'slots', '[]'::jsonb);
  end if;

  v_today    := (now() at time zone v_settings.salon_timezone)::date;
  v_now_time := (now() at time zone v_settings.salon_timezone)::time;

  if p_date < v_today then
    return jsonb_build_object('bookable', false, 'reason', 'PAST_DATE', 'slots', '[]'::jsonb);
  end if;

  if (p_date - v_today) < v_settings.min_advance_days then
    return jsonb_build_object('bookable', false, 'reason', 'TOO_SOON', 'slots', '[]'::jsonb);
  end if;

  -- bloqueio de dia inteiro fecha a data completamente
  if exists (
    select 1 from public.blocked_slots b
    where b.is_full_day and p_date between b.start_date and b.end_date
  ) then
    return jsonb_build_object('bookable', false, 'reason', 'CLOSED', 'slots', '[]'::jsonb);
  end if;

  select exists(select 1 from public.special_hours sh where sh.special_date = p_date) into has_special;

  if has_special then
    if exists (select 1 from public.special_hours sh where sh.special_date = p_date and sh.is_closed) then
      return jsonb_build_object('bookable', false, 'reason', 'CLOSED', 'slots', '[]'::jsonb);
    end if;

    for w in
      select shr.start_time, shr.end_time
      from public.special_hours sh
      join public.special_hours_ranges shr on shr.special_hours_id = sh.id
      where sh.special_date = p_date
      order by shr.start_time
    loop
      candidate_start := w.start_time;
      while candidate_start + (v_service.duration_minutes || ' minutes')::interval <= w.end_time loop
        candidate_end := candidate_start + (v_service.duration_minutes || ' minutes')::interval;
        if not (p_date = v_today and candidate_start <= v_now_time) then
          if not exists (
            select 1 from public.appointments a
            where a.appointment_date = p_date
              and a.status in ('PENDING','CONFIRMED')
              and (candidate_start, candidate_end) overlaps (
                    a.start_time - (v_settings.buffer_minutes || ' minutes')::interval,
                    a.end_time + (v_settings.buffer_minutes || ' minutes')::interval)
          ) and not exists (
            select 1 from public.blocked_slots b
            where not b.is_full_day
              and p_date between b.start_date and b.end_date
              and (candidate_start, candidate_end) overlaps (b.start_time, b.end_time)
          ) then
            v_slots := v_slots || jsonb_build_object(
              'startTime', to_char(candidate_start, 'HH24:MI'),
              'endTime', to_char(candidate_end, 'HH24:MI'));
          end if;
        end if;
        candidate_start := candidate_start + (v_settings.slot_step_minutes || ' minutes')::interval;
      end loop;
    end loop;
  else
    for w in
      select bh.start_time, bh.end_time
      from public.business_hours bh
      where bh.weekday = extract(dow from p_date) and bh.is_active
      order by bh.start_time
    loop
      candidate_start := w.start_time;
      while candidate_start + (v_service.duration_minutes || ' minutes')::interval <= w.end_time loop
        candidate_end := candidate_start + (v_service.duration_minutes || ' minutes')::interval;
        if not (p_date = v_today and candidate_start <= v_now_time) then
          if not exists (
            select 1 from public.appointments a
            where a.appointment_date = p_date
              and a.status in ('PENDING','CONFIRMED')
              and (candidate_start, candidate_end) overlaps (
                    a.start_time - (v_settings.buffer_minutes || ' minutes')::interval,
                    a.end_time + (v_settings.buffer_minutes || ' minutes')::interval)
          ) and not exists (
            select 1 from public.blocked_slots b
            where not b.is_full_day
              and p_date between b.start_date and b.end_date
              and (candidate_start, candidate_end) overlaps (b.start_time, b.end_time)
          ) then
            v_slots := v_slots || jsonb_build_object(
              'startTime', to_char(candidate_start, 'HH24:MI'),
              'endTime', to_char(candidate_end, 'HH24:MI'));
          end if;
        end if;
        candidate_start := candidate_start + (v_settings.slot_step_minutes || ' minutes')::interval;
      end loop;
    end loop;
  end if;

  if jsonb_array_length(v_slots) = 0 then
    select exists(
      select 1 from public.business_hours bh
      where bh.weekday = extract(dow from p_date) and bh.is_active
    ) into has_business;

    if not has_special and not has_business then
      return jsonb_build_object('bookable', false, 'reason', 'CLOSED', 'slots', '[]'::jsonb);
    end if;
    return jsonb_build_object('bookable', false, 'reason', 'FULLY_BOOKED', 'slots', '[]'::jsonb);
  end if;

  return jsonb_build_object('bookable', true, 'slots', v_slots);
end;
$$;

grant execute on function public.get_available_slots(date, uuid) to anon, authenticated;


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

  -- serializa todo mundo escrevendo nessa data (appointments E blocked_slots)
  -- para fechar a janela de corrida entre as duas tabelas; o EXCLUDE em
  -- appointments cobre a concorrência dentro da própria tabela.
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
      customer_id, service_id, appointment_date, start_time, end_time, status, customer_notes
    ) values (
      v_customer_id, p_service_id, p_date, p_start_time, v_end_time, 'PENDING', nullif(p_notes, '')
    ) returning id into v_appointment_id;
  exception when exclusion_violation then
    -- corrida perdida: outra transação gravou esse horário entre a checagem e o insert
    return jsonb_build_object('ok', false, 'error', 'SLOT_NO_LONGER_AVAILABLE');
  end;

  return jsonb_build_object('ok', true, 'appointmentId', v_appointment_id);
end;
$$;

grant execute on function public.create_appointment(uuid, date, time, text, text, text, text) to anon, authenticated;


-- Job agendado (pg_cron ou Vercel Cron chamando uma route handler que roda isso):
-- expira PENDING sem confirmação após settings.pending_expiry_hours, sem criar
-- um novo status — vira CANCELLED com nota (ver documentação.md > Casos de conflito).
create or replace function public.expire_pending_appointments() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointments a
  set status = 'CANCELLED',
      cancelled_at = now(),
      admin_notes = trim(both E'\n' from coalesce(a.admin_notes || E'\n', '') ||
        'Auto-expirado: sem confirmação em ' || s.pending_expiry_hours || 'h.')
  from public.settings s
  where s.id = 1
    and a.status = 'PENDING'
    and a.created_at < now() - (s.pending_expiry_hours || ' hours')::interval;
end;
$$;
