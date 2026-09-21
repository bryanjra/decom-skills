#!/usr/bin/env node
// Checks each event's delivery against events.json, the step that catches a
// script or component stating something the record does not support.
//
//   node scripts/validate.mjs <week> [slug ...]
//
// Per event: video/src/ads/<slug>.tsx exists and obeys the source rules;
// out/<week>/<slug>/guion.md is faithful to the record; voz.mp3 is present
// (absent is a notice: the video is then silent for that event).
// Exit 2 if anything is an error.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, printIssues, weekDir } from './core/project.mjs';
import { auditEvents } from './core/audit.mjs';
import { checkAdSource } from './core/ad-source.mjs';
import { checkGuion, cleanGuion } from './core/guion.mjs';

const [week, ...slugs] = process.argv.slice(2);
if (!week) {
  console.error('usage: node scripts/validate.mjs <week> [slug ...]');
  process.exit(1);
}
const eventsPath = join(weekDir(week), 'events.json');
if (!existsSync(eventsPath)) {
  console.error(`${eventsPath} not found. Run scripts/normalize.mjs first.`);
  process.exit(1);
}
const doc = JSON.parse(readFileSync(eventsPath, 'utf8'));

const todos = { errores: [], avisos: [] };
const juntar = (r, slug) => {
  for (const e of r.errores) todos.errores.push({ slug, ...e });
  for (const a of r.avisos) todos.avisos.push({ slug, ...a });
};

juntar(auditEvents(doc), undefined);

const seleccion = slugs.length ? slugs : doc.events.map((e) => e.slug);
for (const slug of seleccion) {
  const evento = doc.events.find((e) => e.slug === slug);
  if (!evento) {
    todos.errores.push({ regla: 'slug-desconocido', slug, mensaje: `no event with slug "${slug}" in events.json` });
    continue;
  }
  const carpeta = join(weekDir(week), slug);

  const ad = join(ROOT, 'video', 'src', 'ads', `${slug}.tsx`);
  if (existsSync(ad)) juntar(checkAdSource(readFileSync(ad, 'utf8')), slug);
  else todos.errores.push({ regla: 'sin-componente', slug, mensaje: `missing ${ad}` });

  const guion = join(carpeta, 'guion.md');
  if (existsSync(guion)) juntar(checkGuion(cleanGuion(readFileSync(guion, 'utf8')), evento, doc.iglesia), slug);
  else todos.errores.push({ regla: 'sin-guion', slug, mensaje: `missing ${guion}` });

  if (!existsSync(join(carpeta, 'voz.mp3'))) {
    todos.avisos.push({ regla: 'sin-audio', slug, mensaje: 'no voz.mp3: this event will be silent' });
  }
}

printIssues(todos);
console.log(`${seleccion.length} event(s) checked: ${todos.errores.length} error(s), ${todos.avisos.length} notice(s).`);
process.exit(todos.errores.length ? 2 : 0);
