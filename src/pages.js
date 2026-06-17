/**
 * Format LONG (layout:"long") — normalisation des pages.
 *
 * MODÈLE PAR PARAGRAPHE (v4, 2026-06-17) : chaque entrée de `lines` EST un
 * PARAGRAPHE (un bloc, éventuellement wrappé sur plusieurs lignes visuelles) qui
 * porte SES PROPRES attributs de style pour l'harmonie/lisibilité et la fidélité
 * aux originaux :
 *
 *   { text, role?, bold?, size?, letter_spacing?, space_after?, align?, color? }
 *
 * On la normalise en
 *   { id, lines: [{ text, bold, kind, sizeMul, letterSpacing, spaceAfter, align, color }], arrow }
 * consommable par <SegmentLine> (réutilisé) et <PageStack>.
 *
 * Mapping role -> kind (kind pilote casse + couleur de base dans SegmentLine) :
 *   heading -> kind:'heading'  (CAPS + gras)            — le hook en haut de page
 *   cta     -> kind:'cta'      (CAPS + gras, crème)     — renvoi légende en bas de page
 *   body    -> kind:'block'    (casse d'origine, régulier) — corps narratif (défaut)
 *
 * Les 4 attributs PAR PARAGRAPHE demandés par Cyrille (additifs, rétrocompatibles) :
 *   1. size          : taille relative du paragraphe (xl/l/m/s → multiplicateur).
 *                      Défaut : heading='l', cta='s', body='m' ; override via line.size.
 *   2. letter_spacing: tracking (espacement des lettres), en em. Défaut 0 (NORMAL_LS,
 *                      sauf legacy titre court via kind:'title' dans SegmentLine).
 *                      Valeur numérique (ex. 0.02 = +2 %, -0.01 = serré) ou null.
 *   3. bold          : graisse du paragraphe entier. Défaut heading/cta=true,body=false.
 *                      (le gras PAR MOT reste possible via **mot** dans text.)
 *   4. space_after   : ESPACEMENT APRÈS le paragraphe (gap vertical AVANT le suivant),
 *                      en em de la taille de base de page. null = défaut global
 *                      (PAGE_PARA_GAP_EM). Permet de resserrer une liste (verites) ou
 *                      d'aérer une punchline. Le DERNIER paragraphe ignore son space_after.
 *
 * Autres attributs (acquis v3, inchangés) :
 *   align  : 'left'|'center'|'right'|'justify'. Défaut heading/cta=center, body=left.
 *   color  : couleur de BASE du paragraphe (white|yellow|cream). Défaut cta=cream,
 *            heading/body=white. Sert aux TITRES jaunes ; les spans [[mot]] restent
 *            jaunes par-dessus.
 *
 * ADDITIF : ne touche pas segments.js (format court). Les JSON longs SANS ces 4
 * attributs restent valides (défauts sensés identiques au comportement v3).
 */
const ROLE_TO_KIND = { heading: 'heading', cta: 'cta', body: 'block' };
const DEFAULT_BOLD = { heading: true, cta: true, body: false };
const DEFAULT_SIZE = { heading: 'l', cta: 's', body: 'm' };
const DEFAULT_ALIGN = { heading: 'center', cta: 'center', body: 'left' };
const DEFAULT_COLOR = { heading: 'white', cta: 'cream', body: 'white' };
const VALID_COLORS = ['white', 'yellow', 'cream'];

// Multiplicateurs de taille relatifs (appliqués à la taille auto-fit de base).
export const SIZE_MUL = { xl: 1.30, l: 1.15, m: 1.0, s: 0.82 };

// Gap inter-paragraphe PAR DÉFAUT (en em de la taille de base de page) quand
// space_after n'est pas précisé sur un paragraphe. Calé sur l'aération observée
// des originaux (~0.03-0.04 de la hauteur ≈ 0.55 em de la taille de corps).
export const DEFAULT_SPACE_AFTER_EM = 0.55;

export const normalisePages = (pages) => pages.map((page, pi) => {
  const lines = (page.lines ?? []).map((line, li) => {
    const role = line.role ?? 'body';
    const kind = ROLE_TO_KIND[role];
    if (kind == null) {
      throw new Error(`page[${pi}].lines[${li}].role inconnu : ${role}`);
    }
    const bold = line.bold != null ? line.bold : DEFAULT_BOLD[role];
    const sizeKey = line.size ?? DEFAULT_SIZE[role];
    const sizeMul = SIZE_MUL[sizeKey] ?? 1.0;
    const align = line.align ?? DEFAULT_ALIGN[role];
    const color = line.color ?? DEFAULT_COLOR[role];
    if (!VALID_COLORS.includes(color)) {
      throw new Error(`page[${pi}].lines[${li}].color inconnu : ${color}`);
    }
    // v4 — letter_spacing (em) : null = défaut (0 ; SegmentLine garde le tracking
    // legacy -0.005em du kind:'title' court). Sinon valeur numérique honorée.
    const letterSpacing = (line.letter_spacing != null && Number.isFinite(line.letter_spacing))
      ? line.letter_spacing
      : null;
    // v4 — space_after (em) : null = défaut global DEFAULT_SPACE_AFTER_EM. Sinon
    // gap vertical (>=0) appliqué APRÈS ce paragraphe. Honoré au rendu ET à l'auto-fit.
    const spaceAfter = (line.space_after != null && Number.isFinite(line.space_after) && line.space_after >= 0)
      ? line.space_after
      : null;
    return { text: line.text, bold, kind, sizeMul, letterSpacing, spaceAfter, align, color };
  });
  return { id: pi, lines, arrow: page.arrow === true };
});
