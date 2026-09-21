// The weekly narration: out/<week>/guion.md is one script for the whole week, in
// sections (intro, one per event, outro). This module reads it, builds the exact text
// that is sent to the voice, and maps the voice's per-character timing back onto the
// sections. Pure functions, no I/O.

/** What joins two sections in the text sent to the voice: one space reads as one flowing paragraph. */
export const JOINER = ' ';

const ENCABEZADO = /^##\s+(.+?)\s*$/;

/**
 * @param {string} md contents of guion.md
 * @returns {{sections: Array<{id: string, text: string}>, problems: string[]}}
 */
export function parseNarracion(md) {
  const secciones = [];
  const problems = [];
  let actual = null;
  for (const cruda of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const linea = cruda.trim();
    const h = ENCABEZADO.exec(linea);
    if (h) {
      if (secciones.some((s) => s.id === h[1])) problems.push(`section "${h[1]}" appears more than once`);
      actual = { id: h[1], lineas: [] };
      secciones.push(actual);
    } else if (linea && !linea.startsWith('#')) {
      if (actual) actual.lineas.push(linea);
      else problems.push(`text before the first "## <id>" heading is ignored: "${linea.slice(0, 40)}"`);
    }
  }
  return {
    sections: secciones.map((s) => ({ id: s.id, text: s.lineas.join(' ').replace(/\s+/g, ' ').trim() })),
    problems,
  };
}

/**
 * The text sent to the voice and where each section sits in it (character offsets,
 * end exclusive). An empty section is skipped.
 */
export function buildNarration(sections) {
  let text = '';
  const spans = [];
  for (const { id, text: t } of sections) {
    if (!t) continue;
    if (text) text += JOINER;
    spans.push({ id, start: text.length, end: text.length + t.length });
    text += t;
  }
  return { text, spans };
}

/**
 * The speech window of each section in the voiceover, in seconds of audio.
 * @param {Array<{id: string, text: string}>} sections
 * @param {{characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[]}} alignment
 * @returns {Array<{id: string, startSec: number, endSec: number}>}
 */
export function sectionTimes(sections, alignment) {
  const { text, spans } = buildNarration(sections);
  const { characters, character_start_times_seconds: inicios, character_end_times_seconds: fines } = alignment;
  if (characters.join('') !== text || inicios.length !== characters.length || fines.length !== characters.length) {
    throw new Error('the alignment is not the alignment of this script: regenerate the voiceover (node scripts/tts.mjs --force)');
  }
  return spans.map(({ id, start, end }) => ({ id, startSec: inicios[start], endSec: fines[end - 1] }));
}

/**
 * Stand-in speech windows for a week with no voiceover yet: the words of each
 * section at a fixed pace, with a short pause between sections.
 */
export function estimateTimes(sections, { wordsPerSecond, pauseSeconds }) {
  let t = 0;
  const ventanas = [];
  for (const { id, text } of sections) {
    if (!text) continue;
    const dura = text.split(/\s+/).filter(Boolean).length / wordsPerSecond;
    ventanas.push({ id, startSec: t, endSec: t + dura });
    t += dura + pauseSeconds;
  }
  return ventanas;
}
