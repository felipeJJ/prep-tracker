import type { ProgressSummary } from '@/lib/schedule';
import type { ProgramMeta } from '@/lib/types';

export function ProgressHeader({
  summary,
  meta,
}: {
  summary: ProgressSummary;
  meta: ProgramMeta;
}) {
  const bufferPips = Array.from({ length: meta.bufferWeeks }, (_, i) => i < summary.bufferRemaining);

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <div className="eyebrow">Programa de preparação · {meta.target}</div>
      <h1 style={{ fontSize: '1.9rem', margin: '0.6rem 0 0.3rem' }}>Painel de estudo</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.4rem', maxWidth: '52ch' }}>
        Gere o material, estude, tire dúvidas e passe pelo portão da entrevista. Reprovar consome
        buffer — o custo do atraso fica à vista.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <Stat value={`${summary.passed}/${summary.total}`} label="módulos aprovados" />
        <Stat value={`${summary.percentPassed}%`} label="do programa" />
        <Stat value={String(summary.needsReview)} label="em revisão" accent={summary.needsReview > 0} />
        <div
          style={{
            background: 'var(--bg-raised)',
            padding: '0.9rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            {bufferPips.map((full, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  width: 16,
                  height: 8,
                  borderRadius: 2,
                  background: full ? 'var(--led-pass)' : 'var(--bg-sunk)',
                  border: '1px solid var(--border-strong)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>
            {summary.bufferBlown
              ? 'buffer estourado'
              : `buffer: ${summary.bufferRemaining}/${meta.bufferWeeks} semanas`}
          </span>
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-raised)', padding: '0.9rem 1rem' }}>
      <div
        className="mono-num"
        style={{ fontSize: '1.4rem', color: accent ? 'var(--led-review)' : 'var(--steel)' }}
      >
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  );
}
