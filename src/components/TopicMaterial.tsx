'use client';

import { useState } from 'react';
import type { Module, ModuleProgress } from '@/lib/types';
import { buildMaterialPrompt } from '@/lib/prompts';
import { CopyButton } from './CopyButton';

/**
 * Uma linha de tópico dentro do card do módulo. Cada tópico gera seu próprio
 * prompt (com o guia-exemplo embutido) e guarda seu próprio material. Isso é o
 * que mantém cada peça pequena e bem produzida.
 */
export function TopicMaterial({
  module,
  topic,
  progress,
  isWeak,
  onSaveMaterial,
}: {
  module: Module;
  topic: string;
  progress: ModuleProgress;
  isWeak: boolean;
  onSaveMaterial: (topic: string, content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const saved = progress.materials[topic];

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${isWeak ? 'var(--led-review)' : saved ? 'var(--led-pass)' : 'var(--border-strong)'}`,
        borderRadius: 6,
        background: 'var(--bg-sunk)',
        marginBottom: '0.4rem',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.55rem 0.75rem',
          textAlign: 'left',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: saved ? 'var(--led-pass)' : 'var(--led-idle)',
            boxShadow: saved ? '0 0 5px var(--led-pass)' : 'none',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: '0.86rem' }}>
          {topic}
          {isWeak && (
            <span style={{ color: 'var(--led-review)', fontFamily: 'var(--f-mono)', fontSize: '0.7rem' }}>
              {' '}⚠ revisar
            </span>
          )}
        </span>
        {saved && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.66rem', color: 'var(--ink-faint)' }}>
            material salvo
          </span>
        )}
        <span aria-hidden style={{ color: 'var(--ink-faint)', fontSize: '0.72rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 0.75rem 0.75rem' }}>
          <p style={{ fontSize: '0.76rem', color: 'var(--ink-faint)', margin: '0 0 0.5rem' }}>
            Copie o prompt, gere o material num chat novo e cole o resultado abaixo. O prompt já inclui
            o guia-exemplo como padrão de qualidade.
          </p>
          <CopyButton text={buildMaterialPrompt(module, topic)} label="Copiar prompt deste tópico" />

          <div style={{ marginTop: '0.6rem' }}>
            <textarea
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={saved ? 'Colar para substituir o material salvo…' : 'Colar o material gerado…'}
            />
            <button
              className="primary"
              style={{ marginTop: '0.45rem' }}
              disabled={!draft.trim()}
              onClick={() => {
                onSaveMaterial(topic, draft.trim());
                setDraft('');
                setOpen(false);
              }}
            >
              {saved ? 'Substituir material' : 'Salvar material'}
            </button>
            {saved && (
              <p style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', margin: '0.45rem 0 0' }}>
                Salvo em {new Date(saved.savedAt).toLocaleDateString('pt-BR')} ·{' '}
                {saved.content.length.toLocaleString('pt-BR')} caracteres.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
