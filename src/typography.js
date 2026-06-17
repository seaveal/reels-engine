/**
 * Normalisation typographique française — RÈGLE GLOBALE DU MOTEUR (v5, 2026-06-17).
 *
 * OBJECTIF : aucune ligne rendue ne doit contenir UNIQUEMENT de la ponctuation
 * (`?`, `!`, `...`, `…`, `:`, `;`, `,`, `.`). Cause du bug observé (réel
 * 12-verites, page 2, « Vous voulez connaître les gens ? ») : en typographie
 * française les ponctuations doubles `? ! ; :` sont précédées d'une ESPACE ; si
 * c'est une espace SÉCABLE, le wrapping Chromium peut casser juste avant le
 * signe, qui déborde alors seul sur la ligne suivante.
 *
 * FIX (global, appliqué à TOUT le texte rendu, avant tout parsing de markup) :
 *   1. Espace fine insécable (U+202F) AVANT les ponctuations doubles `? ! ; :`
 *      → elles restent collées au mot précédent, jamais wrappées seules.
 *   2. Liaison insécable de toute ponctuation FINALE/orpheline (`. , … ! ? ;`
 *      `…`, `...`) au mot qui la précède (insécable U+2060 WORD JOINER si le
 *      signe est collé au mot ; sinon, si une espace sépare, U+202F).
 *
 * On opère sur la chaîne BRUTE (markers `[[ ]] **` non-blancs → non touchés par
 * les regex d'espace). Idempotent : ré-appliquer ne double pas les insécables.
 *
 * Caractères :
 *   U+202F NARROW NO-BREAK SPACE (espace fine insécable) — visible, non sécable.
 *   U+2060 WORD JOINER — largeur nulle, non sécable (colle deux glyphes adjacents).
 *
 * IMPORTANT : U+202F et U+00A0 et U+2060 sont des « espaces » au sens de \s en JS.
 * Le wrap de l'auto-fit (autoFit.js) découpe les mots sur les espaces SÉCABLES
 * uniquement (cf. SPLIT_RE ci-dessous) pour rester cohérent avec le rendu CSS.
 */

export const NNBSP = ' '; // narrow no-break space (fine insécable)
export const WJ = '⁠'; // word joiner (largeur nulle, insécable)

// Espaces sécables (peuvent porter un retour à la ligne). On NE compte PAS comme
// sécables U+00A0 (nbsp), U+202F (fine insécable), U+2060 (word joiner), U+FEFF.
const BREAKING_SPACE = '[ \\t\\n\\r\\f\\v\\u1680\\u2000-\\u200a\\u2028\\u2029\\u205f\\u3000]';

// Découpe en « mots » insécables : on coupe sur les espaces SÉCABLES seulement.
// Réutilisé par l'auto-fit pour mesurer le wrap exactement comme Chromium.
export const WORD_SPLIT_RE = new RegExp(`${BREAKING_SPACE}+`);

/**
 * Applique la normalisation typographique française à une chaîne.
 * Idempotent. Sûr sur du texte porteur de markup `[[ ]]` / `**`.
 */
export const normaliseTypography = (input) => {
  if (input == null) return input;
  let s = String(input);

  // 0) COLLAPSE des espaces (fix « trous » v6) : toute suite d'espaces — sécables
  //    OU insécables fines/nbsp/word-joiner mélangées — est réduite à UN SEUL
  //    caractère. Sinon « mot  ? » (double espace source) ou « mot ⟨NNBSP⟩? » déjà
  //    normalisé + espace sécable rémanente => deux caractères d'espacement = trou
  //    visible. On préserve la nature insécable : si la suite CONTIENT une fine
  //    insécable, le caractère retenu est U+202F ; sinon une espace sécable simple.
  //    (Le word-joiner U+2060 de largeur nulle ne crée pas de trou ; on le laisse
  //    seulement quand il est SEUL — sinon il est absorbé par le collapse.)
  const SPACE_RUN = '[ \\t\\n\\r\\f\\v\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u2060\\u3000]';
  s = s.replace(new RegExp(`${SPACE_RUN}{2,}`, 'g'), (run) =>
    / | |⁠/.test(run) ? NNBSP : ' ');

  // 1) Ponctuations doubles `? ! ; :` : remplacer l'espace (sécable OU fine
  //    insécable déjà posée par une passe antérieure) qui précède par une fine
  //    insécable UNIQUE. On absorbe aussi U+202F/U+00A0 pour rester idempotent
  //    et ne jamais laisser « espace + insécable » devant le signe.
  s = s.replace(new RegExp(`[${'\\u202f\\u00a0'}${BREAKING_SPACE.slice(1, -1)}]+([?!;:])`, 'g'), `${NNBSP}$1`);

  // 2) Ponctuation double SANS espace devant (ex. « gens? ») : insérer la fine
  //    insécable pour respecter la typo FR ET éviter l'orphelin. On évite les
  //    cas légitimes collés type URL/heure « 12:30 » en exigeant une lettre avant.
  s = s.replace(/([\p{L}\p{N}»”’%)\]])([?!;:])/gu, `$1${NNBSP}$2`);

  // 3) Ponctuation FINALE/orpheline `. , … ! ? ;` (et `...`) séparée du mot par
  //    une espace sécable → la coller via fine insécable (cas rare mais possible
  //    après nettoyage de source). Ex. « mot . » → « mot . » insécable.
  s = s.replace(new RegExp(`${BREAKING_SPACE}+(\\.\\.\\.|…|[.,])(?=$|${BREAKING_SPACE}|["»”’)\\]])`, 'g'), `${NNBSP}$1`);

  return s;
};
