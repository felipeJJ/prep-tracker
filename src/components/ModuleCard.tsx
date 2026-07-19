'use client';

import { useState } from 'react';
import type { Module, ModuleProgress, GateResult } from '@/lib/types';
import { buildDoubtsPrompt, buildInterviewPrompt } from '@/lib/prompts';
import { parseVerdict } from '@/lib/verdict';
import { allTopicsCovered, materialsCount } from '@/lib/schedule';
import { StatusLed } from './StatusLed';
import { CopyButton } from './CopyButton';
import { TopicMaterial } from './TopicMaterial';

type Panel = 'doubts' | 'interview' | null;

export function ModuleCard({
  module,
  progress,
  onSaveMaterial,
  onSavePdf,
  onSaveNotes,
  onReadyForGate,
  onRecordVerdict,
}: {
  module: Module;
  progress: ModuleProgress;
  onSaveMaterial: (topic: string, content: string) => void;
  onSavePdf: (topic: string, pdfPath: string, content?: string) => void;
  onSaveNotes: (notes: string) => void;
  onReadyForGate: () => void;
  onRecordVerdict: (result: GateResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [verdictDraft, setVerdictDraft] = useState('');
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState(progress.notes);
  const [fieldPassed, setFieldPassed] = useState<boolean | null>(null);
  const [fieldWeak, setFieldWeak] = useState('');
  const [fieldComment, setFieldComment] = useState('');

  const lastGate = progress.gateResults[progress.gateResults.length - 1];
  const attempts = progress.gateResults.length;
  const covered = materialsCount(progress);
  const allCovered = allTopicsCovered(module, progress);

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? null : p));
    setVerdictError(null);
  }

  function isWeakTopic(topic: string): boolean {
    return (
      !!lastGate &&
      !lastGate.passed &&
      lastGate.weakTopics.some((w) => w.toLowerCase() === topic.toLowerCase())
    );
  }

  function submitVerdict() {
    const parsed = parseVerdict(verdictDraft);
    if (!parsed.ok) {
      setVerdictError(parsed.error);
      return;
    }
    onRecordVerdict(parsed.result);
    setVerdictDraft('');
    setVerdictError(null);
    setPanel(null);
  }

  // Registro por campos: monta o GateResult direto, sem parsing. Pensado para o modo de
  // voz, onde não sai um bloco ===VEREDITO=== natural — você só digita o que ouviu.
  function submitFields() {
    if (fieldPassed === null) return;
    onRecordVerdict({
      at: new Date().toISOString(),
      passed: fieldPassed,
      weakTopics: fieldWeak
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: fieldComment.trim() || undefined,
    });
    setFieldPassed(null);
    setFieldWeak('');
    setFieldComment('');
    setPanel(null);
  }

  return (
    <article
      style={{
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${lastGate && !lastGate.passed ? 'var(--led-review)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius)',
        background: 'var(--bg-raised)',
        marginBottom: '0.75rem',
        overflow: 'hidden',
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
          gap: '0.9rem',
          padding: '0.9rem 1.1rem',
          textAlign: 'left',
        }}
      >
        <span className="mono-num" style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', minWidth: '2.2ch' }}>
          {String(module.order).padStart(2, '0')}
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.02rem', fontWeight: 600 }}>
            {module.name}
          </span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)' }}>
            {module.priority} · {covered}/{module.topics.length} tópicos
            {module.englishFrom ? ' · entrevista em inglês' : ''}
          </span>
        </span>
        <StatusLed stage={progress.stage} showLabel={false} />
        <span aria-hidden style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.9rem' }}>
            <strong style={{ color: 'var(--ink)' }}>Âncora:</strong> {module.anchor}
          </p>

          {lastGate && !lastGate.passed && (
            <div
              style={{
                background: 'rgba(240,96,60,0.08)',
                border: '1px solid var(--led-review)',
                borderRadius: 'var(--radius)',
                padding: '0.7rem 0.9rem',
                fontSize: '0.82rem',
                margin: '0.7rem 0',
              }}
            >
              <strong>Reprovado no portão</strong> (tentativa {attempts}). Revise os tópicos marcados
              com ⚠ e refaça a entrevista. {lastGate.notes && <em>— {lastGate.notes}</em>}
            </div>
          )}
          {progress.stage === 'passed' && (
            <div
              style={{
                background: 'rgba(63,185,80,0.08)',
                border: '1px solid var(--led-pass)',
                borderRadius: 'var(--radius)',
                padding: '0.7rem 0.9rem',
                fontSize: '0.82rem',
                margin: '0.7rem 0',
              }}
            >
              <strong>Aprovado.</strong> Módulo fechado{attempts > 1 ? ` após ${attempts} tentativas` : ''}.
            </div>
          )}

          {/* Tópicos — cada um gera e guarda seu próprio material */}
          <div style={{ margin: '1rem 0 0.4rem' }}>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              Tópicos · gere o material de cada um
            </span>
          </div>
          {module.topics.map((topic) => (
            <TopicMaterial
              key={topic}
              module={module}
              topic={topic}
              progress={progress}
              isWeak={isWeakTopic(topic)}
              onSaveMaterial={onSaveMaterial}
              onSavePdf={onSavePdf}
            />
          ))}

          {/* Progresso do módulo — sempre visível e marcável */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.6rem',
              margin: '1.1rem 0 0.3rem',
            }}
          >
            <StatusLed stage={progress.stage} showLabel />
            {progress.stage !== 'passed' && progress.stage !== 'ready-for-gate' && (
              <button className="ghost" onClick={onReadyForGate}>
                Marquei que estudei →
              </button>
            )}
            {progress.stage === 'ready-for-gate' && (
              <span style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }}>
                Pronto para o portão — faça a entrevista e registre o resultado abaixo.
              </span>
            )}
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0 0.3rem' }}>
            <button className="ghost" onClick={() => togglePanel('doubts')} disabled={covered === 0}>
              Tirar dúvidas
            </button>
            <button className="ghost" onClick={() => togglePanel('interview')}>
              Entrevista + registrar resultado
            </button>
          </div>

          {!allCovered && (
            <p style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', margin: '0.3rem 0 0' }}>
              Faltam {module.topics.length - covered} tópico(s) com material para cobrir o módulo
              inteiro antes do portão.
            </p>
          )}

          {panel === 'doubts' && (
            <Panel title="Prompt para tirar dúvidas">
              <p style={hint}>
                Contextualiza um chat novo com os materiais que você já estudou neste módulo. Cole,
                escreva sua dúvida no fim e envie.
              </p>
              <CopyButton text={buildDoubtsPrompt(module, progress)} />
            </Panel>
          )}

          {panel === 'interview' && (
            <Panel title="Entrevista do módulo (portão)">
              <p style={hint}>
                Copie o prompt e cole numa conversa nova no app do Claude — a IA já começa como
                entrevistadora sobre este módulo. O material que você estudou vai <strong>embutido</strong>{' '}
                no prompt como contexto; se quiser, anexe também os PDFs deste módulo à conversa. Faça
                por <strong>voz</strong> (treina o inglês falado). Ao final, a IA dá o resultado —
                registre-o de uma das duas formas abaixo.
              </p>
              <CopyButton text={buildInterviewPrompt(module, progress)} label="Copiar prompt de entrevista" />

              {/* Registro por campos — natural para o modo de voz */}
              <div style={{ marginTop: '0.9rem' }}>
                <label style={label}>Registrar por campos (modo de voz)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    className={fieldPassed === true ? 'primary' : 'ghost'}
                    onClick={() => setFieldPassed(true)}
                    aria-pressed={fieldPassed === true}
                  >
                    Passou
                  </button>
                  <button
                    className={fieldPassed === false ? 'primary' : 'ghost'}
                    onClick={() => setFieldPassed(false)}
                    aria-pressed={fieldPassed === false}
                  >
                    Não passou
                  </button>
                </div>
                <input
                  type="text"
                  value={fieldWeak}
                  onChange={(e) => setFieldWeak(e.target.value)}
                  placeholder="Tópicos fracos, separados por vírgula (ou deixe vazio)"
                  style={{ marginBottom: '0.5rem' }}
                />
                <textarea
                  rows={2}
                  value={fieldComment}
                  onChange={(e) => setFieldComment(e.target.value)}
                  placeholder="Comentário do avaliador (opcional)…"
                />
                <button
                  className="primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={fieldPassed === null}
                  onClick={submitFields}
                >
                  Registrar resultado
                </button>
              </div>

              {/* Registro por texto — cola o bloco estruturado (modo por texto) */}
              <div style={{ marginTop: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem' }}>
                <label style={label}>Ou colar a resposta com o veredito (modo por texto)</label>
                <textarea
                  rows={5}
                  value={verdictDraft}
                  onChange={(e) => setVerdictDraft(e.target.value)}
                  placeholder="Cole a resposta do chat, incluindo o bloco ===VEREDITO===…"
                />
                {verdictError && (
                  <p style={{ color: 'var(--led-review)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
                    {verdictError}
                  </p>
                )}
                <button className="ghost" style={{ marginTop: '0.5rem' }} onClick={submitVerdict}>
                  Registrar do texto colado
                </button>
              </div>
            </Panel>
          )}

          {/* Notas */}
          <div style={{ marginTop: '1rem' }}>
            <label style={label}>Anotações</label>
            <textarea
              rows={2}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => onSaveNotes(notesDraft)}
              placeholder="Suas anotações sobre este módulo…"
            />
          </div>
        </div>
      )}
    </article>
  );
}

const hint: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--ink-faint)', margin: '0 0 0.6rem' };
const label: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--f-mono)',
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-faint)',
  marginBottom: '0.35rem',
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-sunk)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '0.9rem',
        marginTop: '0.6rem',
      }}
    >
      <div style={{ ...label, marginBottom: '0.6rem' }}>{title}</div>
      {children}
    </div>
  );
}
