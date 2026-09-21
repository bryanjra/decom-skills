#!/usr/bin/env node
// Generates one voiceover: out/<week>/<slug>/guion.md -> voz.mp3 (+ voz.json).
//
//   node scripts/tts.mjs <slug> [--week 2026-W39] [--force]
//
// Model and voice settings are in scripts/voice.json (version-controlled). The
// API key and voice ID come from the environment or .env. Unchanged text and
// settings reuse the existing mp3 instead of calling the API again.
//
// Exit 0: audio ready. Exit 1: usage or configuration problem. Exit 3: the
// service could not be reached or refused; the pipeline degrades to a silent
// event and reports it, it does not fail.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadEnv, parseArgs, weekDir } from './core/project.mjs';
import { cleanGuion } from './core/guion.mjs';
import { buildRequest, cacheKey, resolveCredentials } from './core/tts.mjs';

loadEnv();
const { flags, positional } = parseArgs(process.argv.slice(2), { booleans: ['force'] });
const slug = positional[0];
if (!slug) {
  console.error('usage: node scripts/tts.mjs <slug> [--week 2026-W39] [--force]');
  process.exit(1);
}

const semanas = existsSync(join(ROOT, 'out')) ? readdirSync(join(ROOT, 'out')).sort().reverse() : [];
const week = flags.week || semanas.find((w) => existsSync(join(weekDir(w), slug, 'guion.md')));
const guionPath = week && join(weekDir(week), slug, 'guion.md');
if (!guionPath || !existsSync(guionPath)) {
  console.error(`No guion.md for "${slug}"${flags.week ? ` in ${flags.week}` : ''}. Expected out/<week>/${slug}/guion.md.`);
  process.exit(1);
}

const text = cleanGuion(readFileSync(guionPath, 'utf8'));
if (!text) {
  console.error(`${guionPath} has no spoken text.`);
  process.exit(1);
}

const voice = JSON.parse(readFileSync(join(ROOT, 'scripts', 'voice.json'), 'utf8'));
const { apiKey, voiceId } = resolveCredentials(process.env);
if (!apiKey || !voiceId) {
  console.error('Missing ElevenLabs credentials: set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (or the ELEVEN_LABS_* names) in the environment or .env.');
  process.exit(1);
}

const carpeta = join(weekDir(week), slug);
const mp3 = join(carpeta, 'voz.mp3');
const meta = join(carpeta, 'voz.json');
const llave = cacheKey({ text, voice, voiceId });

if (!flags.force && existsSync(mp3) && existsSync(meta) && JSON.parse(readFileSync(meta, 'utf8')).cacheKey === llave) {
  console.log(`${slug}: voz.mp3 is up to date, no API call made.`);
  process.exit(0);
}

const degradar = (motivo) => {
  console.error(`${slug}: voiceover unavailable (${motivo}).\nImages, scripts and a silent video can still be produced; this event will have no audio.`);
  process.exit(3);
};

const { url, init } = buildRequest({ text, voice, voiceId, apiKey });
let res;
try {
  res = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
} catch (err) {
  degradar(`could not reach api.elevenlabs.io: ${err.cause?.code ?? err.name}`);
}
if (!res.ok) degradar(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
if (!(res.headers.get('content-type') ?? '').startsWith('audio/')) degradar(`unexpected content-type ${res.headers.get('content-type')}`);

writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
writeFileSync(
  meta,
  `${JSON.stringify({ slug, week, model: voice.model, voiceId, characters: text.length, cacheKey: llave }, null, 2)}\n`,
);
console.log(`${slug}: wrote ${mp3} (${text.length} characters).`);
