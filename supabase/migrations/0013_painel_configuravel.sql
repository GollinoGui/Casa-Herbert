-- Casa Herbert — painel configurável em /admin/configuracoes.
--
-- 1. panel_preferences: o que aparece no Início e nos Relatórios (cartões,
--    gráficos, tamanho dos rankings, período padrão). O app lê com valores
--    padrão por cima, então chave faltando ou antiga nunca quebra a tela.
-- 2. payment_method_options: rótulo e "aceita / não aceita" de cada forma de
--    pagamento, chaveado pelo enum payment_method (que continua fixo — o painel
--    não cria formas novas). Desativar só tira a forma dos seletores de lançamento
--    novo; o histórico continua mostrando o rótulo.
-- 3. payable_categories: categorias de contas a pagar, antes fixas no código.
--    payables.category e recurring_bills.category seguem guardando o slug (texto).
--    Categoria em uso nunca é apagada, só desativada.

alter table public.settings
  add column panel_preferences      jsonb not null default '{}'::jsonb,
  add column payment_method_options jsonb not null default '{}'::jsonb;

create table public.payable_categories (
  slug       text primary key check (slug ~ '^[a-z0-9_]{1,40}$'),
  label      text not null check (length(btrim(label)) between 1 and 60),
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.payable_categories (slug, label, sort_order) values
  ('agua',       'Água',                  10),
  ('energia',    'Luz / energia',         20),
  ('aluguel',    'Aluguel',               30),
  ('internet',   'Internet / telefone',   40),
  ('impostos',   'Impostos e taxas',      50),
  ('compra',     'Compra de mercadoria',  60),
  ('fornecedor', 'Fornecedor / material', 70),
  ('maquininha', 'Taxa de maquininha',    80),
  ('pessoal',    'Pessoal / pró-labore',  90),
  ('manutencao', 'Manutenção',            100),
  ('outros',     'Outros',                110);

-- Slug já gravado em alguma conta e que não estava na lista fixa: entra com o
-- próprio slug como nome, para nenhuma conta antiga ficar sem categoria.
insert into public.payable_categories (slug, label, sort_order)
select distinct c.category, c.category, 1000
from (
  select category from public.payables
  union
  select category from public.recurring_bills
) c
where c.category ~ '^[a-z0-9_]{1,40}$'
on conflict (slug) do nothing;

alter table public.payable_categories enable row level security;
alter table public.payable_categories force row level security;
create policy admin_full_access on public.payable_categories for all using (is_admin()) with check (is_admin());
