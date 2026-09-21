import {brand} from './brand/tokens';
import type {EventAdProps} from './types';

/** Seconds of narration a standalone clip carries: its slice of the voiceover, or an estimate from its words when there is none yet. */
export const voiceSeconds = ({voz, palabras}: Pick<EventAdProps, 'voz' | 'palabras'>): number =>
  voz ? voz.toSec - voz.fromSec : palabras / brand.motion.wordsPerSecond;

/** A standalone clip lasts its narration plus lead-in and tail: no dead air, never cut mid-sentence. */
export const sceneFrames = (seconds: number, fps: number): number =>
  Math.ceil((brand.motion.leadSeconds + seconds + brand.motion.tailSeconds) * fps);

export const transitionFrames = (fps: number): number => Math.round(brand.motion.transitionSeconds * fps);

/** Frames of a TransitionSeries made of these scenes: each overlap is counted once. */
export const reelFrames = (frames: number[], fps: number): number =>
  frames.reduce((a, b) => a + b, 0) - (frames.length - 1) * transitionFrames(fps);
