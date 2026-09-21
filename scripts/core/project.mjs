// Shared plumbing for the CLI scripts: repo paths, .env, arguments, reporting.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const weekDir = (week) => join(ROOT, 'out', week);

/** Load ROOT/.env without overriding variables already set in the shell. */
export function loadEnv() {
  const path = join(ROOT, '.env');
  if (existsSync(path)) process.loadEnvFile(path);
}

/** `--key value`, `--key=value`, and boolean flags listed in `booleans`. */
export function parseArgs(argv, { booleans = [] } = {}) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const [clave, inline] = a.slice(2).split('=');
    if (inline !== undefined) flags[clave] = inline;
    else if (booleans.includes(clave) || argv[i + 1] === undefined || argv[i + 1].startsWith('--')) flags[clave] = true;
    else flags[clave] = argv[++i];
  }
  return { flags, positional };
}

export function printIssues({ errores, avisos }, prefijo = '') {
  for (const e of errores) console.error(`${prefijo}ERROR  [${e.regla}] ${e.slug ? `${e.slug}: ` : ''}${e.mensaje}`);
  for (const a of avisos) console.warn(`${prefijo}notice [${a.regla}] ${a.slug ? `${a.slug}: ` : ''}${a.mensaje}`);
}
