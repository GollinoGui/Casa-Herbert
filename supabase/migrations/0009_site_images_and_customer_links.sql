-- Casa Herbert — fotos gerenciáveis pelo painel e vínculo confiável de clientes.
--
-- Fotos: `media` é a biblioteca (upload no bucket público 'site-images', ou um
-- arquivo que já vem com o site em /public — storage_path null). Cada lugar do
-- site que mostra uma foto aponta para uma linha dela:
--   * site_image_slots  — fotos fixas das páginas (chaves em src/lib/site-images/slots.ts)
--   * services.image_id — foto do card do serviço (carrossel da home)
--   * gallery.media_id  — fotos da seção de resultados
--
-- Clientes: o mesmo WhatsApp com ou sem o DDI 55 virava dois clientes. O
-- telefone normalizado passa a ser o nacional (sem 55), igual a
-- canonicalPhone() em src/lib/utils/phone.ts.

-- =========================================================
-- Storage
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','image/gif'])
on conflict (id) do nothing;

-- =========================================================
-- media (biblioteca)
-- =========================================================
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  storage_path text unique, -- null = arquivo estático do próprio site (/public), não apaga nada no Storage
  alt          text,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
create index idx_media_created_at on public.media (created_at desc);

create table public.site_image_slots (
  slot_key        text primary key,
  media_id        uuid not null references public.media(id) on delete cascade,
  object_position text, -- 'center' | 'top' | 'bottom'; null = center
  updated_at      timestamptz not null default now()
);

create trigger trg_site_image_slots_touch_updated_at
  before update on public.site_image_slots
  for each row execute function public.fn_touch_updated_at();

alter table public.services
  add column image_id       uuid references public.media(id) on delete set null,
  add column image_position text,
  add column show_on_home   boolean not null default true;

alter table public.gallery
  add column media_id uuid references public.media(id) on delete set null;

alter table public.media            enable row level security;
alter table public.site_image_slots enable row level security;
alter table public.media            force row level security;
alter table public.site_image_slots force row level security;

create policy admin_full_access on public.media
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.site_image_slots
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- Fotos que já estavam fixas no código entram na biblioteca, nos mesmos lugares
-- =========================================================
with seeded as (
  insert into public.media (url, alt) values
    ('/images/hero-fachada.png',                'Fachada da Casa Herbert em Orlândia'),
    ('/images/servicos/terapia-capilar.jpg',    'Sessão de terapia capilar na Casa Herbert'),
    ('/images/servicos/fotobiomodulacao.jpg',   'Sessão de fotobiomodulação'),
    ('/images/servicos/velaterapia.jpg',        'Velaterapia')
  returning id, url
)
insert into public.site_image_slots (slot_key, media_id)
select 'home.hero', id from seeded where url = '/images/hero-fachada.png'
union all
select 'home.hero-thumb', id from seeded where url = '/images/servicos/terapia-capilar.jpg';

update public.services s set image_id = m.id, image_position = v.pos
from (values
  ('terapia-capilar',  '/images/servicos/terapia-capilar.jpg',  null),
  ('fotobiomodulacao', '/images/servicos/fotobiomodulacao.jpg', null),
  ('velaterapia',      '/images/servicos/velaterapia.jpg',      'bottom')
) as v(slug, url, pos)
join public.media m on m.url = v.url
where s.slug = v.slug;

-- O carrossel mostrava só os 6 primeiros serviços; mantém o que já aparecia.
update public.services set show_on_home = false where display_order > 6;

-- =========================================================
-- Telefone canônico
-- =========================================================
create function public.canonical_phone(p_phone text) returns text
language sql immutable parallel safe set search_path = public as $$
  select case
    when length(d) in (12, 13) and d like '55%' then substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) t;
$$;

alter table public.customers
  alter column normalized_phone set expression as (public.canonical_phone(phone));

-- =========================================================
-- create_appointment: mesma regra de cliente do app (findOrCreateCustomer):
-- casa pelo telefone canônico e NÃO sobrescreve o nome de um cliente já
-- cadastrado — o nome digitado no site não pode renomear a ficha do painel.
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

  select id into v_customer_id from public.customers
    where normalized_phone = public.canonical_phone(p_customer_phone);
  if v_customer_id is null then
    insert into public.customers (full_name, phone, email)
    values (p_customer_name, p_customer_phone, nullif(p_customer_email, ''))
    returning id into v_customer_id;
  else
    update public.customers
      set email = coalesce(email, nullif(p_customer_email, ''))
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

-- create or replace mantém o grant existente; reforça o revoke de 0007_security_hardening.sql.
revoke execute on function public.create_appointment(uuid, date, time, text, text, text, text) from public, anon, authenticated;
