-- Casa Herbert — saldo somado no banco.
--
-- O app somava o livro-caixa buscando todas as linhas de cash_entries, mas a API
-- do Supabase (PostgREST) devolve no máximo 1000 linhas por consulta: depois do
-- milésimo lançamento o saldo saía errado, sem erro nenhum. Agora a soma é feita
-- aqui, sobre a tabela inteira. A regra continua a mesma: saldo = soma do
-- livro-caixa, e nada mais.

create or replace function public.cash_balance(p_until date default null)
returns bigint
language sql stable set search_path = public as $$
  select coalesce(sum(case when direction = 'in' then amount_cents else -amount_cents end), 0)::bigint
  from public.cash_entries
  where p_until is null or entry_date <= p_until;
$$;

revoke execute on function public.cash_balance(date) from public, anon, authenticated;
