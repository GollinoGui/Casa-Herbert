-- Casa Herbert — lembretes de WhatsApp configuráveis (semiautomáticos).
--
-- Não há envio automático (o cliente não quer custo por mensagem): o painel monta
-- a fila do que já está na hora de mandar, e um clique abre o WhatsApp com a
-- mensagem pronta. Este arquivo só guarda as regras e o que já foi aberto.
--
-- 1. settings.reminder_rules: lista de regras [{id, enabled, timing, template, since}].
--    timing = {type:'on_booking'} | {type:'days_before', days, at:'HH:mm'} (days 0 = no dia)
--           | {type:'hours_before', hours}. "since" (ISO) só importa para on_booking:
--    agendamento confirmado antes de a regra existir não entra na fila.
--    O cálculo da fila fica em src/lib/reminders/queue.ts.
--
-- 2. appointments.messages_sent: {ruleId: timestamp} de quando o painel abriu o
--    WhatsApp com aquela mensagem (não garante que foi enviada). Substitui o
--    reminder_sent_at de 0016, que fica sem uso. Remarcar zera os dois.
--
-- O modo demonstração espelha em src/lib/demo/ (client.ts e rpc.ts).

alter table public.settings add column reminder_rules jsonb;

alter table public.appointments add column messages_sent jsonb not null default '{}'::jsonb;

-- O lembrete de véspera que já existia vira a regra "vespera", com o texto que o salão já usava.
update public.settings
  set reminder_rules = jsonb_build_array(
    jsonb_build_object(
      'id', 'ao-marcar', 'enabled', true, 'since', now(),
      'timing', jsonb_build_object('type', 'on_booking'),
      'template', '{saudacao}, {nome}! Você tem um horário marcado na Casa Herbert para {data}, às {horario} ({servico}). Se precisar remarcar, é só responder por aqui. 🌿'),
    jsonb_build_object(
      'id', 'vespera', 'enabled', true, 'since', now(),
      'timing', jsonb_build_object('type', 'days_before', 'days', 1, 'at', '09:00'),
      'template', coalesce(nullif(message_templates->>'reminder', ''),
        '{saudacao}, {nome}! Passando para lembrar do seu horário na Casa Herbert amanhã, {data}, às {horario} ({servico}). Se precisar remarcar, é só responder por aqui. 🌿')),
    jsonb_build_object(
      'id', 'no-dia', 'enabled', false, 'since', now(),
      'timing', jsonb_build_object('type', 'days_before', 'days', 0, 'at', '08:00'),
      'template', '{saudacao}, {nome}! Hoje é dia do seu horário na Casa Herbert, às {horario} ({servico}). Te esperamos! 🌿')
  )
  where id = 1 and reminder_rules is null;

update public.appointments
  set messages_sent = jsonb_build_object('vespera', reminder_sent_at)
  where reminder_sent_at is not null;

create or replace function public.fn_reset_reminder_on_reschedule() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.appointment_date is distinct from old.appointment_date or new.start_time is distinct from old.start_time then
    new.reminder_sent_at := null;
    new.messages_sent := '{}'::jsonb;
  end if;
  return new;
end $$;

-- Marca/desmarca de uma vez várias regras, sem sobrescrever as que outra pessoa marcou ao mesmo tempo.
create or replace function public.mark_appointment_messages(p_appointment_id uuid, p_rule_ids text[], p_sent boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(array_length(p_rule_ids, 1), 0) = 0 then
    return;
  end if;
  if p_sent then
    update public.appointments
      set messages_sent = messages_sent || (select jsonb_object_agg(r, now()) from unnest(p_rule_ids) r)
      where id = p_appointment_id;
  else
    update public.appointments
      set messages_sent = messages_sent - p_rule_ids
      where id = p_appointment_id;
  end if;
end $$;

revoke execute on function public.mark_appointment_messages(uuid, text[], boolean) from public, anon, authenticated;
