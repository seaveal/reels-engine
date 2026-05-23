/**
 * Normalise un segment du JSON en une liste de "lines" (chaque ligne = bloc texte
 * rendu côte à côte, gras + casse). On expose :
 *   - segment.id
 *   - segment.role
 *   - segment.lines: [{ text, bold, kind: 'title'|'heading'|'body'|'cta'|'block' }]
 *   - segment.bold (override)
 *
 * Règles bold par défaut (la mission) :
 *   title → bold
 *   heading → bold
 *   body / cta / block.text → régulier
 *   override possible via segment.bold (bool) sur tout le segment
 */
export const normaliseSegments = (segments) => segments.map((seg, i) => {
  const lines = [];
  const override = seg.bold;
  const push = (text, defaultBold, kind) =>
    lines.push({ text, bold: override != null ? override : defaultBold, kind });

  if (seg.role === 'title') {
    push(seg.text, true, 'title');
  } else if (seg.role === 'cta') {
    push(seg.text, false, 'cta');
  } else if (seg.role === 'block') {
    if (seg.heading != null) {
      push(seg.heading, true, 'heading');
      if (seg.body != null) push(seg.body, false, 'body');
    } else if (seg.text != null) {
      push(seg.text, false, 'block');
    }
  } else {
    throw new Error(`segment[${i}].role inconnu : ${seg.role}`);
  }
  return { id: i, role: seg.role, lines };
});
