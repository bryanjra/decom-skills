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

const iglesia = { nombre: 'Iglesia Ejemplo' };
const reglasDe = (src, ig = iglesia) => checkAdSource(src, ig).errores.map((e) => e.regla);

test('the church name typed into an ad is an error, however it is cased, accented or wrapped', () => {
  assert.deepEqual(reglasDe(`<p>Iglesia Ejemplo</p>`), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>IGLESIA EJEMPLO</p>`), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>\n  Iglesia\n  Ejemplo\n</p>`), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>Iglesia Peñón</p>`, { nombre: 'Iglesia Penon' }), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>Iglesia Penon</p>`, { nombre: 'Iglesia Peñón' }), ['nombre-literal']);
});

test('the church name finding points at the line where the name starts', () => {
  const r = checkAdSource(`const a = 1;\n<p>Iglesia\n  Ejemplo</p>`, iglesia);
  assert.equal(r.errores[0].linea, 2);
});

test('a church name is matched as whole words and literally', () => {
  assert.deepEqual(reglasDe(`const CentralPanel = 1;`, { nombre: 'Central' }), []);
  assert.deepEqual(reglasDe(`<p>Central</p>`, { nombre: 'Central' }), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>Iglesia (Ejemplo) +</p>`, { nombre: 'Iglesia (Ejemplo) +' }), ['nombre-literal']);
  assert.deepEqual(reglasDe(`<p>Iglesia Ejemplo Norte</p>`, { nombre: 'Iglesia Ejemplo' }), ['nombre-literal']);
});

test('with no church name on record, nothing typed can be a name', () => {
  assert.deepEqual(reglasDe(`<p>Iglesia Ejemplo</p>`, { nombre: null }), []);
  assert.deepEqual(checkAdSource(`<p>Iglesia Ejemplo</p>`).errores, []);
});

test('rendering iglesia.nombre as text is an error; passing iglesia on to a template is not', () => {
  assert.deepEqual(reglasDe(`<h1>{iglesia.nombre}</h1>`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`<h1>{iglesia?.nombre}</h1>`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`<h1>{iglesia['nombre']}</h1>`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`<h1>{iglesia.nombre}</h1>`, { nombre: null }), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`<Layout event={event} iglesia={iglesia} />`), []);
});

test('reading the church name by destructuring is an error too', () => {
  assert.deepEqual(reglasDe(`const {nombre} = iglesia;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`const {direccion, nombre: n} = iglesia;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`const { nombre = '' } = props.iglesia;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`const {\n  direccion,\n  nombre,\n} = iglesia;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`export const Ad = ({event, iglesia: {nombre}}) => null;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`const {iglesia: {direccion, nombre: n}} = props;`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`const {nombre} = iglesia;`, { nombre: null }), ['nombre-en-texto']);
});

test('a multi-line destructuring is reported on the line that names the field', () => {
  const r = checkAdSource(`const a = 1;\nconst {\n  direccion,\n  nombre,\n} = iglesia;`, iglesia);
  assert.equal(r.errores.length, 1);
  assert.equal(r.errores[0].linea, 4);
});

test('destructuring the other church facts, or a nombre from anything else, is fine', () => {
  assert.deepEqual(reglasDe(`const {llamadoAccion, direccion} = iglesia;`), []);
  assert.deepEqual(reglasDe(`const {event, iglesia} = props;`), []);
  assert.deepEqual(reglasDe(`export const Ad = ({event, iglesia}: AdProps) => null;`), []);
  assert.deepEqual(reglasDe(`const {nombre} = otro;`), []);
  assert.deepEqual(reglasDe(`const {nombre} = iglesiaExtra;`), []);
});

test('the church context hook is for the Logo, not for an ad', () => {
  assert.deepEqual(reglasDe(`const igl = useIglesia();`), ['nombre-en-texto']);
  assert.deepEqual(reglasDe(`import {useIglesia} from '../church';`), ['nombre-en-texto']);
});
