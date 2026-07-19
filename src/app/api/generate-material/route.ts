import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PROGRAM } from '@/data/program';
import { materialStablePrefix, materialTaskBlock } from '@/lib/prompts';
import { loadExampleGuide } from '@/lib/guide';
import { consumeCall } from '@/lib/callLimit';
import { renderMarkdownToPdf } from '@/lib/pdf';
import { materialFilename, writeMaterialPdf } from '@/lib/materials';

/**
 * POST /api/generate-material — gera o material de UM tópico via API e devolve um PDF.
 *
 * Caminho principal do app: a IA escreve o material (Markdown) seguindo o guia-exemplo, e o
 * servidor o renderiza em PDF, salvo em disco. A chave vive só no servidor. Se ausente, 503;
 * se a API/geração falhar, erro legível — em ambos os casos a UI cai no copiar-e-colar.
 *
 * Cache: o prefixo estável (framing + guia) vai como bloco com cache_control — a partir da 2ª
 * geração dentro da janela, esse prefixo grande é lido do cache (~10% do custo).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // API + render do PDF podem demorar

const DEFAULT_MODEL = 'claude-sonnet-4-6';

interface Body {
  moduleId?: unknown;
  topic?: unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API não configurada — use o modo copiar-e-colar.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido (JSON esperado).' }, { status: 400 });
  }

  const { moduleId, topic } = body;
  if (typeof moduleId !== 'string' || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json(
      { error: 'Informe moduleId e topic (strings não vazias).' },
      { status: 400 },
    );
  }

  const module = PROGRAM.modules.find((m) => m.id === moduleId);
  if (!module) {
    return NextResponse.json({ error: `Módulo desconhecido: ${moduleId}.` }, { status: 400 });
  }
  if (!module.topics.includes(topic)) {
    return NextResponse.json(
      { error: `Tópico "${topic}" não pertence ao módulo ${module.name}.` },
      { status: 400 },
    );
  }

  // Rede de segurança de custo: só conta chamadas que vão realmente acontecer.
  const limit = await consumeCall();
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Teto mensal de ${limit.limit} chamadas atingido. Ajuste MONTHLY_CALL_LIMIT ou espere o próximo mês. Enquanto isso, use o modo copiar-e-colar.`,
      },
      { status: 429 },
    );
  }

  const exampleGuide = await loadExampleGuide();
  const stablePrefix = materialStablePrefix(exampleGuide);
  const taskBlock = materialTaskBlock(module, topic);
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const client = new Anthropic({ apiKey });

  let markdown: string;
  try {
    // Streaming: material é longo — evita timeout de HTTP em respostas grandes.
    const stream = client.messages.stream({
      model,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      messages: [
        {
          role: 'user',
          content: [
            // Prefixo estável e grande → cacheado. O guia é idêntico em toda geração.
            { type: 'text', text: stablePrefix, cache_control: { type: 'ephemeral' } },
            // Bloco volátil (módulo/tópico) fica depois, para não invalidar o cache.
            { type: 'text', text: taskBlock },
          ],
        },
      ],
    });
    const message = await stream.finalMessage();
    markdown = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (err) {
    console.error('[generate-material] erro na API:', err);
    return NextResponse.json({ error: readableApiError(err) }, { status: statusFor(err) });
  }

  if (!markdown) {
    return NextResponse.json(
      { error: 'A IA não retornou material. Tente novamente ou use o modo copiar-e-colar.' },
      { status: 502 },
    );
  }

  try {
    const pdf = await renderMarkdownToPdf(markdown, { moduleName: module.name, topic });
    const filename = await writeMaterialPdf(materialFilename(module.id, topic), pdf);
    // Devolve o markdown também: o cliente o guarda para embutir como contexto em dúvidas/entrevista.
    return NextResponse.json({ pdfPath: `/api/materiais/${filename}`, filename, markdown });
  } catch (err) {
    console.error('[generate-material] erro ao renderizar PDF:', err);
    return NextResponse.json(
      { error: 'O material foi gerado, mas falhou ao virar PDF. Tente de novo ou use o modo copiar-e-colar.' },
      { status: 500 },
    );
  }
}

/** Traduz erros da API em mensagens legíveis — sem vazar stack trace. */
function readableApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Chave de API inválida. Confira ANTHROPIC_API_KEY no .env.local.';
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'A chave não tem permissão para este modelo. Verifique no Console.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Limite de requisições atingido. Espere um pouco e tente de novo.';
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Requisição recusada pela API: ${err.message}. (Sem crédito na carteira? Recarregue no Console.)`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Falha de rede ao falar com a API. Verifique sua conexão e tente de novo.';
  }
  if (err instanceof Anthropic.APIError) {
    return `Erro da API (${err.status ?? '?'}): ${err.message}`;
  }
  return 'Erro inesperado ao falar com a API. Use o modo copiar-e-colar como saída.';
}

function statusFor(err: unknown): number {
  if (err instanceof Anthropic.APIError && typeof err.status === 'number') {
    return err.status;
  }
  return 502;
}
