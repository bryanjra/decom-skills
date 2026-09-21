// Reads what a calendar title says about itself: ministry prefix, a time
// hiding in the text, and whether the event is virtual. It only reports what
// the title states; an unclear time is reported as ambiguous, never guessed.

import { stripAccents } from './spanish.mjs';

const PREFIJO = /^\s*\(([^)]+)\)\s*[-–—:]?\s*/;
const PERIODO = 'ma[ñn]ana|tarde|noche|madrugada';

// "2pm", "7:30 p.m.", "8 am": the meridiem makes it unambiguous.
const CON_MERIDIANO = /(?<![\d:])(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?(?![\p{L}\d])/iu;
// "19:00": a clock time with no meridiem. Only 13-23 is unambiguous.
const RELOJ = /(?<![\d:])(\d{1,2}):(\d{2})(?![\d:])/;
// "a las 7 de la noche", "las 12 del mediodía": the period is spelled out.
const CON_PERIODO = new RegExp(
  `(?:\\ba\\s+)?\\blas?\\s+(\\d{1,2})(?::(\\d{2}))?\\s+(?:de\\s+la\\s+(${PERIODO})|del\\s+mediod[ií]a)`,
  'iu',
);
// "a las 7": says a time but not which half of the day.
const SOLO_HORA = /\ba\s+las?\s+(\d{1,2})(?::(\d{2}))?(?![\d:])(?!\s*(?:de\s+la|del|[ap]\.?\s?m))/i;

const hhmm = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const minutoValido = (m) => m === undefined || Number(m) <= 59;

function aH24(h, periodo) {
  h = Number(h);
  if (h < 1 || h > 12) return null;
  const p = stripAccents(periodo).toLowerCase();
  if (p === 'am' || p === 'manana' || p === 'madrugada') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12; // pm, tarde, noche, mediodía
}

function buscarHora(texto) {
  let m = CON_MERIDIANO.exec(texto);
  if (m && minutoValido(m[2])) {
    const h = aH24(m[1], m[3].toLowerCase() === 'a' ? 'am' : 'pm');
    if (h !== null) return { hora: hhmm(h, Number(m[2] ?? 0)), texto: m[0] };
    return { hora: null, ambigua: m[0] }; // "13pm": says a time, but an impossible one
  }

  m = CON_PERIODO.exec(texto);
  if (m && minutoValido(m[2])) {
    const h = aH24(m[1], m[3] ?? 'tarde');
    if (h !== null) return { hora: hhmm(h, Number(m[2] ?? 0)), texto: m[0] };
  }

  m = RELOJ.exec(texto);
  if (m && Number(m[2]) <= 59) {
    const h = Number(m[1]);
    if (h >= 13 && h <= 23) return { hora: hhmm(h, Number(m[2])), texto: m[0] };
    if (h <= 12) return { hora: null, ambigua: m[0] };
  }

  m = SOLO_HORA.exec(texto);
  if (m) return { hora: null, ambigua: m[0].trim() };
  return { hora: null };
}

const mismaPalabra = (a, b) =>
  a === b || a + 's' === b || a + 'es' === b || b + 's' === a || b + 'es' === a;

function ministerioPorClave(titulo, ministerios) {
  const palabras = stripAccents(titulo).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const halladas = new Set();
  for (const ministerio of ministerios) {
    const clave = stripAccents(ministerio).toLowerCase().trim();
    if (clave && palabras.some((p) => mismaPalabra(p, clave))) halladas.add(ministerio);
  }
  return halladas.size === 1 ? [...halladas][0] : null;
}

function modalidadVirtual(titulo) {
  const t = stripAccents(titulo).toLowerCase();
  if (/\bzoom\b/.test(t)) return 'Zoom';
  if (/\b(virtual(es)?|online|en linea)\b/.test(t)) return 'Virtual';
  return null;
}

/**
 * @param {string} summary the calendar title
 * @param {{ministerios?: string[]}} [opts] ministry names from church-info.md
 */
export function parseTitulo(summary, { ministerios = [] } = {}) {
  const prefijo = PREFIJO.exec(summary);
  const resto = prefijo && summary.slice(prefijo[0].length).trim() ? summary.slice(prefijo[0].length) : summary;
  const ministerio = prefijo && resto !== summary ? prefijo[1].trim() : null;

  const { hora, texto, ambigua } = buscarHora(resto);
  const titulo = texto
    ? resto.replace(texto, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–—:,@]+|[\s\-–—:,@]+$/g, '')
    : resto.trim();

  return {
    ministerio,
    titulo: titulo || resto.trim(),
    hora,
    horaAmbigua: ambigua ?? null,
    virtual: modalidadVirtual(resto),
    ministerioClave: ministerioPorClave(titulo || resto, ministerios),
  };
}
