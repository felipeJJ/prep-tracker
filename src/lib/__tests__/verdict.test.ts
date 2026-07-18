import { describe, it, expect } from 'vitest';
import { parseVerdict } from '@/lib/verdict';

const fixedNow = () => new Date('2026-08-15T12:00:00.000Z');

describe('parseVerdict', () => {
  it('parseia um bloco de aprovação completo', () => {
    const text = `Boa entrevista! Aqui está a avaliação.

===VEREDITO===
RESULTADO: PASSOU
TOPICOS_FRACOS: nenhum
COMENTARIO: Sustentou bem os trade-offs de cache.
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.result.passed).toBe(true);
      expect(r.result.weakTopics).toEqual([]);
      expect(r.result.notes).toMatch(/trade-offs de cache/);
      expect(r.result.at).toBe('2026-08-15T12:00:00.000Z');
    }
  });

  it('parseia reprovação e extrai tópicos fracos separados por ;', () => {
    const text = `===VEREDITO===
RESULTADO: NAO_PASSOU
TOPICOS_FRACOS: Invalidação de cache; TTL; Pub/sub
COMENTARIO: Travou no aprofundamento de invalidação.
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.result.passed).toBe(false);
      expect(r.result.weakTopics).toEqual(['Invalidação de cache', 'TTL', 'Pub/sub']);
    }
  });

  it('tolera acentos e variações de capitalização no resultado', () => {
    const text = `===VEREDITO===
RESULTADO: Não Passou
TOPICOS_FRACOS: MVCC
COMENTARIO: ok
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.passed).toBe(false);
  });

  it('aceita separador por vírgula nos tópicos', () => {
    const text = `===VEREDITO===
RESULTADO: NAO_PASSOU
TOPICOS_FRACOS: EC2, IAM, VPC
COMENTARIO: revisar rede
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.weakTopics).toEqual(['EC2', 'IAM', 'VPC']);
  });

  it('funciona por fallback mesmo sem as marcas do bloco', () => {
    const text = `RESULTADO: PASSOU
TOPICOS_FRACOS: nenhum
COMENTARIO: mandou bem`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.passed).toBe(true);
  });

  it('falha com mensagem clara quando o texto está vazio', () => {
    const r = parseVerdict('   ', fixedNow);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Cole a resposta/);
  });

  it('falha quando não há linha RESULTADO', () => {
    const r = parseVerdict('Entrevista boa, parabéns!', fixedNow);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/veredito/i);
  });

  it('falha quando o resultado é irreconhecível', () => {
    const text = `===VEREDITO===
RESULTADO: TALVEZ
TOPICOS_FRACOS: nenhum
COMENTARIO: -
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/não reconhecido/i);
  });

  it('trata "none" e "-" como ausência de tópicos fracos', () => {
    const text = `===VEREDITO===
RESULTADO: PASSOU
TOPICOS_FRACOS: -
COMENTARIO: ok
===FIM===`;
    const r = parseVerdict(text, fixedNow);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.weakTopics).toEqual([]);
  });
});
