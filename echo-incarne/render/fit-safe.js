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
  const availableHeight = page.clientHeight - 2;
  const availableWidth = page.clientWidth - 4;
  // A few pixels protect italic overhang and inline highlighting at the right edge.
  wrapper.style.width = availableWidth + 'px';
  const fits = size => {
    text.style.fontSize = size + 'px';
    return wrapper.scrollHeight <= availableHeight && wrapper.scrollWidth <= availableWidth;
  };
  let lo = 1, hi = Math.ceil(availableHeight * 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid; else hi = mid - 1;
  }
  fits(lo);
  text.dataset.maxFontSize = String(lo);
  text.dataset.availableHeight = String(availableHeight);
  text.dataset.availableWidth = String(availableWidth);
};


// Shared by every reel layout. Pin the capsule and its arrow to the safe bottom,
// reserve their height in the content flow, and fit the label on exactly one line.
window.fitReelCta = function (zone) {
  const row = document.getElementById('ctaRow');
  const capsule = document.getElementById('ctaCapsule');
  if (!row || !capsule) return;
  Object.assign(row.style, {
    position:'absolute', left:zone.left+'px', right:zone.right+'px',
    bottom:zone.bottom+'px', alignItems:'flex-end', gap:'20px', flexShrink:'0',
  });
  for (const arrow of row.children) {
    if (arrow === capsule) continue;
    Object.assign(arrow.style, {transform:'none', flexShrink:'0'});
  }
  // Compact padding preserves the capsule while giving its label more width.
  Object.assign(capsule.style, {
    padding:'16px 24px', lineHeight:'1.1', whiteSpace:'nowrap',
    flexShrink:'0', width:'max-content', maxWidth:'none',
  });
  const arrowsWidth = [...row.children].filter(el => el !== capsule)
    .reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
  const availableWidth = row.clientWidth - arrowsWidth - 20 * (row.children.length - 1);
  const fits = size => {
    capsule.style.fontSize = size + 'px';
    return capsule.getBoundingClientRect().width <= availableWidth;
  };
  let lo = 1, hi = Math.ceil(availableWidth * 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid; else hi = mid - 1;
  }
  fits(lo);
  capsule.dataset.availableWidth = String(availableWidth);
  capsule.dataset.maxFontSize = String(lo);
  let spacer = document.getElementById('ctaSpace');
  if (!spacer) {
    spacer = document.createElement('div'); spacer.id = 'ctaSpace';
    spacer.setAttribute('aria-hidden', 'true'); row.after(spacer);
  }
  Object.assign(spacer.style, {height:row.getBoundingClientRect().height+'px', flexShrink:'0'});
};
