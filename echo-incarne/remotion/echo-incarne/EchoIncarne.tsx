import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {loadFont as loadCormorant} from '@remotion/google-fonts/CormorantGaramond';
import {loadFont as loadArchivo} from '@remotion/google-fonts/Archivo';
import {loadFont as loadPlexMono} from '@remotion/google-fonts/IBMPlexMono';
import {COLORS, CANVAS, TYPE} from './tokens';

// --- Polices ---------------------------------------------------------------
// Les weights doivent couvrir : Cormorant 400/500 + italique, Archivo 500, Mono 400/500.
const {fontFamily: SERIF} = loadCormorant('normal', {weights: ['400', '500'], subsets: ['latin']});
loadCormorant('italic', {weights: ['400', '500'], subsets: ['latin']}); // charge l'italique (souffle)
const {fontFamily: SANS} = loadArchivo('normal', {weights: ['500'], subsets: ['latin']});
const {fontFamily: MONO} = loadPlexMono('normal', {weights: ['400', '500'], subsets: ['latin']});

// --- Parseur de surlignage -------------------------------------------------
// Le corpus H3C marque le mot qui bascule avec [[mot]].
// Règle "Écho Incarné" : ce mot devient la SEULE présence terracotta, en italique.
// (À l'écran des réels le surlignage est jaune ; pour ces fonds premium il est terracotta.)
export function parsePivot(text: string): React.ReactNode[] {
  return text.split(/(\[\[[^\]]+\]\])/g).map((chunk, i) => {
    const m = chunk.match(/^\[\[([^\]]+)\]\]$/);
    if (m) {
      return (
        <span key={i} style={{color: COLORS.terracotta, fontStyle: 'italic'}}>
          {m[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{chunk}</React.Fragment>;
  });
}

// --- Pastille photo (vignette ronde style story, anneau terracotta) --------
// Anneau terracotta + fin liseré crème, exactement comme sur le site livre.
export const Pastille: React.FC<{size: number; src?: string}> = ({size, src}) => (
  <div style={{width: size, height: size, borderRadius: '50%', background: COLORS.terracotta,
               padding: size * 0.045, flex: 'none'}}>
    <div style={{width: '100%', height: '100%', borderRadius: '50%', background: COLORS.creme,
                 padding: size * 0.035}}>
      <div style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden'}}>
        <Img
          src={src ? staticFile(src) : staticFile('cyrille-novou-new-ok.jpg')}
          style={{width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'grayscale(1) contrast(1.02)'}}
        />
      </div>
    </div>
  </div>
);

// --- Motif de l'écho : la forme qui revient, opacité croissante vers la présence
const ECHO = [0.08, 0.16, 0.30, 0.52];
export const EchoDots: React.FC = () => (
  <div style={{display: 'flex', gap: 22, alignItems: 'center'}}>
    {ECHO.map((o, i) => (
      <span key={i} style={{width: 46, height: 46, borderRadius: '50%', background: COLORS.encre, opacity: o}} />
    ))}
    <span style={{width: 46, height: 46, borderRadius: '50%', background: '#8C6A4A', opacity: 0.8}} />
    <span style={{width: 46, height: 46, borderRadius: '50%', background: COLORS.terracotta}} />
  </div>
);

// --- Filet de base + points d'ancrage (le relevé, la ligne de couture) -----
const Rule: React.FC<{label?: string; right?: React.ReactNode}> = ({label, right}) => (
  <div style={{borderTop: `1px solid rgba(42,33,26,.28)`, paddingTop: 26,
               display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
    <span style={{fontFamily: MONO, ...TYPE.mono, color: COLORS.encreMuted}}>{label}</span>
    {right}
  </div>
);

// ===========================================================================
// TYPES DE SLIDE
// ===========================================================================

export type SlideData = {
  variant: 'cover' | 'body' | 'cta';
  eyebrow?: string;   // murmure haut (sans, lettres espacées)
  pilier?: string;    // tag terracotta (couverture) ex. "Le mécanisme"
  text: string;       // hook — peut contenir [[pivot]]
  sub?: string;       // souffle (italique)
  legend?: string;    // renvoi légende (cta) ex. "La réponse est en légende"
  index?: number;     // 1-based
  total?: number;
  handle?: string;    // @souverainauquotidien
  photo?: string;     // nom du fichier dans public/ (défaut : cyrille-novou-new-ok.jpg)
};

const base: React.CSSProperties = {
  width: CANVAS.width, height: CANVAS.height, background: COLORS.creme,
  padding: CANVAS.pad, display: 'flex', flexDirection: 'column',
};
const num = (n?: number, t?: number) => `${String(n ?? 1).padStart(2, '0')} / ${String(t ?? 9).padStart(2, '0')}`;

export const Cover: React.FC<SlideData> = (s) => (
  <AbsoluteFill style={{...base, justifyContent: 'space-between'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <div>
        <div style={{fontFamily: SANS, ...TYPE.eyebrow, color: COLORS.taupe}}>
          {s.eyebrow ?? 'Souverain au Quotidien'}
        </div>
        <div style={{fontFamily: MONO, ...TYPE.mono, color: COLORS.taupe, marginTop: 16}}>
          {num(s.index, s.total)}
        </div>
      </div>
      <Pastille size={200} src={s.photo} />
    </div>

    <div>
      {s.pilier && (
        <div style={{fontFamily: MONO, ...TYPE.monoTag, color: COLORS.terracotta, marginBottom: 44}}>
          {s.pilier}
        </div>
      )}
      <div style={{fontFamily: SERIF, ...TYPE.hookCover, color: COLORS.encre}}>
        {parsePivot(s.text)}
      </div>
    </div>

    <div>
      <div style={{marginBottom: 64}}><EchoDots /></div>
      <Rule
        label={s.handle ?? '@souverainauquotidien'}
        right={<span style={{fontFamily: SANS, fontSize: 22, letterSpacing: '0.3em',
                             textTransform: 'uppercase', color: COLORS.taupe}}>H3C</span>}
      />
    </div>
  </AbsoluteFill>
);

export const Body: React.FC<SlideData> = (s) => (
  <AbsoluteFill style={{...base, justifyContent: 'space-between'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <span style={{fontFamily: SANS, ...TYPE.eyebrow, color: COLORS.taupe}}>{s.eyebrow ?? 'Le signe'}</span>
      <span style={{fontFamily: MONO, ...TYPE.mono, color: COLORS.taupe}}>{num(s.index, s.total)}</span>
    </div>

    <div style={{fontFamily: SERIF, ...TYPE.hookBody, color: COLORS.encre}}>
      {parsePivot(s.text)}
      {s.sub && (
        <div style={{...TYPE.sub, color: COLORS.encreSoft, marginTop: 44}}>{parsePivot(s.sub)}</div>
      )}
    </div>

    <Rule
      label={s.handle ?? '·—·—·—·—·—·—·'}
      right={<span style={{fontFamily: SANS, fontSize: 22, letterSpacing: '0.3em',
                           textTransform: 'uppercase', color: COLORS.taupe}}>Suite →</span>}
    />
  </AbsoluteFill>
);

export const Cta: React.FC<SlideData> = (s) => (
  <AbsoluteFill style={{...base, justifyContent: 'space-between', alignItems: 'center', textAlign: 'center'}}>
    <span style={{fontFamily: SANS, ...TYPE.eyebrow, color: COLORS.taupe, alignSelf: 'stretch'}}>
      {s.eyebrow ?? 'Souverain au Quotidien'}
    </span>

    <div>
      <div style={{marginBottom: 56}}><Pastille size={206} src={s.photo} /></div>
      <div style={{fontFamily: SERIF, ...TYPE.hookCta, color: COLORS.encre}}>{parsePivot(s.text)}</div>
      {s.sub && (
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 48, lineHeight: 1.4,
                     color: COLORS.encreSoft, marginTop: 36}}>{s.sub}</div>
      )}
    </div>

    <div style={{fontFamily: MONO, ...TYPE.cta, color: COLORS.terracotta}}>
      {s.legend ?? 'La réponse est en légende'}
    </div>
  </AbsoluteFill>
);

/** Aiguilleur : rend le bon composant selon la variante. */
export const EchoSlide: React.FC<SlideData> = (s) =>
  s.variant === 'cover' ? <Cover {...s} /> : s.variant === 'cta' ? <Cta {...s} /> : <Body {...s} />;
