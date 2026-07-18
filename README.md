# prep-tracker

Um painel de estudo auto-dirigido para preparação a vagas de **Software Engineer mid-level internacional**. O app rastreia o progresso por módulo e gera prompts contextualizados para você estudar, tirar dúvidas e passar por entrevistas simuladas — sem depender do histórico de nenhum chat e sem consumir API paga.

> **Por que existe:** um programa de estudo com 13 módulos é fácil de começar e difícil de sustentar. O gargalo não é o conteúdo — é manter continuidade, saber onde parou, e ser honesto sobre o que ainda não domina. Este app resolve isso transformando o plano de estudo em um sistema com estado, um portão de qualidade por módulo, e um custo visível para o atraso.

---

## O modelo mental

Cada módulo se divide em **tópicos**, e o material é gerado **um tópico por vez** — pedir "o módulo inteiro" de uma vez força a IA a produzir um documento gigante e a qualidade despenca. Cada tópico gera seu próprio material, focado e profundo. Quando os tópicos estão cobertos, o módulo enfrenta o **portão**: uma entrevista simulada sobre o módulo inteiro, que você só passa se sustentar a conversa.

```
  1. Gerar material        ──▶  2. Estudar + dúvidas  ──▶  3. Entrevista (portão)  ──▶  4. Veredito
     POR TÓPICO                       │                          │                        │
        │                        prompt p/ chat             prompt p/ chat          PASSOU → módulo fecha
   prompt de 1 tópico +        (contextualizado           (cobre o módulo      NÃO PASSOU → consome buffer,
   guia-exemplo embutido        com seus materiais)         inteiro; a IA avalia)  marca tópicos fracos
```

O prompt de cada tópico embute um **guia-exemplo** (um tópico-modelo escrito por inteiro) que serve de padrão de qualidade — a IA replica a estrutura, o tom e a profundidade.

O app **não chama nenhuma IA**. Ele monta o prompt certo, com o contexto certo, e você o cola num chat do Claude.ai (ou de outra IA que já use). O material e o veredito da entrevista voltam para o app por copiar-e-colar. Toda a inteligência de _quando_ e _com o quê_ pedir vive no app; a geração vive no seu plano de chat que já existe.

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

Nenhuma configuração de ambiente é necessária — não há chaves, não há backend. O estado é persistido no `localStorage` do navegador.

---

## Arquitetura

Frontend puro em **Next.js (App Router) + TypeScript**, sem servidor. A decisão de não ter backend nem API é deliberada e está documentada em [`docs/adr/`](docs/adr).

```
src/
├─ app/                 # Next App Router (layout + página)
├─ components/          # UI (card de módulo, painel de progresso, LED de status)
├─ data/
│  └─ program.ts        # os 13 módulos, derivados do plano de estudo
├─ lib/
│  ├─ types.ts          # tipos de domínio
│  ├─ prompts.ts        # geração dos 3 prompts (material por tópico, dúvidas, entrevista)
│  ├─ exampleGuide.ts   # guia-exemplo embutido: o padrão de qualidade do material
│  ├─ verdict.ts        # parser do veredito estruturado da entrevista
│  ├─ schedule.ts       # progresso, estágios, consumo de buffer, cronograma dinâmico
│  ├─ storage.ts        # único ponto que toca o localStorage
│  └─ useAppState.ts    # hook React que amarra estado + persistência
└─ styles/
```

A lógica de domínio (`prompts`, `verdict`, `schedule`) é **pura e testada**, isolada de React e do navegador. A UI é uma casca fina sobre ela. Isso mantém o núcleo verificável e fácil de portar — se um dia o app ganhar backend ou trocar de framework, as regras de negócio não mudam.

### Decisões registradas (ADRs)

- [0001 — Sem API: o app é um gerador de prompts](docs/adr/0001-sem-api-gerador-de-prompts.md)
- [0002 — Persistência em localStorage](docs/adr/0002-persistencia-localstorage.md)
- [0003 — Lógica de domínio pura, isolada da UI](docs/adr/0003-logica-de-dominio-pura.md)

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
| Persistência  | localStorage               |
| Testes        | Vitest                     |
| CI            | GitHub Actions             |

---

## Contexto

Este projeto nasceu como ferramenta de estudo pessoal e é, ele mesmo, uma peça de portfólio: um repositório pequeno mas completo, com arquitetura explícita, decisões documentadas e testes — o tipo de evidência de comunicação de engenharia que um histórico de trabalho solo nem sempre mostra.

## Licença

MIT — ver [LICENSE](LICENSE).
