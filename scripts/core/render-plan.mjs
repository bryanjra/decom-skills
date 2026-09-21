// What scripts/render.mjs feeds to Remotion, kept free of I/O so it is testable.
// Paths are relative to video/public/, the way staticFile() expects them.

import { cleanGuion } from './guion.mjs';

const STILL_AT = 0.6; // ad.png is taken this far into the clip, once the animation has settled
const MUSIC_SRC = 'music/bed.mp3';

export const audioSrcFor = (slug) => `audio/${slug}.mp3`;

/** The frame to export as ad.png: about 60% in, always inside the clip. */
export const stillFrame = (durationInFrames) => Math.max(0, Math.min(durationInFrames - 1, Math.round(durationInFrames * STILL_AT)));

/** Props of the EventAd composition for one event. */
export function eventProps({ event, iglesia, guion, hasAudio }) {
  const hablado = cleanGuion(guion);
  return {
    slug: event.slug,
    event,
    iglesia,
    audioSrc: hasAudio ? audioSrcFor(event.slug) : null,
    palabras: hablado ? hablado.split(' ').length : 0,
  };
}

/** Props of the WeeklyReel composition; `items` are eventProps results, in reel order. */
export function reelProps({ doc, items, hasMusic }) {
  return {
    semanaTexto: doc.semana.texto,
    iglesia: doc.iglesia,
    items,
    musicSrc: hasMusic ? MUSIC_SRC : null,
  };
}

/** Events that will be silent, for the report at the end of a render. */
export const silentSlugs = (items) => items.filter((i) => !i.audioSrc).map((i) => i.slug);
