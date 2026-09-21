#!/usr/bin/env node
// Checks a week's deliveries against events.json, the step that catches a script or
// component stating something the record does not support.
//
//   node scripts/validate.mjs <week> [slug ...] [--narracion]
//
// Per event: video/src/ads/<slug>.tsx exists and obeys the source rules (facts from the
// record, brand from tokens, the church name only through the Logo). With no
// slugs, or with --narracion: the week's script (out/<week>/guion.md) is faithful to
// the record and voz.mp3 is present (absent is a notice: the video is then silent).
// A designer validating only its own slug is not asked for a script it does not write.
// Exit 2 if anything is an error.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs, printIssues, weekDir } from './core/project.mjs';
import { auditEvents } from './core/audit.mjs';
import { checkAdSource } from './core/ad-source.mjs';
import { parseNarracion } from './core/narracion.mjs';
import { checkNarracion } from './core/narracion-check.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2), { booleans: ['narracion'] });
const [week, ...slugs] = positional;
if (!week) {
  console.error('usage: node scripts/validate.mjs <week> [slug ...] [--narracion]');
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
if (!doc.iglesia?.nombre) {
  todos.errores.push({ regla: 'sin-iglesia', mensaje: `events.json has no church name: write ${join(weekDir(week), 'lectura.json')} and run normalize.mjs again` });
}

const seleccion = slugs.length ? slugs : doc.events.map((e) => e.slug);
for (const slug of seleccion) {
  const evento = doc.events.find((e) => e.slug === slug);
  if (!evento) {
    todos.errores.push({ regla: 'slug-desconocido', slug, mensaje: `no event with slug "${slug}" in events.json` });
    continue;
  }
  const ad = join(ROOT, 'video', 'src', 'ads', `${slug}.tsx`);
  if (existsSync(ad)) juntar(checkAdSource(readFileSync(ad, 'utf8'), doc.iglesia), slug);
  else todos.errores.push({ regla: 'sin-componente', slug, mensaje: `missing ${ad}` });
}

if (!slugs.length || flags.narracion) {
  const guion = join(weekDir(week), 'guion.md');
  if (existsSync(guion)) juntar(checkNarracion(parseNarracion(readFileSync(guion, 'utf8')), doc), undefined);
  else todos.errores.push({ regla: 'sin-guion', mensaje: `missing ${guion}` });

  if (!existsSync(join(weekDir(week), 'voz.mp3'))) {
    todos.avisos.push({ regla: 'sin-audio', mensaje: 'no voz.mp3: the weekly video will be silent' });
  }
}

printIssues(todos);
console.log(`${seleccion.length} event(s) checked: ${todos.errores.length} error(s), ${todos.avisos.length} notice(s).`);
process.exit(todos.errores.length ? 2 : 0);
