-- Casa Herbert — dados iniciais (horários padrão, configurações, serviços reais).
-- Idempotente: pode rodar mais de uma vez sem duplicar.

insert into public.settings (
  id, min_advance_days, buffer_minutes, slot_step_minutes, pending_expiry_hours,
  default_duration_minutes, whatsapp_number, salon_address, salon_timezone, message_templates
) values (
  1, 1, 0, 15, 48, 60,
  '5516991479968',
  'Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000',
  'America/Sao_Paulo',
  jsonb_build_object(
    'confirmed', E'Olá, {nome}! Tudo bem?\n\nSeu agendamento na Casa Herbert foi confirmado. 🌿\n\nServiço: {servico}\nData: {data}\nHorário: {horario}\n\nCasa Herbert — Embelezamento e Saúde Capilar\nOrlândia/SP',
    'rejected', E'Olá, {nome}. Recebemos sua solicitação de agendamento para {data} às {horario}.\n\nInfelizmente esse horário não poderá ser confirmado.\n\nEntre em contato conosco para escolhermos outro horário disponível. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar',
    'cancelled', E'Olá, {nome}. Seu agendamento na Casa Herbert para {data} às {horario} foi cancelado.\n\nEntre em contato conosco para reagendar quando for melhor para você. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar'
  )
)
on conflict (id) do nothing;

-- Terça(2) a sábado(6): 09:00-11:00 e 14:00-19:00. Domingo(0)/segunda(1): sem linhas (fechado).
insert into public.business_hours (weekday, start_time, end_time)
select weekday, '09:00', '11:00'
from unnest(array[2,3,4,5,6]) as weekday
where not exists (select 1 from public.business_hours);

insert into public.business_hours (weekday, start_time, end_time)
select weekday, '14:00', '19:00'
from unnest(array[2,3,4,5,6]) as weekday
where not exists (
  select 1 from public.business_hours where start_time = '14:00'
);

insert into public.services (name, slug, description, duration_minutes, display_order)
values
  ('Avaliação Capilar', 'avaliacao-capilar', 'Conversa e observação individual do couro cabeludo e dos fios para entender a necessidade de cada pessoa antes de qualquer protocolo.', 30, 1),
  ('Tricoscopia', 'tricoscopia', 'Exame de observação capilar com equipamento próprio, usado para acompanhar a saúde do couro cabeludo ao longo do cuidado.', 30, 2),
  ('Terapia Capilar', 'terapia-capilar', 'Protocolo personalizado de cuidado para o couro cabeludo, pensado a partir da avaliação individual de cada cliente.', 60, 3),
  ('Fotobiomodulação', 'fotobiomodulacao', 'Sessão de luz de baixa intensidade voltada ao acompanhamento da saúde capilar e do bem-estar do couro cabeludo.', 45, 4),
  ('Velaterapia', 'velaterapia', 'Técnica de cuidado e finalização dos fios, indicada dentro do protocolo individual de cada cliente.', 60, 5),
  ('Corte Feminino', 'corte-feminino', 'Corte personalizado, sempre alinhado ao momento de saúde capilar de cada cliente.', 60, 6),
  ('Corte Masculino', 'corte-masculino', 'Corte masculino com atenção aos cuidados do couro cabeludo.', 30, 7)
on conflict (slug) do nothing;
