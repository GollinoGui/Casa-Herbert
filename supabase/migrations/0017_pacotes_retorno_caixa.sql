-- Casa Herbert — retorno por serviço, pacotes de sessões, fechamento de caixa,
-- lista de espera e acompanhamento capilar (evolução com fotos).
--
-- 1. services.return_days: "voltar em X dias". O Início lista quem está na hora
--    do retorno (último atendimento concluído daquele serviço + X dias) e ainda
--    não tem nada marcado. null = serviço sem retorno sugerido.
--
-- 2. Pacotes. service_packages é o catálogo (ex.: 6 sessões de Terapia Capilar).
--    A venda passa por register_sale (item avulso "Pacote: ..."), então caixa,
--    pagamento parcial e contas a receber funcionam como em qualquer venda: o
--    dinheiro entra uma vez, na venda. customer_packages é o pacote da cliente,
--    com o valor de cada sessão fixado no momento da venda (o preço do serviço
--    muda depois). Usar uma sessão = concluir o atendimento marcando
--    appointments.customer_package_id, sem lançamento no caixa. Sessões usadas
--    = atendimentos concluídos ligados ao pacote (contagem, não contador).
--    Venda de pacote com sessão já usada não pode ser cancelada: o cancelamento
--    estornaria no caixa um serviço já prestado.
--
-- 3. Fechamento de caixa (gaveta = só dinheiro em espécie). Cada fechamento parte
--    do que foi contado no anterior, menos o que foi retirado para o banco, e soma
--    os lançamentos em dinheiro criados depois dele (created_at, não entry_date:
--    um recebimento lançado com data antiga não mexe num fechamento já feito).
--    O primeiro fechamento usa o fundo de troco informado e os lançamentos em
--    dinheiro do próprio dia. Lançar a diferença no livro-caixa é opcional. A
--    retirada para o banco não é lançamento: o saldo é um só (gaveta + banco).
--
-- 4. waitlist: quem queria um dia cheio. O sino avisa quando aparece vaga.
--
-- 5. Acompanhamento capilar: registros por data, com anotação e fotos. As fotos
--    ficam no bucket PRIVADO customer-photos (nunca no site-images, que é
--    público) e só são vistas por URL assinada gerada no servidor.
--    customers.photo_consent_at registra a autorização da cliente para fotos.
--
-- O modo demonstração espelha as RPCs em src/lib/demo/rpc.ts.

-- =========================================================
-- 1. Retorno por serviço
-- =========================================================
alter table public.services
  add column return_days int check (return_days is null or return_days between 1 and 730);

-- =========================================================
-- 2. Pacotes de sessões
-- =========================================================
create table public.service_packages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 80),
  service_id  uuid not null references public.services(id),
  sessions    int  not null check (sessions between 2 and 100),
  price_cents int  not null check (price_cents >= 0),
  valid_days  int  check (valid_days is null or valid_days between 1 and 1095),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create type customer_package_status as enum ('active', 'finished', 'cancelled');

create table public.customer_packages (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers(id),
  service_id          uuid not null references public.services(id),
  package_id          uuid references public.service_packages(id) on delete set null,
  name                text not null,
  sessions_total      int  not null check (sessions_total > 0),
  session_value_cents int  not null check (session_value_cents >= 0),
  sale_id             uuid not null unique references public.sales(id),
  status              customer_package_status not null default 'active',
  expires_on          date,
  created_at          timestamptz not null default now()
);
create index idx_customer_packages_customer on public.customer_packages (customer_id);

alter table public.appointments
  add column customer_package_id uuid references public.customer_packages(id);
create index idx_appointments_customer_package on public.appointments (customer_package_id)
  where customer_package_id is not null;

-- p: {packageId, customerId, saleDate?, dueDate?, discountCents?, notes?, payment?: {amountCents, method, receiptTxid?}}
create or replace function public.sell_package(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pkg      record;
  v_customer uuid := nullif(p->>'customerId', '')::uuid;
  v_discount int  := coalesce((p->>'discountCents')::int, 0);
  v_date     date := coalesce(nullif(p->>'saleDate', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_result   jsonb;
  v_sale_id  uuid;
  v_cp_id    uuid;
begin
  if v_customer is null or not exists (select 1 from public.customers where id = v_customer) then
    return jsonb_build_object('ok', false, 'error', 'Escolha a cliente do pacote.');
  end if;
  select * into v_pkg from public.service_packages where id = nullif(p->>'packageId', '')::uuid;
  if v_pkg is null or not v_pkg.is_active then
    return jsonb_build_object('ok', false, 'error', 'Pacote não encontrado.');
  end if;

  v_result := public.register_sale(jsonb_strip_nulls(jsonb_build_object(
    'customerId', v_customer,
    'saleDate', v_date,
    'dueDate', nullif(p->>'dueDate', ''),
    'discountCents', v_discount,
    'notes', nullif(trim(p->>'notes'), ''),
    'items', jsonb_build_array(jsonb_build_object(
      'type', 'custom',
      'description', format('Pacote: %s (%s sessões)', v_pkg.name, v_pkg.sessions),
      'unitPriceCents', v_pkg.price_cents)),
    'payment', p->'payment'
  )));
  if not coalesce((v_result->>'ok')::boolean, false) then
    return v_result;
  end if;
  v_sale_id := (v_result->>'saleId')::uuid;

  insert into public.customer_packages (customer_id, service_id, package_id, name, sessions_total,
                                        session_value_cents, sale_id, expires_on)
  values (v_customer, v_pkg.service_id, v_pkg.id, v_pkg.name, v_pkg.sessions,
          round((v_pkg.price_cents - v_discount)::numeric / v_pkg.sessions)::int, v_sale_id,
          case when v_pkg.valid_days is not null then v_date + v_pkg.valid_days end)
  returning id into v_cp_id;

  return jsonb_build_object('ok', true, 'saleId', v_sale_id, 'customerPackageId', v_cp_id);
end $$;

-- Conclui o atendimento usando uma sessão do pacote. Não lança nada no caixa
-- (o dinheiro entrou na venda do pacote); o trigger de consumo baixa a receita.
create or replace function public.use_package_session(p_appointment_id uuid, p_customer_package_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt record;
  v_pkg  record;
  v_used int;
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null then
    return jsonb_build_object('ok', false, 'error', 'Agendamento não encontrado.');
  end if;
  if v_appt.status <> 'CONFIRMED' then
    return jsonb_build_object('ok', false, 'error', 'Só dá para usar o pacote em um atendimento confirmado.');
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

  select count(*) into v_used from public.appointments
    where customer_package_id = v_pkg.id and status = 'COMPLETED';
  if v_used >= v_pkg.sessions_total then
    return jsonb_build_object('ok', false, 'error', 'Todas as sessões deste pacote já foram usadas.');
  end if;

  update public.appointments
    set customer_package_id = v_pkg.id, status = 'COMPLETED'
    where id = p_appointment_id;

  if v_used + 1 >= v_pkg.sessions_total then
    update public.customer_packages set status = 'finished' where id = v_pkg.id;
  end if;

  return jsonb_build_object('ok', true, 'remaining', v_pkg.sessions_total - v_used - 1);
end $$;

-- cancel_sale de 0012 com a regra dos pacotes por cima.
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale  record;
  v_entry record;
  v_pkg   record;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
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
    if exists (select 1 from public.appointments where customer_package_id = v_pkg.id and status = 'COMPLETED') then
      return jsonb_build_object('ok', false, 'error',
        'Este pacote já tem sessões usadas e não pode ser cancelado. Para devolver parte do valor, lance um ajuste de saída em Saldo e extrato.');
    end if;
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

-- =========================================================
-- 3. Fechamento de caixa
-- =========================================================
create table public.cash_closings (
  id                  uuid primary key default gen_random_uuid(),
  closing_date        date not null,
  opening_cents       int  not null,
  cash_in_cents       int  not null check (cash_in_cents >= 0),
  cash_out_cents      int  not null check (cash_out_cents >= 0),
  expected_cents      int  not null,
  counted_cents       int  not null check (counted_cents >= 0),
  withdrawn_cents     int  not null default 0 check (withdrawn_cents >= 0 and withdrawn_cents <= counted_cents),
  difference_cents    int  not null,
  adjustment_entry_id uuid references public.cash_entries(id),
  notes               text,
  created_at          timestamptz not null default now()
);
create index idx_cash_closings_created on public.cash_closings (created_at desc);

-- Prévia do que a gaveta deveria ter agora (a tela mostra antes de contar).
-- p_opening_cents só vale para o primeiro fechamento.
create or replace function public.cash_drawer_preview(p_opening_cents int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_prev    record;
  v_today   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_opening int;
  v_in      int;
  v_out     int;
begin
  select * into v_prev from public.cash_closings order by created_at desc limit 1;
  v_opening := case when v_prev is null then greatest(coalesce(p_opening_cents, 0), 0)
                    else v_prev.counted_cents - v_prev.withdrawn_cents end;
  select coalesce(sum(amount_cents) filter (where direction = 'in'), 0),
         coalesce(sum(amount_cents) filter (where direction = 'out'), 0)
    into v_in, v_out
    from public.cash_entries
    where payment_method = 'dinheiro'
      and (case when v_prev is null then entry_date = v_today else created_at > v_prev.created_at end);
  return jsonb_build_object(
    'firstClosing', v_prev is null,
    'previousAt', v_prev.created_at,
    'openingCents', v_opening,
    'cashInCents', v_in,
    'cashOutCents', v_out,
    'expectedCents', v_opening + v_in - v_out
  );
end $$;

-- p: {countedCents, withdrawnCents?, openingCents? (só no primeiro), postDifference: bool, notes?}
create or replace function public.close_cash_drawer(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_preview  jsonb;
  v_today    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_counted  int  := (p->>'countedCents')::int;
  v_withdraw int  := coalesce((p->>'withdrawnCents')::int, 0);
  v_expected int;
  v_diff     int;
  v_entry_id uuid;
  v_id       uuid;
begin
  perform pg_advisory_xact_lock(hashtext('cash_closing'));
  if v_counted is null or v_counted < 0 then
    return jsonb_build_object('ok', false, 'error', 'Informe quanto tem na gaveta.');
  end if;
  if v_withdraw < 0 or v_withdraw > v_counted then
    return jsonb_build_object('ok', false, 'error', 'A retirada não pode passar do que foi contado.');
  end if;

  v_preview := public.cash_drawer_preview(coalesce((p->>'openingCents')::int, 0));
  v_expected := (v_preview->>'expectedCents')::int;
  v_diff := v_counted - v_expected;

  if coalesce((p->>'postDifference')::boolean, false) and v_diff <> 0 then
    insert into public.cash_entries (entry_date, direction, amount_cents, category, description, payment_method)
    values (v_today, case when v_diff > 0 then 'in' else 'out' end::cash_direction, abs(v_diff), 'ajuste',
            case when v_diff > 0 then 'Sobra no fechamento do caixa' else 'Falta no fechamento do caixa' end, 'dinheiro')
    returning id into v_entry_id;
  end if;

  insert into public.cash_closings (closing_date, opening_cents, cash_in_cents, cash_out_cents, expected_cents,
                                    counted_cents, withdrawn_cents, difference_cents, adjustment_entry_id, notes)
  values (v_today, (v_preview->>'openingCents')::int, (v_preview->>'cashInCents')::int, (v_preview->>'cashOutCents')::int,
          v_expected, v_counted, v_withdraw, v_diff, v_entry_id, nullif(trim(p->>'notes'), ''))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'closingId', v_id, 'differenceCents', v_diff);
end $$;

-- =========================================================
-- 4. Lista de espera
-- =========================================================
create type waitlist_status as enum ('waiting', 'scheduled', 'cancelled');

create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  service_id   uuid references public.services(id) on delete set null,
  desired_date date not null,
  period       text not null default 'any' check (period in ('any', 'morning', 'afternoon')),
  notes        text check (notes is null or length(notes) <= 500),
  status       waitlist_status not null default 'waiting',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_waitlist_waiting on public.waitlist (desired_date) where status = 'waiting';

create trigger trg_waitlist_touch_updated_at
  before update on public.waitlist
  for each row execute function public.fn_touch_updated_at();

-- =========================================================
-- 5. Acompanhamento capilar
-- =========================================================
alter table public.customers add column photo_consent_at timestamptz;

create table public.customer_records (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  record_date    date not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  notes          text check (notes is null or length(notes) <= 4000),
  created_at     timestamptz not null default now()
);
create index idx_customer_records_customer on public.customer_records (customer_id, record_date desc);

create table public.customer_record_photos (
  id           uuid primary key default gen_random_uuid(),
  record_id    uuid not null references public.customer_records(id) on delete cascade,
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);
create index idx_customer_record_photos_record on public.customer_record_photos (record_id);

insert into storage.buckets (id, name, public)
values ('customer-photos', 'customer-photos', false)
on conflict (id) do update set public = false;

-- =========================================================
-- RLS e permissões — só o servidor acessa.
-- =========================================================
alter table public.service_packages       enable row level security;
alter table public.customer_packages      enable row level security;
alter table public.cash_closings          enable row level security;
alter table public.waitlist               enable row level security;
alter table public.customer_records       enable row level security;
alter table public.customer_record_photos enable row level security;

alter table public.service_packages       force row level security;
alter table public.customer_packages      force row level security;
alter table public.cash_closings          force row level security;
alter table public.waitlist               force row level security;
alter table public.customer_records       force row level security;
alter table public.customer_record_photos force row level security;

create policy admin_full_access on public.service_packages       for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.customer_packages      for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.cash_closings          for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.waitlist               for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.customer_records       for all using (is_admin()) with check (is_admin());
create policy admin_full_access on public.customer_record_photos for all using (is_admin()) with check (is_admin());

revoke execute on function public.sell_package(jsonb) from public, anon, authenticated;
revoke execute on function public.use_package_session(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_sale(uuid, text) from public, anon, authenticated;
revoke execute on function public.cash_drawer_preview(int) from public, anon, authenticated;
revoke execute on function public.close_cash_drawer(jsonb) from public, anon, authenticated;
