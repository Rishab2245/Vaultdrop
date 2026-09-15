'use client';

import { useCallback, useEffect, useState } from 'react';

/** A read-only value with a copy button that confirms it worked. */
export function CopyField({ value, className = '' }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard API needs permission or a secure context. Select the text so
      // the user can still copy it by hand rather than hitting a dead button.
      const input = document.getElementById('copy-input-input') as HTMLInputElement | null;
      input?.select();
    }
  }, [value]);

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        id="copy-input-input"
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="input flex-1 font-mono text-xs"
        aria-label="Shareable link"
      />
      <button type="button" onClick={copy} className="cmd-primary shrink-0 px-4">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
