-- Casa Herbert — Row Level Security. `anon` nunca acessa diretamente
-- appointments/customers/blocked_slots/settings — só via as funções
-- SECURITY DEFINER de 0003_booking_functions.sql, que nunca vazam PII de
-- outros clientes.

alter table public.services            enable row level security;
alter table public.customers           enable row level security;
alter table public.business_hours      enable row level security;
alter table public.special_hours       enable row level security;
alter table public.special_hours_ranges enable row level security;
alter table public.blocked_slots       enable row level security;
alter table public.appointments        enable row level security;
alter table public.settings            enable row level security;
alter table public.testimonials        enable row level security;
alter table public.gallery             enable row level security;
alter table public.admin_profiles      enable row level security;

alter table public.services            force row level security;
alter table public.customers           force row level security;
alter table public.business_hours      force row level security;
alter table public.special_hours       force row level security;
alter table public.special_hours_ranges force row level security;
alter table public.blocked_slots       force row level security;
alter table public.appointments        force row level security;
alter table public.settings            force row level security;
alter table public.testimonials        force row level security;
alter table public.gallery             force row level security;
alter table public.admin_profiles      force row level security;

-- ---------- Leitura pública (anon) ----------
create policy anon_read_active_services on public.services
  for select using (is_active);

create policy anon_read_published_testimonials on public.testimonials
  for select using (is_published);

create policy anon_read_published_gallery on public.gallery
  for select using (is_published);

create policy anon_read_business_hours on public.business_hours
  for select using (is_active);

create policy anon_read_special_hours on public.special_hours
  for select using (true);

create policy anon_read_special_hours_ranges on public.special_hours_ranges
  for select using (true);

-- appointments/customers/blocked_slots/settings: SEM policy de select para
-- anon — a ausência de policy nega o acesso por padrão com RLS habilitado.

-- ---------- Acesso total do admin (autenticado + is_admin()) ----------
create policy admin_full_access on public.services
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.customers
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.business_hours
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.special_hours
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.special_hours_ranges
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.blocked_slots
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.appointments
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.settings
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.testimonials
  for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.gallery
  for all using (is_admin()) with check (is_admin());

create policy admin_read_own_profile on public.admin_profiles
  for select using (id = auth.uid());

-- `public_settings` é uma view (não RLS diretamente) que expõe só campos não
-- sensíveis; conceder select a anon nela:
grant select on public.public_settings to anon, authenticated;
grant select on public.services, public.testimonials, public.gallery,
  public.business_hours, public.special_hours, public.special_hours_ranges
  to anon, authenticated;

-- Nenhuma grant direta de appointments/customers/blocked_slots/settings para
-- anon — só através das funções SECURITY DEFINER (grant de EXECUTE em
-- 0003_booking_functions.sql).
