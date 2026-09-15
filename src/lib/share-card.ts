'use client';

import { PALETTES } from './constants';

/**
 * Render a secret as an image.
 *
 * This is the growth engine, not a nicety. Whisper grew on text-over-image
 * cards and NGL grew on a link people pasted into an Instagram Story; both
 * spread because the artifact left the app. A confession that can only be read
 * on our domain reaches the people already here, which is nobody at the start.
 *
 * Drawn on a canvas rather than screenshotted so the output is always the same
 * size and always legible, whatever device it came from.
 */

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 96;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
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

/** Largest font size at which the body still fits the card. */
function fitFontSize(ctx: CanvasRenderingContext2D, body: string, maxWidth: number, maxHeight: number) {
  for (let size = 68; size >= 30; size -= 2) {
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const lines = wrapText(ctx, body, maxWidth);
    const lineHeight = size * 1.34;
    if (lines.length * lineHeight <= maxHeight) return { size, lines, lineHeight };
  }

  ctx.font = `600 30px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const lines = wrapText(ctx, body, maxWidth).slice(0, 18);
  return { size: 30, lines, lineHeight: 30 * 1.34 };
}

export async function renderShareCard(opts: {
  body: string;
  mood: string;
  palette: number;
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a drawing context.');

  const palette = PALETTES[opts.palette] ?? PALETTES[0];

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, palette.from);
  bg.addColorStop(1, palette.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A dark scrim keeps white text readable over the lighter palettes.
  const scrim = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  scrim.addColorStop(0, 'rgba(7,6,11,0.34)');
  scrim.addColorStop(0.55, 'rgba(7,6,11,0.52)');
  scrim.addColorStop(1, 'rgba(7,6,11,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textBaseline = 'top';

  ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.letterSpacing = '4px';
  ctx.fillText(opts.mood.toUpperCase(), MARGIN, MARGIN);
  ctx.letterSpacing = '0px';

  const maxWidth = WIDTH - MARGIN * 2;
  const maxHeight = HEIGHT - MARGIN * 2 - 300;
  const { lines, lineHeight } = fitFontSize(ctx, opts.body, maxWidth, maxHeight);

  const blockHeight = lines.length * lineHeight;
  let y = Math.max(MARGIN + 160, (HEIGHT - blockHeight) / 2 - 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;

  for (const line of lines) {
    ctx.fillText(line, MARGIN, y);
    y += lineHeight;
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Footer mark. Small, so the secret stays the subject.
  const footerY = HEIGHT - MARGIN - 44;

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, MARGIN, footerY - 4, 52, 52, 16);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 30px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('VaultDrop', MARGIN + 70, footerY + 4);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '400 24px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('say it without saying who', MARGIN + 70, footerY + 40);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image.'))),
      'image/png'
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Hand the card to the OS share sheet where that exists, and fall back to a
 * download. The share sheet is the point on mobile - it is one tap from here to
 * an Instagram Story, which is the entire distribution loop.
 */
export async function shareCard(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded'> {
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
