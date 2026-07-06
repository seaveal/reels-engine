import React from 'react';
import {Composition, getInputProps} from 'remotion';
import {EchoSlide, SlideData} from './EchoIncarne';
import {CANVAS} from './tokens';

/**
 * Chaque slide = une composition "still" (image fixe) de 1080×1350.
 * On rend chaque slide en PNG avec `npx remotion still` (voir README).
 *
 * `defaultSlide` sert de prévisualisation dans le Studio Remotion ;
 * en production tu passes les props via --props (JSON) ou getInputProps().
 */

const preview: SlideData = {
  variant: 'cover',
  pilier: 'Le mécanisme',
  text: "Une femme qui tolère l'insupportable a été [[dressée]].",
  index: 1, total: 9, handle: '@souverainauquotidien',
};

export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as Partial<SlideData>;
  return (
    <Composition
      id="EchoSlide"
      component={EchoSlide}
      durationInFrames={1}
      fps={30}
      width={CANVAS.width}
      height={CANVAS.height}
      defaultProps={preview}
      // les props CLI (--props) écrasent defaultProps lors du rendu still
      calculateMetadata={({props}) => ({props: {...props, ...input}})}
    />
  );
};
