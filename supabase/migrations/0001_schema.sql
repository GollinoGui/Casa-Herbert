-- Casa Herbert — schema principal (fase de produção; ainda NÃO aplicado ao
-- protótipo atual, que roda sobre dados mockados em arquivo — ver
-- documentação.md > Roadmap). Projetado para Postgres/Supabase.

-- =========================================================
-- Extensões
-- =========================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist; -- necessária para o EXCLUDE abaixo

-- =========================================================
-- Enums
-- =========================================================
create type appointment_status as enum
  ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED');

create type block_reason as enum
  ('personal','vacation','holiday','training','maintenance','other');

-- =========================================================
-- admin_profiles (auth.users -> role)
-- =========================================================
create table public.admin_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'admin' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_profiles where id = auth.uid());
$$;

-- =========================================================
-- services
-- =========================================================
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  duration_minutes int  not null check (duration_minutes > 0 and duration_minutes % 5 = 0),
  price_cents      int  check (price_cents >= 0),        -- null = "sob consulta"
  is_active        boolean not null default true,        -- soft-delete apenas (histórico via FK)
  display_order    int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_services_active on public.services (is_active, display_order);

-- =========================================================
-- customers
-- =========================================================
create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  phone            text not null,
  normalized_phone text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  email            text,
  notes            text,               -- notas internas do admin — nunca dados médicos
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index uq_customers_normalized_phone on public.customers (normalized_phone);

-- =========================================================
-- business_hours (modelo semanal; N ranges por dia; 0 linhas = fechado)
-- =========================================================
create table public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6), -- 0=domingo..6=sábado (EXTRACT(DOW))
  start_time time not null,
  end_time   time not null,
  is_active  boolean not null default true,
  constraint chk_business_hours_range check (end_time > start_time),
  exclude using gist (
    weekday with =,
    tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) with &&
  ) where (is_active)
);
create index idx_business_hours_weekday on public.business_hours (weekday) where is_active;

-- Seed padrão: terça(2)-sábado(6) 09:00-11:00 e 14:00-19:00. Domingo(0)/segunda(1): sem linhas.

-- =========================================================
-- special_hours (override por data — prioridade sobre business_hours)
-- =========================================================
create table public.special_hours (
  id           uuid primary key default gen_random_uuid(),
  special_date date not null,
  is_closed    boolean not null default false,
  reason       text,
  created_at   timestamptz not null default now()
);
create unique index uq_special_hours_date on public.special_hours (special_date);

create table public.special_hours_ranges (
  id                uuid primary key default gen_random_uuid(),
  special_hours_id  uuid not null references public.special_hours(id) on delete cascade,
  start_time        time not null,
  end_time          time not null,
  constraint chk_special_range check (end_time > start_time)
);
create index idx_special_hours_ranges_parent on public.special_hours_ranges (special_hours_id);
-- Invariante de aplicação (garantida pela função de upsert, não por constraint física):
-- se special_hours.is_closed = true, não deve ter nenhuma linha filha em special_hours_ranges.

-- =========================================================
-- blocked_slots (bloqueio manual do admin: horário específico, parte do dia,
-- dia inteiro ou vários dias)
-- =========================================================
create table public.blocked_slots (
  id           uuid primary key default gen_random_uuid(),
  start_date   date not null,
  end_date     date not null, -- o app sempre envia; Postgres não aceita default referenciando outra coluna
  is_full_day  boolean not null default true,
  start_time   time,  -- obrigatório apenas se is_full_day = false
  end_time     time,  -- obrigatório apenas se is_full_day = false
  reason       block_reason not null,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint chk_block_dates check (end_date >= start_date),
  constraint chk_block_partial_single_day check (is_full_day or start_date = end_date),
  constraint chk_block_partial_times check (
    (is_full_day and start_time is null and end_time is null)
    or (not is_full_day and start_time is not null and end_time is not null and end_time > start_time)
  ),
  time_range tsrange generated always as (
    case when is_full_day
      then tsrange(start_date::timestamp, (end_date + 1)::timestamp, '[)')
      else tsrange(start_date + start_time, start_date + end_time, '[)')
    end
  ) stored
);
create index idx_blocked_slots_daterange on public.blocked_slots using gist (time_range);
-- Bloqueios sobrepostos entre si não são um bug de correção (não representam
-- disputa entre clientes), então não há EXCLUDE aqui — só o índice GiST para
-- consultas rápidas de intervalo.

-- =========================================================
-- appointments (tabela central — garantia de concorrência vive aqui)
-- =========================================================
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id),
  service_id        uuid not null references public.services(id),
  appointment_date  date not null,
  start_time        time not null,
  end_time          time not null,
  status            appointment_status not null default 'PENDING',
  customer_notes    text,
  admin_notes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  confirmed_at      timestamptz,
  cancelled_at      timestamptz,   -- também usado para REJECTED
  constraint chk_appt_time_order check (end_time > start_time),
  time_range tsrange generated always as (
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)')
  ) stored,
  -- A garantia real contra duplo agendamento, mesmo sob concorrência:
  exclude using gist (
    appointment_date with =,
    time_range with &&
  ) where (status in ('PENDING','CONFIRMED'))
);
create index idx_appointments_date_status on public.appointments (appointment_date, status);
create index idx_appointments_customer on public.appointments (customer_id);
create index idx_appointments_service on public.appointments (service_id);

create or replace function public.fn_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_appointments_touch_updated_at
  before update on public.appointments
  for each row execute function public.fn_touch_updated_at();

create trigger trg_services_touch_updated_at
  before update on public.services
  for each row execute function public.fn_touch_updated_at();

create trigger trg_customers_touch_updated_at
  before update on public.customers
  for each row execute function public.fn_touch_updated_at();

-- Guarda cruzada: um agendamento não pode ser criado/confirmado dentro de um bloqueio manual.
create or replace function public.fn_check_appointment_not_blocked()
returns trigger language plpgsql as $$
begin
  if new.status in ('PENDING','CONFIRMED') then
    if exists (select 1 from public.blocked_slots b where b.time_range && new.time_range) then
      raise exception 'SLOT_BLOCKED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger trg_check_appointment_not_blocked
  before insert or update on public.appointments
  for each row execute function public.fn_check_appointment_not_blocked();

-- =========================================================
-- settings (linha única / singleton)
-- =========================================================
create table public.settings (
  id                        smallint primary key default 1 check (id = 1),
  min_advance_days          int  not null default 1  check (min_advance_days >= 0),
  buffer_minutes            int  not null default 0  check (buffer_minutes >= 0),
  slot_step_minutes         int  not null default 15 check (slot_step_minutes > 0),
  pending_expiry_hours      int  not null default 48 check (pending_expiry_hours > 0),
  default_duration_minutes  int  not null default 60,
  whatsapp_number           text not null,
  salon_address             text,
  salon_timezone            text not null default 'America/Sao_Paulo',
  message_templates         jsonb not null default '{}'::jsonb, -- {confirmed, rejected, cancelled}
  updated_at                timestamptz not null default now()
);

create view public.public_settings as
  select min_advance_days, buffer_minutes, slot_step_minutes,
         whatsapp_number, salon_address, salon_timezone
  from public.settings where id = 1;

-- =========================================================
-- testimonials / gallery
-- =========================================================
create table public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating        smallint check (rating between 1 and 5),
  content       text not null,
  is_published  boolean not null default false,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create table public.gallery (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,
  storage_path  text not null,   -- caminho no bucket 'gallery' do Supabase Storage
  caption       text,
  category      text,
  is_published  boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);
