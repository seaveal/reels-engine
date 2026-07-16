import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import { Background } from './Background.jsx';
import { ProfileBadge } from './ProfileBadge.jsx';
import {
  COLORS, FPS, FONT_FAMILY, safeBox,
  MSG_TYPING_SEC, MSG_REVEAL_SEC, MSG_CTA_SEC, messageStarts, messageSlotSec,
} from './constants.js';

// Format MESSAGE (transpositioning « message reconstitué », 2026-07-13). Conversation
// reconstituée en bulles : la bulle REÇUE (side:in) à gauche en gris, la bulle ENVOYÉE
// (side:out) à droite en terracotta. Chaque message : indicateur de frappe « … » puis
// apparition de la bulle (fondu + slide). Un hook en overlay haut, un CTA en bas.
// ADDITIF : ne touche ni le court, ni le long, ni la liste.

const OSWALD_FONT_FACE = `
@font-face { font-family: 'Oswald'; font-weight: 400; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Regular.ttf'))}) format('truetype'); }
@font-face { font-family: 'Oswald'; font-weight: 700; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Bold.ttf'))}) format('truetype'); }
`;

// Hook overlay : [[mot]] -> jaune (même convention que le reste du moteur).
function renderHook(text) {
  return String(text || '')
    .split(/(\[\[[^\]]+\]\])/g)
    .filter(Boolean)
    .map((p, i) => {
      const m = p.match(/^\[\[([^\]]+)\]\]$/);
      return m
        ? <span key={i} style={{ color: COLORS.yellow }}>{m[1]}</span>
        : <span key={i}>{p}</span>;
    });
}

function Bubble({ side, text, time, revealProgress }) {
  const isOut = side === 'out';
  const translateY = (1 - revealProgress) * 26;
  return (
    <div style={{
      display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start',
      opacity: revealProgress,
      transform: `translateY(${translateY}px)`,
    }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}>
        <div style={{
          backgroundColor: isOut ? COLORS.terracotta : COLORS.bubbleIn,
          color: COLORS.white,
          fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 40, lineHeight: 1.24,
          padding: '22px 30px',
          borderRadius: 32,
          borderBottomRightRadius: isOut ? 8 : 32,
          borderBottomLeftRadius: isOut ? 32 : 8,
          textAlign: 'left', wordBreak: 'break-word',
        }}>{text}</div>
        {time ? (
          <div style={{ fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 22, color: '#8A8A8A', margin: '8px 6px 0' }}>{time}</div>
        ) : null}
      </div>
    </div>
  );
}

function Typing({ side }) {
  const frame = useCurrentFrame();
  const isOut = side === 'out';
  const dot = (k) => {
    const phase = (frame / FPS) * 7 + k * 0.9;
    const o = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(phase));
    return <span key={k} style={{ opacity: o, fontSize: 30, lineHeight: 1, color: COLORS.white }}>●</span>;
  };
  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
      <div style={{
        backgroundColor: isOut ? COLORS.terracotta : COLORS.bubbleIn,
        borderRadius: 32, padding: '20px 26px', display: 'flex', gap: 10, alignItems: 'center',
      }}>{[0, 1, 2].map(dot)}</div>
    </div>
  );
}

export const MessageReel = (props) => {
  const { width, height } = useVideoConfig();
  const safe = safeBox(width, height);
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const messages = props.messages ?? [];
  const starts = messageStarts(props);
  const lastEnd = starts.length ? starts[starts.length - 1] + messageSlotSec(messages[messages.length - 1]) : 0;

  // Zone hook (haut) puis zone chat (dessous), dans la safe box.
  const hookHeight = Math.round(safe.height * 0.20);
  const ctaBand = props.cta ? Math.round(safe.height * 0.12) : 0;
  const chatTop = safe.y + hookHeight + Math.round(safe.height * 0.02);
  const chatHeight = safe.height - hookHeight - ctaBand - Math.round(safe.height * 0.04);

  // CTA : apparaît après la dernière bulle.
  const ctaProgress = interpolate(t, [lastEnd, lastEnd + MSG_CTA_SEC], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <style dangerouslySetInnerHTML={{ __html: OSWALD_FONT_FACE }} />
      <Background name={props.background} />
      <ProfileBadge width={width} height={height} />

      {/* Hook overlay */}
      <div style={{
        position: 'absolute', left: safe.x, top: safe.y, width: safe.width, height: hookHeight,
        display: 'flex', alignItems: 'center',
        fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 54, lineHeight: 1.1,
        color: COLORS.white, textTransform: 'uppercase',
      }}>
        <div>{renderHook(props.hook)}</div>
      </div>

      {/* Zone chat : bulles empilées, seules celles dont la frappe a commencé sont montées */}
      <div style={{
        position: 'absolute', left: safe.x, top: chatTop, width: safe.width, height: chatHeight,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 18,
      }}>
        {messages.map((m, i) => {
          const start = starts[i];
          if (t < start) return null;                       // pas encore
          const revealAt = start + MSG_TYPING_SEC;
          if (t < revealAt) return <Typing key={i} side={m.side} />;  // frappe
          const revealProgress = interpolate(t, [revealAt, revealAt + MSG_REVEAL_SEC], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return <Bubble key={i} side={m.side} text={m.text} time={m.time} revealProgress={revealProgress} />;
        })}
      </div>

      {/* CTA bas */}
      {props.cta ? (
        <div style={{
          position: 'absolute', left: safe.x, top: safe.y + safe.height - ctaBand, width: safe.width, height: ctaBand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: ctaProgress, transform: `translateY(${(1 - ctaProgress) * 16}px)`,
          fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 42, color: COLORS.cream,
          textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.15,
        }}>{props.cta}</div>
      ) : null}
    </AbsoluteFill>
  );
};
