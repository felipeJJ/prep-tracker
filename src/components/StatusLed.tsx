import type { ModuleStage } from '@/lib/types';

const LED: Record<ModuleStage, { color: string; label: string }> = {
  'not-started': { color: 'var(--led-idle)', label: 'Não iniciado' },
  studying: { color: 'var(--led-study)', label: 'Estudando' },
  'ready-for-gate': { color: 'var(--led-ready)', label: 'Pronto p/ portão' },
  passed: { color: 'var(--led-pass)', label: 'Aprovado' },
  'needs-review': { color: 'var(--led-review)', label: 'Revisão' },
};

export function StatusLed({ stage, showLabel = true }: { stage: ModuleStage; showLabel?: boolean }) {
  const { color, label } = LED[stage];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        aria-hidden
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
          {label}
        </span>
      )}
    </span>
  );
}
