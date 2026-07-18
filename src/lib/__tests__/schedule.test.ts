import { describe, it, expect } from 'vitest';
import {
  initialState,
  saveMaterial,
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
  it('salvar material move de not-started para studying', () => {
    let s = initialState();
    expect(getProgress(s, 'a').stage).toBe('not-started');
    s = saveMaterial(s, 'a', '# material', now);
    expect(getProgress(s, 'a').stage).toBe('studying');
    expect(getProgress(s, 'a').material?.content).toBe('# material');
  });

  it('markReadyForGate move para ready-for-gate', () => {
    let s = initialState();
    s = saveMaterial(s, 'a', 'x', now);
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
    s = saveMaterial(s, 'b', 'x', now);
    const sum = summarize(s, testProgram);
    expect(sum.total).toBe(2);
    expect(sum.passed).toBe(1);
    expect(sum.inProgress).toBe(1);
    expect(sum.percentPassed).toBe(50);
    expect(sum.bufferRemaining).toBe(3);
  });
});
