import test from 'node:test';
import assert from 'node:assert/strict';
import { registrySource } from '../core/registry.mjs';

const ok = 'export const Ad = () => null;\n';

test('lists every ad file, sorted, keyed by slug', () => {
  const src = registrySource({ 'zeta.tsx': ok, 'alfa.tsx': ok });
  assert.match(src, /GENERATED/);
  assert.ok(src.indexOf("'alfa'") < src.indexOf("'zeta'"));
  assert.match(src, /import \{ Ad as ad0 \} from '\.\/alfa';/);
  assert.match(src, /'alfa': ad0,/);
  assert.match(src, /'zeta': ad1,/);
});

test('an empty ads folder still yields a valid registry', () => {
  assert.match(registrySource({}), /export const ads: Record<string, AdComponent> = \{\s*\};/);
});

test('a file that does not export Ad is rejected by name', () => {
  assert.throws(() => registrySource({ 'roto.tsx': 'export const Otro = 1;' }), /roto\.tsx.*export.*Ad/);
});

test('both `export const Ad` and `export function Ad` are accepted', () => {
  assert.doesNotThrow(() => registrySource({ 'a.tsx': 'export function Ad() { return null; }' }));
});

test('non-tsx files and the registry itself are ignored', () => {
  const src = registrySource({ 'registry.gen.ts': 'x', 'notas.md': 'x', 'real.tsx': ok });
  assert.match(src, /'real'/);
  assert.equal(src.includes('notas'), false);
  assert.equal(src.includes("from './registry"), false);
});
