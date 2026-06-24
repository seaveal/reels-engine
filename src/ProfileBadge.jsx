import { AbsoluteFill, Img, staticFile } from 'remotion';
import { BADGE } from './constants.js';

// Pastille de profil @lecorpsnetrichejamais (Cyrille 2026-06-24) : avatar rond +
// anneau, incrustée en overlay haut-gauche. Présente sur les TROIS supports — le Reel
// (vidéo), la Carte (FB/Circle) et la Couverture — pour une signature cohérente.
//
// Intégration HARMONIEUSE (classe mondiale) : l'anneau s'adapte à la charte du support
// au lieu de plaquer le même dégradé criard partout :
//   - Reel (fond noir social)      → `ring="instagram"` (sweep conique des couleurs IG) ;
//   - Carte (terracotta)           → `ring="<crème>"`    + `gapColor="<terracotta>"` ;
//   - Couverture (crème éditoriale) → `ring="<terracotta>"` + `gapColor="<crème>"`.
// Le liseré (`gapColor`) prend la couleur du FOND du support → la photo « respire »
// dans le fond comme sur Instagram (gap blanc sur fond blanc). Tout en proportions.
const IG_GRADIENT =
  'conic-gradient(from 215deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)';

export const ProfileBadge = ({
  width,
  height,
  ring = 'instagram',  // 'instagram' = dégradé IG ; sinon n'importe quelle couleur CSS unie
  gapColor = '#000',   // liseré anneau↔photo = couleur du fond du support
  sizeRatio,           // override du diamètre (sinon BADGE.sizeRatio)
}) => {
  const size = Math.round(width * (sizeRatio ?? BADGE.sizeRatio));
  const ringW = Math.max(3, Math.round(size * BADGE.ringRatio));
  const gap = Math.max(2, Math.round(size * BADGE.gapRatio));
  const left = Math.round(width * BADGE.leftRatio);
  const top = Math.round(height * BADGE.topRatio);
  const photo = size - 2 * (ringW + gap);
  const ringBg = ring === 'instagram' ? IG_GRADIENT : ring;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: '50%',
          background: ringBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: size - 2 * ringW,
            height: size - 2 * ringW,
            borderRadius: '50%',
            background: gapColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Img
            src={staticFile('avatar.jpg')}
            style={{ width: photo, height: photo, borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
