import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH, computeDurationFrames } from './constants.js';
import { Reel } from './Reel.jsx';
import { Carte } from './Carte.jsx';
import { Couverture } from './Couverture.jsx';
import { Slide } from './Slide.jsx';

export const RemotionRoot = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={Math.round(6 * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        slug: 'sample',
        reveal: 'all_at_once',
        hand_emoji: false,
        duration_s: null,
        segments: [
          { role: 'title', text: 'EXEMPLE [[DE]] REEL' },
          { role: 'cta', text: '(LISEZ LA LÉGENDE)' },
        ],
      }}
      calculateMetadata={({ props }) => {
        // v4 : frames exactes (= somme des frames de page pour le long) → la dernière
        // page tient jusqu'à la dernière frame (plus d'écran vide en fin de réel).
        return { durationInFrames: computeDurationFrames(props) };
      }}
    />
    {/* Carte illustrative FB/Circle (still PNG 1080×1080) — ADR 2026-06-21. */}
    <Composition
      id="Carte"
      component={Carte}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1080}
      defaultProps={{ text: 'EXEMPLE DE [[CARTE]]', handle: '@CyrilleNovou' }}
    />
    {/* Carte PUB (still PNG 1080×1350, 4:5 feed Meta) — studio de pub, ADR 2026-08-16.
        Même composant que Carte, avec un pied « objet + prix » (R-PUB-3). */}
    <Composition
      id="CartePub"
      component={Carte}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={{ text: 'LA TÊTE COMPREND. [[LE CORPS RÉPARE.]]', handle: '@CyrilleNovou',
        footer: '« Vous avez tout compris. Rien n\'a changé. » — Pack Numérique 39,90 €, à lire et à écouter' }}
    />
    {/* Slide de carrousel IG (still PNG 1080×1350, 4:5) — chantier 3 contenu v2. */}
    <Composition
      id="Slide"
      component={Slide}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={{ text: 'EXEMPLE DE [[SLIDE]]', index: 1, total: 8, badge: true, handle: '@CyrilleNovou' }}
    />
    {/* Couverture de Reel IG (still PNG 1080×1920) — charte « L'Écho Incarné ». */}
    <Composition
      id="Couverture"
      component={Couverture}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        eyebrow: 'DÉPENDANCE AFFECTIVE',
        hook: 'En amour, vous rejouez le même [[scénario]]',
        signature: 'Cyrille Novou',
        safezone: false,
      }}
    />
  </>
);
