/**
 * Cliente da camada de API (lado do browser).
 *
 * Fala só com os route handlers deste app (/api/*), NUNCA direto com a Anthropic — a chave
 * vive só no servidor. É um transporte fino: a UI chama estas funções e trata erro/carregando.
 */

/** Consulta /api/status para a UI decidir se mostra o botão "Gerar via API". */
export async function isApiEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return !!data.enabled;
  } catch {
    return false;
  }
}

export interface GeneratedMaterial {
  /** URL para abrir o PDF gerado (ex.: /api/materiais/m4-event-loop.pdf). */
  pdfPath: string;
  filename: string;
  /** Markdown do material, para guardar como contexto (dúvidas/entrevista). */
  markdown: string;
}

/**
 * Gera o material de um tópico via API e devolve o caminho do PDF gerado. Lança um Error
 * com mensagem legível (rede, rate-limit, sem crédito, teto, falha de render) — a UI, ao
 * pegar o erro, cai no modo copiar-e-colar.
 */
export async function generateMaterial(moduleId: string, topic: string): Promise<GeneratedMaterial> {
  let res: Response;
  try {
    res = await fetch('/api/generate-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, topic }),
    });
  } catch {
    throw new Error('Falha de rede ao chamar a API. Verifique sua conexão.');
  }

  const data = (await res.json().catch(() => ({}))) as {
    pdfPath?: string;
    filename?: string;
    markdown?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Falha ao gerar material (HTTP ${res.status}).`);
  }
  if (!data.pdfPath) {
    throw new Error('A API não retornou o PDF.');
  }
  return {
    pdfPath: data.pdfPath,
    filename: data.filename || 'material.pdf',
    markdown: data.markdown || '',
  };
}
