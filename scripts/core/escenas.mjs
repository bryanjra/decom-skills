// Turns speech windows into the reel's scenes: where the picture hands over from one
// section to the next, and how long each TransitionSeries.Sequence must be so the
// overlaps land on those hand-overs. Pure functions, no I/O.

/**
 * Reel-time seconds at which each scene ends; the last entry is the end of the reel.
 * A scene is one section: [intro, ...events, outro]. The hand-over between two narrated
 * scenes is the midpoint of the pause between their speech, so the cut lands in a
 * breath. The voice starts leadSec into the reel and the reel ends tailSec after the
 * last word. A scene with null times has no narration (an outro when the church has no
 * closing words): it lasts silentSec. Only a last scene may be un-narrated.
 * @param {Array<{startSec: number|null, endSec: number|null}>} scenes in reel order
 * @param {{leadSec: number, tailSec: number, silentSec: number}} o
 * @returns {number[]}
 */
export function cuts(scenes, { leadSec, tailSec, silentSec }) {
  const fines = [];
  scenes.forEach((escena, i) => {
    const siguiente = scenes[i + 1];
    if (escena.endSec === null) fines.push((fines[i - 1] ?? 0) + silentSec);
    else if (typeof siguiente?.startSec === 'number') fines.push(leadSec + (escena.endSec + siguiente.startSec) / 2);
    else fines.push(leadSec + escena.endSec + tailSec);
  });
  return fines;
}

/**
 * Length in frames of each TransitionSeries.Sequence so that the overlaps straddle the
 * cuts: scene i+1 starts exactly `transition` frames before scene i ends, and the reel
 * ends on the last cut.
 * @param {number[]} cutFrames integer frame of each cut (see cuts), strictly increasing
 * @param {number} transition transition length in frames
 * @returns {number[]}
 */
export function sceneFrames(cutFrames, transition) {
  const antes = Math.floor(transition / 2);
  const despues = transition - antes;
  const ultima = cutFrames.length - 1;
  return cutFrames.map((corte, i) => {
    if (i > 0 && corte <= cutFrames[i - 1]) {
      throw new Error(`scene ${i} would end at frame ${corte}, not after the previous cut at frame ${cutFrames[i - 1]}`);
    }
    const inicio = i === 0 ? 0 : cutFrames[i - 1] - antes;
    const fin = i === ultima ? corte : corte + despues;
    const minimo = (i > 0 ? transition : 0) + (i < ultima ? transition : 0);
    if (fin - inicio < minimo) {
      throw new Error(`scene ${i} is too short (${fin - inicio} frames) to hold its transitions (needs ${minimo})`);
    }
    return fin - inicio;
  });
}
