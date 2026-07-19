import { promises as fs } from 'node:fs';
import { resolveMaterialPath } from '@/lib/materials';

/**
 * GET /api/materiais/<arquivo>.pdf — serve um PDF de material do disco.
 *
 * Os PDFs vivem em content/materiais (fora de public/). Este handler valida o nome do arquivo
 * (só nome-base, só .pdf; sem `/` nem `..`) antes de ler, para não virar leitura arbitrária de
 * disco. Responde inline, para abrir na aba do navegador.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  const full = resolveMaterialPath(params.file);
  if (!full) {
    return new Response('Arquivo inválido.', { status: 404 });
  }
  try {
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${params.file}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Material não encontrado.', { status: 404 });
  }
}
