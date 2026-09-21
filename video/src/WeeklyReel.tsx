import React from 'react';
import {AbsoluteFill, Html5Audio, staticFile} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {linearTiming, TransitionSeries, type TransitionPresentation} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {AdScene} from './AdScene';
import {IntroCard, OutroCard} from './cards';
import {brand} from './brand/tokens';
import {sceneFrames, transitionFrames, voiceSeconds} from './timing';
import type {WeeklyReelProps} from './types';

const {fps} = brand.video;

const introFrames = Math.round(brand.motion.introSeconds * fps);
const outroFrames = Math.round(brand.motion.outroSeconds * fps);

/** Fade, slide and wipe in rotation, so consecutive cuts do not repeat. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentationFor = (i: number): TransitionPresentation<any> =>
  [fade(), slide({direction: 'from-right'}), wipe({direction: 'from-left'})][i % 3];

/** Scenes overlap by one transition each, so the total is the sum minus the overlaps. */
const reelFrames = (scenes: number[]): number => {
  const all = [introFrames, ...scenes, outroFrames];
  return all.reduce((a, b) => a + b, 0) - (all.length - 1) * transitionFrames(fps);
};

/** Every scene lasts as long as its own voiceover; the reel is as long as they add up to. */
export const calculateWeeklyReel: CalculateMetadataFunction<WeeklyReelProps> = async ({props}) => {
  const frames = await Promise.all(props.items.map(async (item) => sceneFrames(await voiceSeconds(item), fps)));
  return {durationInFrames: reelFrames(frames), props: {...props, frames}};
};

export const WeeklyReel: React.FC<WeeklyReelProps> = ({semanaTexto, iglesia, items, musicSrc, frames}) => {
  if (!frames || frames.length !== items.length) throw new Error('WeeklyReel needs per-scene frames from calculateMetadata');
  const timing = linearTiming({durationInFrames: transitionFrames(fps)});
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={introFrames}>
          <IntroCard semanaTexto={semanaTexto} iglesia={iglesia} />
        </TransitionSeries.Sequence>
        {items.flatMap((item, i) => [
          <TransitionSeries.Transition key={`t-${item.slug}`} presentation={presentationFor(i)} timing={timing} />,
          <TransitionSeries.Sequence key={item.slug} durationInFrames={frames[i]}>
            <AdScene {...item} />
          </TransitionSeries.Sequence>,
        ])}
        <TransitionSeries.Transition presentation={presentationFor(items.length)} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={outroFrames}>
          <OutroCard iglesia={iglesia} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {/* Music bed slot: pass musicSrc (a file under public/) to turn it on; null keeps the reel voice-only. */}
      {musicSrc ? <Html5Audio src={staticFile(musicSrc)} volume={brand.audio.musicVolume} loop /> : null}
    </AbsoluteFill>
  );
};
