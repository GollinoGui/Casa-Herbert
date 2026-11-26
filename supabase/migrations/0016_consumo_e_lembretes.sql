-- Casa Herbert — consumo interno de produtos e lembretes de véspera.
--
-- 1. service_products: "receita" do serviço — o que se gasta de cada produto num
--    atendimento (tinta, máscara...). Não é venda: o cliente não leva o produto.
--    A quantidade aceita fração (0,5 = meia unidade). Como o estoque é contado em
--    unidades inteiras, products.open_usage acumula a fração já usada da unidade
--    aberta e o estoque só baixa quando completa uma unidade inteira.
--
-- 2. A baixa é um trigger em appointments (status vira COMPLETED), porque dois
--    caminhos concluem um atendimento: register_sale (venda ligada ao atendimento)
--    e o "Concluir sem venda" do painel. COMPLETED é final, então dispara uma vez.
--    Estoque nunca fica negativo (check >= 0): faltando produto, zera — o
--    atendimento já aconteceu e não pode ser recusado por isso. A receita usada é
--    a do serviço no momento da conclusão.
--
-- 3. appointments.reminder_sent_at: quando o painel abriu o WhatsApp com o
--    lembrete de véspera (não garante que a mensagem foi enviada). Remarcar
--    (data ou hora) zera, para o lembrete do novo dia não ser pulado.
--
-- O modo demonstração espelha os dois triggers em src/lib/demo/client.ts (updateRow).

create table public.service_products (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   numeric(10,3) not null check (quantity > 0 and quantity <= 1000),
  unique (service_id, product_id)
);

alter table public.products
  add column open_usage numeric(10,3) not null default 0 check (open_usage >= 0 and open_usage < 1);

create or replace function public.fn_consume_service_products() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_line record;
  v_total numeric;
  v_units int;
begin
  for v_line in
    select sp.product_id, sp.quantity
    from public.service_products sp
    where sp.service_id = new.service_id
  loop
    select open_usage + v_line.quantity into v_total from public.products where id = v_line.product_id for update;
    v_units := floor(v_total);
    update public.products
      set stock_quantity = greatest(0, stock_quantity - v_units),
          open_usage = v_total - v_units
      where id = v_line.product_id;
  end loop;
  return null;
end $$;

create trigger trg_appointments_consume_products
  after update of status on public.appointments
  for each row
  when (old.status is distinct from 'COMPLETED' and new.status = 'COMPLETED')
  execute function public.fn_consume_service_products();

comment on trigger trg_appointments_consume_products on public.appointments is
  'Baixa a receita do serviço (service_products) ao concluir. Não repita a baixa em register_sale.';

alter table public.appointments add column reminder_sent_at timestamptz;

create or replace function public.fn_reset_reminder_on_reschedule() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.appointment_date is distinct from old.appointment_date or new.start_time is distinct from old.start_time then
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;

create trigger trg_appointments_reset_reminder
  before update of appointment_date, start_time on public.appointments
  for each row execute function public.fn_reset_reminder_on_reschedule();

-- Troca a receita inteira de uma vez. p_lines = [{"productId": uuid, "quantity": number}]
create or replace function public.replace_service_products(p_service_id uuid, p_lines jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.service_products where service_id = p_service_id;
  insert into public.service_products (service_id, product_id, quantity)
  select p_service_id, (l->>'productId')::uuid, (l->>'quantity')::numeric
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l;
end $$;

revoke execute on function public.replace_service_products(uuid, jsonb) from public, anon, authenticated;

alter table public.service_products enable row level security;
alter table public.service_products force row level security;
create policy admin_full_access on public.service_products for all using (is_admin()) with check (is_admin());
