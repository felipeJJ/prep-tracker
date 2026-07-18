# ADR 0003 — Lógica de domínio pura, isolada da UI

**Status:** aceito

## Contexto

As regras que importam neste app — como um prompt é montado, como o veredito da
entrevista é parseado, como uma reprovação consome buffer e recalcula o
cronograma — são a parte que, se estiver errada, corrompe o progresso ou degrada
o material. Essas regras não podem depender de React nem do navegador para serem
verificadas.

## Decisão

Concentrar toda a lógica de negócio em módulos puros sob `src/lib/`
(`prompts.ts`, `verdict.ts`, `schedule.ts`), sem imports de React nem de APIs do
navegador. Funções recebem estado e retornam novo estado (imutável). A UI e o
hook de persistência (`useAppState.ts`) são cascas finas que orquestram essas
funções.

Efeitos colaterais (localStorage, clipboard) ficam nas bordas: `storage.ts` e os
componentes.

## Consequências

**Positivas:**
- O núcleo é testável sem montar componentes nem simular navegador — os testes
  rodam em Node puro e são rápidos.
- Funções imutáveis (`recordGateResult`, `saveMaterial`) tornam o fluxo de estado
  previsível e fácil de raciocinar.
- Portabilidade: trocar de framework ou adicionar backend não toca as regras.

**Negativas / trade-offs:**
- Alguma cerimônia a mais: passar estado explicitamente em vez de mutar. É o preço
  da previsibilidade, e vale para lógica que não pode quebrar em silêncio.
