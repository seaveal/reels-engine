/**
 * L'Écho Incarné — jetons de design (Souverain au Quotidien · Méthode H3C)
 * Trois voix chromatiques SEULEMENT. Jamais une quatrième.
 * Source canonique : charte "philosophie-echo-incarne" + #A8432B (terracotta canonique).
 */

export const COLORS = {
  creme:      '#F0E7D6', // crème de papier ancien — porte tout (fond par défaut)
  cremeDeep:  '#E8DCC7', // crème plus dense (bandes, aplats secondaires)
  taupe:      '#998A79', // taupe minéral — ce qui s'efface, le passé, les échos pâles
  terracotta: '#A8432B', // terracotta profonde presque sang séché — l'UNIQUE présence / le mot qui bascule
  terracottaLight: '#D9714E', // terracotta éclaircie, RÉSERVÉE au texte sur fond sombre/terracotta
  encre:      '#2A211A', // encre chaude — le corps du texte serif
  encreSoft:  '#4A4036', // encre atténuée — le souffle, les sous-textes
  encreMuted: '#6A5F51', // encre discrète — signatures mono
} as const;

/** Trame de la page 1080 × 1440 (3:4). Pour revenir en 4:5 : height = 1350. */
export const CANVAS = { width: 1080, height: 1440, pad: 96 } as const;

/**
 * Trois niveaux typographiques, pas un de plus :
 *  - serif   : la chair (monumental, pleine page) + l'italique = le souffle
 *  - sans    : l'os (linéale discrète, le murmure en lettres espacées)
 *  - mono    : le relevé scientifique (numéros, signatures, légende)
 * fontFamily réel injecté à l'exécution par les loaders @remotion/google-fonts.
 */
export const TYPE = {
  eyebrow: {                       // le haut murmure — sans, lettres espacées
    fontSize: 26, letterSpacing: '0.42em', textTransform: 'uppercase' as const, fontWeight: 500,
  },
  mono: { fontSize: 24, letterSpacing: '0.02em' },  // relevé / signature
  monoTag: { fontSize: 24, letterSpacing: '0.2em', textTransform: 'uppercase' as const }, // eyebrow terracotta (pilier)
  hookCover: { fontSize: 104, lineHeight: 1.02, letterSpacing: '-0.015em', fontWeight: 400 },
  hookBody:  { fontSize: 72,  lineHeight: 1.16, letterSpacing: '-0.01em', fontWeight: 400 },
  hookCta:   { fontSize: 82,  lineHeight: 1.08, fontWeight: 400 },
  sub:       { fontSize: 44,  lineHeight: 1.4,  fontWeight: 400 }, // souffle (souvent en italique)
  cta:       { fontSize: 34,  letterSpacing: '0.18em', textTransform: 'uppercase' as const, fontWeight: 700 }, // renvoi légende, mono terracotta — 24->34 + gras (Cyrille 2026-07-07 : illisible en petit)
} as const;
