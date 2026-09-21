// Stages an event's voiceover where Remotion can serve it: video/public/audio/<slug>.mp3.
// The name depends only on the slug, so a file left by an earlier week must never
// survive under the same slug: it would narrate the wrong ad.

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { audioSrcFor } from './render-plan.mjs';

/**
 * @param {{carpeta: string, publico: string, slug: string}} dirs the event folder (out/<week>/<slug>) and video/public
 * @returns {boolean} true if the event has a voiceover, false if it will be silent
 */
export function stageAudio({ carpeta, publico, slug }) {
  const origen = join(carpeta, 'voz.mp3');
  const destino = join(publico, audioSrcFor(slug));
  if (!existsSync(origen)) {
    rmSync(destino, { force: true });
    return false;
  }
  mkdirSync(join(publico, 'audio'), { recursive: true });
  copyFileSync(origen, destino);
  return true;
}
