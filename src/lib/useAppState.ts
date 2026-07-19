'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppState, GateResult } from '@/lib/types';
import { loadState, saveState, clearState } from '@/lib/storage';
import {
  initialState,
  saveMaterial as _saveMaterial,
  saveMaterialPdf as _saveMaterialPdf,
  saveNotes as _saveNotes,
  markReadyForGate as _markReadyForGate,
  recordGateResult as _recordGateResult,
} from '@/lib/schedule';

/**
 * Hook central de estado. Carrega do localStorage no mount (evitando mismatch de
 * hidratação ao começar com o estado inicial no servidor) e persiste a cada mudança.
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const saveMaterial = useCallback((moduleId: string, topic: string, content: string) => {
    setState((s) => _saveMaterial(s, moduleId, topic, content));
  }, []);

  const saveMaterialPdf = useCallback(
    (moduleId: string, topic: string, pdfPath: string, content?: string) => {
      setState((s) => _saveMaterialPdf(s, moduleId, topic, pdfPath, content));
    },
    [],
  );

  const saveNotes = useCallback((moduleId: string, notes: string) => {
    setState((s) => _saveNotes(s, moduleId, notes));
  }, []);

  const markReadyForGate = useCallback((moduleId: string) => {
    setState((s) => _markReadyForGate(s, moduleId));
  }, []);

  const recordGateResult = useCallback((moduleId: string, result: GateResult) => {
    setState((s) => _recordGateResult(s, moduleId, result));
  }, []);

  const reset = useCallback(() => {
    clearState();
    setState(initialState());
  }, []);

  return {
    state,
    hydrated,
    saveMaterial,
    saveMaterialPdf,
    saveNotes,
    markReadyForGate,
    recordGateResult,
    reset,
  };
}
