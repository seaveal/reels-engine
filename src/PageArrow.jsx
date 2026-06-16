/**
 * Flèche « → » dessinée à la main, crème, en bas de page (signal « continue /
 * page suivante » présent sur toutes les pages des originaux SAUF la dernière).
 *
 * Tracé : une ligne horizontale légèrement ondulée + une pointe ouverte, façon
 * feutre. Couleur par défaut crème #F9E9DB (même teinte que le CTA). Centrée par
 * sa bande parente (PageStack réserve une bande de bas DANS la safe box) : ni la
 * flèche ni le texte ne franchissent SAFE bottom (zone légende/icônes IG basses).
 */
export const PageArrow = ({ color = '#F9E9DB' }) => (
  <div
    style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <svg
      width="180"
      height="56"
      viewBox="0 0 180 56"
      fill="none"
      style={{ display: 'block', transform: 'translateX(28%)' }}
    >
      {/* corps de la flèche, léger creux central façon tracé manuel */}
      <path
        d="M6 30 C 50 22, 110 24, 156 30"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* pointe ouverte */}
      <path
        d="M132 14 C 146 22, 154 27, 162 30 C 154 33, 146 38, 134 48"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  </div>
);
