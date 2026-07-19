import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Teto mensal de chamadas à API — rede de segurança contra loops acidentais.
 *
 * É SÓ do lado do servidor (usa disco) e é deliberadamente simples: um arquivo JSON
 * no diretório do projeto (`.api-usage.json`, gitignored) com o mês corrente e a contagem.
 * Ao virar o mês, a contagem zera. Não é uma trava de segurança forte — a trava de
 * verdade é o spend limit no Console da Anthropic, do lado que cobra. Isto aqui só evita
 * que um bug no cliente dispare muitas chamadas sem você perceber.
 */

const USAGE_FILE = path.join(process.cwd(), '.api-usage.json');

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

function readLimit(): number {
  const raw = Number(process.env.MONTHLY_CALL_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
}

interface Usage {
  month: string;
  count: number;
}

async function readUsage(): Promise<Usage> {
  const month = currentMonth();
  try {
    const parsed = JSON.parse(await fs.readFile(USAGE_FILE, 'utf8')) as Partial<Usage>;
    if (parsed.month === month && typeof parsed.count === 'number') {
      return { month, count: parsed.count };
    }
  } catch {
    // arquivo ausente ou inválido — começa zerado
  }
  return { month, count: 0 };
}

export interface LimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Reserva uma chamada: se ainda houver cota no mês, incrementa e permite; senão, bloqueia.
 * Chame ANTES de bater na API — só conta chamadas que de fato vão acontecer.
 */
export async function consumeCall(): Promise<LimitResult> {
  const limit = readLimit();
  const usage = await readUsage();

  if (usage.count >= limit) {
    return { allowed: false, count: usage.count, limit };
  }

  const next: Usage = { month: usage.month, count: usage.count + 1 };
  await fs.writeFile(USAGE_FILE, JSON.stringify(next), 'utf8');
  return { allowed: true, count: next.count, limit };
}
