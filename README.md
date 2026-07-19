# prep-tracker

Um painel de estudo auto-dirigido para preparação a vagas de **Software Engineer mid-level internacional**. O app rastreia o progresso por módulo, **gera o material de estudo em PDF via API** (seguindo um guia-exemplo) e monta prompts contextualizados para tirar dúvidas e passar por entrevistas simuladas. Sem chave de API — ou se a API falhar — ele cai no modo copiar-e-colar.

> **Por que existe:** um programa de estudo com 13 módulos é fácil de começar e difícil de sustentar. O gargalo não é o conteúdo — é manter continuidade, saber onde parou, e ser honesto sobre o que ainda não domina. Este app resolve isso transformando o plano de estudo em um sistema com estado, um portão de qualidade por módulo, e um custo visível para o atraso.

---

## O modelo mental

Cada módulo se divide em **tópicos**, e o material é gerado **um tópico por vez** — pedir "o módulo inteiro" de uma vez força a IA a produzir um documento gigante e a qualidade despenca. Cada tópico gera seu próprio material, focado e profundo. Quando os tópicos estão cobertos, o módulo enfrenta o **portão**: uma entrevista simulada sobre o módulo inteiro, que você só passa se sustentar a conversa.

```
  1. Gerar material        ──▶  2. Estudar + dúvidas  ──▶  3. Entrevista (portão)  ──▶  4. Veredito
     POR TÓPICO                       │                          │                        │
   API → PDF (principal)        prompt p/ chat             prompt p/ voz          PASSOU → módulo fecha
   copiar-e-colar (fallback)   (contextualizado           (por voz no app        NÃO PASSOU → consome buffer,
   guia-exemplo como padrão      com seus materiais)        do Claude; a IA avalia)  marca tópicos fracos
```

Cada geração usa um **guia-exemplo** (um tópico-modelo escrito por inteiro) como padrão de qualidade — a IA replica a estrutura, o tom e a profundidade.

**Material (caminho principal):** com uma chave de API, você clica em "Gerar material em PDF" e o app pede o material à IA e o renderiza em PDF, salvo em disco e aberto pelo app — sem sair para chat nenhum. O guia-exemplo (prefixo grande e estável do prompt) vai com _prompt caching_, então gerações seguintes pagam ~10% dele.

**Fallback copiar-e-colar:** sem chave, ou se a API/render falhar (sem crédito, rate-limit, rede…), o app avisa e você copia o prompt, gera num chat do Claude.ai e cola o resultado de volta.

**Dúvidas e entrevista** seguem por prompt: as dúvidas num chat contextualizado com seus materiais; a entrevista (portão) por **voz no app do Claude**, onde falar em inglês treina a lacuna real. O veredito volta manual (por campos ou colando o texto).

### O portão e o buffer

O programa reserva **3 semanas de buffer**. Reprovar em uma entrevista não é neutro: consome uma semana de buffer e devolve o módulo para revisão, com os tópicos fracos destacados. Quando o buffer esgota, o atraso "estoura" o prazo — e isso fica visível no painel. É a regra central do plano de estudo, codificada: _o portão manda, e atrasar tem preço._

---

## Rodando localmente

Requer Node ≥ 18.17.

```bash
npm install
npm run dev
# abre em http://localhost:3000
```

Outros comandos:

```bash
npm run build      # build de produção
npm run typecheck  # tsc --noEmit
npm run test       # suíte de testes (Vitest)
npm run test:watch # testes em watch mode
```

O modo copiar-e-colar não precisa de configuração alguma. Para gerar material em PDF via API, veja abaixo. O estado é persistido no `localStorage` do navegador.

---

## Geração de material em PDF via API

Caminho principal do material. Configure a chave e rode:

```bash
cp .env.local.example .env.local
# edite .env.local e preencha ANTHROPIC_API_KEY
npm run dev
```

Com a chave presente, cada tópico ganha o botão **"Gerar material em PDF"**: a IA escreve o material seguindo o guia-exemplo, o servidor renderiza um **PDF** (Chromium headless) salvo em `content/materiais/`, e o app mostra **"Abrir PDF"**. Sem chave — ou se a API/render falhar — o app avisa e revela o **fallback copiar-e-colar** (copiar o prompt → chat → colar de volta).

Como funciona por baixo:

- A chave vive **só no servidor** (route handler, `process.env`) — nunca no frontend nem no git (`.env.local` está no `.gitignore`).
- **Prompt caching:** o prompt é partido em prefixo estável (framing + guia-exemplo) e bloco volátil (módulo/tópico). O prefixo grande leva `cache_control`, então gerações seguintes dentro da janela leem-no do cache (~10% do custo).
- O guia-exemplo é lido de `docs/guias/exemplo-event-loop.md` — editar esse `.md` muda o material gerado, sem tocar código.
- Os PDFs são servidos por `GET /api/materiais/<arquivo>.pdf` (valida o nome contra path traversal). Ficam em `content/materiais/` (gitignored).
- A API cobre **só o material**; a entrevista (portão) é manual, por **voz no app do Claude** — ver [ADR 0004](docs/adr/0004-api-so-para-material.md).

> **Dependência:** o `puppeteer` baixa um Chromium no `npm install` (pesado). É o motor do PDF.

### Custo e guardas

- **Confira o preço atual em [claude.com/pricing](https://claude.com/pricing) antes de usar** — as tarifas mudam (o Sonnet, por exemplo, sai da tarifa introdutória após 31/08/2026). O programa inteiro (~65 materiais) custa poucos dólares; **US$ 5–10 na carteira de API do Console cobrem tudo com folga.**
- Defina um **spend limit** mensal no [Console](https://platform.claude.com) — é a trava de verdade, do lado que cobra.
- `MONTHLY_CALL_LIMIT` (em `.env.local`, default 100) é uma rede de segurança local: bloqueia novas chamadas ao atingir o teto no mês, contra loops acidentais.
- Modelo configurável via `ANTHROPIC_MODEL` (default `claude-sonnet-5`; `claude-haiku-4-5` é mais barato, `claude-opus-4-8` é mais capaz).

---

## Arquitetura

**Next.js (App Router) + TypeScript**. O núcleo (estado, progresso, prompts) é frontend puro; a superfície de servidor são os route handlers da API de material, que existem para manter a chave fora do frontend e para renderizar o PDF (ver [ADR 0001](docs/adr/0001-sem-api-gerador-de-prompts.md) e [0004](docs/adr/0004-api-so-para-material.md)). Sem chave, a geração cai no copiar-e-colar.

```
src/
├─ app/                       # Next App Router
│  ├─ (layout + página)
│  └─ api/
│     ├─ status/route.ts               # GET → { enabled } (presença da chave; nunca a chave)
│     ├─ generate-material/route.ts    # POST → IA gera markdown → renderiza PDF → salva
│     └─ materiais/[file]/route.ts     # GET → serve o PDF do disco (valida o nome)
├─ components/                # UI (card de módulo, painel de progresso, LED de status)
├─ data/
│  └─ program.ts             # os 13 módulos, derivados do plano de estudo
├─ lib/
│  ├─ types.ts               # tipos de domínio
│  ├─ prompts.ts             # prompts: material (prefixo estável + volátil), dúvidas, entrevista
│  ├─ exampleGuide.ts        # guia-exemplo embutido: fallback do padrão de qualidade
│  ├─ guide.ts               # (servidor) lê o guia de docs/guias/, fallback p/ exampleGuide
│  ├─ pdf.ts                 # (servidor) markdown → HTML estilizado → PDF (marked + puppeteer)
│  ├─ materials.ts           # (servidor) nome/caminho/gravação dos PDFs + resolver seguro
│  ├─ apiClient.ts           # (cliente) fala com /api/*; gera PDF ou revela o fallback
│  ├─ callLimit.ts           # (servidor) teto mensal de chamadas — rede de segurança
│  ├─ verdict.ts             # parser do veredito estruturado da entrevista
│  ├─ schedule.ts            # progresso, estágios, consumo de buffer, cronograma dinâmico
│  ├─ storage.ts             # único ponto que toca o localStorage
│  └─ useAppState.ts         # hook React que amarra estado + persistência
└─ styles/
```

A lógica de domínio (`prompts`, `verdict`, `schedule`) é **pura e testada**, isolada de React e do navegador. A UI é uma casca fina sobre ela. Isso mantém o núcleo verificável e fácil de portar — se um dia o app ganhar backend ou trocar de framework, as regras de negócio não mudam.

### Decisões registradas (ADRs)

- [0001 — Sem API: o app é um gerador de prompts](docs/adr/0001-sem-api-gerador-de-prompts.md)
- [0002 — Persistência em localStorage](docs/adr/0002-persistencia-localstorage.md)
- [0003 — Lógica de domínio pura, isolada da UI](docs/adr/0003-logica-de-dominio-pura.md)
- [0004 — API só para material; entrevista por voz](docs/adr/0004-api-so-para-material.md)

---

## Testes

A lógica crítica tem cobertura de testes — o parser de veredito (que precisa ser tolerante a variações do texto colado) e as regras de buffer/cronograma (onde um erro corromperia o progresso).

```bash
npm run test
```

```
✓ src/lib/__tests__/verdict.test.ts   (9 tests)
✓ src/lib/__tests__/schedule.test.ts  (9 tests)
```

---

## Stack

| Camada        | Escolha                    |
| ------------- | -------------------------- |
| Framework     | Next.js 14 (App Router)    |
| Linguagem     | TypeScript (modo estrito)  |
| Persistência  | localStorage (estado) · PDFs em disco |
| Material       | Anthropic API (`@anthropic-ai/sdk`) → PDF (`marked` + `puppeteer`) |
| Testes        | Vitest                     |
| CI            | GitHub Actions             |

---

## Contexto

Este projeto nasceu como ferramenta de estudo pessoal e é, ele mesmo, uma peça de portfólio: um repositório pequeno mas completo, com arquitetura explícita, decisões documentadas e testes — o tipo de evidência de comunicação de engenharia que um histórico de trabalho solo nem sempre mostra.

## Licença

MIT — ver [LICENSE](LICENSE).
