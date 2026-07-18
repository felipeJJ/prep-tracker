import type { Module, ModuleProgress } from '@/lib/types';

/**
 * Geração de prompts.
 *
 * O app não chama nenhuma IA. Ele monta prompts ricos para o usuário copiar e
 * colar num chat do Claude.ai. A qualidade do material depende inteiramente da
 * qualidade destes prompts — por isso eles carregam a especificação completa do
 * que o material deve conter, além do contexto do módulo e do progresso.
 */

const MENTOR_FRAMING = `Você é um mentor de engenharia de software sênior preparando um desenvolvedor \
brasileiro (full-stack, ~2 anos de produção real num ERP financeiro) para vagas mid-level \
internacionais como contractor. Trate-o como alguém que já domina desenvolvimento web moderno — \
não explique o básico (o que é API, CRUD, React, Docker). Priorize raciocínio, trade-offs e \
profundidade sobre memorização.`;

/**
 * Prompt para GERAR o material de estudo de um módulo.
 * Inclui a especificação de formato/qualidade que o material deve seguir.
 */
export function buildMaterialPrompt(module: Module): string {
  const topics = module.topics.map((t) => `- ${t}`).join('\n');

  return `${MENTOR_FRAMING}

# Tarefa
Gere um material de estudo aprofundado sobre o módulo "${module.name}".

# Âncora (use como fio condutor)
Sempre que possível, conecte os conceitos a esta experiência real do aluno:
"${module.anchor}"

# Tópicos que o material DEVE cobrir
${topics}

# Especificação do material (siga à risca)
Para CADA tópico acima, o material deve conter, nesta ordem:

1. **O que é e por que existe** — o problema que resolve, não só a definição.
2. **Como funciona por dentro** — arquitetura, componentes, limitações. Profundidade de \
engenheiro, não de tutorial.
3. **Trade-offs** — quando usar, quando NÃO usar, e quais alternativas existem. Esta seção é \
obrigatória e é a mais importante.
4. **Exemplo de código** — curto, comentado, em TypeScript/Node quando fizer sentido. O código \
ilustra o conceito; não precisa ser um projeto completo.
5. **Como isso melhoraria o sistema do aluno** — aplicação concreta ao ERP financeiro, ligada à \
âncora.

# Formato
- Markdown, com títulos claros por tópico.
- Priorize prosa densa e precisa sobre listas rasas.
- Ao fim de cada tópico, inclua **uma pergunta de aprofundamento** do tipo que um entrevistador \
faria (ex.: "por que não a alternativa X?", "e se a escala for 100×?").
- Encerre o material com uma seção "## Pontos que um entrevistador vai cutucar" listando os 3–5 \
lugares onde o aluno provavelmente travaria sob aprofundamento.

Escreva o material completo agora.`;
}

/**
 * Prompt para TIRAR DÚVIDAS sobre um módulo já estudado.
 * Contextualiza o chat com o material e as anotações do aluno.
 */
export function buildDoubtsPrompt(module: Module, progress?: ModuleProgress): string {
  const hasMaterial = progress?.material?.content?.trim();
  const materialBlock = hasMaterial
    ? `\n\n# Material que o aluno já estudou (para contexto)\n${truncate(progress!.material!.content, 6000)}`
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
