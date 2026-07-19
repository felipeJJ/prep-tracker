'use client';

import { useEffect, useState } from 'react';
import type { Module, ModuleProgress } from '@/lib/types';
import { buildMaterialPrompt } from '@/lib/prompts';
import { generateMaterial, isApiEnabled } from '@/lib/apiClient';
import { CopyButton } from './CopyButton';

/**
 * Uma linha de tópico dentro do card do módulo.
 *
 * Caminho principal: "Gerar material em PDF" chama a API, que escreve o material seguindo o
 * guia-exemplo e devolve um PDF — o app guarda o link e você abre o PDF. Se não houver chave
 * ou a API falhar, cai no fallback copiar-e-colar (copiar o prompt → chat → colar de volta).
 */
export function TopicMaterial({
  module,
  topic,
  progress,
  isWeak,
  onSaveMaterial,
  onSavePdf,
}: {
  module: Module;
  topic: string;
  progress: ModuleProgress;
  isWeak: boolean;
  onSaveMaterial: (topic: string, content: string) => void;
  onSavePdf: (topic: string, pdfPath: string, content?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [apiEnabled, setApiEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const saved = progress.materials[topic];

  useEffect(() => {
    let alive = true;
    isApiEnabled().then((enabled) => {
      if (alive) setApiEnabled(enabled);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Sem chave, o único caminho é o fallback — já o deixa visível.
  const fallbackVisible = showFallback || !apiEnabled;
  
  async function onGenerate() {
    setGenerating(true);
    setApiError(null);
    try {
      const { pdfPath, markdown } = await generateMaterial(module.id, topic);
      onSavePdf(topic, pdfPath, markdown);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Falha ao gerar via API.');
      setShowFallback(true); // erro → revela o fallback copiar-e-colar
    } finally {
      setGenerating(false);
    }
  }

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
            {saved.pdfPath ? 'PDF salvo' : 'material salvo'}
          </span>
        )}
        <span aria-hidden style={{ color: 'var(--ink-faint)', fontSize: '0.72rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 0.75rem 0.75rem' }}>
          {/* Material já salvo */}
          {saved?.pdfPath && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
              <a href={saved.pdfPath} target="_blank" rel="noreferrer" style={pdfLink}>
                📄 Abrir PDF
              </a>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>
                gerado em {new Date(saved.savedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {saved?.content && !saved.pdfPath && (
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', margin: '0 0 0.6rem' }}>
              Material salvo em texto (fallback) em {new Date(saved.savedAt).toLocaleDateString('pt-BR')} ·{' '}
              {saved.content.length.toLocaleString('pt-BR')} caracteres.
            </p>
          )}

          {/* Caminho principal: gerar PDF via API */}
          {apiEnabled ? (
            <>
              <p style={{ fontSize: '0.76rem', color: 'var(--ink-faint)', margin: '0 0 0.5rem' }}>
                Gera o material em PDF seguindo o guia-exemplo, sem sair do app.
              </p>
              <button className="primary" onClick={onGenerate} disabled={generating} aria-live="polite">
                {generating
                  ? 'Gerando material em PDF…'
                  : saved?.pdfPath
                    ? 'Regenerar PDF'
                    : 'Gerar material em PDF'}
              </button>
              {generating && (
                <p style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', margin: '0.4rem 0 0' }}>
                  A IA está escrevendo e o servidor montando o PDF — pode levar até ~1 min.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.76rem', color: 'var(--ink-faint)', margin: '0 0 0.5rem' }}>
              API não configurada — gere o material pelo modo copiar-e-colar abaixo. (Para gerar em
              PDF dentro do app, configure <code>ANTHROPIC_API_KEY</code> no <code>.env.local</code>.)
            </p>
          )}

          {apiError && (
            <p style={{ color: 'var(--led-review)', fontSize: '0.78rem', margin: '0.5rem 0 0' }}>
              {apiError}{' '}
              <span style={{ color: 'var(--ink-faint)' }}>— use o modo copiar-e-colar abaixo.</span>
            </p>
          )}

          {/* Fallback: copiar-e-colar. Sempre disponível; auto-revelado sem chave ou após erro. */}
          {apiEnabled && !fallbackVisible && (
            <button
              className="ghost"
              style={{ marginTop: '0.5rem', fontSize: '0.76rem' }}
              onClick={() => setShowFallback(true)}
            >
              ou usar copiar-e-colar
            </button>
          )}

          {fallbackVisible && (
            <div
              style={{
                marginTop: '0.7rem',
                paddingTop: '0.7rem',
                borderTop: apiEnabled ? '1px solid var(--border)' : 'none',
              }}
            >
              <p style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', margin: '0 0 0.5rem' }}>
                Copie o prompt, gere num chat novo e cole o resultado aqui. O prompt já inclui o
                guia-exemplo como padrão de qualidade.
              </p>
              <CopyButton text={buildMaterialPrompt(module, topic)} label="Copiar prompt deste tópico" />
              <div style={{ marginTop: '0.6rem' }}>
                <textarea
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Colar o material gerado…"
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
                  Salvar material (texto)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const pdfLink: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--steel-dim)',
  border: '1px solid var(--steel)',
  color: 'var(--ink)',
  borderRadius: 'var(--radius)',
  padding: '0.4rem 0.7rem',
  fontSize: '0.82rem',
  textDecoration: 'none',
};
