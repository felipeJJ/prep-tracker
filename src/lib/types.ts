/**
 * Tipos de domínio do prep-tracker.
 *
 * O app é um gerador de prompts + rastreador de progresso. Não fala com nenhuma
 * API: monta prompts para o usuário colar no Claude.ai e recebe de volta o material
 * e o veredito da entrevista (colados manualmente). Todo o estado vive no navegador.
 */

/** Prioridade herdada do Plano rev.2 — governa quanto tempo o módulo merece. */
export type Priority =
  | 'base'
  | 'consolidar'
  | 'prioridade'
  | 'lacuna nº1'
  | 'lacuna crítica'
  | 'diferencial';

/** Um módulo do programa, como definido no seed (Plano rev.2). */
export interface Module {
  id: string;
  order: number;
  name: string;
  priority: Priority;
  /** Semanas planejadas no cronograma original. */
  plannedWeeks: number;
  /** Âncora concreta do dossiê — o exemplo real que dá lastro ao estudo. */
  anchor: string;
  /** Subtópicos que o material de estudo deve cobrir. */
  topics: string[];
  /** Se true, as entrevistas deste módulo em diante são conduzidas em inglês. */
  englishFrom?: boolean;
}

/** Metadados do programa (janela, ritmo, buffer). */
export interface ProgramMeta {
  target: string;
  startDate: string;
  applyDate: string;
  hoursPerWeek: number;
  bufferWeeks: number;
}

export interface Program {
  meta: ProgramMeta;
  modules: Module[];
}

/** Estágio de um módulo no ciclo de estudo. */
export type ModuleStage =
  | 'not-started' // ainda não começou
  | 'studying' // ao menos um tópico com material gerado, em estudo
  | 'ready-for-gate' // estudou, pronto para a entrevista-portão
  | 'passed' // passou no portão
  | 'needs-review'; // reprovou; consome buffer, precisa revisar

/** Resultado de uma sessão de entrevista-portão, parseado do veredito colado. */
export interface GateResult {
  /** Data ISO do registro. */
  at: string;
  passed: boolean;
  /** Tópicos apontados como fracos pelo avaliador (foco da revisão). */
  weakTopics: string[];
  /** Comentário livre do avaliador, se houver. */
  notes?: string;
}

/**
 * Material de estudo de UM tópico. Há dois caminhos, refletidos aqui:
 *  - Via API (caminho principal): o material vira um PDF no servidor; guarda-se `pdfPath`.
 *  - Via copiar-e-colar (fallback): o markdown colado do chat vai em `content`.
 * Pelo menos um dos dois está presente.
 */
export interface StudyMaterial {
  /** Data ISO em que foi salvo. */
  savedAt: string;
  /** URL para abrir o PDF gerado via API (ex.: /api/materiais/m4-event-loop.pdf). */
  pdfPath?: string;
  /** Conteúdo em markdown, colado do chat no modo fallback. */
  content?: string;
}

/**
 * Estado de progresso de um único módulo (o que muda ao longo do tempo).
 *
 * O material é rastreado POR TÓPICO: cada tópico do módulo tem (ou não) seu
 * próprio material gerado. Isso mantém cada peça pequena e bem produzida —
 * pedir "o módulo AWS inteiro" de uma vez degradava a qualidade.
 */
export interface ModuleProgress {
  moduleId: string;
  stage: ModuleStage;
  /** Materiais por tópico. A chave é o nome do tópico (Module.topics[i]). */
  materials: Record<string, StudyMaterial>;
  /** Anotações livres do usuário sobre o módulo. */
  notes: string;
  /** Histórico de tentativas no portão (a última é a que vale). */
  gateResults: GateResult[];
}

/** Estado completo persistido no localStorage. */
export interface AppState {
  /** Versão do schema — permite migração futura. */
  version: 2;
  progress: Record<string, ModuleProgress>;
  /**
   * Semanas de buffer já consumidas por reprovações.
   * bufferRemaining = meta.bufferWeeks - bufferConsumed.
   */
  bufferConsumed: number;
}
