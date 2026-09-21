import React from 'react';
import type {CalculateMetadataFunction} from 'remotion';
import {AdScene} from './AdScene';
import {brand} from './brand/tokens';
import {sceneFrames, voiceSeconds} from './timing';
import type {EventAdProps} from './types';

/** Single-event composition: exported as ad.png (a still) and clip.mp4. */
export const EventAd: React.FC<EventAdProps> = (props) => <AdScene {...props} />;

/** The clip lasts exactly as long as its voiceover, plus lead-in and tail. */
export const calculateEventAd: CalculateMetadataFunction<EventAdProps> = async ({props}) => ({
  durationInFrames: sceneFrames(await voiceSeconds(props), brand.video.fps),
});
