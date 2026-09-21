import test from 'node:test';
import assert from 'node:assert/strict';
import { auditEvents } from '../core/audit.mjs';

const ev = (over = {}) => ({
  slug: 'charla-familias',
  titulo: 'Charla familias',
  fecha: '2026-09-25',
  diaSemana: 'viernes',
  hora: '19:00',
  horaFuente: 'church-info.md',
  lugar: 'Templo',
  modalidad: 'presencial',
  plantilla: 'estandar',
  ...over,
});
const doc = (...events) => ({ week: '2026-W39', events });
const reglas = (r) => r.errores.map((e) => e.regla);

test('a well-formed document has no errors and no notices', () => {
  const r = auditEvents(doc(ev()));
  assert.deepEqual(r, { errores: [], avisos: [] });
});

test('an event without a time is a notice, not an error', () => {
  const r = auditEvents(doc(ev({ hora: null, horaFuente: null, horaNota: 'no hay servicio el viernes' })));
  assert.deepEqual(r.errores, []);
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].regla, 'sin-hora');
  assert.equal(r.avisos[0].slug, 'charla-familias');
  assert.match(r.avisos[0].mensaje, /no hay servicio el viernes/);
});

test('a time whose source is "inferido" is blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev({ horaFuente: 'inferido' })))), ['hora-fuente']);
});

test('a time with no source is blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev({ horaFuente: null })))), ['hora-fuente']);
});

test('a source without a time is blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev({ hora: null })))), ['hora-fuente']);
});

test('every allowed source passes', () => {
  for (const horaFuente of ['calendario', 'titulo', 'church-info.md', 'usuario']) {
    assert.deepEqual(auditEvents(doc(ev({ horaFuente }))).errores, [], horaFuente);
  }
});

test('a malformed time is blocked', () => {
  for (const hora of ['7pm', '25:00', '19:60', '9:00', '']) {
    assert.deepEqual(reglas(auditEvents(doc(ev({ hora })))), ['hora-formato'], JSON.stringify(hora));
  }
});

test('duplicate slugs are blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev(), ev()))), ['slug-duplicado']);
});

test('a slug that is not lowercase-hyphenated is blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev({ slug: 'Charla Familias' })))), ['slug-formato']);
});

test('an unknown template is blocked', () => {
  assert.deepEqual(reglas(auditEvents(doc(ev({ plantilla: 'neon' })))), ['plantilla']);
});

test('an in-person event with no place is a notice', () => {
  const r = auditEvents(doc(ev({ lugar: null, lugarFuente: null })));
  assert.deepEqual(r.errores, []);
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].regla, 'sin-lugar');
});

test('a place missing from the sources says where it looked', () => {
  const r = auditEvents(doc(ev({ lugar: null, lugarFuente: null })));
  assert.match(r.avisos[0].mensaje, /church-info\.md/);
});

test('a place dropped on purpose is reported with its reason, not as missing from the sources', () => {
  const r = auditEvents(doc(ev({ lugar: null, lugarFuente: null, lugarNota: 'the person asked for it to be announced without a place' })));
  assert.deepEqual(r.errores, []);
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].regla, 'sin-lugar');
  assert.match(r.avisos[0].mensaje, /asked/);
  assert.doesNotMatch(r.avisos[0].mensaje, /church-info/);
});

test('a virtual event on a non-virtual template is a notice', () => {
  const r = auditEvents(doc(ev({ modalidad: 'virtual', lugar: 'Virtual', plantilla: 'estandar' })));
  assert.deepEqual(r.errores, []);
  assert.equal(r.avisos[0].regla, 'plantilla-virtual');
});

test('a slug that collides with a section of the weekly script is an error', () => {
  for (const slug of ['intro', 'outro']) {
    assert.ok(reglas(auditEvents(doc(ev({ slug })))).includes('slug-reservado'), slug);
  }
});
