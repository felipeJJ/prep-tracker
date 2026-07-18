'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Copiar prompt' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="primary" onClick={onCopy} aria-live="polite">
      {copied ? 'Copiado ✓' : label}
    </button>
  );
}
