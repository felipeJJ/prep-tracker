import type {
  AppState,
  GateResult,
  Module,
  ModuleProgress,
  ModuleStage,
  Program,
} from '@/lib/types';

/**
 * Lógica de progresso e cronograma.
 *
 * Regras que implementam o Plano rev.2:
 *  - O portão manda: um módulo só fecha ("passed") quando passa na entrevista.
 *  - Reprovar tem preço: cada reprovação consome 1 semana do buffer (3 no total)
 *    e joga o módulo para "needs-review".
 *  - O cronograma é recalculado a partir do progresso real, não fixo.
 */

export function emptyProgress(moduleId: string): ModuleProgress {
  return { moduleId, stage: 'not-started', notes: '', gateResults: [] };
}

export function initialState(): AppState {
  return { version: 1, progress: {}, bufferConsumed: 0 };
}

export function getProgress(state: AppState, moduleId: string): ModuleProgress {
  return state.progress[moduleId] ?? emptyProgress(moduleId);
}

/** Buffer restante nunca fica negativo — quando esgota, o atraso "estoura" o prazo. */
export function bufferRemaining(state: AppState, program: Program): number {
  return Math.max(0, program.meta.bufferWeeks - state.bufferConsumed);
}

/** true quando o buffer estourou (mais reprovações do que semanas de reserva). */
export function bufferBlown(state: AppState, program: Program): boolean {
  return state.bufferConsumed > program.meta.bufferWeeks;
}

/** Salva o material de estudo e move o módulo para "studying" se ainda não começou. */
export function saveMaterial(
  state: AppState,
  moduleId: string,
  content: string,
  now: () => Date = () => new Date(),
): AppState {
  const prev = getProgress(state, moduleId);
  const stage: ModuleStage =
    prev.stage === 'not-started' ? 'studying' : prev.stage;
  const next: ModuleProgress = {
    ...prev,
    stage,
    material: { savedAt: now().toISOString(), content },
  };
  return { ...state, progress: { ...state.progress, [moduleId]: next } };
}

/** Marca que o aluno terminou de estudar e está pronto para o portão. */
export function markReadyForGate(state: AppState, moduleId: string): AppState {
  const prev = getProgress(state, moduleId);
  const next: ModuleProgress = { ...prev, stage: 'ready-for-gate' };
  return { ...state, progress: { ...state.progress, [moduleId]: next } };
}

export function saveNotes(state: AppState, moduleId: string, notes: string): AppState {
  const prev = getProgress(state, moduleId);
  return {
    ...state,
    progress: { ...state.progress, [moduleId]: { ...prev, notes } },
  };
}

/**
 * Registra o resultado de uma entrevista-portão.
 * - Passou: módulo vai para "passed".
 * - Não passou: módulo vai para "needs-review" e consome 1 semana de buffer.
 * Retorna o novo estado (imutável).
 */
export function recordGateResult(
  state: AppState,
  moduleId: string,
  result: GateResult,
): AppState {
  const prev = getProgress(state, moduleId);
  const stage: ModuleStage = result.passed ? 'passed' : 'needs-review';

  const next: ModuleProgress = {
    ...prev,
    stage,
    gateResults: [...prev.gateResults, result],
  };

  const bufferConsumed = result.passed ? state.bufferConsumed : state.bufferConsumed + 1;

  return {
    ...state,
    bufferConsumed,
    progress: { ...state.progress, [moduleId]: next },
  };
}

export interface ScheduleRow {
  module: Module;
  stage: ModuleStage;
  /** Semanas efetivas: planejadas + 1 por reprovação (revisão custa tempo). */
  effectiveWeeks: number;
  /** Número de tentativas de portão já feitas. */
  attempts: number;
  /** Tópicos fracos da última reprovação, se houver. */
  weakTopics: string[];
}

/**
 * Constrói o cronograma dinâmico a partir do progresso.
 * Módulos que reprovaram custam semanas extras (uma por reprovação).
 */
export function buildSchedule(state: AppState, program: Program): ScheduleRow[] {
  return program.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((module) => {
      const p = getProgress(state, module.id);
      const fails = p.gateResults.filter((g) => !g.passed).length;
      const last = p.gateResults[p.gateResults.length - 1];
      return {
        module,
        stage: p.stage,
        effectiveWeeks: module.plannedWeeks + fails,
        attempts: p.gateResults.length,
        weakTopics: last && !last.passed ? last.weakTopics : [],
      };
    });
}

export interface ProgressSummary {
  total: number;
  passed: number;
  inProgress: number;
  needsReview: number;
  notStarted: number;
  /** Percentual de módulos aprovados. */
  percentPassed: number;
  bufferRemaining: number;
  bufferBlown: boolean;
}

export function summarize(state: AppState, program: Program): ProgressSummary {
  const rows = buildSchedule(state, program);
  const passed = rows.filter((r) => r.stage === 'passed').length;
  const needsReview = rows.filter((r) => r.stage === 'needs-review').length;
  const notStarted = rows.filter((r) => r.stage === 'not-started').length;
  const inProgress = rows.filter(
    (r) => r.stage === 'studying' || r.stage === 'ready-for-gate',
  ).length;
  const total = rows.length;

  return {
    total,
    passed,
    inProgress,
    needsReview,
    notStarted,
    percentPassed: total === 0 ? 0 : Math.round((passed / total) * 100),
    bufferRemaining: bufferRemaining(state, program),
    bufferBlown: bufferBlown(state, program),
  };
}
