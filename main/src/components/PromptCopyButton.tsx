'use client';

import { useState } from 'react';

type CopyState = 'idle' | 'copied' | 'error';

export function PromptCopyButton({ label, url }: { label: string; url: string }) {
  const [state, setState] = useState<CopyState>('idle');

  const handleClick = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const display =
    state === 'copied' ? 'Copied!' : state === 'error' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-1 transition-colors"
    >
      {display}
    </button>
  );
}
