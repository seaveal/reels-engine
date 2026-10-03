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
  const fits = size => {
    text.style.fontSize = size + 'px';
    if (window.__ctaZone) window.fitReelCta(window.__ctaZone, size);
    return wrapper.scrollHeight <= page.clientHeight - 2 && wrapper.scrollWidth <= availableWidth;
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
// Réglages par réseau (Cyrille 2026-10-02, vu sur son téléphone) : sur Instagram, colonne élargie de
// 2 px et arrêtée juste au-dessus du cœur des « j'aime », barre arrêtée juste au-dessus de la photo
// de profil. TikTok et YouTube gardent la colonne pleine hauteur et la barre à 1640 px.
const BANDES = {
  instagram: {colonneX: 930, colonneHaut: 1140, barreHaut: 1690},
  tiktok:    {colonneX: 932, colonneHaut: 0,    barreHaut: 1640},
  youtube:   {colonneX: 932, colonneHaut: 0,    barreHaut: 1640},
};
window.addPlatformBands = function (platform) {
  const B = BANDES[platform] || BANDES.instagram;
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
