import { describe, it, expect } from 'vitest';
import {
  buildInterviewPrompt,
  buildMaterialPrompt,
  materialStablePrefix,
  materialTaskBlock,
} from '@/lib/prompts';
import type { Module, ModuleProgress } from '@/lib/types';

const mod: Module = {
  id: 'm4',
  order: 4,
  name: 'Node.js Profundo',
  priority: 'prioridade',
  plannedWeeks: 2,
  anchor: 'seu runtime real em produção',
  topics: ['Event loop e libuv', 'Streams e backpressure'],
};

describe('prompt de material (cacheável)', () => {
  it('o prefixo estável carrega o guia e NÃO contém o tópico (para poder cachear)', () => {
    const prefix = materialStablePrefix('GUIA-EXEMPLO-XYZ');
    expect(prefix).toContain('GUIA-EXEMPLO-XYZ');
    expect(prefix).not.toContain('Event loop e libuv');
  });

  it('o bloco volátil carrega módulo/tópico/âncora', () => {
    const task = materialTaskBlock(mod, 'Event loop e libuv');
    expect(task).toContain('Event loop e libuv');
    expect(task).toContain('Node.js Profundo');
    expect(task).toContain('seu runtime real em produção');
  });

  it('o prompt completo (fallback) = prefixo + bloco', () => {
    const full = buildMaterialPrompt(mod, 'Event loop e libuv', 'GUIA-EXEMPLO-XYZ');
    expect(full).toContain('GUIA-EXEMPLO-XYZ');
    expect(full).toContain('Event loop e libuv');
  });
});

describe('prompt de entrevista', () => {
  const progress: ModuleProgress = {
    moduleId: 'm4',
    stage: 'ready-for-gate',
    notes: '',
    gateResults: [],
    materials: {
      'Event loop e libuv': {
        savedAt: '2026-08-01T00:00:00Z',
        pdfPath: '/api/materiais/m4-event-loop-e-libuv.pdf',
        content: '# Event loop\nA thread única atende milhares de conexões porque…',
      },
    },
  };

  it('embute o material salvo como base da entrevista', () => {
    const p = buildInterviewPrompt(mod, progress);
    expect(p).toContain('BASE da entrevista');
    expect(p).toContain('atende milhares de conexões');
    expect(p).toContain('===VEREDITO==='); // ainda emite o veredito estruturado
  });

  it('sem material embutido, orienta usar os PDFs anexados / tópicos', () => {
    const p = buildInterviewPrompt(mod);
    expect(p).toContain('não foi embutido');
  });

  it('módulo com englishFrom conduz em inglês', () => {
    const p = buildInterviewPrompt({ ...mod, englishFrom: true }, progress);
    expect(p).toContain('EM INGLÊS');
  });
});
