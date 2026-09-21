#!/usr/bin/env node
// Regenerates video/src/ads/registry.gen.ts from video/src/ads/*.tsx.
//   node scripts/gen-registry.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './core/project.mjs';
import { registrySource } from './core/registry.mjs';

const dir = join(ROOT, 'video', 'src', 'ads');
const archivos = Object.fromEntries(
  readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => [f, readFileSync(join(dir, f), 'utf8')]),
);

const salida = join(dir, 'registry.gen.ts');
const fuente = registrySource(archivos);
if (!existsSync(salida) || readFileSync(salida, 'utf8') !== fuente) writeFileSync(salida, fuente);
console.log(`registry: ${Object.keys(archivos).length} ad component(s)`);
