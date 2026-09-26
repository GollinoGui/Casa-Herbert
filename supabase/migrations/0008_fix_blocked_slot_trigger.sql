-- Casa Herbert — o trigger de 0001_schema.sql nunca bloqueava nada: colunas
-- geradas (appointments.time_range) só são calculadas DEPOIS dos triggers
-- BEFORE, então new.time_range chegava NULL e a comparação nunca era verdadeira.
-- Calcula o intervalo aqui mesmo, a partir das colunas de origem.

create or replace function public.fn_check_appointment_not_blocked()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('PENDING','CONFIRMED') then
    if exists (
      select 1 from public.blocked_slots b
      where b.time_range && tsrange(new.appointment_date + new.start_time, new.appointment_date + new.end_time, '[)')
    ) then
      raise exception 'SLOT_BLOCKED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
