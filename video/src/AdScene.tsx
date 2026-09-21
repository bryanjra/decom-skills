import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ads} from './ads/registry.gen';
import type {EventAdProps} from './types';

/**
 * One event's picture: its ad component. Sound is not its business: the single-event clip
 * (EventAd) plays its own slice of the narration, and the weekly reel plays the whole
 * narration once over all its scenes.
 */
export const AdScene: React.FC<Pick<EventAdProps, 'slug' | 'event' | 'iglesia'>> = ({slug, event, iglesia}) => {
  const Ad = ads[slug];
  if (!Ad) throw new Error(`No ad component registered for "${slug}". Run: node scripts/gen-registry.mjs`);
  return (
    <AbsoluteFill>
      <Ad event={event} iglesia={iglesia} />
    </AbsoluteFill>
  );
};
