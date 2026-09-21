import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTitulo } from '../core/titulo.mjs';

test('splits a parenthesised ministry prefix from the title', () => {
  const r = parseTitulo('(Jóvenes) - Oracion virtual');
  assert.equal(r.ministerio, 'Jóvenes');
  assert.equal(r.titulo, 'Oracion virtual');
  assert.equal(r.hora, null);
});

test('keeps a plain title untouched', () => {
  const r = parseTitulo('Charla familias');
  assert.equal(r.ministerio, null);
  assert.equal(r.titulo, 'Charla familias');
  assert.equal(r.hora, null);
  assert.equal(r.horaAmbigua, null);
});

test('extracts a leading "2pm" and removes it from the title', () => {
  const r = parseTitulo('2pm Ecos del Futuro Jovenes Distrito 9');
  assert.equal(r.hora, '14:00');
  assert.equal(r.titulo, 'Ecos del Futuro Jovenes Distrito 9');
});

test('does not mistake a number in the title for a time', () => {
  const r = parseTitulo('Ecos del Futuro Distrito 9');
  assert.equal(r.hora, null);
  assert.equal(r.titulo, 'Ecos del Futuro Distrito 9');
});

test('accepts unambiguous time forms', () => {
  assert.equal(parseTitulo('Culto 7:30 pm').hora, '19:30');
  assert.equal(parseTitulo('Culto 7:30 p.m.').hora, '19:30');
  assert.equal(parseTitulo('Culto 19:00').hora, '19:00');
  assert.equal(parseTitulo('Culto a las 7 de la noche').hora, '19:00');
  assert.equal(parseTitulo('Desayuno 8 am').hora, '08:00');
  assert.equal(parseTitulo('Almuerzo 12pm').hora, '12:00');
  assert.equal(parseTitulo('Vigilia 12am').hora, '00:00');
});

test('refuses to guess AM/PM when the title has a bare clock time', () => {
  const r = parseTitulo('Culto 7:30');
  assert.equal(r.hora, null);
  assert.equal(r.horaAmbigua, '7:30');
  assert.equal(r.titulo, 'Culto 7:30');
});

test('refuses to guess a bare "a las N"', () => {
  const r = parseTitulo('Reunión a las 7');
  assert.equal(r.hora, null);
  assert.equal(r.horaAmbigua, 'a las 7');
});

test('rejects impossible clock values', () => {
  assert.equal(parseTitulo('Culto 25:00').hora, null);
  assert.equal(parseTitulo('Culto 13pm').hora, null);
});

test('detects virtual modality from the title, accent-insensitively', () => {
  assert.deepEqual(parseTitulo('(Jóvenes) - Oracion virtual').virtual, 'Virtual');
  assert.deepEqual(parseTitulo('Reunión por Zoom').virtual, 'Zoom');
  assert.deepEqual(parseTitulo('Estudio ONLINE').virtual, 'Virtual');
  assert.deepEqual(parseTitulo('Clase en línea').virtual, 'Virtual');
  assert.equal(parseTitulo('Charla familias').virtual, null);
});

const MINISTERIOS = { ministerios: ['Jóvenes', 'Adolescentes', 'Familias'] };

test('finds a ministry by keyword when there is no prefix', () => {
  assert.equal(parseTitulo('Charla familias', MINISTERIOS).ministerioClave, 'Familias');
  assert.equal(parseTitulo('Charla familia', MINISTERIOS).ministerioClave, 'Familias');
  assert.equal(parseTitulo('2pm Ecos del Futuro Jovenes Distrito 9', MINISTERIOS).ministerioClave, 'Jóvenes');
  assert.equal(parseTitulo('Integración maestros Adolescentes', MINISTERIOS).ministerioClave, 'Adolescentes');
  assert.equal(parseTitulo('Ayuno Evangelismo', MINISTERIOS).ministerioClave, null);
});

test('with no ministry list configured no keyword is ever inferred', () => {
  assert.equal(parseTitulo('Charla familias').ministerioClave, null);
  assert.equal(parseTitulo('Charla familias', { ministerios: [] }).ministerioClave, null);
});

test('two different keyword ministries yield no keyword ministry', () => {
  assert.equal(parseTitulo('Jóvenes y familias', MINISTERIOS).ministerioClave, null);
});
