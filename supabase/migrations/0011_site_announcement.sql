-- Casa Herbert — aviso no topo do site, editado em /admin/configuracoes.
--
-- Uma faixa fina acima do menu para recados de temporada ("Agenda de dezembro
-- aberta", "Fechado no feriado de 15/11"). Texto vazio = sem faixa. O link é
-- opcional, e a data de término faz o aviso sair sozinho depois daquele dia.

alter table public.settings
  add column announcement_text  text,
  add column announcement_link  text,
  add column announcement_until date;
