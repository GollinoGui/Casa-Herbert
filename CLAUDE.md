# CLAUDE.md

Guia para sessões futuras do Claude Code neste repositório. Para contexto de produto/negócio, ver [documentação.md](documentação.md) — este arquivo é sobre como trabalhar no código.

## O que é este projeto

Site institucional + painel administrativo para a Casa Herbert Embelezamento e Saúde Capilar (Orlândia/SP). Protótipo visual atualmente rodando sobre dados mockados — **ainda não há Supabase conectado**, apesar de o schema já existir em `supabase/migrations/`. Não presuma que há um banco real: `src/lib/data/*.ts` lê/escreve um arquivo JSON local.

## Comandos

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build       # build de produção
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## A fonte da verdade das regras de agendamento

`src/lib/booking/engine.ts` — funções puras, sem I/O. Qualquer mudança nas regras de agendamento (antecedência mínima, janelas de horário, conflitos, buffer) deve ser feita aqui primeiro, e depois espelhada em `supabase/migrations/0003_booking_functions.sql` (que implementa exatamente o mesmo algoritmo em PL/pgSQL para quando o Supabase for conectado). As duas implementações devem sempre concordar — se mudar uma sem a outra, a regra vai divergir entre o protótipo e a futura produção.

Não simplifique essas regras sem que o usuário peça explicitamente — foram desenhadas com cuidado para cobrir: datas passadas, antecedência mínima configurável, dias fechados, intervalo de almoço, duração variável por serviço, conflitos considerando duração, horários especiais com prioridade sobre o padrão semanal, e bloqueios manuais.

## Camada de dados mockada

`src/lib/data/*.ts` expõe funções assíncronas com as assinaturas que terão quando virarem chamadas reais ao Supabase. Ao trocar para Supabase (ver documentação.md > Roadmap), a implementação interna desses arquivos muda, mas as assinaturas devem continuar as mesmas — não quebre esse contrato ao mexer neles.

Toda escrita passa por `mutateDb()` (`src/lib/data/store.ts`), que lê, aplica a mutação e persiste — nunca escreva no `.mockdata/db.json` fora desse helper.

## Convenções de código

- Server Components por padrão. Só usar `"use client"` quando precisar de estado/eventos/hooks do browser.
- Server Actions ficam em `src/lib/actions/` (`booking.ts` para o fluxo público, `admin/*.ts` para o painel), sempre com `"use server"` no topo do arquivo.
- Copy da interface em português (PT-BR); identificadores de código (variáveis, funções, tipos) em inglês.
- Sem comentários óbvios. Comentar só o que não é óbvio pelo código (uma decisão não trivial, um workaround, uma invariante escondida).
- Linguagem de marca: nunca usar "diagnóstico", "cura", "tratar doença", "patologia diagnosticada". Preferir "avaliação", "cuidado", "protocolo personalizado", "acompanhamento", "saúde do couro cabeludo". Ver documentação.md > seção 1.
- Datas/horas são strings simples (`"YYYY-MM-DD"`, `"HH:mm"`), nunca `Date` para representar um horário de agendamento — evita bugs de timezone. Para parsear uma data local com segurança, usar `parseDateOnly()` de `src/lib/utils/date-format.ts`, nunca `new Date(dateStr)` direto.
- Fotos: ainda não há fotos reais — usar `<PlaceholderImage>` (`src/components/ui/PlaceholderImage.tsx`) em vez de `<img>`/`next/image` para qualquer imagem de conteúdo (hero, galeria, produtos).
- Paleta e tipografia: tokens em `tailwind.config.ts` (`brand.forest/moss/sage/cream/beige/gold/graphite`, `font-serif` = Playfair Display para títulos, `font-sans` = Inter para corpo). Reusar as classes utilitárias já definidas em `src/app/globals.css` (`.container-herbert`, `.btn-primary`, `.btn-secondary`, `.btn-gold`, `.section-padding`, `.eyebrow`, `.gold-divider`) em vez de recriar estilos.

## Onde NÃO mexer sem entender o impacto

- `src/middleware.ts` protege `/admin/*` — qualquer rota nova sob `/admin` já fica protegida automaticamente por causa do matcher, não precisa duplicar a checagem de sessão em cada página (mas Server Actions administrativas devem revalidar por conta própria se forem chamadas fora do contexto de uma página protegida).
- `supabase/migrations/*.sql` — mudar sem aplicar de fato ao banco (fase atual não tem Supabase conectado) é só documentação para a Fase 2. Se alterar, mantenha os quatro arquivos coerentes entre si (schema → RLS → funções → seed).
