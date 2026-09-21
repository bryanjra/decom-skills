import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageAudio } from '../core/stage-audio.mjs';

/** A fresh week folder (out/<week>) and a fresh video/public, removed after the test. */
function sandbox(t) {
  const raiz = mkdtempSync(join(tmpdir(), 'stage-audio-'));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const carpeta = join(raiz, 'out', '2026-W39');
  const publico = join(raiz, 'public');
  mkdirSync(carpeta, { recursive: true });
  mkdirSync(publico, { recursive: true });
  return { carpeta, publico, staged: join(publico, 'audio', 'semana.mp3') };
}

test('copies voz.mp3 to public/audio/semana.mp3, creating the folder, and reports audio', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  assert.equal(stageAudio({ carpeta, publico }), true);
  assert.equal(readFileSync(staged, 'utf8'), 'nueva');
});

test('a new voz.mp3 replaces what an earlier run staged', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(staged, 'vieja');
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  stageAudio({ carpeta, publico });
  assert.equal(readFileSync(staged, 'utf8'), 'nueva');
});

test('per-event files left by the old pipeline never survive next to the new audio', (t) => {
  const { carpeta, publico } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(join(publico, 'audio', 'culto.mp3'), 'de un evento');
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  stageAudio({ carpeta, publico });
  assert.equal(existsSync(join(publico, 'audio', 'culto.mp3')), false);
});

test('no voz.mp3 reports silence and removes stale audio left by another week', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(staged, 'de otra semana');
  assert.equal(stageAudio({ carpeta, publico }), false);
  assert.equal(existsSync(staged), false);
});

test('no voz.mp3 and nothing staged is simply silent, not an error', (t) => {
  const { carpeta, publico } = sandbox(t);
  assert.equal(stageAudio({ carpeta, publico }), false);
});
