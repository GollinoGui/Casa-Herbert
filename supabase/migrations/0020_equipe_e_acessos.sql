  -- =========================================================
  -- Equipe: quem entra no painel e com qual papel.
  -- 'admin' vê tudo; 'staff' (secretária) só agenda, clientes e lista de espera.
  -- O papel é lido do banco em toda requisição (middleware + requireAdmin/requireStaff),
  -- então trocar o papel ou apagar a linha vale na hora, sem esperar o cookie vencer.
  -- =========================================================

  alter table public.admin_profiles add column email text;

  update public.admin_profiles p
    set email = u.email
    from auth.users u
  where u.id = p.id;

  create unique index admin_profiles_email_key on public.admin_profiles (lower(email));

  -- Sempre sobra um administrador: o último não pode ser rebaixado nem apagado
  -- (inclusive pelo cascade de auth.users, que passa por aqui).
  create function public.keep_last_admin() returns trigger
  language plpgsql set search_path = public as $$
  begin
    if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
      -- Trava as linhas de admin: dois rebaixamentos ao mesmo tempo não zeram a lista.
      perform 1 from admin_profiles where role = 'admin' for update;
      if not exists (select 1 from admin_profiles where role = 'admin' and id <> old.id) then
        raise exception 'LAST_ADMIN' using errcode = 'P0001';
      end if;
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end;
  $$;

  create trigger trg_admin_profiles_keep_last_admin
    before update or delete on public.admin_profiles
    for each row execute function public.keep_last_admin();
