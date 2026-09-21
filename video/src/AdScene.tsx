import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {ads} from './ads/registry.gen';
import {brand} from './brand/tokens';
import type {EventAdProps} from './types';

/**
 * One event: its ad component plus its voiceover, starting after the lead-in.
 * Used by the single-event composition and, unchanged, by the weekly reel.
 */
export const AdScene: React.FC<EventAdProps> = ({slug, event, iglesia, audioSrc}) => {
  const {fps} = useVideoConfig();
  const Ad = ads[slug];
  if (!Ad) throw new Error(`No ad component registered for "${slug}". Run: node scripts/gen-registry.mjs`);
  return (
    <AbsoluteFill>
      <Ad event={event} iglesia={iglesia} />
      {audioSrc ? (
        <Sequence from={Math.round(brand.motion.leadSeconds * fps)}>
          <Html5Audio src={staticFile(audioSrc)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
