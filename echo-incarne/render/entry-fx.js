/* One branded wipe when a reel starts. No sound, no changes to text geometry. */
'use strict';
let reelEntrySequence = 0;
window.playReelEntry = function ({spec, T, Z}) {
  const sequence = ++reelEntrySequence;
  document.getElementById('reelEntryFx')?.remove();
  if (spec.entry_fx === false || spec.entry_fx === 'none') return;
  const stage = document.getElementById('stage');
  const page = document.getElementById('page');
  // The first segment is installed synchronously by playReel after this call.
  requestAnimationFrame(() => {
    if (sequence !== reelEntrySequence) return;
    if (!page?.isConnected || !stage?.isConnected) return;
    document.getElementById('reelEntryFx')?.remove();
    const content = page.getBoundingClientRect(), bounds = stage.getBoundingClientRect();
    const top = Math.max(Z.top, content.top - bounds.top);
    const bottom = Math.min(1920 - Z.bottom, content.bottom - bounds.top);
    if (bottom <= top) return;
    const clip = document.createElement('div'); clip.id = 'reelEntryFx';
    clip.setAttribute('aria-hidden', 'true');
    Object.assign(clip.style, {
      position:'absolute', left:Z.left+'px', right:Z.right+'px', top:top+'px',
      height:(bottom-top)+'px', overflow:'hidden', pointerEvents:'none', zIndex:'4',
    });
    const wipe = document.createElement('div');
    Object.assign(wipe.style, {
      position:'absolute', inset:'0', background:T.accent,
      transformOrigin:'right center', willChange:'transform',
    });
    clip.append(wipe); stage.append(clip);
    const animation = wipe.animate([
      {transform:'scaleX(1)', offset:0},
      {transform:'scaleX(.96)', offset:.12},
      {transform:'scaleX(0)', offset:1},
    ], {duration:420, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'});
    animation.finished.then(() => clip.remove(), () => clip.remove());
  });
};
