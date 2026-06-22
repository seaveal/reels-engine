import { interpolate, useCurrentFrame } from 'remotion';
import { PAGE_FADE_SEC, FPS, COLORS } from './constants.js';
import { SegmentLine } from './SegmentLine.jsx';

// FORMAT LIST (layout:"list") — réels « liste numérotée / antithèse » des originaux :
//   - un grand NUMÉRO blanc gras centré, en haut
//   - 2 blocs courts UPPERCASE, CENTRÉS, surlignages partiels [[…]], séparés d'une
//     ligne vide
//   - contenu ANCRÉ EN HAUT (tiers supérieur), espace vide en dessous (comme les
//     originaux) — taille FIXE (pas d'auto-fit qui remplirait toute la safe box)
//   - sur la dernière page : footer « LISEZ LA LÉGENDE » crème, plus bas, centré.
// Tailles en fraction de la largeur frame → responsive, calées sur les originaux.
export const ListPage = ({ page, safe, width, height }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, PAGE_FADE_SEC * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const numberFs = Math.round(width * 0.135);
  const bodyFs = Math.round(width * 0.058);
  const footerFs = Math.round(width * 0.044);
  const blocks = page.blocks || [];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {/* Pile NUMÉRO + blocs, ancrée en haut de la safe box, centrée H */}
      <div
        style={{
          position: 'absolute',
          left: safe.x,
          top: safe.y,
          width: safe.width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {page.number != null && page.number !== '' && (
          <SegmentLine
            text={page.number}
            bold
            color="white"
            align="center"
            fontSize={numberFs}
            marginBottom={Math.round(bodyFs * 0.30)}
          />
        )}
        {blocks.map((b, i) => (
          <SegmentLine
            key={i}
            text={b}
            kind="heading"
            color="white"
            align="center"
            fontSize={bodyFs}
            marginBottom={i < blocks.length - 1 ? Math.round(bodyFs * 1.05) : 0}
          />
        ))}
      </div>
      {/* Footer « LISEZ LA LÉGENDE » (dernière page) — plus bas, crème, centré */}
      {page.footer && (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            top: Math.round(height * 0.60),
            width: safe.width,
            textAlign: 'center',
            fontFamily: 'Oswald',
            fontWeight: 600,
            fontSize: footerFs,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: COLORS.cream,
            opacity: 0.95,
          }}
        >
          {page.footer}
        </div>
      )}
    </div>
  );
};
