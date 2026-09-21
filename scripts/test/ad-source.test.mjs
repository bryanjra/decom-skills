import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAdSource } from '../core/ad-source.mjs';

const reglas = (src) => checkAdSource(src).errores.map((e) => e.regla);

test('a props-driven component with token colors passes', () => {
  const src = `
    import {brand} from '../brand/tokens';
    export const Ad = ({event}) => (
      <div style={{color: brand.color.text, fontSize: 64, opacity: 0.5}}>
        <h1>{event.titulo}</h1>
        <p>{event.fechaTexto} {event.horaTexto}</p>
        <p>Te esperamos</p>
      </div>
    );`;
  assert.deepEqual(reglas(src), []);
});

test('a hard-coded clock time in the source is an error', () => {
  assert.deepEqual(reglas(`const t = '7:00 p. m.';`), ['hora-literal']);
  assert.deepEqual(reglas(`<p>a las 7 pm</p>`), ['hora-literal']);
  assert.deepEqual(reglas(`<p>19:00</p>`), ['hora-literal']);
});

test('a hard-coded date or weekday in the source is an error', () => {
  assert.deepEqual(reglas(`<p>25 de septiembre</p>`), ['fecha-literal']);
  assert.deepEqual(reglas(`<p>Este viernes</p>`), ['fecha-literal']);
});

test('hard-coded color literals are errors', () => {
  assert.deepEqual(reglas(`const s = {color: '#ff0000'};`), ['color-literal']);
  assert.deepEqual(reglas(`const s = {color: '#fff'};`), ['color-literal']);
  assert.deepEqual(reglas(`const s = {background: 'rgba(0,0,0,0.5)'};`), ['color-literal']);
  assert.deepEqual(reglas(`const s = {background: 'hsl(10, 50%, 50%)'};`), ['color-literal']);
});

test('CSS transitions and animations, which do not render, are errors', () => {
  assert.deepEqual(reglas(`const s = {transition: 'all 1s'};`), ['css-animacion']);
  assert.deepEqual(reglas(`const s = {animation: 'spin 1s'};`), ['css-animacion']);
  assert.deepEqual(reglas(`<div className="animate-bounce" />`), ['css-animacion']);
});

test('a hard-coded frame count for scene length is an error', () => {
  assert.deepEqual(reglas(`export const durationInFrames = 300;`), ['duracion-fija']);
});

test('findings carry the line number', () => {
  const r = checkAdSource(`const a = 1;\nconst t = '7:00 p. m.';\n`);
  assert.equal(r.errores[0].linea, 2);
});
