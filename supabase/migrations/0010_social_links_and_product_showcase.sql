-- Casa Herbert — redes sociais e vitrine de produtos gerenciadas pelo painel, e os
-- espaços de foto da nova home.
--
-- Redes: os links de Instagram/Facebook estavam fixos no código apontando para as
-- páginas iniciais genéricas. Agora ficam em settings; vazio = o site esconde o link.
--
-- Produtos: a página /produtos mostrava seis produtos escritos no código. Ela passa
-- a listar os produtos do estoque marcados com show_on_site, com descrição e foto
-- da biblioteca (media), igual ao card dos serviços.

alter table public.settings
  add column instagram_url text,
  add column facebook_url  text;

alter table public.products
  add column description    text,
  add column image_id       uuid references public.media(id) on delete set null,
  add column image_position text,
  add column show_on_site   boolean not null default false;

-- A lupa da tricoscopia (home) começa com a foto do couro cabeludo que estava na
-- miniatura do topo — copiada antes de o espaço antigo ser removido abaixo.
insert into public.site_image_slots (slot_key, media_id, object_position)
select 'home.tricoscopia', media_id, object_position
from public.site_image_slots
where slot_key = 'home.hero-thumb'
on conflict (slot_key) do nothing;

-- Espaços que saíram do site: os produtos fictícios, a miniatura do topo da home e as
-- abas Terapia/Fotobiomodulação da home (a página /terapia-capilar tem as suas).
delete from public.site_image_slots
where slot_key like 'produto.%'
   or slot_key in ('home.hero-thumb', 'home.terapia', 'home.fotobio');
