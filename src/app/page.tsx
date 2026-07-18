'use client';

import { PROGRAM } from '@/data/program';
import { useAppState } from '@/lib/useAppState';
import { getProgress, summarize } from '@/lib/schedule';
import { ProgressHeader } from '@/components/ProgressHeader';
import { ModuleCard } from '@/components/ModuleCard';

export default function Home() {
  const {
    state,
    hydrated,
    saveMaterial,
    saveNotes,
    markReadyForGate,
    recordGateResult,
    reset,
  } = useAppState();

  const summary = summarize(state, PROGRAM);

  return (
    <main
      style={{
        maxWidth: '46rem',
        margin: '0 auto',
        padding: '3rem 1.25rem 5rem',
      }}
    >
      <ProgressHeader summary={summary} meta={PROGRAM.meta} />

      {!hydrated ? (
        <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)', fontSize: '0.85rem' }}>
          carregando estado…
        </p>
      ) : (
        <>
          <section aria-label="Módulos">
            {PROGRAM.modules
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  progress={getProgress(state, module.id)}
                  onSaveMaterial={(c) => saveMaterial(module.id, c)}
                  onSaveNotes={(n) => saveNotes(module.id, n)}
                  onReadyForGate={() => markReadyForGate(module.id)}
                  onRecordVerdict={(r) => recordGateResult(module.id, r)}
                />
              ))}
          </section>

          <footer
            style={{
              marginTop: '2.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }}>
              Estado salvo localmente no navegador. Nenhum dado sai da sua máquina.
            </span>
            <button
              className="ghost"
              onClick={() => {
                if (confirm('Apagar todo o progresso salvo? Esta ação não pode ser desfeita.')) reset();
              }}
            >
              Resetar progresso
            </button>
          </footer>
        </>
      )}
    </main>
  );
}
