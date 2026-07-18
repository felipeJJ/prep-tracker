import type { AppState } from '@/lib/types';
import { initialState } from '@/lib/schedule';

/**
 * Persistência no localStorage.
 *
 * Sem backend: todo o estado vive no navegador. Estas funções são o único ponto
 * que toca o localStorage, o que facilita trocar por IndexedDB ou por uma API no
 * futuro (ver docs/adr/0003).
 */

const KEY = 'prep-tracker:v1';

export function loadState(): AppState {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    // Schema v1 (material único por módulo) é incompatível com v2 (material por
    // tópico). Em vez de migrar, descartamos — é uma ferramenta pessoal e o
    // material é facilmente regerado. Ver docs/adr/0002.
    if (parsed.version !== 2) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // localStorage cheio ou indisponível — falha silenciosa é aceitável aqui;
    // o app continua funcional em memória durante a sessão.
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
