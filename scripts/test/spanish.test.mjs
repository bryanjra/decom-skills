import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  horaTexto,
  horaHablada,
  diaSemana,
  fechaTexto,
  rangoTexto,
  isoWeek,
  weekRange,
  semanaTexto,
} from '../core/spanish.mjs';

test('slugify strips accents, lowercases and hyphenates', () => {
  assert.equal(slugify('Charla familias'), 'charla-familias');
  assert.equal(slugify('Ecos del Futuro Jovenes Distrito 9'), 'ecos-del-futuro-jovenes-distrito-9');
  assert.equal(slugify('¿Qué hacemos? — Niños & Familias!'), 'que-hacemos-ninos-familias');
});

test('horaTexto renders 12-hour Spanish clock text', () => {
  assert.equal(horaTexto('19:00'), '7:00 p. m.');
  assert.equal(horaTexto('09:00'), '9:00 a. m.');
  assert.equal(horaTexto('12:00'), '12:00 p. m.');
  assert.equal(horaTexto('00:30'), '12:30 a. m.');
  assert.equal(horaTexto('18:45'), '6:45 p. m.');
});

test('horaHablada speaks the hour with its own period and preposition', () => {
  assert.equal(horaHablada('19:00'), 'a las siete de la noche');
  assert.equal(horaHablada('13:00'), 'a la una de la tarde');
  assert.equal(horaHablada('09:00'), 'a las nueve de la mañana');
  assert.equal(horaHablada('12:00'), 'a las doce del mediodía');
  assert.equal(horaHablada('13:15'), 'a la una y cuarto de la tarde');
  assert.equal(horaHablada('19:30'), 'a las siete y media de la noche');
  assert.equal(horaHablada('18:45'), 'a las seis y cuarenta y cinco de la tarde');
  assert.equal(horaHablada('14:05'), 'a las dos y cinco de la tarde');
  assert.equal(horaHablada('02:00'), 'a las dos de la madrugada');
  assert.equal(horaHablada('00:00'), 'a las doce de la noche');
});

test('diaSemana and fechaTexto use lowercase Spanish names', () => {
  assert.equal(diaSemana('2026-09-25'), 'viernes');
  assert.equal(diaSemana('2026-09-27'), 'domingo');
  assert.equal(fechaTexto('2026-09-25'), 'viernes 25 de septiembre');
  assert.equal(fechaTexto('2026-10-01'), 'jueves 1 de octubre');
});

test('rangoTexto collapses the month when both days share it', () => {
  assert.equal(rangoTexto('2026-09-25', '2026-09-27'), 'del viernes 25 al domingo 27 de septiembre');
  assert.equal(rangoTexto('2026-09-26', '2026-10-01'), 'del sábado 26 de septiembre al jueves 1 de octubre');
});

test('isoWeek and weekRange follow ISO 8601 weeks', () => {
  assert.equal(isoWeek('2026-09-21'), '2026-W39');
  assert.equal(isoWeek('2026-09-27'), '2026-W39');
  assert.equal(isoWeek('2026-09-28'), '2026-W40');
  assert.equal(isoWeek('2026-01-01'), '2026-W01');
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
  assert.deepEqual(weekRange('2026-W39'), { inicio: '2026-09-21', fin: '2026-09-27' });
  assert.deepEqual(weekRange('2026-W01'), { inicio: '2025-12-29', fin: '2026-01-04' });
});

test('semanaTexto builds the intro card line with lowercase months', () => {
  assert.equal(semanaTexto('2026-09-21', '2026-09-27'), 'Semana del 21 al 27 de septiembre');
  assert.equal(semanaTexto('2026-09-28', '2026-10-04'), 'Semana del 28 de septiembre al 4 de octubre');
});
