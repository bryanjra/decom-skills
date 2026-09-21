// Static checks on a per-event ad component (video/src/ads/<slug>.tsx). They
// enforce the rules a designer can break without a type error: facts must come
// from props, colors from tokens, motion from useCurrentFrame().

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const DIAS = 'lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo';

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

export function checkAdSource(src) {
  const errores = [];
  src.split('\n').forEach((texto, i) => {
    for (const { regla, patrones, mensaje } of REGLAS) {
      if (patrones.some((p) => p.test(texto))) errores.push({ regla, linea: i + 1, mensaje });
    }
  });
  return { errores, avisos: [] };
}
