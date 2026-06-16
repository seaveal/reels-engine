/**
 * Format LONG (layout:"long") — normalisation des pages.
 *
 * Une page du JSON = { lines: [{ text, role?, bold? }], hold_s? }.
 * On la normalise en { id, lines: [{ text, bold, kind }] } consommable par
 * <SegmentLine> (réutilisé tel quel) et <PageStack>.
 *
 * Mapping role -> kind (kind pilote casse + gras dans SegmentLine) :
 *   heading -> kind:'heading'  (CAPS + gras)      — le hook en haut de page
 *   cta     -> kind:'cta'      (CAPS + régulier)  — renvoi légende en bas de page
 *   body    -> kind:'block'    (casse d'origine, régulier) — corps narratif (défaut)
 *
 * Règles bold par défaut (alignées segments.js) :
 *   heading -> gras ; body/cta -> régulier ; override possible via line.bold.
 *
 * ADDITIF : ne touche pas segments.js (format court).
 */
const ROLE_TO_KIND = { heading: 'heading', cta: 'cta', body: 'block' };
const DEFAULT_BOLD = { heading: true, cta: false, body: false };

export const normalisePages = (pages) => pages.map((page, pi) => {
  const lines = (page.lines ?? []).map((line, li) => {
    const role = line.role ?? 'body';
    const kind = ROLE_TO_KIND[role];
    if (kind == null) {
      throw new Error(`page[${pi}].lines[${li}].role inconnu : ${role}`);
    }
    const bold = line.bold != null ? line.bold : DEFAULT_BOLD[role];
    return { text: line.text, bold, kind };
  });
  return { id: pi, lines };
});
