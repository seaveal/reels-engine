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
