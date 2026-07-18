# ADR 0001 — Sem API: o app é um gerador de prompts

**Status:** aceito

## Contexto

O app precisa produzir material de estudo aprofundado, conduzir entrevistas
simuladas e responder dúvidas — todas tarefas de LLM. A rota óbvia seria o app
chamar a API de um provedor de IA diretamente.

Duas forças pesam contra isso:

1. **Custo e credenciais.** Chamar uma API paga exige uma chave, gestão segura
   dessa chave (nunca no cliente), e gera custo por uso. O usuário já possui um
   plano de chat (Claude.ai) e não deseja pagar por API separada.
2. **Superfície de risco.** Uma chave secreta no projeto implica backend,
   variáveis de ambiente, e o risco permanente de vazamento — desproporcional
   para uma ferramenta de uso pessoal.

## Decisão

O app **não chama nenhuma IA**. Ele é um gerador de prompts contextualizados.
Para cada ação (gerar material, tirar dúvidas, entrevistar), o app monta o prompt
apropriado — com o contexto do módulo, o progresso e o material já estudado — e o
usuário o copia para um chat de IA que já usa. O resultado (material, veredito)
volta ao app por copiar-e-colar.

## Consequências

**Positivas:**
- Zero custo de API, zero chave, zero backend. O app é puro frontend estático.
- O valor do app — saber _qual_ prompt montar, _quando_ e _com qual contexto_ —
  fica intacto. É o cérebro, não o músculo.
- Simplicidade de deploy: qualquer host de estático serve.

**Negativas / trade-offs:**
- O ciclo da entrevista não é fechado automaticamente. A IA responde no chat, não
  no app; o veredito precisa ser colado de volta. Mitigado com um formato de
  veredito estruturado que o app parseia (ver `src/lib/verdict.ts`).
- Há fricção de copiar-e-colar entre app e chat. Aceitável para uso pessoal e
  metódico; seria inadequado para um produto de consumo em escala.

## Alternativas consideradas

- **Chamar a API com chave no `.env` + backend.** Rejeitada pelo custo e pela
  superfície de risco, desproporcionais ao caso de uso pessoal.
- **Integração com CLI local de IA.** Viável, mas acopla o app a uma ferramenta
  específica e complica o setup; contraria o objetivo de rodar com um comando.
