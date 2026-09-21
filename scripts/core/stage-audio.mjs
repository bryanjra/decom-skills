// Stages the week's voiceover where Remotion can serve it: video/public/audio/semana.mp3.
// video/public/ is not versioned and the name does not carry the week, so anything left
// there by an earlier run (this week's, another week's, or the per-event files of the old
// pipeline) must never survive: it would narrate the wrong video.

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION_SRC } from './render-plan.mjs';

/**
 * @param {{carpeta: string, publico: string}} dirs the week folder (out/<week>) and video/public
 * @returns {boolean} true if the week has a voiceover, false if it will be silent
 */
export function stageAudio({ carpeta, publico }) {
  const origen = join(carpeta, 'voz.mp3');
  rmSync(join(publico, 'audio'), { recursive: true, force: true });
  if (!existsSync(origen)) return false;
  mkdirSync(join(publico, 'audio'), { recursive: true });
  copyFileSync(origen, join(publico, NARRATION_SRC));
  return true;
}
