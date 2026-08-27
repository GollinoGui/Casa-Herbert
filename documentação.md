# Casa Herbert — Documentação do Projeto

Site institucional + painel administrativo para a **Casa Herbert Embelezamento e Saúde Capilar** (Orlândia/SP). Este documento é o registro vivo do projeto — decisões de arquitetura, regras de negócio, como rodar localmente e o roadmap até produção.

## 1. Visão geral

- **Posicionamento:** embelezamento e saúde capilar, não uma clínica médica nem uma barbearia/salão tradicional. Linguagem sempre em torno de "avaliação", "cuidado", "protocolo personalizado", "acompanhamento" — nunca "diagnóstico", "cura" ou "tratar doença".
- **Endereço:** Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000.
- **WhatsApp:** (16) 99147-9968.
- **Atendimento:** somente com hora marcada.
- **Horários:** terça a sábado, 09:00–11:00 e 14:00–19:00. Domingo e segunda-feira fechado.

## 2. Status atual do protótipo

**Fase 1 (atual): protótipo visual.** O site inteiro roda localmente (`npm run dev`) sobre uma **camada de dados mockada** (arquivo JSON local), implementando exatamente as mesmas regras de agendamento que depois serão aplicadas no Supabase. O objetivo desta fase é validar visual, fluxo de agendamento e painel administrativo antes de conectar infraestrutura real.

**Fase 2 (depois de aprovado): produção.** Aplicar as migrations em `supabase/migrations/`, trocar a implementação interna de `src/lib/data/*.ts` para consultar o Supabase em vez do arquivo local, configurar Supabase Auth para o admin, e então fazer deploy na Vercel. Ver seção 8 (Roadmap) para o passo a passo.

## 3. Regras de negócio do agendamento

Todas as regras abaixo são aplicadas em `src/lib/booking/engine.ts` (funções puras, sem I/O) e reaplicadas do zero em `src/lib/data/availability.ts` (`createAppointment`) antes de gravar — nunca confiar só no que o formulário mostrou antes de enviar. As mesmas regras estão espelhadas em `supabase/migrations/0003_booking_functions.sql` para quando o Supabase for conectado.

- **Sem datas passadas.**
- **Antecedência mínima configurável:** `settings.minAdvanceDays` (padrão `1`) — fórmula é `(data escolhida − hoje) em dias de calendário ≥ minAdvanceDays`. Com o padrão 1, o mesmo dia nunca é permitido, em qualquer horário. Para exigir 48h, basta mudar para `2` em **/admin/configuracoes**.
- **Dias fechados:** domingo e segunda-feira (via `business_hours` sem linhas nesses dias).
- **Janelas de horário:** terça a sábado, 09:00–11:00 e 14:00–19:00 — o intervalo de almoço (11:00–14:00) nunca aparece porque nenhuma janela o cobre, sem precisar de caso especial no código.
- **Duração por serviço:** cada serviço tem `durationMinutes` (múltiplo de 5). Um horário só é oferecido se `[início, início+duração)` couber inteiramente dentro de uma única janela do dia.
- **Conflito de horário:** nunca dois agendamentos `PENDING`/`CONFIRMED` sobrepostos. Horários back-to-back (10:00–11:00 seguido de 11:00–12:00) NÃO são conflito — intervalo `[início, fim)`.
- **Horários especiais** (`special_hours`) sempre têm prioridade sobre o horário padrão semanal para aquela data específica (ex.: véspera de Natal com horário reduzido, Natal fechado).
- **Bloqueios manuais** (`blocked_slots`): horário específico, parte do dia, dia inteiro ou vários dias — nunca aparecem para o cliente.
- **Buffer entre atendimentos** (`settings.bufferMinutes`, opcional): se maior que zero, adiciona um espaçamento extra na checagem de conflito sem alterar o horário realmente gravado do agendamento.

### Casos de conflito já resolvidos

- **`PENDING` esquecido:** expira automaticamente após `settings.pendingExpiryHours` (padrão 48h) virando `CANCELLED` com nota — sem criar um novo status.
- **Editar horários depois de já existirem agendamentos futuros:** nunca invalida agendamentos existentes retroativamente (cada um guarda seu próprio horário gravado). O painel **avisa** quais agendamentos ficariam fora da nova janela, nunca cancela sozinho.
- **Bloquear um período que já tem agendamentos dentro:** o bloqueio é criado, e o admin recebe a lista de agendamentos em conflito para decidir manualmente — nunca cancela automaticamente.
- **Reagendamento:** sempre volta o status para `PENDING` (a confirmação era para o horário antigo).
- **Duas pessoas no mesmo horário ao mesmo tempo:** no mock, a checagem-e-escrita acontece de forma síncrona antes de gravar. No Postgres real, quem garante isso de verdade é a constraint `EXCLUDE USING gist` em `appointments` (ver `0001_schema.sql`) — impossível dois agendamentos `PENDING`/`CONFIRMED` sobrepostos existirem ao mesmo tempo, mesmo sob concorrência ou uma escrita direta no banco.

## 4. Arquitetura

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion (animações) + React Hook Form + Zod (formulários/validação) + FullCalendar (agenda administrativa) + date-fns (datas, locale pt-BR).

### Camada de dados mockada (fase atual)

`src/lib/data/*.ts` expõe funções assíncronas com **as mesmas assinaturas** que terão quando virarem chamadas ao Supabase (`getServices`, `getAvailableSlotsForService`, `createAppointment`, `confirmAppointment`, etc.). Por baixo, elas leem/escrevem um arquivo JSON local (`.mockdata/db.json`, gitignored), gerenciado por `src/lib/data/store.ts`. Na primeira execução, o arquivo é semeado automaticamente a partir de `src/lib/data/seed-data.ts` (serviços reais da Casa Herbert, horários padrão, alguns agendamentos de exemplo em status variados, depoimentos, galeria).

Isso significa: qualquer página/Server Action que hoje chama `getActiveServices()` ou `createAppointment(...)` **não vai precisar mudar** quando o Supabase entrar — só a implementação interna desses arquivos muda.

### Autenticação do admin (protótipo apenas)

Login simples por senha comparando `ADMIN_EMAIL`/`ADMIN_PASSWORD` (variáveis de ambiente) — ver `src/lib/auth/session.ts`. Sessão é um cookie httpOnly assinado com HMAC-SHA256 (`AUTH_SECRET`), validado em `src/middleware.ts` para tudo em `/admin/*` exceto `/admin/login`. **Isso é descartável** — na fase de produção vira Supabase Auth (tabela `admin_profiles` + RLS, já modelada em `0001_schema.sql`/`0002_rls_policies.sql`).

### Estrutura de pastas

```
src/
  app/                    rotas (App Router)
    page.tsx, sobre/, terapia-capilar/, servicos/, resultados/,
    produtos/, contato/, agendar/         → site público
    admin/                                → painel administrativo (protegido)
    sitemap.ts, robots.ts                 → SEO
  components/
    ui/          Button, Card, Field (Input/Textarea/Select), Modal, Badge, PlaceholderImage
    motion/      FadeIn, StaggerChildren, ParallaxLeaf, GoldDivider
    layout/      Header, Footer, WhatsAppFloatingButton
    home/        seções da Home
    booking/     wizard de agendamento (Serviço → Data → Horário → Dados → Revisão)
    admin/       Sidebar, CalendarView, AppointmentDetailModal, formulários administrativos
  lib/
    booking/     engine.ts (regras puras), validators.ts (zod), constants.ts, whatsapp.ts
    data/        camada de dados mockada (ver acima)
    actions/     Server Actions — booking.ts (público), admin/*.ts (painel)
    auth/        sessão do admin
    utils/       datas (pt-BR), telefone, cn()
  types/         tipos compartilhados
supabase/
  migrations/    schema completo pronto para aplicar na Fase 2 (ver seção 8)
```

## 5. Identidade visual

| Cor | Hex | Uso |
|---|---|---|
| Laranja (cor principal) | `#EF8523` | títulos de destaque, botões primários, rodapé, navegação ativa, ícones |
| Laranja escuro | `#BA681B` | hover de botões, contraste sobre dourado |
| Verde médio | `#53735A` | suporte secundário discreto — eyebrows, detalhes pontuais |
| Verde sálvia | `#A3B89A` | suporte secundário — placeholders, ilustrações botânicas |
| Creme/off-white | `#F7F3EA` | fundo principal |
| Bege | `#E7E3D8` | bordas, cards |
| Dourado suave | `#CBB89A` | divisores, detalhes |
| Grafite | `#2E2E2E` | texto de corpo |

O laranja é a cor dominante da marca (era verde escuro na primeira versão do protótipo). O verde foi rebaixado a suporte secundário — usado com moderação em eyebrows e detalhes, sem competir com o laranja. Os tokens ficam em `tailwind.config.ts` sob nomes semânticos (`brand.forest` = laranja principal, `brand.forestDark` = laranja escuro) — os nomes "forest/moss" são históricos da primeira versão verde e não foram renomeados para evitar reescrever dezenas de arquivos que já referenciam essas classes; o valor de cor é o que importa.

Tipografia: **Playfair Display** (títulos, `font-serif`) + **Inter** (corpo, `font-sans`), via `next/font/google`. Tokens completos em `tailwind.config.ts`.

Sem fotos reais ainda — toda foto usa `<PlaceholderImage>` (gradiente + ícone + legenda), propositalmente identificável como espaço reservado, para trocar por fotos reais sem retrabalho de layout.

## 6. Como rodar localmente

```bash
npm install
cp .env.example .env.local   # já existe um .env.local de exemplo com valores de teste
npm run dev
```

Login do admin (protótipo): e-mail e senha definidos em `.env.local` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).

Para recomeçar os dados do zero, apague `.mockdata/db.json` (ele é recriado automaticamente a partir do seed na próxima requisição).

## 7. Variáveis de ambiente

| Variável | Fase | Descrição |
|---|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Protótipo | credenciais do login simples do `/admin` |
| `AUTH_SECRET` | Protótipo | chave HMAC para assinar o cookie de sessão do admin |
| `NEXT_PUBLIC_SUPABASE_URL` | Produção | ver seção 8 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Produção | ver seção 8 |
| `SUPABASE_SERVICE_ROLE_KEY` | Produção | ver seção 8 (uso restrito a jobs de servidor, nunca exposto ao client) |

## 8. Roadmap — Fase 2 (produção)

1. **Criar o projeto Supabase** (organização já existe: "Gollino M.E"). Aplicar as migrations em ordem: `0001_schema.sql` → `0002_rls_policies.sql` → `0003_booking_functions.sql` → `0004_seed.sql`.
2. **Criar `src/lib/supabase/client.ts`** (browser) **e `server.ts`** (Server Components/Actions, usando `@supabase/ssr`).
3. **Trocar a implementação interna** de cada arquivo em `src/lib/data/*.ts` para chamar o Supabase (`supabase.rpc('get_available_slots', ...)`, `supabase.rpc('create_appointment', ...)`, `supabase.from('services').select()`, etc.) mantendo as mesmas assinaturas de função — nada que consome esses módulos precisa mudar.
4. **Criar o primeiro admin:** Dashboard do Supabase → Authentication → Add User (e-mail + senha) → copiar o UUID gerado → `insert into admin_profiles (id, full_name) values ('<uuid>', 'Nome do Admin');`.
5. **Trocar a autenticação do painel** de `src/lib/auth/session.ts` (HMAC caseiro) para Supabase Auth (`supabase.auth.signInWithPassword`, sessão via cookies do `@supabase/ssr`), atualizando `src/middleware.ts` de acordo.
6. **Agendar `expire_pending_appointments()`** (Supabase `pg_cron` ou uma rota de cron na Vercel) para rodar periodicamente.
7. **Configurar as variáveis de ambiente** de Supabase na Vercel e fazer o deploy.
8. **(Opcional/futuro)** integrar com a WhatsApp Business Cloud API para envio automático de mensagens, em vez dos links `wa.me` manuais usados no protótipo.

## 9. Limitações conhecidas do protótipo

- Os dados resetam se `.mockdata/db.json` for apagado (é só o seed sendo recriado — não é um bug).
- Autenticação do admin é uma senha única comparada em texto puro contra variável de ambiente — adequado só para demonstração, nunca usar assim em produção.
- Sem upload real de imagens (galeria/produtos usam placeholders com legenda) — chega junto com o Supabase Storage na Fase 2.
- "Hoje"/"agora" usam o fuso horário do processo local, não `America/Sao_Paulo` explicitamente — isso é resolvido na Fase 2 (ver `salon_timezone` em `settings`, já modelado no schema).
- Sem integração real com WhatsApp Business API — os botões do painel geram links `wa.me` com mensagem pré-preenchida, que o admin envia manualmente.
