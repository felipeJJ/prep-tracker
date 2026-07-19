import { describe, it, expect } from 'vitest';
import {
  initialState,
  saveMaterial,
  saveMaterialPdf,
  materialsCount,
  allTopicsCovered,
  markReadyForGate,
  recordGateResult,
  bufferRemaining,
  bufferBlown,
  buildSchedule,
  summarize,
  getProgress,
} from '@/lib/schedule';
import type { GateResult, Program } from '@/lib/types';

const now = () => new Date('2026-08-15T12:00:00.000Z');

const testProgram: Program = {
  meta: {
    target: 'test',
    startDate: '2026-07-21',
    applyDate: '2027-01-01',
    hoursPerWeek: 10,
    bufferWeeks: 3,
  },
  modules: [
    { id: 'a', order: 1, name: 'A', priority: 'base', plannedWeeks: 1, anchor: '', topics: ['t1'] },
    { id: 'b', order: 2, name: 'B', priority: 'prioridade', plannedWeeks: 2, anchor: '', topics: ['t2'] },
  ],
};

const pass: GateResult = { at: now().toISOString(), passed: true, weakTopics: [] };
const fail = (weak: string[]): GateResult => ({ at: now().toISOString(), passed: false, weakTopics: weak });

describe('fluxo de material e estágios', () => {
  it('salvar material de um tópico move de not-started para studying', () => {
    let s = initialState();
    expect(getProgress(s, 'a').stage).toBe('not-started');
    s = saveMaterial(s, 'a', 't1', '# material', now);
    expect(getProgress(s, 'a').stage).toBe('studying');
    expect(getProgress(s, 'a').materials['t1']?.content).toBe('# material');
  });

  it('materiais são independentes por tópico', () => {
    let s = initialState();
    s = saveMaterial(s, 'b', 't2', 'material t2', now);
    // módulo b tem só t2 no testProgram; salvar outro tópico coexiste
    s = saveMaterial(s, 'b', 'extra', 'material extra', now);
    const p = getProgress(s, 'b');
    expect(materialsCount(p)).toBe(2);
    expect(p.materials['t2']?.content).toBe('material t2');
    expect(p.materials['extra']?.content).toBe('material extra');
  });

  it('saveMaterialPdf guarda pdfPath + markdown, cobre o tópico e move para studying', () => {
    let s = initialState();
    s = saveMaterialPdf(s, 'a', 't1', '/api/materiais/a-t1.pdf', '# conteúdo do material', now);
    const m = getProgress(s, 'a').materials['t1'];
    expect(m?.pdfPath).toBe('/api/materiais/a-t1.pdf');
    expect(m?.content).toBe('# conteúdo do material');
    expect(getProgress(s, 'a').stage).toBe('studying');
    expect(allTopicsCovered(testProgram.modules[0]!, getProgress(s, 'a'))).toBe(true);
  });

  it('tópico coberto só por PDF (sem markdown) ainda conta como coberto', () => {
    let s = initialState();
    s = saveMaterialPdf(s, 'a', 't1', '/api/materiais/a-t1.pdf', undefined, now);
    expect(allTopicsCovered(testProgram.modules[0]!, getProgress(s, 'a'))).toBe(true);
  });

  it('allTopicsCovered vira true só quando todos os tópicos têm material', () => {
    const modB = testProgram.modules[1]!; // topics: ['t2']
    let s = initialState();
    expect(allTopicsCovered(modB, getProgress(s, 'b'))).toBe(false);
    s = saveMaterial(s, 'b', 't2', 'x', now);
    expect(allTopicsCovered(modB, getProgress(s, 'b'))).toBe(true);
  });

  it('markReadyForGate move para ready-for-gate', () => {
    let s = initialState();
    s = saveMaterial(s, 'a', 't1', 'x', now);
    s = markReadyForGate(s, 'a');
    expect(getProgress(s, 'a').stage).toBe('ready-for-gate');
  });
});

describe('portão e consumo de buffer', () => {
  it('passar fecha o módulo sem consumir buffer', () => {
    let s = initialState();
    s = recordGateResult(s, 'a', pass);
    expect(getProgress(s, 'a').stage).toBe('passed');
    expect(s.bufferConsumed).toBe(0);
    expect(bufferRemaining(s, testProgram)).toBe(3);
  });

  it('reprovar move para needs-review e consome 1 semana de buffer', () => {
    let s = initialState();
    s = recordGateResult(s, 'a', fail(['t1']));
    expect(getProgress(s, 'a').stage).toBe('needs-review');
    expect(s.bufferConsumed).toBe(1);
    expect(bufferRemaining(s, testProgram)).toBe(2);
  });

  it('reprovações acumulam e podem estourar o buffer', () => {
    let s = initialState();
    s = recordGateResult(s, 'a', fail(['t1']));
    s = recordGateResult(s, 'a', fail(['t1']));
    s = recordGateResult(s, 'b', fail(['t2']));
    expect(s.bufferConsumed).toBe(3);
    expect(bufferRemaining(s, testProgram)).toBe(0);
    expect(bufferBlown(s, testProgram)).toBe(false);

    s = recordGateResult(s, 'b', fail(['t2']));
    expect(s.bufferConsumed).toBe(4);
    expect(bufferRemaining(s, testProgram)).toBe(0); // nunca negativo
    expect(bufferBlown(s, testProgram)).toBe(true); // estourou
  });

  it('reprovar e depois passar mantém o buffer já consumido', () => {
    let s = initialState();
    s = recordGateResult(s, 'a', fail(['t1']));
    s = recordGateResult(s, 'a', pass);
    expect(getProgress(s, 'a').stage).toBe('passed');
    expect(s.bufferConsumed).toBe(1); // a reprovação anterior não é "devolvida"
  });
});

describe('cronograma dinâmico', () => {
  it('semanas efetivas crescem 1 por reprovação', () => {
    let s = initialState();
    s = recordGateResult(s, 'b', fail(['t2'])); // B planejado em 2 semanas
    const rows = buildSchedule(s, testProgram);
    const rowB = rows.find((r) => r.module.id === 'b')!;
    expect(rowB.effectiveWeeks).toBe(3); // 2 + 1
    expect(rowB.attempts).toBe(1);
    expect(rowB.weakTopics).toEqual(['t2']);
  });

  it('mantém ordem dos módulos', () => {
    const rows = buildSchedule(initialState(), testProgram);
    expect(rows.map((r) => r.module.id)).toEqual(['a', 'b']);
  });
});

describe('resumo de progresso', () => {
  it('conta corretamente os estágios e o percentual', () => {
    let s = initialState();
    s = recordGateResult(s, 'a', pass);
    s = saveMaterial(s, 'b', 't2', 'x', now);
    const sum = summarize(s, testProgram);
    expect(sum.total).toBe(2);
    expect(sum.passed).toBe(1);
    expect(sum.inProgress).toBe(1);
    expect(sum.percentPassed).toBe(50);
    expect(sum.bufferRemaining).toBe(3);
  });
});
