// The gate over events.json. Errors block rendering; notices are reported but
// do not. A missing time is a notice (the ad is made without one), but a time
// that is malformed or whose source is not trustworthy is an error: that is
// how a wrong hour would reach a locked door.

import { isHora } from './spanish.mjs';

export const FUENTES_HORA = ['calendario', 'titulo', 'church-info.md', 'usuario'];
export const PLANTILLAS = ['destacado', 'estandar', 'virtual'];
/** Slugs that would collide with the intro and outro sections of the weekly script. */
export const SLUGS_RESERVADOS = ['intro', 'outro'];

export function auditEvents(doc) {
  const errores = [];
  const avisos = [];
  const error = (regla, e, mensaje) => errores.push({ regla, slug: e.slug, mensaje });
  const aviso = (regla, e, mensaje) => avisos.push({ regla, slug: e.slug, mensaje });

  const vistos = new Set();
  for (const e of doc.events ?? []) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug ?? '')) {
      error('slug-formato', e, `slug "${e.slug}" must be lowercase, accent-stripped and hyphenated`);
    }
    if (SLUGS_RESERVADOS.includes(e.slug)) {
      error('slug-reservado', e, `slug "${e.slug}" is reserved for a section of the weekly script`);
    }
    if (vistos.has(e.slug)) error('slug-duplicado', e, `slug "${e.slug}" appears more than once`);
    vistos.add(e.slug);

    const conHora = e.hora !== null && e.hora !== undefined;
    if (conHora) {
      if (!isHora(e.hora)) {
        error('hora-formato', e, `hora "${e.hora}" is not HH:MM (24h)`);
      } else if (!FUENTES_HORA.includes(e.horaFuente)) {
        error('hora-fuente', e, `hora ${e.hora} has source "${e.horaFuente}"; allowed: ${FUENTES_HORA.join(', ')}`);
      }
    } else {
      if (e.horaFuente) error('hora-fuente', e, `no hora but horaFuente is "${e.horaFuente}"`);
      aviso('sin-hora', e, `"${e.titulo}" (${e.fechaTexto ?? e.fecha}) has no time: ${e.horaNota ?? 'unknown'}`);
    }

    if (!PLANTILLAS.includes(e.plantilla)) {
      error('plantilla', e, `plantilla "${e.plantilla}" must be one of ${PLANTILLAS.join(', ')}`);
    } else if (e.modalidad === 'virtual' && e.plantilla !== 'virtual') {
      aviso('plantilla-virtual', e, `"${e.titulo}" is virtual but uses the "${e.plantilla}" template`);
    }

    if (e.modalidad !== 'virtual' && !e.lugar) {
      aviso('sin-lugar', e, `"${e.titulo}" has no place: ${e.lugarNota ?? 'neither the card nor church-info.md gives one'}`);
    }
  }
  return { errores, avisos };
}
