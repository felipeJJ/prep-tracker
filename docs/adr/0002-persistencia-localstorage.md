# ADR 0002 — Persistência em localStorage

**Status:** aceito

## Contexto

O app precisa lembrar o progresso: estágio de cada módulo, material salvo,
anotações, resultados de entrevista e buffer consumido. Como decidido no ADR 0001,
não há backend. As opções de persistência no navegador são `localStorage`,
`IndexedDB`, ou um pequeno backend com SQLite.

## Decisão

Usar `localStorage`, encapsulado num único módulo (`src/lib/storage.ts`).

O volume de dados é pequeno (dezenas de KB no pior caso — 13 módulos, cada um com
um material em markdown e algumas anotações). `localStorage` comporta isso com
folga, é síncrono e trivial de usar, e não exige setup.

## Consequências

**Positivas:**
- Zero configuração; o app roda com `npm run dev` e nada mais.
- Toda a persistência atravessa um único módulo, então trocar de mecanismo depois
  é uma mudança localizada.

**Negativas / trade-offs:**
- Dados presos a um navegador/máquina. Sem sincronização entre dispositivos.
  Aceitável: o estudo acontece num setup fixo.
- `localStorage` tem limite (~5 MB) e é síncrono. Se um material colado for muito
  grande, pode aproximar o limite; improvável no uso previsto, e a escrita falha
  de forma silenciosa e segura (o app segue funcional em memória na sessão).

## Versionamento do schema

O estado carrega um campo `version`. Quando o modelo mudou de material único
por módulo (v1) para material por tópico (v2), a decisão foi **descartar** o
estado v1 ao carregar, em vez de escrever uma migração. Justificativa: é uma
ferramenta pessoal, o material é regenerável a partir dos prompts, e uma
migração custaria mais do que vale. Um produto com dados de usuários reais
exigiria a migração — aqui, o descarte é o trade-off certo.

## Alternativas consideradas

- **IndexedDB.** Mais robusto e assíncrono, mas overkill para este volume e com
  API mais verbosa. Reconsiderar se o app passar a guardar histórico volumoso.
- **Backend + SQLite.** Contraria o ADR 0001 (sem servidor). Seria a escolha se
  sincronização entre dispositivos virasse requisito.
