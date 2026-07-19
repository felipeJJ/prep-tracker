import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Onde os PDFs de material vivem e como são nomeados/servidos (SÓ servidor).
 *
 * Os arquivos ficam em `content/materiais/` (fora de `public/`, para não misturar com fonte),
 * gitignored. São servidos pelo route handler `/api/materiais/[file]`, que valida o nome para
 * evitar path traversal. O nome é determinístico por módulo+tópico: regenerar substitui o mesmo
 * arquivo, sem acumular duplicatas.
 */

export const MATERIALS_DIR = path.join(process.cwd(), 'content', 'materiais');

/** Slug ASCII, minúsculo, sem acentos — seguro para nome de arquivo e URL. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Nome do arquivo PDF de um tópico: `<moduleId>-<slug-do-topico>.pdf`. */
export function materialFilename(moduleId: string, topic: string): string {
  return `${slugify(moduleId)}-${slugify(topic)}.pdf`;
}

/** Grava o PDF em disco (criando o diretório se preciso) e devolve o nome do arquivo. */
export async function writeMaterialPdf(filename: string, bytes: Uint8Array): Promise<string> {
  await fs.mkdir(MATERIALS_DIR, { recursive: true });
  await fs.writeFile(path.join(MATERIALS_DIR, filename), bytes);
  return filename;
}

/**
 * Resolve um nome de arquivo pedido em uma requisição para um caminho absoluto seguro.
 * Rejeita qualquer coisa que não seja um `.pdf` de nome-base simples (sem `/`, `..`, etc).
 * Retorna null se inválido — o handler responde 404.
 */
export function resolveMaterialPath(requested: string): string | null {
  const base = path.basename(requested);
  if (base !== requested || !base.endsWith('.pdf') || base.startsWith('.')) {
    return null;
  }
  const full = path.join(MATERIALS_DIR, base);
  // Defesa extra: garante que continua dentro de MATERIALS_DIR.
  if (path.dirname(full) !== MATERIALS_DIR) return null;
  return full;
}
