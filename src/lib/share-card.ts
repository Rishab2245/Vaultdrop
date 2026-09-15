'use client';

import { PALETTES } from './constants';

/**
 * Render a record as an image.
 *
 * This is the growth engine, not a nicety. Whisper grew on text-over-image
 * cards and NGL grew on a link people pasted into a story; both spread because
 * the artifact left the app. A confession that can only be read on our domain
 * reaches the people already here, which at the start is nobody.
 *
 * The card is the record, printed: system chrome in mono around a serif body,
 * with a redaction bar under the signature line. Drawn on a canvas rather than
 * screenshotted so the output is the same size and legible from any device.
 */

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 88;

const VOID = '#0A0E1A';
const HAIRLINE = '#2A3050';
const CHROME = '#E8ECF4';
const LABEL = '#5E6680';

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SERIF = 'Newsreader, Georgia, "Times New Roman", serif';

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

/** Largest serif size at which the body still fits the record area. */
function fitBody(ctx: CanvasRenderingContext2D, body: string, maxWidth: number, maxHeight: number) {
  for (let size = 62; size >= 28; size -= 2) {
    ctx.font = `400 ${size}px ${SERIF}`;
    const lines = wrapText(ctx, body, maxWidth);
    const lineHeight = size * 1.42;
    if (lines.length * lineHeight <= maxHeight) return { size, lines, lineHeight };
  }

  ctx.font = `400 28px ${SERIF}`;
  return { size: 28, lines: wrapText(ctx, body, maxWidth).slice(0, 22), lineHeight: 28 * 1.42 };
}

function hairline(ctx: CanvasRenderingContext2D, y: number, from: number, to: number): void {
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(from, y, to - from, 1);
}

export async function renderShareCard(opts: {
  body: string;
  mood: string;
  code: string;
  ref: string;
  palette: number;
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a drawing context.');

  const channel = PALETTES[opts.palette] ?? PALETTES[0];

  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textBaseline = 'top';

  const right = WIDTH - MARGIN;

  // --- header: the system identifies the record -------------------------
  ctx.font = `500 24px ${MONO}`;
  ctx.letterSpacing = '3px';

  ctx.fillStyle = channel.hex;
  ctx.fillText(`REC ${opts.ref}`, MARGIN, MARGIN);

  ctx.fillStyle = LABEL;
  const codeWidth = ctx.measureText(opts.code).width;
  ctx.fillText(opts.code, right - codeWidth, MARGIN);

  hairline(ctx, MARGIN + 46, MARGIN, right);

  // --- body: the only thing a person wrote ------------------------------
  const maxWidth = right - MARGIN;
  const bodyTop = MARGIN + 92;
  const bodyMaxHeight = HEIGHT - bodyTop - 300;

  ctx.letterSpacing = '0px';
  const { lines, lineHeight } = fitBody(ctx, opts.body, maxWidth, bodyMaxHeight);

  let y = bodyTop;
  ctx.fillStyle = CHROME;
  for (const line of lines) {
    ctx.fillText(line, MARGIN, y);
    y += lineHeight;
  }

  // --- signature: redacted, because there is no author to print ---------
  const footTop = HEIGHT - MARGIN - 130;
  hairline(ctx, footTop, MARGIN, right);

  ctx.font = `500 22px ${MONO}`;
  ctx.letterSpacing = '3px';
  ctx.fillStyle = LABEL;
  ctx.fillText('SIGNED', MARGIN, footTop + 30);

  // The bar is the point: this field exists and cannot be read.
  const signedWidth = ctx.measureText('SIGNED').width;
  ctx.fillStyle = CHROME;
  ctx.fillRect(MARGIN + signedWidth + 22, footTop + 26, 232, 30);

  // --- footer mark ------------------------------------------------------
  ctx.font = `700 26px ${MONO}`;
  ctx.fillStyle = CHROME;
  ctx.fillText('VAULTDROP', MARGIN, HEIGHT - MARGIN - 52);

  ctx.font = `400 20px ${MONO}`;
  ctx.fillStyle = LABEL;
  ctx.fillText('SAY IT WITHOUT SAYING WHO', MARGIN, HEIGHT - MARGIN - 18);

  ctx.letterSpacing = '0px';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image.'))),
      'image/png'
    );
  });
}

/**
 * Hand the card to the OS share sheet where that exists, and fall back to a
 * download. The share sheet is the point on mobile - it is one tap from here to
 * a story, which is the entire distribution loop.
 */
export async function shareCard(
  blob: Blob,
  filename: string,
  text: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (error) {
      // A user who dismisses the sheet has not asked for a download instead.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
