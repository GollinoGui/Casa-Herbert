# Casa Herbert — Documentação do Projeto

Site institucional + painel administrativo para a **Casa Herbert Embelezamento e Saúde Capilar** (Orlândia/SP). Este documento é o registro vivo do projeto — decisões de arquitetura, regras de negócio, como rodar localmente e o roadmap até produção.

## 1. Visão geral

- **Posicionamento:** embelezamento e saúde capilar, não uma clínica médica nem uma barbearia/salão tradicional. Linguagem sempre em torno de "avaliação", "cuidado", "protocolo personalizado", "acompanhamento" — nunca "diagnóstico", "cura" ou "tratar doença".
- **Endereço:** Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000.
- **WhatsApp:** (16) 99147-9968.
- **Atendimento:** somente com hora marcada.
- **Horários:** terça a sábado, 09:00–11:00 e 14:00–19:00. Domingo e segunda-feira fechado.

## 2. Status atual

**Migrando para a Cloudflare.** O painel roda como Worker na Cloudflare (plano grátis, que permite uso comercial) sobre Supabase (região `sa-east-1`). A Vercel saiu porque o plano grátis dela é só para uso não comercial.

Deploy pela integração Git da Cloudflare (Workers Builds), não da máquina local. Ver seção 8.

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

O login confere e-mail/senha no **Supabase Auth** e só aceita usuários cadastrados na tabela `admin_profiles` (`src/lib/auth/credentials.ts`). Depois do login, a sessão é um cookie httpOnly assinado com HMAC-SHA256 (`AUTH_SECRET`, validade de 8h, ou 30 dias com "Lembrar de mim" marcado), conferido em `src/middleware.ts` para as páginas `/admin/*` e em `requireAdmin()` no início de toda Server Action administrativa.

**Liberar alguém no painel** (SQL Editor do Supabase), depois de criar o usuário em Authentication → Add user:

```sql
insert into admin_profiles (id, full_name)
select id, 'Nome da Pessoa' from auth.users where email = 'email@dapessoa.com';
```

O SQL Editor responde "Success. No rows returned" quando o insert dá certo; confira listando:

```sql
select u.email, a.full_name from admin_profiles a join auth.users u on u.id = a.id;
```

**Tirar o acesso:** `delete from admin_profiles where id = (select id from auth.users where email = 'email@dapessoa.com');` — a sessão atual continua válida até expirar (até 8h, ou 30 dias se a pessoa marcou "Lembrar de mim"); para cortar na hora, apague também o usuário em Authentication → Users.

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
| Laranja (cor principal) | `#EF8523` | botões primários, rodapé, superfícies, ícones — como **fundo**; texto sobre ele é sempre grafite |
| Laranja tijolo (texto) | `#A4520E` | títulos e textos em laranja (`text-brand-forest`) — o `#EF8523` como texto fica em 2,4:1 sobre o creme e reprova o WCAG |
| Laranja escuro | `#BA681B` | hover de botões, contraste sobre dourado |
| Verde médio | `#53735A` | suporte secundário discreto — eyebrows, detalhes pontuais |
| Verde sálvia | `#A3B89A` | suporte secundário — placeholders, ilustrações botânicas |
| Creme/off-white | `#F7F3EA` | fundo principal |
| Bege | `#E7E3D8` | bordas, cards |
| Dourado suave | `#CBB89A` | divisores, detalhes |
| Grafite | `#2E2E2E` | texto de corpo |

O laranja é a cor dominante da marca (era verde escuro na primeira versão do protótipo). Em `tailwind.config.ts`, `textColor.brand.forest` sobrescreve só a cor de texto: `text-brand-forest` sai tijolo, enquanto `bg-`/`border-`/`ring-brand-forest` seguem com o laranja vivo. Sobre fundo laranja, o texto é grafite em 100% (creme/branco ficam em ~2,4:1, e grafite com opacidade também reprova). O verde foi rebaixado a suporte secundário — usado com moderação em eyebrows e detalhes, sem competir com o laranja. Os tokens ficam em `tailwind.config.ts` sob nomes semânticos (`brand.forest` = laranja principal, `brand.forestDark` = laranja escuro) — os nomes "forest/moss" são históricos da primeira versão verde e não foram renomeados para evitar reescrever dezenas de arquivos que já referenciam essas classes; o valor de cor é o que importa.

Tipografia: **Playfair Display** (títulos, `font-serif`) + **Inter** (corpo, `font-sans`), via `next/font/google`. Tokens completos em `tailwind.config.ts`.

Sem fotos reais ainda — toda foto usa `<PlaceholderImage>` (gradiente + ícone + legenda), propositalmente identificável como espaço reservado, para trocar por fotos reais sem retrabalho de layout.

## 6. Como rodar localmente

```bash
npm install
cp .env.example .env   # preencher com os valores do Supabase (seção 7)
npm run dev
```

Atenção: localmente o site usa **o mesmo banco de produção** — agendamentos e alterações feitas em `localhost` aparecem no site real.

Para testar o worker no runtime da Cloudflare: `npm run preview` (lê os segredos de `.dev.vars`, fora do git, com `DEMO_MODE=` vazio — o build é de produção e recusa o modo demo).

A imagem de compartilhamento (`public/og-image.png`) é estática: o `@vercel/og` não roda no Windows e não cabe no limite de 3 MiB do worker grátis. Para mudá-la, editar o PNG.

## 7. Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta (Project Settings → API Keys) — só no servidor, nunca em variável `NEXT_PUBLIC_` |
| `AUTH_SECRET` | chave para assinar o cookie de sessão do painel (`openssl rand -base64 48`); trocar invalida todas as sessões |

Localmente ficam em `.env` (fora do git). Na Cloudflare, os três acima são **segredos** (Worker → Settings → Variables and Secrets, ou `npx wrangler secret put NOME`); `SITE_ENABLED` fica em `vars` no `wrangler.jsonc`. Nunca colocar segredo no `wrangler.jsonc`.

## 8. Operação

- **Deploy:** push no GitHub → a Cloudflare (Workers Builds) roda `npx opennextjs-cloudflare build` e `npx opennextjs-cloudflare deploy`. Não fazer deploy da máquina local: o OpenNext embute os arquivos `.env*` dentro do worker (levaria a chave secreta e o `DEMO_MODE`), por isso `npm run deploy` recusa quando existe `.env` na pasta.
- **Versões travadas:** `@opennextjs/cloudflare` 1.15.1 é a última que aceita Next 14 (a 1.16+ exige Next 15). Atualizar o adaptador = migrar para Next 15 antes.
- **Limites do plano grátis da Cloudflare:** worker de até 3 MiB comprimido (hoje ~2,3 MiB — conferir com `npx wrangler deploy --dry-run` depois de adicionar biblioteca pesada no servidor) e 10 ms de CPU por requisição. Se aparecer erro "exceeded CPU" nos logs (Worker → Observability), o plano pago é US$ 5/mês.
- **Supabase grátis:** pausa após 7 dias sem uso (com uso diário não acontece) e não tem backup para baixar — manter um `pg_dump` periódico fora do Supabase.
- **Mudança de schema:** nunca editar migration já aplicada. Criar `supabase/migrations/000N_descricao.sql` e aplicar no banco (SQL Editor ou Supabase CLI).
- **Dados iniciais:** o banco começou só com serviços, horários e configurações reais (`0004_seed.sql`). Depoimentos, galeria e produtos são cadastrados pelo painel; enquanto vazios, as seções correspondentes não aparecem no site.
- **Conteúdo que vem do painel:** links de Instagram/Facebook (**/admin/configuracoes** — vazio esconde a rede no site), horário de funcionamento (rodapé, card de visita e JSON-LD), e a vitrine de produtos (**/admin/estoque** → "Mostrar este produto no site", com descrição e foto; alimenta `/produtos` e o chat simulado da home), e o aviso no topo do site (**/admin/configuracoes** → "Aviso no topo do site": texto, link opcional e data de término; vazio = sem faixa).
- **Home personalizada:** o questionário "Como está o seu couro cabeludo?" manda as respostas como observação do pedido (`/agendar?notas=`); os horários livres do topo levam direto aos dados pessoais (`/agendar?service=&date=&time=`, revalidados antes de pular etapas); e quem já agendou por aquele navegador é reconhecido no topo (localStorage, `src/lib/utils/last-booking.ts`) — sem login, some se a pessoa limpar os dados do navegador.
- **Domínio:** o worker responde em `casa-herbert.<conta>.workers.dev`. `SITE_URL` em `src/app/layout.tsx` (usado em SEO/sitemap) já aponta para `casaherbert.com.br` — ligar esse domínio ao worker (Custom Domains) quando for registrado.
- **(Futuro)** integrar com a WhatsApp Business Cloud API para envio automático de mensagens, em vez dos links `wa.me` manuais.

- **Painel instalável (PWA):** `src/app/manifest.ts` + ícones fixos em `public/pwa/` (fundo verde, "CH" em Playfair). No celular ou no computador do balcão, "Instalar app"/"Adicionar à tela inicial" abre direto em `/admin`, sem barra do navegador.
- **Migration 0017 (`0017_pacotes_retorno_caixa.sql`):** pacotes de sessões, retorno por serviço, fechamento do caixa, lista de espera e acompanhamento com fotos. Precisa estar aplicada no banco antes do deploy do código que usa essas tabelas. Ela cria o bucket **privado** `customer-photos`.

### Funcionalidades de atendimento e gestão (0017)

- **Pacotes de sessões** (**/admin/pacotes**): a Casa cadastra pacotes (serviço, nº de sessões, preço, validade) e vende para a cliente pela ficha ou pela tela de pacotes. A venda passa pela mesma `register_sale` (entra no caixa e em contas a receber como qualquer venda) e o valor de cada sessão fica fixado na hora da venda. No atendimento confirmado, "Usar sessão do pacote" conclui sem novo pagamento (RPC `use_package_session`). Pacote com sessão usada não pode ser cancelado: devolução parcial é um ajuste de saída em Saldo e extrato.
- **Retorno por serviço:** cada serviço pode ter "Retorno recomendado (dias)". O Início mostra quem está na hora de voltar (sem horário futuro marcado) com botão de WhatsApp; o texto vem do modelo "Hora do retorno" em Configurações.
- **Fechamento do caixa** (**/admin/financeiro?aba=fechamento**): confere só o dinheiro em espécie. Esperado = troco inicial + entradas − saídas em dinheiro desde o último fechamento; a pessoa informa o contado e o que foi retirado (depósito/banco). Sobra ou falta pode virar um ajuste no extrato (opcional). O fechamento olha os lançamentos pela hora de gravação, então lançamento com data retroativa entra no próximo fechamento, não reabre o anterior.
- **Lista de espera** (**/admin/lista-de-espera**): cliente, serviço, dia desejado e período. Quando abre um horário que serve, a lista destaca e o sino avisa; "Agendar" já abre o novo agendamento no horário livre.
- **Acompanhamento capilar com fotos** (ficha da cliente): registros datados com observações e fotos de antes/depois. Fotos só com o consentimento da cliente registrado na ficha. Ficam no bucket privado `customer-photos` e aparecem por link temporário (30 min) — nunca no bucket público do site.
- **Ficha como linha do tempo:** atendimentos, compras e registros de acompanhamento em uma lista só, por mês, com filtro.
- **Meta do mês:** definida em Configurações → Painel. O Início mostra quanto já entrou e a previsão com os atendimentos marcados até o fim do mês.
- **Previsão de estoque:** "acaba em ~N dias" pelo uso dos últimos 30 dias (vendas + receita de consumo dos serviços).
- **Busca rápida (Ctrl+K ou "/")**: clientes, produtos, serviços e páginas do painel de qualquer tela; no celular, pela lupa da barra do topo.
- **Mapa dos horários mais cheios** (Relatórios): atendimentos concluídos e confirmados por dia da semana × hora.

## 9. Limitações conhecidas

- Sem upload real de imagens (galeria/produtos usam placeholders com legenda) — a tabela `gallery` já tem `image_url`/`storage_path` para quando entrar o Supabase Storage.
- Sem integração real com WhatsApp Business API — os botões do painel geram links `wa.me` com mensagem pré-preenchida, que o admin envia manualmente.
## 10. Ideias para funcionalidades futuras

- **Comissões.** Venda de produto gera comissão para a Casa Herbert (o negócio). Prestação de serviço também deve gerar comissão no futuro — mas atribuída a qual **funcionária** realizou o atendimento/a venda. Hoje o modelo de dados não tem conceito de funcionária/profissional (`Sale`/`SaleItem` em `src/lib/data/sales.ts` não têm campo de quem vendeu ou atendeu) — precisa entrar como uma entidade nova antes de calcular comissão por pessoa.

### Adiados de propósito (revisados em 27/11/2026)

- **Comissão por profissional.** Hoje só existe uma profissional, então não compensa ainda. Quando entrar: cadastro de profissional, quem atendeu/vendeu em cada item, e o **percentual gravado na própria venda** (snapshot), para que mudar a regra depois não altere comissões passadas. Estorno/cancelamento da venda precisa estornar a comissão junto.
- **Vale-presente / crédito da cliente.** Precisa de um **código resgatável** (o presente é de uma pessoa e é usado por outra) e de um saldo próprio por vale. Cuidado contábil: a venda do vale é a entrada de dinheiro; o resgate **não** pode contar como receita de novo (é forma de pagamento "vale", sem novo lançamento de entrada no livro-caixa). Validade e cancelamento seguem as mesmas regras de estorno do caixa.
- **Agenda em colunas por profissional:** a visão "resource" do FullCalendar é paga (licença premium) e só faz sentido com mais de uma profissional.
