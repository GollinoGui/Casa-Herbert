-- Casa Herbert — personalização do painel.
--
-- 1. customers.birth_date: opcional (é dado pessoal — LGPD). Alimenta o bloco
--    "Aniversariantes da semana" do Início. O ano pode ser desconhecido: quem
--    cadastra só dia e mês grava o ano 1900, e o painel não mostra idade.
-- 2. products.min_stock: abaixo disso (ou igual), o produto entra no aviso de
--    estoque baixo do Início. null = sem aviso para esse produto.
--
-- O resto da personalização não muda o schema: preferências do salão ficam em
-- settings.panel_preferences (jsonb, 0013) e os modelos novos de WhatsApp
-- (aniversário, retorno) em settings.message_templates (jsonb, 0001).

alter table public.customers
  add column birth_date date;

alter table public.products
  add column min_stock int check (min_stock is null or min_stock >= 0);
