import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeWeek } from '../core/normalize.mjs';
import { auditEvents } from '../core/audit.mjs';
import { parseChurchInfo } from '../core/church-info.mjs';

const fixture = (name) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const semanaEjemplo = JSON.parse(readFileSync(fixture('ejemplo-w39.json'), 'utf8'));
// A fictional church: every church fact the code may use comes from here.
const churchInfo = parseChurchInfo(readFileSync(fixture('church-info.md'), 'utf8'));

const allDay = (summary, start, endExclusive, extra = {}) => ({
  id: `id-${summary}`,
  summary,
  status: 'confirmed',
  eventType: 'DEFAULT',
  start: { date: `${start}T00:00:00Z` },
  end: { date: `${endExclusive}T00:00:00Z` },
  ...extra,
});
const timed = (summary, start, end, extra = {}) => ({
  id: `id-${summary}`,
  summary,
  status: 'confirmed',
  eventType: 'DEFAULT',
  start: { dateTime: start, timeZone: 'America/Bogota' },
  end: { dateTime: end, timeZone: 'America/Bogota' },
  ...extra,
});
const cal = (events, summary = 'Calendario Uno', timeZone = 'America/Bogota') => ({
  summary,
  timeZone,
  events,
});
const run = (events, opts = {}) =>
  normalizeWeek({
    week: '2026-W39',
    calendars: [cal(events)],
    churchInfo,
    overrides: {},
    ...opts,
  });
const only = (events, opts) => run(events, opts).doc.events[0];

test('a week of three all-day events yields three events, none with an invented time', () => {
  const { doc } = normalizeWeek({
    week: '2026-W39',
    calendars: [semanaEjemplo],
    churchInfo,
    overrides: {},
  });
  assert.equal(doc.week, '2026-W39');
  assert.equal(doc.calendar, 'Iglesia Ejemplo II-2026');
  assert.equal(doc.timezone, 'America/Bogota');
  assert.equal(doc.semana.texto, 'Semana del 21 al 27 de septiembre');
  assert.equal(doc.semana.hablada, 'del veintiuno al veintisiete de septiembre');
  assert.deepEqual(doc.events.map((e) => e.slug), ['oracion-virtual', 'refam-juvenil', 'charla-familias']);

  const charla = doc.events[2];
  assert.equal(charla.titulo, 'Charla familias');
  assert.equal(charla.fecha, '2026-09-25'); // not shifted to the 24th by UTC midnight
  assert.equal(charla.diaSemana, 'viernes');
  assert.equal(charla.fechaTexto, 'viernes 25 de septiembre');
  assert.equal(charla.ministerio, 'Familias');
  assert.equal(charla.hora, null);
  assert.equal(charla.horaFuente, null);
  assert.equal(charla.horaTexto, null);
  assert.equal(charla.horaHablada, null);
  assert.equal(charla.lugar, 'Salón Principal');
  assert.equal(charla.lugarFuente, 'church-info.md');
  assert.equal(charla.modalidad, 'presencial');
  assert.equal(charla.plantilla, 'estandar');

  const oracion = doc.events[0];
  assert.equal(oracion.ministerio, 'Jóvenes');
  assert.equal(oracion.titulo, 'Oracion virtual');
  assert.equal(oracion.modalidad, 'virtual');
  assert.equal(oracion.lugar, 'Virtual');
  assert.equal(oracion.lugarFuente, 'titulo');
  assert.equal(oracion.plantilla, 'virtual');
  assert.equal(oracion.hora, null);
});

test('church facts are copied from church-info.md, not from the code', () => {
  const { doc } = run([]);
  assert.deepEqual(doc.iglesia, {
    nombre: 'Iglesia Ejemplo',
    direccion: 'Calle 1 #2-3, Ciudad Ejemplo',
    lugarPorDefecto: 'Salón Principal',
    llamadoAccion: 'Te esperamos',
    despedida: 'Dios te bendiga',
  });
});

test('with an empty church-info.md nothing about the church is invented', () => {
  const empty = parseChurchInfo('');
  const { doc } = run([allDay('Charla familias', '2026-09-25', '2026-09-26')], { churchInfo: empty });
  assert.deepEqual(doc.iglesia, { nombre: null, direccion: null, lugarPorDefecto: null, llamadoAccion: null, despedida: null });
  const e = doc.events[0];
  assert.equal(e.lugar, null);
  assert.equal(e.lugarFuente, null);
  assert.equal(e.ministerio, null);
  assert.equal(e.hora, null);
});

test('the timezone comes from the calendar, not from the code', () => {
  const { doc } = normalizeWeek({
    week: '2026-W39',
    calendars: [
      cal(
        [
          {
            id: 'x',
            summary: 'Culto',
            status: 'confirmed',
            eventType: 'DEFAULT',
            start: { dateTime: '2026-09-27T01:30:00Z' },
            end: { dateTime: '2026-09-27T03:00:00Z' },
          },
        ],
        'Otro calendario',
        'America/Mexico_City',
      ),
    ],
    churchInfo,
    overrides: {},
  });
  assert.equal(doc.timezone, 'America/Mexico_City');
  assert.equal(doc.events[0].fecha, '2026-09-26');
  assert.equal(doc.events[0].hora, '19:30');
});

test('a timed card gives the time with provenance "calendario"', () => {
  const e = only([timed('Integración maestros Adolescentes', '2026-09-26T19:00:00-05:00', '2026-09-26T20:00:00-05:00')]);
  assert.equal(e.fecha, '2026-09-26');
  assert.equal(e.hora, '19:00');
  assert.equal(e.horaFuente, 'calendario');
  assert.equal(e.horaTexto, '7:00 p. m.');
  assert.equal(e.horaHablada, 'a las siete de la noche');
});

test('a card dateTime in UTC is converted to the calendar local time and date', () => {
  const e = only([
    {
      id: 'x',
      summary: 'Vigilia',
      status: 'confirmed',
      eventType: 'DEFAULT',
      start: { dateTime: '2026-09-27T00:30:00Z' },
      end: { dateTime: '2026-09-27T02:00:00Z' },
    },
  ]);
  assert.equal(e.fecha, '2026-09-26');
  assert.equal(e.hora, '19:30');
});

test('a time in the title is used and stripped, with provenance "titulo"', () => {
  const e = only([allDay('2pm Ecos del Futuro Jovenes Distrito 9', '2026-09-27', '2026-09-28')]);
  assert.equal(e.titulo, 'Ecos del Futuro Jovenes Distrito 9');
  assert.equal(e.hora, '14:00');
  assert.equal(e.horaFuente, 'titulo');
  assert.equal(e.ministerio, 'Jóvenes');
});

test('the card time wins over a different time in the title', () => {
  const e = only([timed('Culto 8pm', '2026-09-26T19:00:00-05:00', '2026-09-26T20:00:00-05:00')]);
  assert.equal(e.hora, '19:00');
  assert.equal(e.horaFuente, 'calendario');
});

test('an untimed event on a service day inherits that service time', () => {
  const e = only([allDay('Culto de jóvenes', '2026-09-26', '2026-09-27')]); // sábado
  assert.equal(e.hora, '18:45');
  assert.equal(e.horaFuente, 'church-info.md');
  assert.equal(e.horaTexto, '6:45 p. m.');
});

test('the title time wins over the service time', () => {
  const e = only([allDay('2pm Ecos del Futuro', '2026-09-27', '2026-09-28')]); // domingo
  assert.equal(e.hora, '14:00');
  assert.equal(e.horaFuente, 'titulo');
});

test('a named Sunday service is matched by title', () => {
  assert.equal(only([allDay('Escuela dominical', '2026-09-27', '2026-09-28')]).hora, '10:30');
  assert.equal(only([allDay('Culto evangelístico', '2026-09-27', '2026-09-28')]).hora, '09:00');
});

test('an unmatched Sunday event gets no time and says why', () => {
  const e = only([allDay('Bautismos', '2026-09-27', '2026-09-28')]);
  assert.equal(e.hora, null);
  assert.equal(e.horaFuente, null);
  assert.match(e.horaNota, /09:00/);
  assert.match(e.horaNota, /10:30/);
});

test('an event on a day with no service gets no time and a plain note', () => {
  const e = only([allDay('Charla familias', '2026-09-25', '2026-09-26')]);
  assert.equal(e.hora, null);
  assert.match(e.horaNota, /viernes/);
});

test('an ambiguous bare clock time in the title is not used', () => {
  const e = only([allDay('Reunión 7:30', '2026-09-25', '2026-09-26')]);
  assert.equal(e.hora, null);
  assert.match(e.horaNota, /7:30/);
  assert.equal(e.titulo, 'Reunión 7:30');
});

test('a place on the card is used and labelled "calendario"', () => {
  const e = only([timed('Culto', '2026-09-26T19:00:00-05:00', '2026-09-26T20:00:00-05:00', { location: 'Salón 2' })]);
  assert.equal(e.lugar, 'Salón 2');
  assert.equal(e.lugarFuente, 'calendario');
});

test('a Zoom title gives place "Zoom" and the virtual template', () => {
  const e = only([allDay('Reunión por Zoom', '2026-09-25', '2026-09-26')]);
  assert.equal(e.lugar, 'Zoom');
  assert.equal(e.modalidad, 'virtual');
  assert.equal(e.plantilla, 'virtual');
});

test('events outside the week, cancelled and non-default types are dropped and listed', () => {
  const { doc } = run([
    allDay('Antes', '2026-09-19', '2026-09-20'),
    allDay('Después', '2026-09-28', '2026-09-29'),
    allDay('Cancelado', '2026-09-25', '2026-09-26', { status: 'cancelled' }),
    allDay('Cumple', '2026-09-25', '2026-09-26', { eventType: 'BIRTHDAY' }),
    allDay('Dentro', '2026-09-25', '2026-09-26'),
  ]);
  assert.deepEqual(doc.events.map((e) => e.titulo), ['Dentro']);
  assert.deepEqual(doc.descartados.map((d) => d.titulo).sort(), ['Antes', 'Cancelado', 'Cumple', 'Después']);
});

test('a multi-day all-day event keeps its start and inclusive end', () => {
  const e = only([allDay('Congreso', '2026-09-25', '2026-09-28')]);
  assert.equal(e.fecha, '2026-09-25');
  assert.equal(e.fechaFin, '2026-09-27');
  assert.equal(e.fechaTexto, 'del viernes 25 al domingo 27 de septiembre');
});

test('a single-day all-day event has no fechaFin', () => {
  assert.equal('fechaFin' in only([allDay('Charla', '2026-09-25', '2026-09-26')]), false);
});

test('duplicate titles get the weekday appended to keep slugs unique', () => {
  const { doc } = run([
    allDay('Oración virtual', '2026-09-21', '2026-09-22'),
    allDay('Oración virtual', '2026-09-23', '2026-09-24'),
  ]);
  assert.deepEqual(doc.events.map((e) => e.slug), ['oracion-virtual-lunes', 'oracion-virtual-miercoles']);
});

test('events are sorted by date, then time, then title', () => {
  const { doc } = run([
    allDay('Zeta', '2026-09-25', '2026-09-26'),
    timed('Tarde', '2026-09-25T19:00:00-05:00', '2026-09-25T20:00:00-05:00'),
    timed('Temprano', '2026-09-25T08:00:00-05:00', '2026-09-25T09:00:00-05:00'),
    allDay('Alfa', '2026-09-24', '2026-09-25'),
  ]);
  assert.deepEqual(doc.events.map((e) => e.titulo), ['Alfa', 'Temprano', 'Tarde', 'Zeta']);
});

test('two calendars are merged and both names recorded', () => {
  const { doc } = normalizeWeek({
    week: '2026-W39',
    calendars: [cal([allDay('A', '2026-09-25', '2026-09-26')], 'Uno'), cal([allDay('B', '2026-09-25', '2026-09-26')], 'Dos')],
    churchInfo,
    overrides: {},
  });
  assert.equal(doc.calendar, 'Uno + Dos');
  assert.equal(doc.events.length, 2);
});

test('an override supplies a time with provenance "usuario"', () => {
  const e = only([allDay('Charla familias', '2026-09-25', '2026-09-26')], {
    overrides: { 'charla-familias': { hora: '19:00' } },
  });
  assert.equal(e.hora, '19:00');
  assert.equal(e.horaFuente, 'usuario');
  assert.equal(e.horaHablada, 'a las siete de la noche');
});

test('an override can pick the template and place, and omit an event', () => {
  const { doc } = run(
    [allDay('Charla familias', '2026-09-25', '2026-09-26'), allDay('Ayuno', '2026-09-26', '2026-09-27')],
    { overrides: { 'charla-familias': { plantilla: 'destacado', lugar: 'Salón 2' }, ayuno: { omitir: true } } },
  );
  assert.equal(doc.events.length, 1);
  assert.equal(doc.events[0].plantilla, 'destacado');
  assert.equal(doc.events[0].lugar, 'Salón 2');
  assert.equal(doc.events[0].lugarFuente, 'usuario');
  assert.deepEqual(doc.descartados.map((d) => d.titulo), ['Ayuno']);
});

test('an override for an unknown slug is a problem, not silently ignored', () => {
  const { problemas } = run([allDay('Charla familias', '2026-09-25', '2026-09-26')], {
    overrides: { 'charla-famlias': { hora: '19:00' } },
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /charla-famlias/);
});

test('an override with a malformed time is a problem and does not set the time', () => {
  const { doc, problemas } = run([allDay('Charla familias', '2026-09-25', '2026-09-26')], {
    overrides: { 'charla-familias': { hora: '7pm' } },
  });
  assert.equal(doc.events[0].hora, null);
  assert.match(problemas[0], /7pm/);
});

test('an override with hora null drops a time inherited from a service', () => {
  const { doc, problemas } = run([allDay('Culto de jóvenes', '2026-09-26', '2026-09-27')], {
    overrides: { 'culto-de-jovenes': { hora: null } },
  }); // sábado: without the override it inherits 18:45
  const e = doc.events[0];
  assert.deepEqual(problemas, []);
  assert.equal(e.hora, null);
  assert.equal(e.horaFuente, null);
  assert.equal(e.horaTexto, null);
  assert.equal(e.horaHablada, null);
  assert.match(e.horaNota, /asked/);
});

test('an override with hora null drops a time written in the title', () => {
  const e = only([allDay('2pm Ecos del Futuro Jovenes Distrito 9', '2026-09-27', '2026-09-28')], {
    overrides: { 'ecos-del-futuro-jovenes-distrito-9': { hora: null } },
  });
  assert.equal(e.titulo, 'Ecos del Futuro Jovenes Distrito 9');
  assert.equal(e.hora, null);
  assert.equal(e.horaFuente, null);
});

test('an override with hora null drops a time from the calendar card', () => {
  const e = only([timed('Integración maestros', '2026-09-26T19:00:00-05:00', '2026-09-26T20:00:00-05:00')], {
    overrides: { 'integracion-maestros': { hora: null } },
  });
  assert.equal(e.hora, null);
  assert.equal(e.horaFuente, null);
  assert.equal(e.horaTexto, null);
});

test('an override with lugar null drops the default place', () => {
  const e = only([allDay('Charla familias', '2026-09-25', '2026-09-26')], {
    overrides: { 'charla-familias': { lugar: null } },
  }); // without the override the place is church-info.md's default
  assert.equal(e.lugar, null);
  assert.equal(e.lugarFuente, null);
});

test('a place dropped by lugar null says why in the record; a place that was never there says nothing', () => {
  const dropped = only([allDay('Charla familias', '2026-09-25', '2026-09-26')], {
    overrides: { 'charla-familias': { lugar: null } },
  });
  assert.match(dropped.lugarNota, /asked/);

  const sinDefecto = parseChurchInfo('# Servicios recurrentes\n    Martes: 7:00 PM');
  const never = only([allDay('Charla familias', '2026-09-25', '2026-09-26')], { churchInfo: sinDefecto });
  assert.equal(never.lugar, null);
  assert.equal(never.lugarNota, undefined);
});

test('an empty or malformed value is not the same as null: the event keeps what the sources gave it', () => {
  const { doc, problemas } = run([allDay('Culto de jóvenes', '2026-09-26', '2026-09-27')], {
    overrides: { 'culto-de-jovenes': { hora: '', lugar: '' } },
  });
  assert.equal(doc.events[0].hora, '18:45');
  assert.equal(doc.events[0].horaFuente, 'church-info.md');
  assert.equal(doc.events[0].lugar, 'Salón Principal');
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /hora/);

  const numero = run([allDay('Culto de jóvenes', '2026-09-26', '2026-09-27')], {
    overrides: { 'culto-de-jovenes': { hora: 1900 } },
  });
  assert.equal(numero.doc.events[0].hora, '18:45');
  assert.match(numero.problemas[0], /1900/);
});

test('overrides without hora or lugar leave the time and place alone', () => {
  const e = only([allDay('Culto de jóvenes', '2026-09-26', '2026-09-27')], {
    overrides: { 'culto-de-jovenes': { plantilla: 'estandar' } },
  });
  assert.equal(e.hora, '18:45');
  assert.equal(e.horaFuente, 'church-info.md');
  assert.equal(e.lugar, 'Salón Principal');
  assert.equal(e.lugarFuente, 'church-info.md');
});

test('a week built with null overrides passes the audit, with notices that say why', () => {
  const { doc, problemas } = run(
    [allDay('Ayuno', '2026-09-26', '2026-09-27'), allDay('2pm Ecos del Futuro', '2026-09-27', '2026-09-28')],
    { overrides: { ayuno: { hora: null, lugar: null }, 'ecos-del-futuro': { hora: null } } },
  );
  assert.deepEqual(problemas, []);
  const { errores, avisos } = auditEvents(doc);
  assert.deepEqual(errores, []);
  const sinHora = avisos.filter((a) => a.regla === 'sin-hora');
  assert.deepEqual(sinHora.map((a) => a.slug).sort(), ['ayuno', 'ecos-del-futuro']);
  for (const a of sinHora) {
    assert.match(a.mensaje, /asked/);
    assert.doesNotMatch(a.mensaje, /unknown/);
  }
  assert.deepEqual(avisos.filter((a) => a.regla === 'sin-lugar').map((a) => a.slug), ['ayuno']);
});

test('unreadable lines in church-info.md surface as problems', () => {
  const info = parseChurchInfo('# Servicios recurrentes\n    Lunes: por definir');
  const { problemas } = run([], { churchInfo: info });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /Lunes: por definir/);
});
