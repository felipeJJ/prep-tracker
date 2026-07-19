# ADR 0004 — Material gerado via API em PDF; entrevista por voz

**Status:** aceito · **Substitui**, para o material, o [ADR 0001](0001-sem-api-gerador-de-prompts.md)

## Contexto

O [ADR 0001](0001-sem-api-gerador-de-prompts.md) decidiu que o app não chamaria IA: seria um
gerador de prompts, com material e veredito voltando por copiar-e-colar. As forças contra a
API eram custo, gestão de chave e superfície de risco.

Na prática, o copiar-e-colar do **material** é o atrito diário: são ~65 materiais no programa,
e alternar app ↔ chat externo para cada um cansa e desincentiva o hábito. A intenção real do
projeto é **gerar o material dentro do app, em PDF**, seguindo o padrão do guia-exemplo — sem
ir a chat nenhum no caminho feliz.

Ao mesmo tempo, a parte espinhosa nunca foi o material — foi a **entrevista** (multi-turno,
com estado e veredito estruturado no meio do diálogo). E a entrevista rende mais **falada**,
em inglês, no app de voz do Claude, dentro do plano de assinatura que já se paga.

## Decisão

**Gerar o material via API, como PDF, é o caminho principal.** Copiar-e-colar vira o fallback.

- **Material (caminho principal):** com `ANTHROPIC_API_KEY` configurada, o app pede o material
  à Messages API (a IA escreve em Markdown seguindo o guia-exemplo) e o **renderiza em PDF no
  servidor** (Chromium headless), salvo em disco e aberto pelo app. Sem estado — uma requisição,
  uma resposta, um PDF.
- **Cache:** o prompt é partido em **prefixo estável** (framing + guia-exemplo, um bloco grande
  e idêntico em toda geração) e **bloco volátil** (módulo/tópico). O prefixo estável leva
  `cache_control`, então a partir da 2ª geração dentro da janela ele é lido do cache (~10% do
  custo). O guia vem de `docs/guias/` no servidor (editável sem tocar código).
- **Fallback copiar-e-colar:** se não houver chave, ou a API/render falhar (sem crédito,
  rate-limit, rede, erro de PDF), o app **avisa e cai no copiar-e-colar** — copiar o prompt,
  gerar num chat, colar o resultado. Não é mais o fluxo padrão; é a rede de segurança.
- **Entrevista:** continua **manual, por voz** no app do Claude. Nada no fluxo de entrevista,
  veredito ou buffer é tocado. O prompt ganhou só um acréscimo para enunciar o veredito de
  forma transcritível na voz; o bloco `===VEREDITO===` segue para o modo por texto.
- **Chave só no servidor** (route handler, `process.env`) — nunca no frontend nem no git.

## Consequências

**Positivas:**

- Material gerado em PDF dentro do app, sem alternar de janela — o atrito diário some, que era
  o ponto.
- A parte cara/complexa (entrevista com estado) fica **fora** do projeto; a integração de
  material é o caso mais simples de API (stateless, um round-trip) + um render de PDF local.
- O cache do prefixo (guia-exemplo, ~3k tokens, idêntico sempre) reduz o custo por chamada.
- Custo pequeno e previsível, protegido por spend limit no Console e por um teto local de
  chamadas; e o fallback copiar-e-colar continua como saída sem custo.

**Negativas / trade-offs:**

- Passa a existir superfície de servidor (route handlers) e dependências: `@anthropic-ai/sdk`,
  `marked` e **`puppeteer`** (que baixa um Chromium — dependência pesada). Aceito por rodar
  local e por ser opcional: sem chave, o app é o copiar-e-colar de antes.
- Custo por uso do material. Mitigado por spend limit (Console) e `MONTHLY_CALL_LIMIT` (local).
- O material gerado via API é guardado **só como PDF** (mais um marcador no app), não como
  Markdown no estado. Consequência: o prompt de "tirar dúvidas" não embute o conteúdo desses
  tópicos — lista o tópico pelo nome (o conteúdo vive no PDF). Materiais salvos pelo fallback
  (texto colado) seguem entrando como contexto das dúvidas normalmente.
- O ciclo da entrevista continua não fechado automaticamente — intencional: a entrevista
  falada é onde o treino real acontece.

## Alternativas consideradas

- **API também para a entrevista.** Rejeitada: multi-turno com estado é a parte mais complexa,
  e a entrevista rende mais falada. A voz no app do Claude resolve melhor, sem tocar crédito.
- **Manter tudo copiar-e-colar (ADR 0001).** Rejeitada para o material: o atrito diário
  desincentiva o hábito; gerar em PDF no app é o ganho central.
- **PDF pelo navegador (imprimir) ou pela skill `pdf` da Anthropic.** Rejeitadas em favor do
  render server-side com Chromium: gera o arquivo automaticamente (sem diálogo), com controle
  total do visual via CSS e formando uma biblioteca de PDFs em disco.
- **Guardar também o Markdown.** Adiada: a escolha foi guardar só o PDF + marcador. Reabrir
  essa decisão é o caminho se o prompt de dúvidas precisar do conteúdo como contexto.
