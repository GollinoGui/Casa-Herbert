-- Casa Herbert — ajustes apontados pelo Security Advisor do Supabase.
--
-- O app nunca usa a chave pública (anon): tudo passa pelo servidor com a
-- chave secreta. Então nada que escreve ou expõe dados precisa ficar
-- chamável pela API pública.

-- create_appointment pela API pública permitiria criar agendamentos sem a
-- validação do app (src/lib/booking/validators.ts). get_available_slots é
-- inofensiva, mas também não é usada — fica fechada pelo mesmo motivo.
-- is_admin() continua executável: as policies de RLS chamam ela com o papel
-- de quem faz a consulta.
revoke execute on function public.create_appointment(uuid, date, time, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.get_available_slots(date, uuid) from public, anon, authenticated;

-- View pensada para um client público que não existe; SECURITY DEFINER por padrão.
drop view if exists public.public_settings;

alter function public.fn_touch_updated_at() set search_path = public;
alter function public.fn_check_appointment_not_blocked() set search_path = public;

alter extension btree_gist set schema extensions;
