#!/usr/bin/env node
// Raw calendar responses + Claude's reading (+ optional overrides) -> out/<week>/events.json
//
//   node scripts/normalize.mjs --week 2026-W39 [--overrides path] [raw.json ...]
//
// Raw files default to out/<week>/raw/*.json (the list_events responses saved
// verbatim). Claude's reading of the titles and church-info.md is out/<week>/lectura.json;
// without it the events carry only what the calendar cards say (the first pass, which
// Claude reads to write that file). Exit 0: events.json is approved for the next step.
// Exit 2: it was written but has errors that must be fixed first. A missing time is a
// notice, not an error: that ad is made without a time.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, parseArgs, printIssues, weekDir } from './core/project.mjs';
import { normalizeWeek } from './core/normalize.mjs';
import { auditEvents } from './core/audit.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2));
const week = flags.week;
if (!week || week === true) {
  console.error('usage: node scripts/normalize.mjs --week 2026-W39 [--overrides path] [raw.json ...]');
  process.exit(1);
}

const dir = weekDir(week);
const rawDir = join(dir, 'raw');
const rawFiles = positional.length
  ? positional.map((p) => resolve(p))
  : existsSync(rawDir)
    ? readdirSync(rawDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(rawDir, f))
    : [];
if (!rawFiles.length) {
  console.error(`No raw calendar files. Save each list_events response as ${rawDir}/<name>.json, or pass paths.`);
  process.exit(1);
}

const lecturaPath = join(dir, 'lectura.json');
const lectura = existsSync(lecturaPath) ? JSON.parse(readFileSync(lecturaPath, 'utf8')) : {};

const overridesPath = flags.overrides ? resolve(flags.overrides) : join(ROOT, 'overrides', `${week}.json`);
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};

const { doc, problemas } = normalizeWeek({
  week,
  calendars: rawFiles.map((f) => JSON.parse(readFileSync(f, 'utf8'))),
  lectura,
  overrides,
});
const { errores, avisos } = auditEvents(doc);

mkdirSync(dir, { recursive: true });
const salida = join(dir, 'events.json');
writeFileSync(salida, `${JSON.stringify(doc, null, 2)}\n`);

console.log(`${doc.semana.texto} (${week}) - ${doc.calendar}`);
for (const e of doc.events) {
  const cuando = e.hora ? `${e.hora} (${e.horaFuente})` : 'no time';
  console.log(`  ${e.slug.padEnd(28)} ${e.fecha} ${e.diaSemana.padEnd(9)} ${cuando.padEnd(24)} ${e.lugar ?? 'no place'}`);
}
if (doc.descartados.length) console.log(`  dropped: ${doc.descartados.map((d) => `${d.titulo} [${d.motivo}]`).join('; ')}`);
console.log(`wrote ${salida}`);
if (!existsSync(lecturaPath)) console.log(`no ${lecturaPath} yet: the events carry only what the calendar cards say`);

for (const p of problemas) console.error(`ERROR  [input] ${p}`);
printIssues({ errores, avisos });

if (problemas.length || errores.length) {
  console.error('\nevents.json is NOT approved for rendering. Fix the errors above and run again.');
  process.exit(2);
}
const sinHora = avisos.filter((a) => a.regla === 'sin-hora').length;
console.log(`\nOK: ${doc.events.length} events, ${sinHora} without a time (ads are made without a time; add one in overrides/${week}.json to change that).`);
