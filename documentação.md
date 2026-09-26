# Casa Herbert — Documentação do Projeto

Site institucional + painel administrativo para a **Casa Herbert Embelezamento e Saúde Capilar** (Orlândia/SP). Este documento é o registro vivo do projeto — decisões de arquitetura, regras de negócio, como rodar localmente e o roadmap até produção.

## 1. Visão geral

- **Posicionamento:** embelezamento e saúde capilar, não uma clínica médica nem uma barbearia/salão tradicional. Linguagem sempre em torno de "avaliação", "cuidado", "protocolo personalizado", "acompanhamento" — nunca "diagnóstico", "cura" ou "tratar doença".
- **Endereço:** Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000.
- **WhatsApp:** (16) 99147-9968.
- **Atendimento:** somente com hora marcada.
- **Horários:** terça a sábado, 09:00–11:00 e 14:00–19:00. Domingo e segunda-feira fechado.

## 2. Status atual

**Em produção.** Site e painel rodam na Vercel (`https://casa-herbert.vercel.app`, região São Paulo — `gru1`) sobre Supabase (projeto na organização da Casa Herbert, região `sa-east-1`). As duas contas (Supabase e Vercel) estão no e-mail da Casa Herbert.

Deploy é feito pela Vercel CLI a partir da pasta do projeto (`npx vercel deploy --prod`), não por integração com o GitHub. Ver seção 8.

## 3. Regras de negócio do agendamento

Todas as regras abaixo são aplicadas em `src/lib/booking/engine.ts` (funções puras, sem I/O) e reaplicadas do zero em `src/lib/data/availability.ts` (`createAppointment`) antes de gravar — nunca confiar só no que o formulário mostrou antes de enviar. As mesmas regras estão espelhadas nas funções SQL `get_available_slots`/`create_appointment` (`0003_booking_functions.sql`, atualizada em `0006_production_fixes.sql`); o app não as chama, mas elas devem continuar concordando com o engine.

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

- **`PENDING` esquecido:** expira automaticamente após `settings.pendingExpiryHours` (padrão 48h) virando `CANCELLED` com nota — sem criar um novo status. Roda de hora em hora via `pg_cron` no Supabase (job `expire-pending-appointments`).
- **Editar horários depois de já existirem agendamentos futuros:** nunca invalida agendamentos existentes retroativamente (cada um guarda seu próprio horário gravado). O painel **avisa** quais agendamentos ficariam fora da nova janela, nunca cancela sozinho.
- **Bloquear um período que já tem agendamentos dentro:** o bloqueio é criado, e o admin recebe a lista de agendamentos em conflito para decidir manualmente — nunca cancela automaticamente.
- **Reagendamento:** sempre volta o status para `PENDING` (a confirmação era para o horário antigo).
- **Duas pessoas no mesmo horário ao mesmo tempo:** o app checa antes de gravar, mas quem garante de verdade é o banco: a constraint `EXCLUDE USING gist` em `appointments` (`0001_schema.sql`) torna impossível dois agendamentos `PENDING`/`CONFIRMED` sobrepostos, mesmo sob concorrência; o trigger `SLOT_BLOCKED` (`0008_fix_blocked_slot_trigger.sql`) faz o mesmo para bloqueios manuais. O app traduz esses erros para "horário não está mais disponível".

## 4. Arquitetura

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion (animações) + React Hook Form + Zod (formulários/validação) + FullCalendar (agenda administrativa) + date-fns (datas, locale pt-BR).

### Camada de dados

`src/lib/data/*.ts` é o único lugar que fala com o banco. Todo acesso é feito **no servidor**, com a chave secreta do Supabase (service role, que ignora RLS) — o navegador nunca recebe chave nenhuma do Supabase. As policies de RLS (`0002_rls_policies.sql`) continuam ativas como proteção caso a chave pública seja usada por fora.

Operações com várias escritas que precisam acontecer inteiras ou não acontecer (trocar os horários de um dia, salvar horário especial, finalizar venda com baixa de estoque) são funções SQL chamadas por RPC — ver `0006_production_fixes.sql`.

### Autenticação do admin

O login confere e-mail/senha no **Supabase Auth** e só aceita usuários cadastrados na tabela `admin_profiles` (`src/lib/auth/credentials.ts`). Depois do login, a sessão é um cookie httpOnly assinado com HMAC-SHA256 (`AUTH_SECRET`, validade de 8h), conferido em `src/middleware.ts` para as páginas `/admin/*` e em `requireAdmin()` no início de toda Server Action administrativa.

**Liberar alguém no painel** (SQL Editor do Supabase), depois de criar o usuário em Authentication → Add user:

```sql
insert into admin_profiles (id, full_name)
select id, 'Nome da Pessoa' from auth.users where email = 'email@dapessoa.com';
```

O SQL Editor responde "Success. No rows returned" quando o insert dá certo; confira listando:

```sql
select u.email, a.full_name from admin_profiles a join auth.users u on u.id = a.id;
```

**Tirar o acesso:** `delete from admin_profiles where id = (select id from auth.users where email = 'email@dapessoa.com');` — a sessão atual continua válida até expirar (até 8h); para cortar na hora, apague também o usuário em Authentication → Users.

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
    data/        acesso ao banco (ver acima)
    supabase/    cliente do Supabase (servidor) e conversão de linhas → tipos do app
    actions/     Server Actions — booking.ts (público), admin/*.ts (painel)
    auth/        login (Supabase Auth), cookie de sessão, requireAdmin()
    utils/       datas (pt-BR), telefone, cn()
  types/         tipos compartilhados
supabase/
  migrations/    histórico do schema — todas já aplicadas em produção (ver seção 8)
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
cp .env.example .env   # preencher com os valores do Supabase (seção 7)
npm run dev
```

Atenção: localmente o site usa **o mesmo banco de produção** — agendamentos e alterações feitas em `localhost` aparecem no site real.

`npm run build` no Windows falha só em `/opengraph-image` e `/twitter-image` ("Invalid URL") por causa do espaço no caminho da pasta ("Casa Herbert") — bug do `@vercel/og` no Windows. Na Vercel (Linux) funciona normalmente.

## 7. Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta (Project Settings → API Keys) — só no servidor, nunca em variável `NEXT_PUBLIC_` |
| `AUTH_SECRET` | chave para assinar o cookie de sessão do painel (`openssl rand -base64 48`); trocar invalida todas as sessões |

Localmente ficam em `.env` (fora do git). Na Vercel, em Project → Settings → Environment Variables (ou `npx vercel env add`).

## 8. Operação

- **Deploy:** `npx vercel deploy --prod` na pasta do projeto (CLI logada na conta da Casa Herbert). Região das funções fixada em `vercel.json` (`gru1`, São Paulo — perto do banco).
- **Mudança de schema:** nunca editar migration já aplicada. Criar `supabase/migrations/000N_descricao.sql` e aplicar no banco (SQL Editor ou Supabase CLI).
- **Dados iniciais:** o banco começou só com serviços, horários e configurações reais (`0004_seed.sql`). Depoimentos, galeria e produtos são cadastrados pelo painel; enquanto vazios, as seções correspondentes não aparecem no site.
- **Domínio:** o site ainda responde em `casa-herbert.vercel.app`. `SITE_URL` em `src/app/layout.tsx` (usado em SEO/sitemap) já aponta para `casaherbert.com.br` — configurar esse domínio na Vercel quando for registrado.
- **(Futuro)** integrar com a WhatsApp Business Cloud API para envio automático de mensagens, em vez dos links `wa.me` manuais.

## 9. Limitações conhecidas

- Sem upload real de imagens (galeria/produtos usam placeholders com legenda) — a tabela `gallery` já tem `image_url`/`storage_path` para quando entrar o Supabase Storage.
- Sem integração real com WhatsApp Business API — os botões do painel geram links `wa.me` com mensagem pré-preenchida, que o admin envia manualmente.
- Plano Hobby (grátis) da Vercel é, pelos termos de uso, para projetos não comerciais — avaliar o plano Pro.

## 10. Ideias para funcionalidades futuras

- **Comissões.** Venda de produto gera comissão para a Casa Herbert (o negócio). Prestação de serviço também deve gerar comissão no futuro — mas atribuída a qual **funcionária** realizou o atendimento/a venda. Hoje o modelo de dados não tem conceito de funcionária/profissional (`Sale`/`SaleItem` em `src/lib/data/sales.ts` não têm campo de quem vendeu ou atendeu) — precisa entrar como uma entidade nova antes de calcular comissão por pessoa.
