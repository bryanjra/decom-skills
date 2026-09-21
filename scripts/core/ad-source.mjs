// Static checks on a per-event ad component (video/src/ads/<slug>.tsx). They
// enforce the rules a designer can break without a type error: facts must come
// from props, colors from tokens, motion from useCurrentFrame(), and the church
// name from the Logo part alone: an ad neither types it nor renders it.

import { stripAccents } from './spanish.mjs';

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const DIAS = 'lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo';

const NOMBRE_EN_TEXTO = 'the church name is drawn by Logo; an ad does not read iglesia.nombre or the church context';

const REGLAS = [
  {
    regla: 'hora-literal',
    patrones: [/(?<![\d:])\d{1,2}\s*:\s*\d{2}(?![\d:])/, /(?<![\d:])\d{1,2}\s*[ap]\.?\s?m\.?(?![\p{L}\d])/iu],
    mensaje: 'hard-coded time; render event.horaTexto instead',
  },
  {
    regla: 'fecha-literal',
    patrones: [new RegExp(`\\bde\\s+(?:${MESES})\\b`, 'i'), new RegExp(`\\b(?:${DIAS})s?\\b`, 'i')],
    mensaje: 'hard-coded date or weekday; render event.fechaTexto instead',
  },
  {
    regla: 'color-literal',
    patrones: [/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/, /\b(?:rgba?|hsla?)\s*\(/i],
    mensaje: 'hard-coded color; take it from brand tokens',
  },
  {
    regla: 'nombre-en-texto',
    patrones: [/\biglesia\s*\??\.\s*nombre\b/, /\biglesia\s*(?:\?\.)?\s*\[\s*['"]nombre['"]\s*\]/, /\buseIglesia\b/],
    mensaje: NOMBRE_EN_TEXTO,
  },
  {
    regla: 'css-animacion',
    patrones: [/\b(?:transition|animation)\s*:/, /@keyframes/, /\banimate-[a-z]/],
    mensaje: 'CSS transitions and animations do not render; drive motion with useCurrentFrame() + interpolate()',
  },
  {
    regla: 'duracion-fija',
    patrones: [/\bdurationInFrames\s*[=:]\s*\d+/],
    mensaje: 'scene length must come from the voiceover via calculateMetadata, not a frame count',
  },
];

// Reading `nombre` out of `iglesia` by destructuring, which may span several lines.
const DESESTRUCTURA_NOMBRE = [
  /\{[^{}]*\bnombre\b[^{}]*\}\s*=\s*(?:[\w$]+\s*\??\.\s*)*iglesia\b/g, // const {nombre} = iglesia
  /\biglesia\s*:\s*\{[^{}]*\bnombre\b[^{}]*\}/g, // ({iglesia: {nombre}}) => ...
];

const lineaEn = (texto, indice) => texto.slice(0, indice).split('\n').length;

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Line where the church name is typed into `src` (any case or accents, even wrapped over lines), or null. */
function lineaDelNombre(src, nombre) {
  const palabras = stripAccents(nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (!palabras.length) return null;
  const nombreRe = new RegExp(`(?<![\\p{L}\\d])${palabras.map(escapar).join('\\s+')}(?![\\p{L}\\d])`, 'iu');
  const plano = stripAccents(src);
  const m = nombreRe.exec(plano);
  return m ? lineaEn(plano, m.index) : null;
}

/**
 * @param {string} src the ad's source
 * @param {{nombre?: string|null}} [iglesia] church-info.md facts; without a name there is none to find typed in
 */
export function checkAdSource(src, iglesia = {}) {
  const errores = [];
  src.split('\n').forEach((texto, i) => {
    for (const { regla, patrones, mensaje } of REGLAS) {
      if (patrones.some((p) => p.test(texto))) errores.push({ regla, linea: i + 1, mensaje });
    }
  });
  for (const patron of DESESTRUCTURA_NOMBRE) {
    for (const m of src.matchAll(patron)) {
      errores.push({ regla: 'nombre-en-texto', linea: lineaEn(src, m.index + m[0].search(/\bnombre\b/)), mensaje: NOMBRE_EN_TEXTO });
    }
  }
  const linea = lineaDelNombre(src, iglesia?.nombre);
  if (linea) errores.push({ regla: 'nombre-literal', linea, mensaje: 'the church name is typed into the ad; Logo draws it, never type it' });
  return { errores, avisos: [] };
}
