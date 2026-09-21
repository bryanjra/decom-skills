import test from 'node:test';
import assert from 'node:assert/strict';
import { cuts, sceneFrames } from '../core/escenas.mjs';

const O = { leadSec: 0.5, tailSec: 1, silentSec: 4 };

test('the hand-over between two narrated scenes is the middle of the pause between them', () => {
  assert.deepEqual(cuts([{ startSec: 0, endSec: 4 }, { startSec: 5, endSec: 9 }], O), [5, 10.5]);
});

test('the voice starts after the lead-in and the reel ends a tail after the last word', () => {
  assert.deepEqual(cuts([{ startSec: 0, endSec: 3 }], O), [4.5]);
});

test('a last scene with no narration lasts silentSec after the scene before it', () => {
  const c = cuts([{ startSec: 0, endSec: 4 }, { startSec: 5, endSec: 9 }, { startSec: null, endSec: null }], O);
  assert.deepEqual(c, [5, 10.5, 14.5]);
});

test('scenes overlap by one transition and the reel ends on the last cut', () => {
  const tf = 15;
  const frames = sceneFrames([150, 300, 450], tf);
  assert.deepEqual(frames, [158, 165, 157]);
  assert.equal(frames.reduce((a, b) => a + b, 0) - (frames.length - 1) * tf, 450);
});

test('every transition is centred on its cut, for odd and even transition lengths', () => {
  for (const tf of [14, 15]) {
    const cutFrames = [97, 210, 333, 420];
    const frames = sceneFrames(cutFrames, tf);
    let siguiente = 0; // where the next scene starts in reel time: previous start + length - tf
    const empieza = frames.map((d) => {
      const s = siguiente;
      siguiente = s + d - tf;
      return s;
    });
    for (let i = 0; i < cutFrames.length - 1; i++) {
      const medio = empieza[i + 1] + tf / 2;
      assert.ok(Math.abs(medio - cutFrames[i]) <= 0.5, `tf ${tf}, cut ${i}: transition centre ${medio} vs cut ${cutFrames[i]}`);
    }
    assert.equal(siguiente + tf, cutFrames.at(-1), `tf ${tf}: the reel ends on the last cut`);
  }
});

test('cuts that do not move forward are rejected', () => {
  assert.throws(() => sceneFrames([100, 100, 300], 15), /not after the previous cut/);
  assert.throws(() => sceneFrames([100, 90, 300], 15), /not after the previous cut/);
});

test('a scene too short to hold its own transitions is rejected', () => {
  // scene 1 lasts (20 + 8) - (10 - 7) = 25 frames but needs 2 * 15
  assert.throws(() => sceneFrames([10, 20, 100], 15), /too short/);
});
