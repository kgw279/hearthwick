/**
 * Bitmap text using the art pack's own pixel fonts. White outlined glyphs for dark backgrounds,
 * 'ink' glyphs (dark brown, no outline) for parchment and other light panels.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';

const ADVANCE = 6;
const SPACE = 4;
export const LINE_HEIGHT = 11;

const LETTER_NAMES: Record<string, string> = { '!': 'bang', '?': 'question', ',': 'comma', "'": 'apostrophe', '&': 'amp', '(': 'lparen', ')': 'rparen' };
const DIGIT_NAMES: Record<string, string> = { '+': 'plus', '-': 'minus', x: 'times', '/': 'slash', ':': 'colon', '%': 'percent', '.': 'dot' };

function glyphName(ch: string, ink: boolean): string | null {
  const isLower = ch >= 'a' && ch <= 'z';
  const isUpper = ch >= 'A' && ch <= 'Z';
  const isDigit = ch >= '0' && ch <= '9';
  if (ink) {
    if (isLower) return `ink_lower_${ch}`;
    if (isUpper) return `ink_${ch}`;
    if (LETTER_NAMES[ch]) return `ink_${LETTER_NAMES[ch]}`;
    if (isDigit) return `ink_digit_${ch}`;
    if (DIGIT_NAMES[ch]) return `ink_digit_${DIGIT_NAMES[ch]}`;
    return null;
  }
  if (isLower) return `lower_${ch}`;
  if (isUpper) return `letter_${ch}`;
  if (LETTER_NAMES[ch]) return `letter_${LETTER_NAMES[ch]}`;
  if (isDigit) return `digit_${ch}`;
  if (DIGIT_NAMES[ch]) return `digit_${DIGIT_NAMES[ch]}`;
  return null;
}

export function measure(text: string): number {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? SPACE : ADVANCE;
  return w + 1;
}

export function drawText(r: Renderer, assets: Assets, text: string, x: number, y: number, ink = false): void {
  let cx = Math.round(x);
  for (const ch of text) {
    if (ch === ' ') {
      cx += SPACE;
      continue;
    }
    const name = glyphName(ch, ink);
    if (name && assets.has(name)) r.sprite(name, cx, y);
    cx += ADVANCE;
  }
}

/** Split text into lines no wider than maxW pixels. */
export function wrap(text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}
