import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChurchInfo, findService } from '../core/church-info.mjs';

// A fictional church written the way a real hand-typed file looks: heading
// with no space after '#', 4-space indentation, "8: 00", and an implausible
// end time. Nothing here may be baked into the code; only this file says it.
const MESSY = [
  '#Contact info',
  '    Nombre: Iglesia Ejemplo',
  '    Direccion: Calle 1 #2-3, Ciudad Ejemplo',
  '    Lugar por defecto: Salón Principal',
  '    Ministerios: Jóvenes, Adolescentes, Familias',
  '    Llamado a la accion: Te esperamos',
  '',
  '# Servicios recurrentes',
  '    Martes: 6:45 PM - 8:00 PM',
  '    Jueves: 6:45 PM - 8:00 PM',
  '    Sabados: 6:45 PM - 8: 00 PM',
  '    Domingos (1er servicio - Culto evangelistico): 9:00 AM - 10:00 AM',
  '    Domingos (2do servicio - Escuela dominical): 10:30 AM - 12:00 AM',
  '',
  '',
].join('\n');

test('reads the church facts from labelled lines', () => {
  const info = parseChurchInfo(MESSY);
  assert.equal(info.nombre, 'Iglesia Ejemplo');
  assert.equal(info.direccion, 'Calle 1 #2-3, Ciudad Ejemplo');
  assert.equal(info.lugarPorDefecto, 'Salón Principal');
  assert.deepEqual(info.ministerios, ['Jóvenes', 'Adolescentes', 'Familias']);
  assert.equal(info.llamadoAccion, 'Te esperamos');
});

test('labels are matched ignoring case and accents', () => {
  const info = parseChurchInfo('DIRECCIÓN: Calle 9\nllamado a la acción: Ven');
  assert.equal(info.direccion, 'Calle 9');
  assert.equal(info.llamadoAccion, 'Ven');
});

test('reads every recurring service with its start time only', () => {
  const { servicios } = parseChurchInfo(MESSY);
  assert.deepEqual(
    servicios.map((s) => [s.dia, s.hora, s.nombre]),
    [
      ['martes', '18:45', null],
      ['jueves', '18:45', null],
      ['sábado', '18:45', null],
      ['domingo', '09:00', 'Culto evangelistico'],
      ['domingo', '10:30', 'Escuela dominical'],
    ],
  );
});

test('anything the file does not say stays empty, never defaulted', () => {
  assert.deepEqual(parseChurchInfo(''), {
    nombre: null,
    direccion: null,
    lugarPorDefecto: null,
    ministerios: [],
    llamadoAccion: null,
    servicios: [],
    problemas: [],
  });
  const soloDireccion = parseChurchInfo('#Contact info\n    Direccion: Calle 1');
  assert.equal(soloDireccion.nombre, null);
  assert.equal(soloDireccion.lugarPorDefecto, null);
});

test('a weekday line outside the services section is not a service', () => {
  assert.deepEqual(parseChurchInfo('# Otra cosa\n    Martes: 7:00 PM').servicios, []);
});

test('a service line whose time cannot be read is reported, not guessed', () => {
  const info = parseChurchInfo('# Servicios recurrentes\n    Lunes: por definir');
  assert.deepEqual(info.servicios, []);
  assert.equal(info.problemas.length, 1);
  assert.match(info.problemas[0], /Lunes: por definir/);
});

test('church-info.example.md documents every field and parses cleanly', () => {
  const path = fileURLToPath(new URL('../../church-info.example.md', import.meta.url));
  const info = parseChurchInfo(readFileSync(path, 'utf8'));
  assert.deepEqual(info.problemas, []);
  assert.ok(info.nombre && info.direccion && info.lugarPorDefecto && info.llamadoAccion);
  assert.ok(info.ministerios.length > 0);
  assert.ok(info.servicios.length > 0);
});

test('an unnamed service applies to any event on that weekday', () => {
  const { servicios } = parseChurchInfo(MESSY);
  const r = findService(servicios, { diaSemana: 'sábado', titulo: 'Culto de jóvenes' });
  assert.equal(r.servicio.hora, '18:45');
  assert.equal(r.candidatos, undefined);
});

test('a weekday with no service matches nothing', () => {
  const { servicios } = parseChurchInfo(MESSY);
  assert.deepEqual(findService(servicios, { diaSemana: 'viernes', titulo: 'Charla familias' }), {
    servicio: null,
    candidatos: [],
  });
});

test('two Sunday services are told apart by name', () => {
  const { servicios } = parseChurchInfo(MESSY);
  assert.equal(findService(servicios, { diaSemana: 'domingo', titulo: 'Culto evangelístico especial' }).servicio.hora, '09:00');
  assert.equal(findService(servicios, { diaSemana: 'domingo', titulo: 'Escuela dominical' }).servicio.hora, '10:30');
});

test('a Sunday event matching neither name is ambiguous and gets no service', () => {
  const { servicios } = parseChurchInfo(MESSY);
  const r = findService(servicios, { diaSemana: 'domingo', titulo: 'Bautismos' });
  assert.equal(r.servicio, null);
  assert.deepEqual(r.candidatos.map((s) => s.hora), ['09:00', '10:30']);
});
