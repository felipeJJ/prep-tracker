import { NextResponse } from 'next/server';

/**
 * GET /api/status — diz à UI se a camada de API está disponível.
 *
 * Devolve só { enabled }, derivado da PRESENÇA da chave no servidor. NUNCA devolve a
 * chave nem qualquer parte dela. É o que permite o botão "Gerar via API" aparecer só
 * quando há chave configurada, mantendo o app 100% funcional no modo copiar-e-colar sem ela.
 */

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ enabled: !!process.env.ANTHROPIC_API_KEY });
}
