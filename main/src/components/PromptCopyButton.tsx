'use client';

import { useState } from 'react';

type CopyState = 'idle' | 'copied' | 'error';

export function PromptCopyButton({ label, url }: { label: string; url: string }) {
  const [state, setState] = useState<CopyState>('idle');

  const fetchText = async (): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    return res.text();
  };

  const handleClick = async () => {
    try {
      // Safari consumes the click's transient user activation across an await,
      // so `await fetch(...)` followed by `clipboard.writeText(...)` is refused
      // there. ClipboardItem accepts a *pending promise*, which claims the
      // clipboard synchronously inside the gesture and resolves afterwards.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': fetchText().then((text) => new Blob([text], { type: 'text/plain' })),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(await fetchText());
      }
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      // Some engines reject the promise form outright; fall back to the plain
      // path rather than reporting a failure the user can do nothing about.
      try {
        await navigator.clipboard.writeText(await fetchText());
        setState('copied');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    }
  };

  const display =
    state === 'copied' ? 'Copied!' : state === 'error' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-1 transition-colors"
    >
      {display}
    </button>
  );
}
