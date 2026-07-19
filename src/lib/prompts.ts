import type { Module, ModuleProgress } from '@/lib/types';
import { EXAMPLE_GUIDE } from '@/lib/exampleGuide';

/**
 * Geração de prompts.
 *
 * O app não chama nenhuma IA. Ele monta prompts ricos para o usuário copiar e
 * colar num chat do Claude.ai. A qualidade do material depende inteiramente da
 * qualidade destes prompts — por isso eles carregam o guia-exemplo (o padrão de
 * qualidade), o contexto do módulo/tópico e o progresso.
 *
 * O material é pedido POR TÓPICO, não pelo módulo inteiro: pedir "AWS inteiro"
 * força uma resposta gigante e a qualidade despenca. Um tópico por vez sai focado
 * e profundo.
 */

const MENTOR_FRAMING = `Você é um mentor de engenharia de software sênior preparando um desenvolvedor \
brasileiro (full-stack, ~2 anos de produção real num ERP financeiro) para vagas mid-level \
internacionais como contractor. Trate-o como alguém que já domina desenvolvimento web moderno — \
não explique o básico (o que é API, CRUD, React, Docker). Priorize raciocínio, trade-offs e \
profundidade sobre memorização.`;

/**
 * Prefixo ESTÁVEL do prompt de material: framing + padrão de qualidade + guia-exemplo +
 * exigências gerais. NÃO contém módulo/tópico — é byte-a-byte idêntico em toda geração, o que
 * o torna cacheável. O guia é um bloco grande (~3k tokens); marcá-lo com cache_control corta
 * ~90% do seu custo a partir da 2ª chamada dentro da janela de cache.
 *
 * O guia é INJETADO, não importado direto: no fallback (cliente) passa-se o `EXAMPLE_GUIDE`
 * embutido (default); no servidor passa-se o conteúdo real lido de `docs/guias/`.
 */
export function materialStablePrefix(exampleGuide: string = EXAMPLE_GUIDE): string {
  return `${MENTOR_FRAMING}

# Sua tarefa
Você vai gerar um material de estudo aprofundado sobre UM tópico específico de um módulo — o \
tópico e o módulo exatos vêm no FIM desta mensagem. Cubra SOMENTE esse tópico; não tente cobrir o \
módulo inteiro (outros tópicos têm seu próprio material). Focar num tópico é o que mantém a \
qualidade alta.

# Padrão de qualidade — replique a estrutura, o tom e a profundidade do exemplo abaixo
O exemplo a seguir é de OUTRO tópico. Use-o como molde de FORMA, não de conteúdo: mesma espinha \
socrática (cada seção abre com uma pergunta que o aluno tenta responder antes de ler), mesma \
profundidade técnica de referência, mesmos blocos de código comentados, mesma seção final de \
auto-teste e de "onde o entrevistador vai cutucar".

--- INÍCIO DO GUIA-EXEMPLO ---
${exampleGuide}
--- FIM DO GUIA-EXEMPLO ---

# Exigências (valem para qualquer tópico)
- Cada seção principal abre com uma **pergunta** e um convite a pensar antes da explicação.
- Profundidade de engenheiro (o "porquê" e os trade-offs), não tutorial de superfície.
- Ao menos um **exemplo de código** comentado (TypeScript/Node quando fizer sentido).
- Conecte ao sistema do aluno (o ERP financeiro) via âncora, ao menos uma vez.
- Termine com **"Teste-se antes do portão"** (perguntas de auto-verificação) e **"Onde o \
entrevistador vai cutucar"** (armadilhas com resposta curta).
- Markdown. Prosa densa e precisa sobre listas rasas.`;
}

/**
 * Bloco VOLÁTIL do prompt: o tópico específico a produzir agora. Fica DEPOIS do prefixo
 * estável, para não invalidar o cache do prefixo.
 */
export function materialTaskBlock(module: Module, topic: string): string {
  return `# O tópico a produzir agora
- **Módulo:** ${module.name}
- **Tópico:** ${topic}
- **Âncora** (use como fio condutor, conecte ao menos uma vez): "${module.anchor}"

Siga o padrão do exemplo, adaptado a este tópico. Escreva o material completo agora, em Markdown.`;
}

/**
 * Prompt completo de material como UMA string (modo copiar-e-colar / fallback).
 * A camada de API usa as duas partes acima separadas para poder cachear o prefixo estável.
 */
export function buildMaterialPrompt(
  module: Module,
  topic: string,
  exampleGuide: string = EXAMPLE_GUIDE,
): string {
  return `${materialStablePrefix(exampleGuide)}\n\n${materialTaskBlock(module, topic)}`;
}

/**
 * Prompt para TIRAR DÚVIDAS sobre um módulo já estudado.
 * Contextualiza o chat com o material e as anotações do aluno.
 */
export function buildDoubtsPrompt(module: Module, progress?: ModuleProgress): string {
  const entries = Object.entries(progress?.materials ?? {});
  // Material colado (fallback) entra como contexto; material só-PDF entra só pelo nome do tópico
  // (o conteúdo vive no PDF, não no estado do app).
  const withText = entries.filter(([, m]) => m.content?.trim());
  const combined = withText.map(([topic, m]) => `## ${topic}\n${m.content}`).join('\n\n');
  const pdfOnly = entries.filter(([, m]) => m.pdfPath && !m.content?.trim()).map(([t]) => t);

  const materialBlock = combined.trim()
    ? `\n\n# Material que o aluno já estudou (para contexto)\n${truncate(combined, 8000)}`
    : '';
  const studiedBlock = pdfOnly.length
    ? `\n\n# Tópicos já estudados (material em PDF, conteúdo não incluído aqui)\n${pdfOnly.map((t) => `- ${t}`).join('\n')}`
    : '';
  const notesBlock = progress?.notes?.trim()
    ? `\n\n# Anotações do aluno\n${progress.notes.trim()}`
    : '';

  return `${MENTOR_FRAMING}

# Contexto
O aluno estudou o módulo "${module.name}" e quer tirar dúvidas / discutir o tema em profundidade.
Âncora do módulo: "${module.anchor}"${materialBlock}${studiedBlock}${notesBlock}

# Seu papel agora
Responda como Tech Lead / Arquiteto. Questione decisões, ofereça alternativas, aprofunde. Quando o \
aluno acertar, aumente a profundidade em vez de só validar. Escreva sua primeira mensagem se \
apresentando brevemente e perguntando qual é a dúvida — ou, se o aluno já colou uma pergunta \
abaixo, responda-a diretamente.

# Dúvida do aluno
[escreva sua dúvida aqui, ou deixe em branco para o mentor perguntar]`;
}

/**
 * Prompt para o MODO ENTREVISTA (o portão de saída do módulo).
 *
 * Inicia a conversa no app do Claude JÁ como entrevistador: embute os materiais de estudo do
 * módulo como contexto (o aluno pode também anexar os PDFs), instrui a IA a conduzir uma
 * entrevista baseada nesses materiais + tópicos, e a encerrar com um veredito (falado + bloco
 * estruturado que o app parseia).
 */
export function buildInterviewPrompt(module: Module, progress?: ModuleProgress): string {
  const inEnglish = !!module.englishFrom;
  const langNote = inEnglish
    ? `\n\n# IDIOMA\nA partir deste módulo, conduza a entrevista INTEIRAMENTE EM INGLÊS. Avalie \
também a clareza e fluência do inglês técnico do candidato — travar por não saber dizer conta \
como fraqueza, tanto quanto travar por não saber o conceito.`
    : '';

  const topics = module.topics.map((t) => `- ${t}`).join('\n');

  // Materiais de estudo como base da entrevista (o conteúdo salvo junto do PDF).
  const withText = Object.entries(progress?.materials ?? {}).filter(([, m]) => m.content?.trim());
  const materialContext = withText.map(([t, m]) => `## ${t}\n${m.content}`).join('\n\n');
  const materialBlock = materialContext.trim()
    ? `\n\n# Material de estudo deste módulo (BASE da entrevista)
O aluno estudou o material abaixo. Baseie a entrevista NELE e nos tópicos: cobre o raciocínio e os \
trade-offs por trás do que está escrito, não a memorização literal. (O aluno pode também ter \
anexado os PDFs deste módulo a esta conversa — se anexou, use-os igualmente.)
${truncate(materialContext, 16000)}`
    : `\n\n# Material de estudo deste módulo
O material não foi embutido aqui. Se o aluno anexou os PDFs deste módulo, baseie a entrevista \
neles; senão, conduza pelos tópicos listados acima.`;

  return `${MENTOR_FRAMING}

# Papel: Entrevistador Técnico
Conduza uma entrevista simulada sobre "${module.name}", no padrão de empresas internacionais para \
uma vaga mid-level. Este é um PORTÃO: o objetivo é verificar se o candidato consegue sustentar a \
conversa e as explicações de forma clara, sucinta e sob aprofundamento.${langNote}

# Tópicos em jogo
${topics}${materialBlock}

# Regras da entrevista
1. Faça perguntas em dificuldade CRESCENTE. Comece acessível, aprofunde a cada acerto.
2. Sempre que a resposta estiver correta, cave mais fundo ("por que não X?", "e a 100× a escala?").
3. NUNCA interrompa a entrevista para ensinar. Só avalia.
4. Faça uma pergunta por vez e espere a resposta.
5. Conduza de 6 a 10 perguntas, depois encerre e avalie.

# Critério de aprovação
O candidato PASSA se sustentou explicações claras e sucintas, justificou decisões e aguentou pelo \
menos dois níveis de aprofundamento na maioria dos tópicos. Hesitação pontual não reprova; não \
conseguir defender o raciocínio, sim.

# Veredito final (OBRIGATÓRIO)
Ao encerrar, emita seu veredito de DUAS formas complementares, para funcionar tanto por texto quanto por voz:

1. **Falado (para o modo de voz no app do Claude).** Enuncie o veredito de forma clara e \
transcritível, para o candidato ouvir e digitar os campos no app. Diga explicitamente, nesta ordem:
   - "Resultado: passou" **ou** "Resultado: não passou".
   - Os tópicos fracos, um a um (ou "nenhum tópico fraco").
   - Um comentário de uma a três frases sobre o desempenho.

2. **Bloco estruturado (para quem usar por texto).** Logo depois, emita um bloco EXATAMENTE neste \
formato, entre as marcas, sem texto fora delas:

===VEREDITO===
RESULTADO: PASSOU | NAO_PASSOU
TOPICOS_FRACOS: tópico um; tópico dois; (ou "nenhum")
COMENTARIO: uma a três frases sobre o desempenho.
===FIM===

No modo de voz, dizer o bloco em voz alta soa artificial — priorize a forma falada; o bloco é para \
quando a entrevista for por texto. Comece a entrevista agora com a primeira pergunta.`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '\n\n[...material truncado para caber no contexto...]';
}
