// Markup inline des textes de réel.
//
// DEUX niveaux (additif, rétrocompatible) :
//
// 1. FORMAT COURT (historique) — `[[mot]]` surligné jaune uniquement.
//    parseHighlights / stripHighlights : INCHANGÉS (segments.js + autoFit en dépendent).
//
// 2. FORMAT LONG — surlignage jaune `[[…]]` ET gras `**…**`, combinables et
//    imbriquables (`[[**mot**]]`, `**[[mot]]**`). parseInline → pieces
//    `{ text, yellow, bold }` ; stripInline retire tous les marqueurs pour la
//    mesure auto-fit. Réutilisé par SegmentLine (rendu) et autoFit (mesure).

// ---- Niveau 1 : court (inchangé) ----
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

// ---- Niveau 2 : long (jaune + gras, imbriquables) ----
// Tokeniseur : on balaie le texte, on bascule des drapeaux yellow/bold à chaque
// marqueur d'ouverture/fermeture (`[[`, `]]`, `**`). Marqueurs non appariés =
// rendus littéralement (pas de crash). Approche simple à pile, suffisante pour
// le corps de réel (pas de besoin d'arbre complet).
export const parseInline = (text) => {
  const pieces = [];
  let buf = '';
  let yellow = false;
  let bold = false;
  const flush = () => {
    if (buf) { pieces.push({ text: buf, yellow, bold }); buf = ''; }
  };
  let i = 0;
  const n = text.length;
  while (i < n) {
    const two = text.slice(i, i + 2);
    if (two === '[[') { flush(); yellow = true; i += 2; continue; }
    if (two === ']]') { flush(); yellow = false; i += 2; continue; }
    if (two === '**') { flush(); bold = !bold; i += 2; continue; }
    buf += text[i];
    i += 1;
  }
  flush();
  return pieces;
};

// Texte visible (sans marqueurs) — pour la mesure auto-fit et le comptage de volume.
export const stripInline = (text) =>
  text.replace(/\[\[/g, '').replace(/\]\]/g, '').replace(/\*\*/g, '');
