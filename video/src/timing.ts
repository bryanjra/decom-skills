import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {staticFile} from 'remotion';
import {brand} from './brand/tokens';
import type {EventAdProps} from './types';

/** Seconds of narration: the real audio length, or an estimate from the script when there is none yet. */
export async function voiceSeconds({audioSrc, palabras}: Pick<EventAdProps, 'audioSrc' | 'palabras'>): Promise<number> {
  return audioSrc ? getAudioDurationInSeconds(staticFile(audioSrc)) : palabras / brand.motion.wordsPerSecond;
}

/** A scene lasts exactly its voiceover plus lead-in and tail: no dead air, never cut mid-sentence. */
export const sceneFrames = (seconds: number, fps: number): number =>
  Math.ceil((brand.motion.leadSeconds + seconds + brand.motion.tailSeconds) * fps);

export const transitionFrames = (fps: number): number => Math.round(brand.motion.transitionSeconds * fps);
