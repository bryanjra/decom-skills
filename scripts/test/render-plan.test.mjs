import test from 'node:test';
import assert from 'node:assert/strict';
import { audioSrcFor, eventProps, reelProps, silentSlugs, stillFrame } from '../core/render-plan.mjs';

const iglesia = { nombre: 'Iglesia Ejemplo', direccion: null, lugarPorDefecto: 'Salón Principal', llamadoAccion: 'Te esperamos' };
const evento = { slug: 'culto-jovenes', titulo: 'Culto de jóvenes', hora: '18:45', horaHablada: 'a las seis y cuarenta y cinco de la tarde' };
const guion = '# Culto de jóvenes\n<!-- borrador -->\nTe invitamos al culto de jóvenes el sábado.\nTe esperamos.\n';

test('the audio is staged under public/audio/<slug>.mp3 and referenced relative to public/', () => {
  assert.equal(audioSrcFor('culto-jovenes'), 'audio/culto-jovenes.mp3');
});

test('event props carry the record, the church and the audio path', () => {
  const p = eventProps({ event: evento, iglesia, guion, hasAudio: true });
  assert.equal(p.slug, 'culto-jovenes');
  assert.equal(p.event, evento);
  assert.equal(p.iglesia, iglesia);
  assert.equal(p.audioSrc, 'audio/culto-jovenes.mp3');
});

test('an event without a voiceover degrades to a silent scene, audioSrc null', () => {
  assert.equal(eventProps({ event: evento, iglesia, guion, hasAudio: false }).audioSrc, null);
});

test('palabras counts only the spoken text, not headings or comments', () => {
  // "Te invitamos al culto de jóvenes el sábado. Te esperamos." = 10 words; the heading (3) and comment (1) would make 14
  assert.equal(eventProps({ event: evento, iglesia, guion, hasAudio: false }).palabras, 10);
});

test('a script with no spoken text counts zero words', () => {
  assert.equal(eventProps({ event: evento, iglesia, guion: '# solo título\n<!-- nada -->', hasAudio: false }).palabras, 0);
});

test('the still is taken about 60% into the clip, on a whole frame', () => {
  assert.equal(stillFrame(300), 180);
  assert.equal(stillFrame(301), 181);
});

test('the still frame always falls inside the clip', () => {
  assert.equal(stillFrame(1), 0);
  assert.equal(stillFrame(2), 1);
  assert.ok(stillFrame(10) <= 9);
});

test('reel props take the week text from events.json and keep the item order', () => {
  const items = [{ slug: 'a' }, { slug: 'b' }];
  const doc = { semana: { texto: 'Semana del 21 al 27 de septiembre' }, iglesia };
  const p = reelProps({ doc, items, hasMusic: false });
  assert.equal(p.semanaTexto, 'Semana del 21 al 27 de septiembre');
  assert.equal(p.iglesia, iglesia);
  assert.deepEqual(p.items.map((i) => i.slug), ['a', 'b']);
});

test('the music bed is wired only when the file exists', () => {
  const doc = { semana: { texto: 'x' }, iglesia };
  assert.equal(reelProps({ doc, items: [], hasMusic: true }).musicSrc, 'music/bed.mp3');
  assert.equal(reelProps({ doc, items: [], hasMusic: false }).musicSrc, null);
});

test('silentSlugs lists exactly the events with no audio, in order', () => {
  const items = [
    { slug: 'a', audioSrc: 'audio/a.mp3' },
    { slug: 'b', audioSrc: null },
    { slug: 'c', audioSrc: null },
  ];
  assert.deepEqual(silentSlugs(items), ['b', 'c']);
  assert.deepEqual(silentSlugs([]), []);
});
