import { COLORS } from './constants.js';

const HIGHLIGHT_RE = /\[\[([^\]]+)\]\]/g;

export const parseHighlights = (text) => {
  const out = [];
  let last = 0;
  for (const match of text.matchAll(HIGHLIGHT_RE)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index), highlight: false });
    out.push({ text: match[1], highlight: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), highlight: false });
  return out;
};

export const stripHighlights = (text) => text.replace(HIGHLIGHT_RE, '$1');

export const renderHighlighted = (text, baseColor = COLORS.white) =>
  parseHighlights(text).map((piece, i) =>
    piece.highlight
      ? `<span style="color:${COLORS.yellow}">${escapeHtml(piece.text)}</span>`
      : `<span style="color:${baseColor}">${escapeHtml(piece.text)}</span>`,
  ).join('');

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
