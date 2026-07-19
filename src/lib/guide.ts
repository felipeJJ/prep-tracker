import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EXAMPLE_GUIDE } from '@/lib/exampleGuide';

/**
 * Leitura do guia-exemplo do disco (SÓ servidor — o route handler tem acesso a arquivos).
 *
 * O guia vive em `docs/guias/exemplo-event-loop.md`, editável sem tocar código: mudar o .md
 * muda o material gerado via API sem rebuild. Se o arquivo sumir ou não puder ser lido, cai
 * no `EXAMPLE_GUIDE` embutido — o app nunca fica sem padrão de qualidade.
 */

const GUIDE_PATH = path.join(process.cwd(), 'docs', 'guias', 'exemplo-event-loop.md');

export async function loadExampleGuide(): Promise<string> {
  try {
    const content = await fs.readFile(GUIDE_PATH, 'utf8');
    return content.trim() ? content : EXAMPLE_GUIDE;
  } catch {
    return EXAMPLE_GUIDE;
  }
}
