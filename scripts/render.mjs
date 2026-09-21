#!/usr/bin/env node
// Renders a week: per event an ad.png and a clip.mp4, then the combined semana.mp4.
//
//   node scripts/render.mjs <week> [slug ...]
//
// With slugs, only those events are rendered and the weekly video is skipped: a
// reel built from a subset would be a wrong reel. Renders run one after another
// on purpose: rendering is CPU-bound, and only the orchestrator renders.
//
// Validates first (an error in any delivery stops the run, nothing is rendered),
// regenerates the ad registry, stages each voiceover into video/public/audio/,
// bundles once, then renders. An event with no voz.mp3 is rendered silent and
// listed at the end. REMOTION_BROWSER_EXECUTABLE selects the browser, else
// Remotion's own download is used.
//
// Exit 0: done. Exit 1: usage. Exit 2: validation failed. Exit 4: some renders failed.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { ROOT, loadEnv, parseArgs, weekDir } from './core/project.mjs';
import { eventProps, reelProps, silentSlugs, stillFrame } from './core/render-plan.mjs';
import { stageAudio } from './core/stage-audio.mjs';

loadEnv();
const [week, ...slugs] = parseArgs(process.argv.slice(2)).positional;
if (!week) {
  console.error('usage: node scripts/render.mjs <week> [slug ...]');
  process.exit(1);
}
const eventsPath = join(weekDir(week), 'events.json');
if (!existsSync(eventsPath)) {
  console.error(`${eventsPath} not found. Run scripts/normalize.mjs first.`);
  process.exit(1);
}
const doc = JSON.parse(readFileSync(eventsPath, 'utf8'));

// 1. Nothing renders until the deliveries are valid and the registry is current.
const correr = (script, args) => spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { stdio: 'inherit' });
const validacion = correr('validate.mjs', [week, ...slugs]);
if (validacion.status !== 0) {
  console.error('Validation failed: nothing was rendered.');
  process.exit(validacion.status === 1 ? 1 : 2);
}
if (correr('gen-registry.mjs', []).status !== 0) process.exit(1);

// 2. Stage the audio and build the props of each event.
const publico = join(ROOT, 'video', 'public');
const seleccion = slugs.length ? doc.events.filter((e) => slugs.includes(e.slug)) : doc.events;
const items = seleccion.map((event) => {
  const carpeta = join(weekDir(week), event.slug);
  const hasAudio = stageAudio({ carpeta, publico, slug: event.slug });
  return eventProps({ event, iglesia: doc.iglesia, guion: readFileSync(join(carpeta, 'guion.md'), 'utf8'), hasAudio });
});

// 3. Bundle once, then render one thing at a time.
const require = createRequire(join(ROOT, 'video', 'package.json'));
const { bundle } = require('@remotion/bundler');
const { renderMedia, renderStill, selectComposition } = require('@remotion/renderer');

const inicio = Date.now();
let ultimo = -1;
const avance = (etiqueta) => (fraccion) => {
  const paso = Math.floor(fraccion * 4) * 25; // report every 25%
  if (paso !== ultimo) console.log(`  ${etiqueta} ${paso}%`);
  ultimo = paso;
};
const nuevo = () => (ultimo = -1);

console.log('Bundling...');
const serveUrl = await bundle({
  entryPoint: join(ROOT, 'video', 'src', 'index.ts'),
  publicDir: publico,
  onProgress: (p) => avance('bundle')(p / 100),
});
const comun = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null, logLevel: 'warn' };

const fallos = [];
const intentar = async (nombre, tarea) => {
  try {
    await tarea();
  } catch (err) {
    fallos.push({ nombre, mensaje: err.message.split('\n')[0] });
    console.error(`FAILED ${nombre}: ${err.message.split('\n')[0]}`);
  }
};

for (const props of items) {
  const carpeta = join(weekDir(week), props.slug);
  await intentar(props.slug, async () => {
    console.log(`${props.slug}${props.audioSrc ? '' : ' (silent)'}`);
    const composition = await selectComposition({ ...comun, id: 'EventAd', inputProps: props });
    await renderStill({
      ...comun,
      composition,
      inputProps: props,
      output: join(carpeta, 'ad.png'),
      frame: stillFrame(composition.durationInFrames),
      imageFormat: 'png',
    });
    nuevo();
    await renderMedia({
      ...comun,
      composition,
      inputProps: props,
      codec: 'h264',
      outputLocation: join(carpeta, 'clip.mp4'),
      onProgress: ({ progress }) => avance('clip')(progress),
    });
  });
}

if (!slugs.length && items.length) {
  await intentar('semana', async () => {
    console.log('semana');
    const props = reelProps({ doc, items, hasMusic: existsSync(join(publico, 'music', 'bed.mp3')) });
    const composition = await selectComposition({ ...comun, id: 'WeeklyReel', inputProps: props });
    nuevo();
    await renderMedia({
      ...comun,
      composition,
      inputProps: props,
      codec: 'h264',
      outputLocation: join(weekDir(week), 'semana.mp4'),
      onProgress: ({ progress }) => avance('reel')(progress),
    });
  });
}

// 4. Report.
const mudos = silentSlugs(items);
const segundos = Math.round((Date.now() - inicio) / 1000);
console.log(`\n${items.length} event(s) in ${weekDir(week)} (${segundos}s).`);
if (slugs.length) console.log('Weekly video skipped: it is only built when no slugs are given.');
if (mudos.length) console.log(`No voiceover, rendered silent: ${mudos.join(', ')}. Run: node scripts/tts.mjs <slug> --week ${week}`);
if (fallos.length) {
  console.error(`${fallos.length} render(s) failed: ${fallos.map((f) => f.nombre).join(', ')}`);
  process.exit(4);
}
