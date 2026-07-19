import puppeteer from 'puppeteer';
import { marked } from 'marked';

/**
 * Renderização de material Markdown → PDF (SÓ servidor).
 *
 * `marked` converte o Markdown gerado pela IA em HTML; o Puppeteer (Chromium headless)
 * imprime esse HTML em PDF com um estilo próprio que ecoa o padrão do guia-exemplo:
 * corpo serifado legível, seções claras, blocos de código, e callouts para as perguntas
 * socráticas e as seções finais de auto-teste. É o Chromium de verdade, então a fidelidade
 * tipográfica é alta.
 */

export interface PdfMeta {
  moduleName: string;
  topic: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderMarkdownToPdf(markdown: string, meta: PdfMeta): Promise<Uint8Array> {
  const body = await marked.parse(markdown, { gfm: true });
  const html = htmlTemplate(body, meta);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#9a9a9a;padding:0 14mm;display:flex;justify-content:space-between;">
        <span>${escapeHtml(meta.topic)}</span>
        <span><span class="pageNumber"></span>/<span class="totalPages"></span></span>
      </div>`,
    });
  } finally {
    await browser.close();
  }
}

function htmlTemplate(bodyHtml: string, meta: PdfMeta): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  :root { --ink:#1c1c1e; --soft:#4a4a4f; --faint:#8a8a90; --accent:#1f3a5f; --line:#e2e2e6; --code-bg:#f6f6f4; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--ink); line-height: 1.62; font-size: 11pt; margin: 0;
  }
  .doc-header { border-bottom: 2px solid var(--accent); padding-bottom: 0.6rem; margin-bottom: 1.4rem; }
  .doc-kicker { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 8.5pt;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
  .doc-title { font-size: 20pt; margin: 0.25rem 0 0; color: var(--accent); line-height: 1.2; }
  h1 { font-size: 16pt; margin: 1.6rem 0 0.6rem; color: var(--ink); line-height: 1.25; }
  h2 { font-size: 13.5pt; margin: 1.5rem 0 0.5rem; color: var(--accent); line-height: 1.3;
    border-bottom: 1px solid var(--line); padding-bottom: 0.2rem; }
  h3 { font-size: 11.5pt; margin: 1.1rem 0 0.4rem; color: var(--ink); }
  p { margin: 0.55rem 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: var(--accent); text-decoration: none; }
  ul, ol { margin: 0.5rem 0 0.7rem; padding-left: 1.4rem; }
  li { margin: 0.2rem 0; }
  blockquote {
    margin: 0.9rem 0; padding: 0.5rem 0.9rem; border-left: 3px solid var(--accent);
    background: #f4f6f9; color: var(--soft); font-style: italic; border-radius: 0 4px 4px 0;
  }
  blockquote p { margin: 0.25rem 0; }
  code {
    font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 9.5pt;
    background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 3px; border: 1px solid var(--line);
  }
  pre {
    background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px;
    padding: 0.8rem 1rem; overflow-x: auto; margin: 0.8rem 0; line-height: 1.5;
    page-break-inside: avoid;
  }
  pre code { background: none; border: none; padding: 0; font-size: 9pt; }
  table { border-collapse: collapse; width: 100%; margin: 0.9rem 0; font-size: 10pt; }
  th, td { border: 1px solid var(--line); padding: 0.4rem 0.6rem; text-align: left; }
  th { background: var(--code-bg); }
  h1, h2, h3 { page-break-after: avoid; }
  img { max-width: 100%; }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-kicker">${escapeHtml(meta.moduleName)} · material de estudo</div>
    <h1 class="doc-title">${escapeHtml(meta.topic)}</h1>
  </div>
  ${bodyHtml}
</body>
</html>`;
}
