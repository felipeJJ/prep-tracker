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
 * Prompt para GERAR o material de estudo de UM TÓPICO de um módulo.
 * Embute o guia-exemplo como padrão de qualidade a ser replicado.
 */
export function buildMaterialPrompt(module: Module, topic: string): string {
  return `${MENTOR_FRAMING}

# Tarefa
Gere um material de estudo aprofundado sobre UM tópico específico:

- **Módulo:** ${module.name}
- **Tópico:** ${topic}

Cubra SOMENTE este tópico. Não tente cobrir o módulo inteiro — outros tópicos têm seu próprio \
material. Focar num tópico é o que mantém a qualidade alta.

# Âncora (use como fio condutor)
Sempre que possível, conecte o tópico a esta experiência real do aluno:
"${module.anchor}"

# Padrão de qualidade — replique a estrutura, o tom e a profundidade do exemplo abaixo
O exemplo a seguir é de OUTRO tópico. Use-o como molde de FORMA, não de conteúdo: mesma espinha \
socrática (cada seção abre com uma pergunta que o aluno tenta responder antes de ler), mesma \
profundidade técnica de referência, mesmos blocos de código comentados, mesma seção final de \
auto-teste e de "onde o entrevistador vai cutucar".

--- INÍCIO DO GUIA-EXEMPLO ---
${EXAMPLE_GUIDE}
--- FIM DO GUIA-EXEMPLO ---

# Agora produza o material do tópico "${topic}"
Siga o mesmo padrão do exemplo, adaptado a este tópico. Exigências:
- Cada seção principal abre com uma **pergunta** e um convite a pensar antes da explicação.
- Profundidade de engenheiro (o "porquê" e os trade-offs), não tutorial de superfície.
- Ao menos um **exemplo de código** comentado (TypeScript/Node quando fizer sentido).
- Conecte ao sistema do aluno (o ERP financeiro) via âncora, ao menos uma vez.
- Termine com **"Teste-se antes do portão"** (perguntas de auto-verificação) e **"Onde o \
entrevistador vai cutucar"** (armadilhas com resposta curta).
- Markdown. Prosa densa e precisa sobre listas rasas.

Escreva o material completo agora.`;
}

/**
 * Prompt para TIRAR DÚVIDAS sobre um módulo já estudado.
 * Contextualiza o chat com o material e as anotações do aluno.
 */
export function buildDoubtsPrompt(module: Module, progress?: ModuleProgress): string {
  const materials = progress?.materials ?? {};
  const combined = Object.entries(materials)
    .map(([topic, m]) => `## ${topic}\n${m.content}`)
    .join('\n\n');
  const materialBlock = combined.trim()
    ? `\n\n# Material que o aluno já estudou (para contexto)\n${truncate(combined, 8000)}`
    : '';
  const notesBlock = progress?.notes?.trim()
    ? `\n\n# Anotações do aluno\n${progress.notes.trim()}`
    : '';

  return `${MENTOR_FRAMING}

# Contexto
O aluno estudou o módulo "${module.name}" e quer tirar dúvidas / discutir o tema em profundidade.
Âncora do módulo: "${module.anchor}"${materialBlock}${notesBlock}

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
 * Instrui a IA a AVALIAR se o aluno sustentou a conversa de forma sucinta,
 * e a emitir um veredito estruturado que o app consegue parsear.
 */
export function buildInterviewPrompt(module: Module): string {
  const inEnglish = !!module.englishFrom;
  const langNote = inEnglish
    ? `\n\n# IDIOMA\nA partir deste módulo, conduza a entrevista INTEIRAMENTE EM INGLÊS. Avalie \
também a clareza e fluência do inglês técnico do candidato — travar por não saber dizer conta \
como fraqueza, tanto quanto travar por não saber o conceito.`
    : '';

  const topics = module.topics.map((t) => `- ${t}`).join('\n');

  return `${MENTOR_FRAMING}

# Papel: Entrevistador Técnico
Conduza uma entrevista simulada sobre "${module.name}", no padrão de empresas internacionais para \
uma vaga mid-level. Este é um PORTÃO: o objetivo é verificar se o candidato consegue sustentar a \
conversa e as explicações de forma clara, sucinta e sob aprofundamento.${langNote}

# Tópicos em jogo
${topics}

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

# Veredito final (OBRIGATÓRIO — formato exato para o app parsear)
Ao encerrar, emita um bloco EXATAMENTE neste formato, entre as marcas, sem texto fora delas:

===VEREDITO===
RESULTADO: PASSOU | NAO_PASSOU
TOPICOS_FRACOS: tópico um; tópico dois; (ou "nenhum")
COMENTARIO: uma a três frases sobre o desempenho.
===FIM===

Comece a entrevista agora com a primeira pergunta.`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '\n\n[...material truncado para caber no contexto...]';
}
