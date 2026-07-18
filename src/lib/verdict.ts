import type { GateResult } from '@/lib/types';

/**
 * Parsing do veredito da entrevista.
 *
 * O prompt de entrevista instrui a IA a encerrar com um bloco estruturado entre
 * marcas ===VEREDITO=== e ===FIM===. O usuário cola a resposta inteira do chat
 * aqui, e extraímos o resultado. É tolerante: aceita variações de acento, espaços
 * e capitalização, e retorna um erro legível quando não encontra o bloco.
 */

export interface ParseSuccess {
  ok: true;
  result: GateResult;
}
export interface ParseFailure {
  ok: false;
  error: string;
}
export type ParseResult = ParseSuccess | ParseFailure;

const BLOCK_RE = /===\s*VEREDITO\s*===([\s\S]*?)===\s*FIM\s*===/i;

/**
 * Extrai um GateResult do texto colado. Procura o bloco delimitado; se não achar,
 * tenta um fallback procurando as linhas-chave soltas.
 */
export function parseVerdict(pastedText: string, now: () => Date = () => new Date()): ParseResult {
  if (!pastedText || !pastedText.trim()) {
    return { ok: false, error: 'Cole a resposta da entrevista para registrar o resultado.' };
  }

  const blockMatch = pastedText.match(BLOCK_RE);
  const body = blockMatch ? blockMatch[1]! : pastedText;

  const resultado = extractField(body, 'RESULTADO');
  if (resultado === null) {
    return {
      ok: false,
      error:
        'Não encontrei o veredito. Verifique se colou o bloco entre ===VEREDITO=== e ===FIM===, ou se a linha RESULTADO está presente.',
    };
  }

  const passed = normalizeResult(resultado);
  if (passed === null) {
    return {
      ok: false,
      error: `Resultado não reconhecido: "${resultado}". Esperado PASSOU ou NAO_PASSOU.`,
    };
  }

  const weakRaw = extractField(body, 'TOPICOS_FRACOS') ?? '';
  const weakTopics = parseWeakTopics(weakRaw);
  const notes = extractField(body, 'COMENTARIO')?.trim() || undefined;

  return {
    ok: true,
    result: {
      at: now().toISOString(),
      passed,
      weakTopics,
      notes,
    },
  };
}

/** Extrai o valor de "CHAVE: valor" (até o fim da linha). Case-insensitive na chave. */
function extractField(body: string, key: string): string | null {
  const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'im');
  const m = body.match(re);
  return m ? m[1]!.trim() : null;
}

/** Normaliza o resultado tolerando acento, espaço, hífen e capitalização. */
function normalizeResult(raw: string): boolean | null {
  const v = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .trim();

  if (v.startsWith('PASSOU') || v === 'PASS' || v === 'APROVADO') return true;
  if (
    v.startsWith('NAO_PASSOU') ||
    v.startsWith('NAOPASSOU') ||
    v === 'FAIL' ||
    v === 'REPROVADO'
  ) {
    return false;
  }
  return null;
}

/** Quebra a lista de tópicos fracos por ';' ou ','. Trata "nenhum" como vazio. */
function parseWeakTopics(raw: string): string[] {
  const cleaned = raw.trim();
  if (!cleaned) return [];
  const lowered = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (lowered === 'nenhum' || lowered === 'none' || lowered === '-') return [];

  return cleaned
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.toLowerCase() !== 'nenhum');
}
