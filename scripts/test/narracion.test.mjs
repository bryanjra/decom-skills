import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JOINER, buildNarration, estimateTimes, parseNarracion, sectionTimes } from '../core/narracion.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/alignment-ejemplo.json', import.meta.url));

const MD = [
  '# Semana 39',
  '<!-- borrador, no se dice -->',
  '## intro',
  'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos',
  'del veintiuno al veintisiete de septiembre.',
  '',
  '## oracion-virtual',
  'El lunes es la oración virtual de jóvenes.',
  '## outro',
  'Te esperamos, Dios te bendiga.',
].join('\n');

// Every character takes half a second, so the times below are exact binary fractions.
const alineacion = (text) => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i * 0.5),
  character_end_times_seconds: [...text].map((_, i) => (i + 1) * 0.5),
});

test('parseNarracion reads the sections in order and joins wrapped lines', () => {
  const { sections, problems } = parseNarracion(MD);
  assert.deepEqual(problems, []);
  assert.deepEqual(sections, [
    { id: 'intro', text: 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.' },
    { id: 'oracion-virtual', text: 'El lunes es la oración virtual de jóvenes.' },
    { id: 'outro', text: 'Te esperamos, Dios te bendiga.' },
  ]);
});

test('text before the first heading and a repeated section are reported', () => {
  const { sections, problems } = parseNarracion('Suelto.\n## a\nUno.\n## a\nDos.');
  assert.equal(problems.length, 2);
  assert.match(problems[0], /before the first/);
  assert.match(problems[1], /"a" appears more than once/);
  assert.deepEqual(sections.map((s) => s.text), ['Uno.', 'Dos.']);
});

test('a heading with extra words keeps them in the id, so the check can reject it', () => {
  assert.equal(parseNarracion('## intro extra\nHola.').sections[0].id, 'intro extra');
});

test('buildNarration joins the sections and records where each one sits', () => {
  const { text, spans } = buildNarration([{ id: 'a', text: 'Hola.' }, { id: 'b', text: 'Adiós.' }]);
  assert.equal(text, `Hola.${JOINER}Adiós.`);
  assert.deepEqual(spans, [
    { id: 'a', start: 0, end: 5 },
    { id: 'b', start: 5 + JOINER.length, end: 11 + JOINER.length },
  ]);
});

test('an empty section is skipped and leaves no gap', () => {
  const { text, spans } = buildNarration([{ id: 'a', text: 'Hola.' }, { id: 'b', text: '' }, { id: 'c', text: 'Fin.' }]);
  assert.equal(text, `Hola.${JOINER}Fin.`);
  assert.deepEqual(spans.map((s) => s.id), ['a', 'c']);
});

test('sectionTimes maps each section to its first and last spoken character', () => {
  const secciones = [{ id: 'a', text: 'Hola.' }, { id: 'b', text: 'Adiós.' }];
  const { text } = buildNarration(secciones);
  assert.deepEqual(sectionTimes(secciones, alineacion(text)), [
    { id: 'a', startSec: 0, endSec: 2.5 },
    { id: 'b', startSec: (5 + JOINER.length) * 0.5, endSec: (11 + JOINER.length) * 0.5 },
  ]);
});

test('sectionTimes works on a real ElevenLabs alignment, accents included', () => {
  const { text, alignment } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const secciones = [
    { id: 'intro', text: 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.' },
    { id: 'oracion-virtual', text: 'El lunes es la oración virtual de jóvenes.' },
    { id: 'refam-juvenil', text: 'El miércoles, el Refam juvenil, en el Salón Principal.' },
  ];
  assert.equal(buildNarration(secciones).text, text);
  const t = sectionTimes(secciones, alignment);
  assert.deepEqual(t.map((x) => x.id), ['intro', 'oracion-virtual', 'refam-juvenil']);
  for (const x of t) assert.ok(x.endSec > x.startSec, `${x.id} has a positive length`);
  assert.ok(t[0].endSec <= t[1].startSec && t[1].endSec <= t[2].startSec, 'sections do not overlap');
  assert.equal(t[0].startSec, alignment.character_start_times_seconds[0]);
  assert.equal(t[2].endSec, alignment.character_end_times_seconds.at(-1));
});

test('an alignment of some other text is rejected, not silently mis-timed', () => {
  const { alignment } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  assert.throws(() => sectionTimes([{ id: 'x', text: 'Otro texto.' }], alignment), /not the alignment of this script/);
});

test('estimateTimes sizes sections from their words when there is no voice yet', () => {
  const t = estimateTimes(
    [{ id: 'a', text: 'Uno dos tres cuatro.' }, { id: 'b', text: '' }, { id: 'c', text: 'Cinco seis.' }],
    { wordsPerSecond: 2, pauseSeconds: 0.5 },
  );
  assert.deepEqual(t, [
    { id: 'a', startSec: 0, endSec: 2 },
    { id: 'c', startSec: 2.5, endSec: 3.5 },
  ]);
});
