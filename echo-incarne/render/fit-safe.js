/* Maximise segment text inside the platform's existing safe zone.
   Header, paragraph gaps and CTA keep their space. Fit after local fonts load. */
'use strict';
window.fitReelSegment = function (page, text) {
  const wrapper = page.firstElementChild;
  const frame = page.parentElement;
  frame.firstElementChild.style.flexShrink = '0';
  document.getElementById('ctaRow').style.flexShrink = '0';
  Object.assign(page.style, {flex:'1 1 0px', minHeight:'0', margin:'24px 0', minWidth:'0'});
  Object.assign(wrapper.style, {flexShrink:'0', minWidth:'0'});
  const availableWidth = page.clientWidth - 4;
  // A few pixels protect italic overhang and inline highlighting at the right edge.
  wrapper.style.width = availableWidth + 'px';
  // Le bouton suit la taille du texte : sa hauteur (une ou plusieurs lignes) se déduit à chaque essai.
  // Son libellé ne déborde jamais de la capsule : sur un texte très court, un mot du bouton plus large
  // que la zone (« LÉGENDE » à 180 px) sortait du bouton et passait sous la colonne (2026-10-04).
  // Mesure : la ligne la plus large du libellé tient dans la boîte de contenu (rembourrage exclu).
  const capsule = document.getElementById('ctaCapsule');
  const label = document.createRange();
  const labelFits = () => {
    const cs = getComputedStyle(capsule);
    label.selectNodeContents(capsule);
    return label.getBoundingClientRect().width
      <= capsule.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;
  };
  const fits = size => {
    text.style.fontSize = size + 'px';
    if (window.__ctaZone) window.fitReelCta(window.__ctaZone, size);
    return wrapper.scrollHeight <= page.clientHeight - 2 && wrapper.scrollWidth <= availableWidth
      && (!window.__ctaZone || labelFits());
  };
  let lo = 1, hi = Math.ceil(page.clientHeight * 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid; else hi = mid - 1;
  }
  fits(lo);
  text.dataset.maxFontSize = String(lo);
  text.dataset.availableHeight = String(page.clientHeight - 2);
  text.dataset.availableWidth = String(availableWidth);
};


// Shared by every reel layout. Pin the capsule and its arrow to the safe bottom and
// reserve their height in the content flow.
// Cyrille 2026-10-02 : le bouton garde la place la plus basse de la zone sûre, mais son texte
// est AUSSI GROS que le texte du réel, quitte à passer sur deux lignes ou plus. L'ancienne règle
// « une seule ligne » réduisait le libellé à 15-25 px pour un texte de 60-80 px : personne ne le voyait.
// `size` (px) vient de fitReelSegment ; sans lui (layouts structurés), comportement d'avant :
// libellé maximisé sur une ligne.
window.fitReelCta = function (zone, size) {
  const row = document.getElementById('ctaRow');
  const capsule = document.getElementById('ctaCapsule');
  if (!row || !capsule) return;
  // Aucun CTA dans la spec (story mantra, 2026-10-03 : « aucun renvoi, aucun lien, aucun appel ») :
  // ni bouton, ni flèche, ni place réservée en bas. Seule l'absence de libellé déclenche ce cas.
  if (!capsule.textContent.trim()) {
    row.style.display = 'none';
    window.__ctaZone = null;
    return;
  }
  window.__ctaZone = zone;
  Object.assign(row.style, {
    position:'absolute', left:zone.left+'px', right:zone.right+'px',
    bottom:zone.bottom+'px', alignItems:'flex-end', gap:'20px', flexShrink:'0',
  });
  for (const arrow of row.children) {
    if (arrow === capsule) continue;
    Object.assign(arrow.style, {transform:'none', flexShrink:'0'});
  }
  const arrowsWidth = [...row.children].filter(el => el !== capsule)
    .reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
  const availableWidth = row.clientWidth - arrowsWidth - 20 * (row.children.length - 1);
  capsule.dataset.availableWidth = String(availableWidth);
  if (size) {
    Object.assign(capsule.style, {
      // Police d'affichage du moteur (Archivo gras ; Anton pour Braise), plus lisible que la mono.
      fontFamily:'var(--sans)', fontWeight:capsule.dataset.ctaWeight || '700',
      padding:'.3em .6em', lineHeight:'1.12', whiteSpace:'normal', textAlign:'center',
      letterSpacing:'.02em', borderRadius:'.5em', flexShrink:'1', minWidth:'0',
      width:'max-content', maxWidth:availableWidth+'px', fontSize:size+'px',
    });
    capsule.dataset.maxFontSize = String(size);
  } else {
    // Compact padding preserves the capsule while giving its label more width.
    Object.assign(capsule.style, {
      padding:'16px 24px', lineHeight:'1.1', whiteSpace:'nowrap',
      flexShrink:'0', width:'max-content', maxWidth:'none',
    });
    const fits = s => {
      capsule.style.fontSize = s + 'px';
      return capsule.getBoundingClientRect().width <= availableWidth;
    };
    let lo = 1, hi = Math.ceil(availableWidth * 2);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(mid)) lo = mid; else hi = mid - 1;
    }
    fits(lo);
    capsule.dataset.maxFontSize = String(lo);
  }
  let spacer = document.getElementById('ctaSpace');
  if (!spacer) {
    spacer = document.createElement('div'); spacer.id = 'ctaSpace';
    spacer.setAttribute('aria-hidden', 'true'); row.after(spacer);
  }
  Object.assign(spacer.style, {height:row.getBoundingClientRect().height+'px', flexShrink:'0'});
};

// Bandes encre (Cyrille 2026-10-02) : sur le fond crème, les icônes blanches des réseaux
// (j'aime, commenter, partager, enregistrer), la photo de profil, le nom du compte et le début de
// la légende sont invisibles. Une colonne encre à droite porte les icônes ; une barre encre en bas
// porte la ligne de la photo de profil et le début de la légende, sans monter au-delà (retour de
// Cyrille : à 1500 px, elle était beaucoup trop haute).
// Chaque moteur réserve la place des bandes dans son empilement (#platformBands) : sous l'onde, les
// cercles et le grain, pour que « l'onde qui se répand » de L'Écho Incarné reste visible jusque sur
// les bandes ; à défaut de réserve, juste avant le cadre de contenu.
// Réglages par réseau. TikTok et YouTube (Cyrille 2026-10-02) : colonne pleine hauteur, barre à 1640 px.
// Instagram, proportions harmonieuses (Cyrille 2026-10-04, sur la capture de son iPhone, 1290×2796 :
// la vidéo y est affichée à l'échelle 1,3262 et rognée de 54 px de chaque côté).
// Unité U = « ma vignette » : la photo de profil qu'Instagram affiche en bas à gauche, mesurée sur la
// capture (81 px de diamètre, sommet y 1685, centre 1726). Tous les rapports sont en U et φ.
const PHI = (1 + Math.sqrt(5)) / 2, U = 81;
const IG_VIGNETTE_HAUT = 1685;          // capture : sommet de la photo de profil
const IG_BORD_VISIBLE = 1026;           // capture : bord droit de l'écran (au-delà, hors champ)
const IG_COEUR_HAUT = 1113;             // capture : sommet du cœur des « j'aime »
// SEUL réglage de la barre : où son bord haut traverse la vignette, en fraction de U. 1/2 = au centre
// (défaut, barre 194 px, avant 230) ; 0,06 = au ras du sommet (1690, réglage du 2026-10-02) ;
// 1,15 = sous la vignette, à mi-chemin de la ligne de légende (1779). La légende (1791) reste sur le sombre.
const IG_BARRE_DANS_VIGNETTE = 1 / 2;
const IG_MARGE = U / PHI ** 2;          // ≈ 31 : au-dessus du cœur, entre texte et colonne
const BANDES = {
  instagram: {
    colonneX: Math.round(IG_BORD_VISIBLE - U * PHI),      // largeur visible U·φ ≈ 131 : 895 (avant 930) ;
                                                          // icônes (centre x 957) centrées à 3 px près
    colonneHaut: Math.round(IG_COEUR_HAUT - IG_MARGE),    // 1082 (avant 1140, au milieu du cœur)
    barreHaut: Math.round(IG_VIGNETTE_HAUT + U * IG_BARRE_DANS_VIGNETTE),   // 1726 (avant 1690)
  },
  tiktok:    {colonneX: 932, colonneHaut: 0,    barreHaut: 1640},
  youtube:   {colonneX: 932, colonneHaut: 0,    barreHaut: 1640},
  story:     null,   // story mantra (2026-10-04) : ni colonne ni barre, l'écran d'une story n'a ni icônes ni légende
};
// Zone du texte et du bouton sur Instagram. Le bouton se pose U/2 au-dessus de la vignette (bas à 1644,
// avant 1370), soit U au-dessus de la barre par défaut : ancré sur la vignette, il ne la chevauche dans
// aucune position de la barre. Texte et bouton s'arrêtent à IG_MARGE de la colonne.
window.ZONE_INSTAGRAM = {
  bottom: Math.round(1920 - (IG_VIGNETTE_HAUT - U / 2)),            // 276 (avant 550)
  right: Math.round(1080 - BANDES.instagram.colonneX + IG_MARGE),   // 216 (avant 180)
};
// Story Instagram : rien d'utile dans les ~250 px du haut ni les ~340 px du bas ; pas de rail à droite.
window.ZONE_STORY = {top: 280, right: 104, bottom: Math.round(340 + IG_MARGE), left: 104};
window.addPlatformBands = function (platform) {
  const B = platform in BANDES ? BANDES[platform] : BANDES.instagram;
  if (!B) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  let bands = document.getElementById('platformBands');
  if (!bands) {
    let frame = document.getElementById('ctaRow');
    while (frame && frame.parentElement !== stage) frame = frame.parentElement;
    if (!frame) return;
    bands = document.createElement('div');
    bands.id = 'platformBands';
    stage.insertBefore(bands, frame);
  }
  if (bands.childElementCount) return;
  bands.setAttribute('aria-hidden', 'true');
  bands.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  bands.innerHTML =
    `<div style="position:absolute;top:${B.colonneHaut}px;bottom:0;left:${B.colonneX}px;right:0;background:#2A211A;"></div>` +
    `<div style="position:absolute;left:0;right:0;top:${B.barreHaut}px;bottom:0;background:#2A211A;"></div>`;
};
