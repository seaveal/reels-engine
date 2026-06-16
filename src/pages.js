/**
 * Format LONG (layout:"long") — normalisation des pages.
 *
 * Une page du JSON = { lines: [{ text, role?, bold?, size?, align? }], hold_s?, arrow? }.
 * On la normalise en { id, lines: [{ text, bold, kind, sizeMul, align }], arrow }
 * consommable par <SegmentLine> (réutilisé) et <PageStack>.
 *
 * Mapping role -> kind (kind pilote casse + couleur de base dans SegmentLine) :
 *   heading -> kind:'heading'  (CAPS + gras)            — le hook en haut de page
 *   cta     -> kind:'cta'      (CAPS + gras, crème)     — renvoi légende en bas de page
 *   body    -> kind:'block'    (casse d'origine, régulier) — corps narratif (défaut)
 *
 * Règles PAR DÉFAUT (alignées sur l'observation des 3 réels originaux) :
 *   bold   : heading=true, cta=true, body=false ; override via line.bold.
 *            (le gras PAR MOT au sein d'une ligne se fait via **mot** dans text.)
 *   size   : heading='l', cta='s', body='m' ; override via line.size.
 *   align  : heading='center', cta='center', body='left' ; override via line.align.
 *            (corps justifié possible via align:'justify' — réel « stoique ».)
 *
 * ADDITIF : ne touche pas segments.js (format court).
 */
const ROLE_TO_KIND = { heading: 'heading', cta: 'cta', body: 'block' };
const DEFAULT_BOLD = { heading: true, cta: true, body: false };
const DEFAULT_SIZE = { heading: 'l', cta: 's', body: 'm' };
const DEFAULT_ALIGN = { heading: 'center', cta: 'center', body: 'left' };

// Multiplicateurs de taille relatifs (appliqués à la taille auto-fit de base).
export const SIZE_MUL = { xl: 1.30, l: 1.15, m: 1.0, s: 0.82 };

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
    return { text: line.text, bold, kind, sizeMul, align };
  });
  return { id: pi, lines, arrow: page.arrow === true };
});
