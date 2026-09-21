# Weekly Narration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the weekly video from five separately voiced blocks into one narrated piece: a spoken welcome, the week's events in varied phrasing, and a single spoken close, all in one continuous voice take.

**Architecture:** The orchestrator writes one `out/<week>/guion.md` in sections (`intro`, one per event, `outro`). `scripts/tts.mjs` voices it in one ElevenLabs `with-timestamps` request. Pure functions in `scripts/core/` map the per-character timing to section windows, scene cuts and `TransitionSeries` lengths; `render.mjs` passes the result to Remotion as props, and `WeeklyReel` plays one audio track over it.

**Tech Stack:** Node 22 ESM in `scripts/` (tests: `node --test`), Remotion 4.0.526 + React + TypeScript in `video/`, ElevenLabs REST (`/with-timestamps`).

**Spec:** `docs/superpowers/specs/2026-09-21-weekly-narration-design.md`

## Global Constraints

- **Node on this VM:** the Bash tool has no `node` on PATH. Start every shell command that needs it with `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`. Run everything from the repo root `/home/bryanjaramillo/decom-skills` with absolute paths or an explicit `cd`; use a subshell for `video/`: `(cd video && npx tsc --noEmit)`.
- **Baseline:** `node --test scripts/test/*.test.mjs` passes 116 tests and `(cd video && npx tsc --noEmit)` exits 0 before any change (re-verified on HEAD `7e31c0a` plus the working-tree edits below). Never leave either red at the end of a task.
- **Shared working tree.** The user edits this repo while the plan runs (branding work: `Wordmark` became `Logo`, `logoHeight`, plus doc edits). When this plan was written they had uncommitted changes in `video/src/WeeklyReel.tsx`, `cards.tsx`, `brand/tokens.ts`, `templates/*.tsx`, `PLAN.md`, `README.md`, `church-info.example.md`, `.claude/skills/church-ads/design.md` and `brand/corporate-brand.md`. Never revert or stash them. Before every commit run `git status --short` and `git diff --stat -- <the files you edited>`: if a file you edited also holds hunks you did not write, stage only your own (`git add -p <file>`) or ask the user to commit theirs first, so their work is never committed under this plan's message. Task 9 needs its own preflight because its files are the ones the branding work rewrites.
- All video is 16:9, 1920x1080, 30 fps; templates re-layout rather than hardcode.
- `video/src/brand/tokens.ts` is the single source of truth for colors, spacing, type scale **and motion timing**. No hardcoded hex values or timing constants elsewhere.
- Never invent event facts; church facts (name, address, default place, ministries, call to action, `Despedida`, services) come from `church-info.md`, never from `scripts/` or `video/src/`. Tests use the fictional "Iglesia Ejemplo".
- All audience-facing text is Spanish (Colombia), addressing the reader as `tú`, never `usted`. Code, comments and docs are in English.
- The closing call to action is the church's own and is spoken once, in the outro; event lines carry neither it nor the `Despedida`.
- Subagents never render; only the orchestrator renders (CPU-bound, serialized).
- Never name a directory `lib`. Generated output in `out/` is disposable and never edited by hand.
- Never print `.env` values. TTS is paid: only Task 1 step 3 (about 200 characters) and Task 12 step 4 (about 280 characters) call the API.
- Every commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (pass it as a second `-m`).
- Existing tests keep their style: `node:test`, `node:assert/strict`, files at `scripts/test/<module>.test.mjs`.

## Decisions the spec left open

1. **Length notice for an event line** is 6–30 words (`LONGITUD_EVENTO`): the shortest faithful line (title, day, place) is about 8 words, and 30 words keeps a three-event week under a minute.
2. **Clip slice padding** is two new motion tokens, `slicePadBeforeSeconds: 0.05` and `slicePadAfterSeconds: 0.1`, so a standalone clip does not clip a consonant onset.
3. **`motion.introSeconds` is removed** (the intro card is now as long as its narration); `outroSeconds` stays only for an outro with no narration. *This departs from the spec's wording* ("the intro and outro cards fall back to `introSeconds` / `outroSeconds`" without a voiceover): a silent week now sizes every scene, intro and outro included, from the words of its line, which keeps one rule instead of two.
4. **The timeline logic is three focused modules**, not one: `narracion.mjs` (script format and alignment), `escenas.mjs` (cuts and scene lengths), `narracion-check.mjs` (validation).
5. **`validate.mjs` gains `--narracion`**: a designer validating only its own slug is not asked for a script it no longer writes. With no slugs the narration is always checked.
6. **Node reads `tokens.ts` directly** (type stripping, verified on v22.23.2), so `render.mjs` passes `brand.motion` into the pure planner instead of duplicating values. It prints one harmless `MODULE_TYPELESS_PACKAGE_JSON` warning; do not add `"type": "module"` to `video/package.json`.
7. **Silent estimate:** with no voiceover, section windows are estimated from word counts at `wordsPerSecond`, separated by `transitionSeconds`.

## File Structure

**Create**
- `scripts/core/narracion.mjs`: script format (`parseNarracion`, `buildNarration`), alignment to section windows (`sectionTimes`), silent estimate (`estimateTimes`).
- `scripts/core/escenas.mjs`: `cuts`, `sceneFrames`.
- `scripts/core/narracion-check.mjs`: `checkNarracion`, `LONGITUD_EVENTO`.
- `scripts/test/narracion.test.mjs`, `escenas.test.mjs`, `narracion-check.test.mjs`.
- `scripts/test/fixtures/alignment-ejemplo.json`: a real `with-timestamps` alignment (Task 1).

**Modify**
- `scripts/core/`: `church-info.mjs`, `normalize.mjs`, `spanish.mjs`, `guion.mjs`, `audit.mjs`, `tts.mjs`, `render-plan.mjs`, `stage-audio.mjs`.
- `scripts/`: `tts.mjs`, `validate.mjs`, `render.mjs`.
- `scripts/test/`: `church-info`, `normalize`, `spanish`, `guion`, `audit`, `tts`, `render-plan`, `stage-audio` tests; `fixtures/church-info.md`.
- `video/src/`: `types.ts`, `timing.ts`, `AdScene.tsx`, `EventAd.tsx`, `WeeklyReel.tsx`, `cards.tsx`, `sample.ts`, `brand/tokens.ts`.
- `church-info.md`, `church-info.example.md`.
- Docs: `.claude/skills/church-ads/script.md`, `.claude/skills/church-ads/SKILL.md`, `.claude/agents/ad-designer.md`, `CLAUDE.md`, `PLAN.md`, `README.md`.

---

### Task 1: Verify `with-timestamps` with the church's voice (gate)

This is the spec's first risk. Everything after it assumes the endpoint returns per-character timing for the exact text sent. If a gate check fails, **stop and report to the user**; the fallback (one take per section) needs its own plan.

**Files:**
- Create: `scripts/test/fixtures/alignment-ejemplo.json`
- Commit with it: this plan (`docs/superpowers/plans/`); the spec is already committed

**Interfaces:**
- Produces: `scripts/test/fixtures/alignment-ejemplo.json` shaped `{"text": string, "alignment": {"characters": string[], "character_start_times_seconds": number[], "character_end_times_seconds": number[]}}`. Tasks 4 and 8 read it.

- [ ] **Step 1: Confirm credentials exist without printing them**

```bash
cd /home/bryanjaramillo/decom-skills && grep -c -E "^(ELEVENLABS_API_KEY|ELEVEN_LABS_API_KEY|ELEVENLABS_VOICE_ID|ELEVEN_LABS_VOICE_ID)=" .env
```
Expected: `2` (one key, one voice id). If `0`, stop and ask the user.

- [ ] **Step 2: Write the throwaway probe outside the repo**

```bash
mkdir -p /tmp/narracion-spike && cat > /tmp/narracion-spike/spike.mjs <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
const R = '/home/bryanjaramillo/decom-skills';
const { loadEnv } = await import(`${R}/scripts/core/project.mjs`);
const { resolveCredentials } = await import(`${R}/scripts/core/tts.mjs`);
loadEnv();
const { apiKey, voiceId } = resolveCredentials(process.env);
if (!apiKey || !voiceId) throw new Error('missing credentials');
const voice = JSON.parse(readFileSync(`${R}/scripts/voice.json`, 'utf8'));
const text =
  'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre. ' +
  'El lunes es la oración virtual de jóvenes. ' +
  'El miércoles, el Refam juvenil, en el Salón Principal.';
const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${voice.output_format}`,
  {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: voice.model,
      voice_settings: {
        stability: voice.stability,
        similarity_boost: voice.similarity_boost,
        style: voice.style,
        use_speaker_boost: voice.use_speaker_boost,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  },
);
console.log('status', res.status, res.headers.get('content-type'));
const json = await res.json();
if (!res.ok) {
  console.log(JSON.stringify(json).slice(0, 300));
  process.exit(3);
}
console.log('response keys', Object.keys(json));
const a = json.alignment;
console.log('alignment keys', Object.keys(a));
console.log('text length', text.length, '| characters', a.characters.length, '| starts', a.character_start_times_seconds.length, '| ends', a.character_end_times_seconds.length);
console.log('characters rebuild the text exactly?', a.characters.join('') === text);
const monotone = a.character_start_times_seconds.every((t, i, v) => i === 0 || t >= v[i - 1]);
console.log('start times never go backwards?', monotone);
console.log('last end (s)', a.character_end_times_seconds.at(-1));
writeFileSync('/tmp/narracion-spike/spike.mp3', Buffer.from(json.audio_base64, 'base64'));
writeFileSync(
  `${R}/scripts/test/fixtures/alignment-ejemplo.json`,
  `${JSON.stringify({ text, alignment: { characters: a.characters, character_start_times_seconds: a.character_start_times_seconds, character_end_times_seconds: a.character_end_times_seconds } }, null, 2)}\n`,
);
EOF
echo written
```
Expected: `written`.

- [ ] **Step 3: Run the probe (spends about 200 characters of ElevenLabs quota; the spec pre-approves it)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && node /tmp/narracion-spike/spike.mjs
```
Expected, in this shape (the numbers vary):
```
status 200 application/json
response keys [ 'audio_base64', 'alignment', 'normalized_alignment' ]
alignment keys [ 'characters', 'character_start_times_seconds', 'character_end_times_seconds' ]
text length N | characters N | starts N | ends N
characters rebuild the text exactly? true
start times never go backwards? true
last end (s) 10.9
```

- [ ] **Step 4: Apply the gate**

All of these must hold, or **stop and report**:
1. Status 200 with a JSON body that has `audio_base64` and `alignment`.
2. `characters`, `starts` and `ends` all have the same length as the text.
3. `characters rebuild the text exactly? true` (accents and `ñ` survive; the design maps sections by character offset).
4. `start times never go backwards? true`.
5. The mp3 length agrees with the last end time to within 0.5 s:

```bash
D=/home/bryanjaramillo/decom-skills/video/node_modules/@remotion/compositor-linux-arm64-gnu
LD_LIBRARY_PATH=$D $D/ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/narracion-spike/spike.mp3
```
Expected: a number within 0.5 of `last end (s)`.

- [ ] **Step 5: Commit the fixture and this plan (the spec is already committed as `2692095`)**

```bash
cd /home/bryanjaramillo/decom-skills
git add docs/superpowers/plans scripts/test/fixtures/alignment-ejemplo.json
git commit -m "Add the weekly narration plan and a real with-timestamps alignment fixture" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `Despedida` in church-info.md

**Files:**
- Modify: `scripts/core/church-info.mjs`, `scripts/core/normalize.mjs`
- Modify: `church-info.md`, `church-info.example.md`, `scripts/test/fixtures/church-info.md`
- Test: `scripts/test/church-info.test.mjs`, `scripts/test/normalize.test.mjs`

**Interfaces:**
- Produces: `parseChurchInfo(text).despedida: string | null`; `doc.iglesia.despedida: string | null` in `events.json`. Tasks 6, 8 and 9 read `iglesia.despedida`.

- [ ] **Step 1: Write the failing tests**

In `scripts/test/church-info.test.mjs`:

1. In `MESSY`, after `'    Llamado a la accion: Te esperamos',` add the line `'    Despedida: Dios te bendiga',`.
2. In the test `reads the church facts from labelled lines`, after `assert.equal(info.llamadoAccion, 'Te esperamos');` add `assert.equal(info.despedida, 'Dios te bendiga');`.
3. In `anything the file does not say stays empty, never defaulted`, after `    llamadoAccion: null,` add `    despedida: null,`.
4. In `church-info.example.md documents every field and parses cleanly`, after the line `assert.ok(info.nombre && info.direccion && info.lugarPorDefecto && info.llamadoAccion);` add `assert.ok(info.despedida);`.

In `scripts/test/fixtures/church-info.md`, after `    Llamado a la accion: Te esperamos` add `    Despedida: Dios te bendiga`.

In `scripts/test/normalize.test.mjs`:
1. In `church facts are copied from church-info.md, not from the code`, after `    llamadoAccion: 'Te esperamos',` add `    despedida: 'Dios te bendiga',`.
2. In `with an empty church-info.md nothing about the church is invented`, change the expected object to `{ nombre: null, direccion: null, lugarPorDefecto: null, llamadoAccion: null, despedida: null }`.

- [ ] **Step 2: Run to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/church-info.test.mjs scripts/test/normalize.test.mjs 2>&1 | grep -E "^# (pass|fail)|not ok"
```
Expected: `# fail` above 0 (`despedida` is `undefined`; the example test fails because `church-info.example.md` has no such field yet).

- [ ] **Step 3: Implement**

In `scripts/core/church-info.mjs`, add to `CAMPOS` after the `'llamado a la accion'` entry:

```js
  despedida: 'despedida',
```
and in `parseChurchInfo`, in the initial `info` object after `llamadoAccion: null,`:

```js
    despedida: null,
```

In `scripts/core/normalize.mjs`, in the `iglesia` block, after `llamadoAccion: churchInfo.llamadoAccion,` add:

```js
      despedida: churchInfo.despedida,
```

- [ ] **Step 4: Document the field in the real and example files**

In `church-info.md`, after `    Llamado a la accion: Te esperamos` add `    Despedida: Dios te bendiga`.

In `church-info.example.md`:
- after the data line `    Llamado a la accion: Te esperamos` add `    Despedida: Dios te bendiga`;
- replace the comment line `  Llamado a la accion  The closing call to action every ad ends with.` with:

```
  Llamado a la accion  The church's closing call to action; said once, in the weekly outro.
  Despedida            Optional blessing said right after it (e.g. "Dios te bendiga").
                       Without it, the outro is the call to action alone.
```

- [ ] **Step 5: Run the whole suite**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# tests 116`, `# pass 116`, `# fail 0`.

- [ ] **Step 6: Commit**

`church-info.example.md` (and possibly `church-info.md`) may carry the user's own uncommitted edits, for example to the `Nombre` comment line. Check first, and stage only your hunks if theirs are there:

```bash
git diff --stat -- church-info.md church-info.example.md
# if either shows changes that are not yours:  git add -p church-info.example.md   (answer y only for the Despedida hunks)
```

```bash
git add scripts/core/church-info.mjs scripts/core/normalize.mjs church-info.md church-info.example.md scripts/test/church-info.test.mjs scripts/test/normalize.test.mjs scripts/test/fixtures/church-info.md
git commit -m "Read the church's Despedida from church-info.md" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Spoken week range (`semanaHablada`)

**Files:**
- Modify: `scripts/core/spanish.mjs` (append), `scripts/core/normalize.mjs`
- Test: `scripts/test/spanish.test.mjs`, `scripts/test/normalize.test.mjs`

**Interfaces:**
- Produces: `diaHablado(n: number): string` (1 -> `"primero"`, 21 -> `"veintiuno"`, 31 -> `"treinta y uno"`); `semanaHablada(inicio: string, fin: string): string` for ISO dates; `doc.semana.hablada: string` in `events.json`. Task 6 requires the intro to contain `semana.hablada` verbatim.

- [ ] **Step 1: Write the failing tests**

In `scripts/test/spanish.test.mjs`, add `diaHablado,` and `semanaHablada,` to the import list (before `} from '../core/spanish.mjs';`), then append:

```js
test('diaHablado speaks a day of the month, with "primero" for the 1st', () => {
  assert.equal(diaHablado(1), 'primero');
  assert.equal(diaHablado(2), 'dos');
  assert.equal(diaHablado(21), 'veintiuno');
  assert.equal(diaHablado(30), 'treinta');
  assert.equal(diaHablado(31), 'treinta y uno');
});

test('semanaHablada speaks the week range in words', () => {
  assert.equal(semanaHablada('2026-09-21', '2026-09-27'), 'del veintiuno al veintisiete de septiembre');
  assert.equal(semanaHablada('2026-03-02', '2026-03-08'), 'del dos al ocho de marzo');
  assert.equal(semanaHablada('2026-06-01', '2026-06-07'), 'del primero al siete de junio');
});

test('semanaHablada names both months when the week crosses one', () => {
  assert.equal(semanaHablada('2026-09-28', '2026-10-04'), 'del veintiocho de septiembre al cuatro de octubre');
  assert.equal(semanaHablada('2026-08-31', '2026-09-06'), 'del treinta y uno de agosto al seis de septiembre');
  assert.equal(semanaHablada('2026-10-26', '2026-11-01'), 'del veintiséis de octubre al primero de noviembre');
  assert.equal(semanaHablada('2026-12-28', '2027-01-03'), 'del veintiocho de diciembre al tres de enero');
});
```

In `scripts/test/normalize.test.mjs`, after `assert.equal(doc.semana.texto, 'Semana del 21 al 27 de septiembre');` add:

```js
  assert.equal(doc.semana.hablada, 'del veintiuno al veintisiete de septiembre');
```

- [ ] **Step 2: Run to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/spanish.test.mjs scripts/test/normalize.test.mjs 2>&1 | grep -E "^# (pass|fail)|SyntaxError|does not provide"
```
Expected: a failure naming the missing export `diaHablado` / `semanaHablada`.

- [ ] **Step 3: Implement**

Append to `scripts/core/spanish.mjs`:

```js
// ---- spoken dates --------------------------------------------------------

/** A day of the month as it is spoken: 1 -> "primero", 21 -> "veintiuno". */
export const diaHablado = (n) => (n === 1 ? 'primero' : numeroEnPalabras(n));

/** The week range as it is spoken: "del veintiuno al veintisiete de septiembre". */
export function semanaHablada(inicio, fin) {
  const a = partes(inicio);
  const b = partes(fin);
  return a.mes === b.mes
    ? `del ${diaHablado(a.dia)} al ${diaHablado(b.dia)} de ${a.mes}`
    : `del ${diaHablado(a.dia)} de ${a.mes} al ${diaHablado(b.dia)} de ${b.mes}`;
}
```

In `scripts/core/normalize.mjs`, add `semanaHablada,` to the import list from `./spanish.mjs` (between `rangoTexto,` and `semanaTexto,`) and change the `semana` line to:

```js
    semana: { inicio, fin, texto: semanaTexto(inicio, fin), hablada: semanaHablada(inicio, fin) },
```

- [ ] **Step 4: Run the whole suite**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# tests 119`, `# pass 119`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/core/spanish.mjs scripts/core/normalize.mjs scripts/test/spanish.test.mjs scripts/test/normalize.test.mjs
git commit -m "Speak the week range in words and record it as semana.hablada" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: The script format and the alignment (`narracion.mjs`)

**Files:**
- Create: `scripts/core/narracion.mjs`
- Test: `scripts/test/narracion.test.mjs`

**Interfaces:**
- Consumes: `scripts/test/fixtures/alignment-ejemplo.json` (Task 1).
- Produces (all pure, no I/O):
  - `JOINER: string` (`' '`), what joins two sections in the text sent to the voice.
  - `parseNarracion(md: string): {sections: Array<{id: string, text: string}>, problems: string[]}`
  - `buildNarration(sections): {text: string, spans: Array<{id: string, start: number, end: number}>}` (character offsets, `end` exclusive; empty sections skipped)
  - `sectionTimes(sections, alignment): Array<{id: string, startSec: number, endSec: number}>` where `alignment` is `{characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[]}`; throws if the alignment is not the alignment of these sections' text.
  - `estimateTimes(sections, {wordsPerSecond, pauseSeconds}): Array<{id, startSec, endSec}>`, the silent stand-in.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/narracion.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JOINER, buildNarration, estimateTimes, parseNarracion, sectionTimes } from '../core/narracion.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/alignment-ejemplo.json', import.meta.url));

const MD = [
  '# Semana 39',
  '<!-- borrador, no se dice -->',
  '## intro',
  'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos',
  'del veintiuno al veintisiete de septiembre.',
  '',
  '## oracion-virtual',
  'El lunes es la oración virtual de jóvenes.',
  '## outro',
  'Te esperamos, Dios te bendiga.',
].join('\n');

// Every character takes half a second, so the times below are exact binary fractions.
const alineacion = (text) => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i * 0.5),
  character_end_times_seconds: [...text].map((_, i) => (i + 1) * 0.5),
});

test('parseNarracion reads the sections in order and joins wrapped lines', () => {
  const { sections, problems } = parseNarracion(MD);
  assert.deepEqual(problems, []);
  assert.deepEqual(sections, [
    { id: 'intro', text: 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.' },
    { id: 'oracion-virtual', text: 'El lunes es la oración virtual de jóvenes.' },
    { id: 'outro', text: 'Te esperamos, Dios te bendiga.' },
  ]);
});

test('text before the first heading and a repeated section are reported', () => {
  const { sections, problems } = parseNarracion('Suelto.\n## a\nUno.\n## a\nDos.');
  assert.equal(problems.length, 2);
  assert.match(problems[0], /before the first/);
  assert.match(problems[1], /"a" appears more than once/);
  assert.deepEqual(sections.map((s) => s.text), ['Uno.', 'Dos.']);
});

test('a heading with extra words keeps them in the id, so the check can reject it', () => {
  assert.equal(parseNarracion('## intro extra\nHola.').sections[0].id, 'intro extra');
});

test('buildNarration joins the sections and records where each one sits', () => {
  const { text, spans } = buildNarration([{ id: 'a', text: 'Hola.' }, { id: 'b', text: 'Adiós.' }]);
  assert.equal(text, `Hola.${JOINER}Adiós.`);
  assert.deepEqual(spans, [
    { id: 'a', start: 0, end: 5 },
    { id: 'b', start: 5 + JOINER.length, end: 11 + JOINER.length },
  ]);
});

test('an empty section is skipped and leaves no gap', () => {
  const { text, spans } = buildNarration([{ id: 'a', text: 'Hola.' }, { id: 'b', text: '' }, { id: 'c', text: 'Fin.' }]);
  assert.equal(text, `Hola.${JOINER}Fin.`);
  assert.deepEqual(spans.map((s) => s.id), ['a', 'c']);
});

test('sectionTimes maps each section to its first and last spoken character', () => {
  const secciones = [{ id: 'a', text: 'Hola.' }, { id: 'b', text: 'Adiós.' }];
  const { text } = buildNarration(secciones);
  assert.deepEqual(sectionTimes(secciones, alineacion(text)), [
    { id: 'a', startSec: 0, endSec: 2.5 },
    { id: 'b', startSec: (5 + JOINER.length) * 0.5, endSec: (11 + JOINER.length) * 0.5 },
  ]);
});

test('sectionTimes works on a real ElevenLabs alignment, accents included', () => {
  const { text, alignment } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const secciones = [
    { id: 'intro', text: 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.' },
    { id: 'oracion-virtual', text: 'El lunes es la oración virtual de jóvenes.' },
    { id: 'refam-juvenil', text: 'El miércoles, el Refam juvenil, en el Salón Principal.' },
  ];
  assert.equal(buildNarration(secciones).text, text);
  const t = sectionTimes(secciones, alignment);
  assert.deepEqual(t.map((x) => x.id), ['intro', 'oracion-virtual', 'refam-juvenil']);
  for (const x of t) assert.ok(x.endSec > x.startSec, `${x.id} has a positive length`);
  assert.ok(t[0].endSec <= t[1].startSec && t[1].endSec <= t[2].startSec, 'sections do not overlap');
  assert.equal(t[0].startSec, alignment.character_start_times_seconds[0]);
  assert.equal(t[2].endSec, alignment.character_end_times_seconds.at(-1));
});

test('an alignment of some other text is rejected, not silently mis-timed', () => {
  const { alignment } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  assert.throws(() => sectionTimes([{ id: 'x', text: 'Otro texto.' }], alignment), /not the alignment of this script/);
});

test('estimateTimes sizes sections from their words when there is no voice yet', () => {
  const t = estimateTimes(
    [{ id: 'a', text: 'Uno dos tres cuatro.' }, { id: 'b', text: '' }, { id: 'c', text: 'Cinco seis.' }],
    { wordsPerSecond: 2, pauseSeconds: 0.5 },
  );
  assert.deepEqual(t, [
    { id: 'a', startSec: 0, endSec: 2 },
    { id: 'c', startSec: 2.5, endSec: 3.5 },
  ]);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/narracion.test.mjs 2>&1 | grep -E "^# (pass|fail)|Cannot find|ERR_MODULE"
```
Expected: `ERR_MODULE_NOT_FOUND` for `narracion.mjs`.

- [ ] **Step 3: Implement**

Create `scripts/core/narracion.mjs`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/narracion.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# tests 9`, `# pass 9`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/core/narracion.mjs scripts/test/narracion.test.mjs
git commit -m "Parse the weekly script and map the voice's timing onto its sections" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Scene cuts and lengths (`escenas.mjs`)

**Files:**
- Create: `scripts/core/escenas.mjs`
- Test: `scripts/test/escenas.test.mjs`

**Interfaces:**
- Consumes: speech windows `{startSec: number|null, endSec: number|null}` in reel order (from `sectionTimes` or `estimateTimes`; `null` means the scene has no narration).
- Produces:
  - `cuts(scenes, {leadSec, tailSec, silentSec}): number[]`, the reel-time second at which each scene ends; the last entry is the end of the reel.
  - `sceneFrames(cutFrames: number[], transition: number): number[]`, the `durationInFrames` of each `TransitionSeries.Sequence` so the overlaps straddle the cuts. `cutFrames` must be integers, strictly increasing. Reel length is `sum(frames) - (frames.length - 1) * transition`, which equals the last cut.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/escenas.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { cuts, sceneFrames } from '../core/escenas.mjs';

const O = { leadSec: 0.5, tailSec: 1, silentSec: 4 };

test('the hand-over between two narrated scenes is the middle of the pause between them', () => {
  assert.deepEqual(cuts([{ startSec: 0, endSec: 4 }, { startSec: 5, endSec: 9 }], O), [5, 10.5]);
});

test('the voice starts after the lead-in and the reel ends a tail after the last word', () => {
  assert.deepEqual(cuts([{ startSec: 0, endSec: 3 }], O), [4.5]);
});

test('a last scene with no narration lasts silentSec after the scene before it', () => {
  const c = cuts([{ startSec: 0, endSec: 4 }, { startSec: 5, endSec: 9 }, { startSec: null, endSec: null }], O);
  assert.deepEqual(c, [5, 10.5, 14.5]);
});

test('scenes overlap by one transition and the reel ends on the last cut', () => {
  const tf = 15;
  const frames = sceneFrames([150, 300, 450], tf);
  assert.deepEqual(frames, [158, 165, 157]);
  assert.equal(frames.reduce((a, b) => a + b, 0) - (frames.length - 1) * tf, 450);
});

test('every transition is centred on its cut, for odd and even transition lengths', () => {
  for (const tf of [14, 15]) {
    const cutFrames = [97, 210, 333, 420];
    const frames = sceneFrames(cutFrames, tf);
    let siguiente = 0; // where the next scene starts in reel time: previous start + length - tf
    const empieza = frames.map((d) => {
      const s = siguiente;
      siguiente = s + d - tf;
      return s;
    });
    for (let i = 0; i < cutFrames.length - 1; i++) {
      const medio = empieza[i + 1] + tf / 2;
      assert.ok(Math.abs(medio - cutFrames[i]) <= 0.5, `tf ${tf}, cut ${i}: transition centre ${medio} vs cut ${cutFrames[i]}`);
    }
    assert.equal(siguiente + tf, cutFrames.at(-1), `tf ${tf}: the reel ends on the last cut`);
  }
});

test('cuts that do not move forward are rejected', () => {
  assert.throws(() => sceneFrames([100, 100, 300], 15), /not after the previous cut/);
  assert.throws(() => sceneFrames([100, 90, 300], 15), /not after the previous cut/);
});

test('a scene too short to hold its own transitions is rejected', () => {
  // scene 1 lasts (20 + 8) - (10 - 7) = 25 frames but needs 2 * 15
  assert.throws(() => sceneFrames([10, 20, 100], 15), /too short/);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/escenas.test.mjs 2>&1 | grep -E "^# (pass|fail)|ERR_MODULE"
```
Expected: `ERR_MODULE_NOT_FOUND` for `escenas.mjs`.

- [ ] **Step 3: Implement**

Create `scripts/core/escenas.mjs`:

```js
// Turns speech windows into the reel's scenes: where the picture hands over from one
// section to the next, and how long each TransitionSeries.Sequence must be so the
// overlaps land on those hand-overs. Pure functions, no I/O.

/**
 * Reel-time seconds at which each scene ends; the last entry is the end of the reel.
 * A scene is one section: [intro, ...events, outro]. The hand-over between two narrated
 * scenes is the midpoint of the pause between their speech, so the cut lands in a
 * breath. The voice starts leadSec into the reel and the reel ends tailSec after the
 * last word. A scene with null times has no narration (an outro when the church has no
 * closing words): it lasts silentSec. Only a last scene may be un-narrated.
 * @param {Array<{startSec: number|null, endSec: number|null}>} scenes in reel order
 * @param {{leadSec: number, tailSec: number, silentSec: number}} o
 * @returns {number[]}
 */
export function cuts(scenes, { leadSec, tailSec, silentSec }) {
  const fines = [];
  scenes.forEach((escena, i) => {
    const siguiente = scenes[i + 1];
    if (escena.endSec === null) fines.push((fines[i - 1] ?? 0) + silentSec);
    else if (typeof siguiente?.startSec === 'number') fines.push(leadSec + (escena.endSec + siguiente.startSec) / 2);
    else fines.push(leadSec + escena.endSec + tailSec);
  });
  return fines;
}

/**
 * Length in frames of each TransitionSeries.Sequence so that the overlaps straddle the
 * cuts: scene i+1 starts exactly `transition` frames before scene i ends, and the reel
 * ends on the last cut.
 * @param {number[]} cutFrames integer frame of each cut (see cuts), strictly increasing
 * @param {number} transition transition length in frames
 * @returns {number[]}
 */
export function sceneFrames(cutFrames, transition) {
  const antes = Math.floor(transition / 2);
  const despues = transition - antes;
  const ultima = cutFrames.length - 1;
  return cutFrames.map((corte, i) => {
    if (i > 0 && corte <= cutFrames[i - 1]) {
      throw new Error(`scene ${i} would end at frame ${corte}, not after the previous cut at frame ${cutFrames[i - 1]}`);
    }
    const inicio = i === 0 ? 0 : cutFrames[i - 1] - antes;
    const fin = i === ultima ? corte : corte + despues;
    const minimo = (i > 0 ? transition : 0) + (i < ultima ? transition : 0);
    if (fin - inicio < minimo) {
      throw new Error(`scene ${i} is too short (${fin - inicio} frames) to hold its transitions (needs ${minimo})`);
    }
    return fin - inicio;
  });
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/escenas.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# tests 7`, `# pass 7`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/core/escenas.mjs scripts/test/escenas.test.mjs
git commit -m "Compute scene cuts and TransitionSeries lengths from the speech windows" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Validate the weekly script

**Files:**
- Create: `scripts/core/narracion-check.mjs`
- Modify: `scripts/core/guion.mjs` (length range option), `scripts/core/audit.mjs` (reserved slugs), `scripts/validate.mjs` (rewrite)
- Test: `scripts/test/narracion-check.test.mjs`, `scripts/test/guion.test.mjs`, `scripts/test/audit.test.mjs`

**Interfaces:**
- Consumes: `parseNarracion` (Task 4); `doc.semana.hablada` (Task 3); `doc.iglesia.despedida` (Task 2); `checkGuion` from `guion.mjs`.
- Produces:
  - `checkGuion(texto, evento, iglesia = {}, {longitud = LONGITUD} = {})`: the new fourth argument overrides the word range `{min, max}`; existing callers are unchanged.
  - `checkNarracion({sections, problems}, doc): {errores: Array<{regla, slug?, mensaje}>, avisos: Array<{regla, slug?, mensaje}>}` (the argument is what `parseNarracion` returns).
  - `LONGITUD_EVENTO = {min: 6, max: 30}`.
  - Rules. Errors: `guion-estructura`, `seccion-desconocida`, `seccion-faltante`, `seccion-orden`, `intro-cifras`, `semana-sin-hablada`, `intro-sin-semana`, `intro-sin-iglesia`, `registro-usted`, `outro-distinto`, `outro-sin-respaldo`, plus every `checkGuion` error attributed to the event's `slug`. Notices: `cta-fuera-del-cierre`, `apertura-repetida`, plus `checkGuion` notices (`longitud`, `sin-periodo`) per event, never `sin-cta`.
  - `auditEvents` gains error `slug-reservado` for a slug of `intro` or `outro`.
  - `node scripts/validate.mjs <week> [slug ...] [--narracion]`: components for the given slugs (all if none); the narration and `voz.mp3` only when no slugs are given or `--narracion` is passed.

- [ ] **Step 1: Write the failing tests for `checkGuion`'s range and for reserved slugs**

Append to `scripts/test/guion.test.mjs`:

```js
test('a caller can set the length range, e.g. for a line with no closing', () => {
  const corto = 'El sábado, Culto de jóvenes, en el Salón Principal.';
  assert.deepEqual(avisos(corto, conHora, {}), ['longitud']);
  assert.deepEqual(checkGuion(corto, conHora, {}, { longitud: { min: 6, max: 30 } }).avisos, []);
});
```

Append to `scripts/test/audit.test.mjs`:

```js
test('a slug that collides with a section of the weekly script is an error', () => {
  for (const slug of ['intro', 'outro']) {
    assert.ok(reglas(auditEvents(doc(ev({ slug })))).includes('slug-reservado'), slug);
  }
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/guion.test.mjs scripts/test/audit.test.mjs 2>&1 | grep -E "^# (pass|fail)"
```
Expected: `# fail 2`.

- [ ] **Step 3: Implement both**

In `scripts/core/guion.mjs`, change the signature and the length check:

```js
export function checkGuion(texto, evento, iglesia = {}, { longitud = LONGITUD } = {}) {
```
and replace

```js
  if (palabras < LONGITUD.min || palabras > LONGITUD.max) {
    aviso('longitud', `${palabras} words; aim for about 20-25`);
  }
```
with

```js
  if (palabras < longitud.min || palabras > longitud.max) {
    aviso('longitud', `${palabras} words; aim for ${longitud.min}-${longitud.max}`);
  }
```
Also add `@param {{longitud?: {min: number, max: number}}} [opciones] word range override` under the existing `@param` lines of the JSDoc.

In `scripts/core/audit.mjs`, after `export const PLANTILLAS = ...` add:

```js
/** Slugs that would collide with the intro and outro sections of the weekly script. */
export const SLUGS_RESERVADOS = ['intro', 'outro'];
```
and, inside the loop right after the `slug-formato` check, add:

```js
    if (SLUGS_RESERVADOS.includes(e.slug)) {
      error('slug-reservado', e, `slug "${e.slug}" is reserved for a section of the weekly script`);
    }
```

- [ ] **Step 4: Run to verify they pass**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/guion.test.mjs scripts/test/audit.test.mjs 2>&1 | grep -E "^# (pass|fail)"
```
Expected: `# fail 0`.

- [ ] **Step 5: Write the failing tests for `checkNarracion`**

Create `scripts/test/narracion-check.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNarracion } from '../core/narracion.mjs';
import { checkNarracion } from '../core/narracion-check.mjs';

const IGLESIA = {
  nombre: 'Iglesia Ejemplo',
  direccion: null,
  lugarPorDefecto: 'Salón Principal',
  llamadoAccion: 'Te esperamos',
  despedida: 'Dios te bendiga',
};
const EVENTOS = [
  { slug: 'oracion-virtual', titulo: 'Oración virtual', diaSemana: 'lunes', fechaTexto: 'lunes 21 de septiembre', hora: null, horaTexto: null, horaHablada: null, lugar: 'Zoom', modalidad: 'virtual' },
  { slug: 'culto-jovenes', titulo: 'Culto de jóvenes', diaSemana: 'miércoles', fechaTexto: 'miércoles 23 de septiembre', hora: '18:45', horaTexto: '6:45 p. m.', horaHablada: 'a las seis y cuarenta y cinco de la tarde', lugar: 'Salón Principal', modalidad: 'presencial' },
  { slug: 'retiro-familias', titulo: 'Retiro de familias', diaSemana: 'viernes', fechaTexto: 'viernes 25 de septiembre', hora: null, horaTexto: null, horaHablada: null, lugar: 'Salón Principal', modalidad: 'presencial' },
];
const DOC = { semana: { hablada: 'del veintiuno al veintisiete de septiembre' }, iglesia: IGLESIA, events: EVENTOS };
const UNO = { ...DOC, events: [EVENTOS[0]] };

const INTRO = 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.';
const OUTRO = 'Te esperamos, Dios te bendiga.';
const ORACION = 'El lunes es la oración virtual, por Zoom.';
const CULTO = 'Después, el miércoles, el culto de jóvenes a las seis y cuarenta y cinco de la tarde, en el Salón Principal.';
const RETIRO = 'Y el viernes, el retiro de familias, también en el Salón Principal.';

const md = (...lineas) => lineas.join('\n');
const BUENO = md('## intro', INTRO, '## oracion-virtual', ORACION, '## culto-jovenes', CULTO, '## retiro-familias', RETIRO, '## outro', OUTRO);
const BUENO_UNO = md('## intro', INTRO, '## oracion-virtual', ORACION, '## outro', OUTRO);

const run = (texto, doc = DOC) => checkNarracion(parseNarracion(texto), doc);
const reglas = (r) => r.errores.map((e) => e.regla);
const avisos = (r) => r.avisos.map((e) => e.regla);

test('a faithful week passes with no errors and no notices', () => {
  assert.deepEqual(run(BUENO), { errores: [], avisos: [] });
  assert.deepEqual(run(BUENO_UNO, UNO), { errores: [], avisos: [] });
});

test('an event with no section is an error attributed to it', () => {
  const r = run(md('## intro', INTRO, '## oracion-virtual', ORACION, '## culto-jovenes', CULTO, '## outro', OUTRO));
  assert.deepEqual(r.errores.map((e) => [e.regla, e.slug]), [['seccion-faltante', 'retiro-familias']]);
});

test('sections out of order are an error', () => {
  const r = run(md('## oracion-virtual', ORACION, '## intro', INTRO, '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), ['seccion-orden']);
});

test('a section that is neither intro, outro nor an event slug is an error', () => {
  const r = run(md('## intro', INTRO, '## oracion-virtual', ORACION, '## bonus', 'Hola.', '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), ['seccion-desconocida']);
});

test('the intro must say the week exactly as events.json speaks it', () => {
  const r = run(md('## intro', 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos.', '## oracion-virtual', ORACION, '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), ['intro-sin-semana']);
});

test('the intro speaks dates as words, not digits', () => {
  const r = run(md('## intro', 'Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del 21 al 27 de septiembre.', '## oracion-virtual', ORACION, '## outro', OUTRO), UNO);
  assert.ok(reglas(r).includes('intro-cifras'));
});

test('the intro names the church when church-info.md has a name', () => {
  const r = run(md('## intro', 'Bienvenidos, estos son nuestros eventos del veintiuno al veintisiete de septiembre.', '## oracion-virtual', ORACION, '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), ['intro-sin-iglesia']);
});

test('an events.json from before semana.hablada asks for a new normalize run', () => {
  const r = run(BUENO_UNO, { ...UNO, semana: {} });
  assert.deepEqual(reglas(r), ['semana-sin-hablada']);
});

test('the outro is the call to action and the blessing exactly, in that order', () => {
  const sin = (outro) => md('## intro', INTRO, '## oracion-virtual', ORACION, '## outro', outro);
  assert.deepEqual(reglas(run(sin('Te esperamos.'), UNO)), ['outro-distinto']);
  assert.deepEqual(reglas(run(sin('Dios te bendiga, te esperamos.'), UNO)), ['outro-distinto']);
  assert.deepEqual(reglas(run(sin('Te esperamos, dios te bendiga'), UNO)), []); // case and punctuation do not matter
});

test('a church that gives closing words must have an outro', () => {
  const r = run(md('## intro', INTRO, '## oracion-virtual', ORACION), UNO);
  assert.deepEqual(reglas(r), ['seccion-faltante']);
  assert.match(r.errores[0].mensaje, /outro/);
});

test('the outro says only what church-info.md gives, and may be absent when it gives nothing', () => {
  const nada = { ...UNO, iglesia: { ...IGLESIA, llamadoAccion: null, despedida: null } };
  assert.deepEqual(reglas(run(BUENO_UNO, nada)), ['outro-sin-respaldo']);
  assert.deepEqual(reglas(run(md('## intro', INTRO, '## oracion-virtual', ORACION), nada)), []);
  const solo = { ...UNO, iglesia: { ...IGLESIA, despedida: null } };
  assert.deepEqual(reglas(run(md('## intro', INTRO, '## oracion-virtual', ORACION, '## outro', 'Te esperamos.'), solo)), []);
});

test('the call to action or blessing inside an event line is a notice', () => {
  const r = run(md('## intro', INTRO, '## oracion-virtual', 'El lunes te esperamos en la oración virtual, por Zoom.', '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), []);
  assert.deepEqual(r.avisos.map((a) => [a.regla, a.slug]), [['cta-fuera-del-cierre', 'oracion-virtual']]);
});

test('two neighbouring events opening with the same words is a notice on the second', () => {
  const culto = 'Te invitamos al culto de jóvenes, el miércoles a las seis y cuarenta y cinco de la tarde, en el Salón Principal.';
  const retiro = 'Te invitamos al retiro de familias, el viernes, en el Salón Principal.';
  const r = run(md('## intro', INTRO, '## oracion-virtual', ORACION, '## culto-jovenes', culto, '## retiro-familias', retiro, '## outro', OUTRO));
  assert.deepEqual(reglas(r), []);
  assert.deepEqual(r.avisos.map((a) => [a.regla, a.slug]), [['apertura-repetida', 'retiro-familias']]);
});

test('the facts of an event line are still held to the record', () => {
  const mal = 'Después, el miércoles, el culto de jóvenes a las siete de la noche, en el Salón Principal.';
  const r = run(md('## intro', INTRO, '## oracion-virtual', ORACION, '## culto-jovenes', mal, '## retiro-familias', RETIRO, '## outro', OUTRO));
  assert.deepEqual(r.errores.map((e) => [e.regla, e.slug]), [['hora-distinta', 'culto-jovenes']]);
  assert.ok(!avisos(r).includes('sin-cta'));
});

test('structure problems found while reading the file are errors', () => {
  assert.ok(reglas(run(md('Suelto.', BUENO))).includes('guion-estructura'));
});

test('an event line far shorter than a spoken sentence is a notice', () => {
  const r = run(md('## intro', INTRO, '## oracion-virtual', 'Lunes, oración virtual.', '## outro', OUTRO), UNO);
  assert.deepEqual(reglas(r), []);
  assert.deepEqual(avisos(r), ['longitud']);
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/narracion-check.test.mjs 2>&1 | grep -E "^# (pass|fail)|ERR_MODULE"
```
Expected: `ERR_MODULE_NOT_FOUND` for `narracion-check.mjs`.

- [ ] **Step 7: Implement `checkNarracion`**

Create `scripts/core/narracion-check.mjs`:

```js
// Checks the weekly script (out/<week>/guion.md) against events.json. Errors block the
// run; notices are reported. Each event line is held to the same facts rules as a
// standalone script was (checkGuion); what is new is the structure of the whole and
// the intro and outro, which say only what events.json and church-info.md give.
// It is a heuristic net, not proof: the orchestrator still reads the whole script.

import { checkGuion } from './guion.mjs';
import { stripAccents } from './spanish.mjs';

/** A line about one event has no greeting and no closing, so it is shorter than a standalone ad. */
export const LONGITUD_EVENTO = { min: 6, max: 30 };

/** Lowercase, no accents, no punctuation, single spaces: for comparing what is said. */
const plano = (s) =>
  stripAccents(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * @param {{sections: Array<{id: string, text: string}>, problems: string[]}} narracion what parseNarracion returns
 * @param {object} doc events.json
 * @returns {{errores: Array<{regla: string, slug?: string, mensaje: string}>, avisos: Array<{regla: string, slug?: string, mensaje: string}>}}
 */
export function checkNarracion({ sections, problems = [] }, doc) {
  const errores = [];
  const avisos = [];
  const error = (regla, mensaje, slug) => errores.push({ regla, slug, mensaje });
  const aviso = (regla, mensaje, slug) => avisos.push({ regla, slug, mensaje });

  const { iglesia, semana } = doc;
  const eventos = doc.events ?? [];
  for (const p of problems) error('guion-estructura', p);

  // Structure: intro, one section per event in events.json order, and an outro when the church gives closing words.
  const cierre = [iglesia.llamadoAccion, iglesia.despedida].filter(Boolean);
  const conocidos = ['intro', ...eventos.map((e) => e.slug), 'outro'];
  const esperados = conocidos.filter((id) => id !== 'outro' || cierre.length > 0);
  const porId = new Map(sections.map((s) => [s.id, s]));

  for (const s of sections) {
    if (!conocidos.includes(s.id)) error('seccion-desconocida', `"## ${s.id}" is neither intro, outro nor the slug of an event in events.json`);
  }
  for (const id of esperados) {
    if (!porId.get(id)?.text) {
      error('seccion-faltante', `guion.md has no text under "## ${id}"`, id === 'intro' || id === 'outro' ? undefined : id);
    }
  }
  const presentes = sections.filter((s) => s.text && conocidos.includes(s.id)).map((s) => s.id);
  const enOrden = conocidos.filter((id) => presentes.includes(id));
  if (presentes.join() !== enOrden.join()) {
    error('seccion-orden', `sections must follow intro, the events in events.json order, outro; found: ${presentes.join(', ')}`);
  }

  // Intro: welcomes, names the church, says the week exactly as events.json speaks it.
  const intro = porId.get('intro')?.text;
  if (intro) {
    const t = plano(intro);
    if (/\d/.test(intro)) error('intro-cifras', 'the intro must speak dates as words, not digits');
    if (!semana?.hablada) error('semana-sin-hablada', 'events.json has no semana.hablada: run scripts/normalize.mjs again');
    else if (!t.includes(plano(semana.hablada))) error('intro-sin-semana', `the intro must say the week exactly as "${semana.hablada}"`);
    if (iglesia.nombre && !t.includes(plano(iglesia.nombre))) error('intro-sin-iglesia', `the intro must name the church, "${iglesia.nombre}"`);
    if (/\busted(?:es)?\b/.test(t)) error('registro-usted', 'formal register; write for tú');
  }

  // Outro: the church's own call to action and blessing, nothing else.
  const outro = porId.get('outro')?.text;
  if (outro) {
    if (!cierre.length) error('outro-sin-respaldo', 'church-info.md gives no closing words, so there is no outro line');
    else if (plano(outro) !== plano(cierre.join(' '))) error('outro-distinto', `the outro must be exactly "${cierre.join(', ')}"`);
  }

  // Event lines: the facts rules, without a required closing.
  const sinCierre = { ...iglesia, llamadoAccion: null };
  let anterior = null;
  for (const e of eventos) {
    const texto = porId.get(e.slug)?.text;
    if (!texto) continue;
    const r = checkGuion(texto, e, sinCierre, { longitud: LONGITUD_EVENTO });
    for (const x of r.errores) error(x.regla, x.mensaje, e.slug);
    for (const x of r.avisos) aviso(x.regla, x.mensaje, e.slug);

    const t = plano(texto);
    for (const frase of cierre) {
      if (t.includes(plano(frase))) aviso('cta-fuera-del-cierre', `"${frase}" belongs in the outro, not in an event line`, e.slug);
    }
    const apertura = t.split(' ').slice(0, 2).join(' ');
    if (apertura === anterior) aviso('apertura-repetida', `opens with "${apertura}", like the event before it`, e.slug);
    anterior = apertura;
  }

  return { errores, avisos };
}
```

- [ ] **Step 8: Run to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/narracion-check.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)|^not ok"
```
Expected: `# tests 16`, `# pass 16`, `# fail 0`. If a test fails because `checkGuion` reports something the test did not expect (for example a `longitud` notice on a line), fix the test line's wording, not the rule; the lines above were counted at 8, 21 and 12 words.

- [ ] **Step 9: Rewrite `scripts/validate.mjs`**

Replace the whole file with:

```js
#!/usr/bin/env node
// Checks a week's deliveries against events.json, the step that catches a script or
// component stating something the record does not support.
//
//   node scripts/validate.mjs <week> [slug ...] [--narracion]
//
// Per event: video/src/ads/<slug>.tsx exists and obeys the source rules. With no
// slugs, or with --narracion: the week's script (out/<week>/guion.md) is faithful to
// the record and voz.mp3 is present (absent is a notice: the video is then silent).
// A designer validating only its own slug is not asked for a script it does not write.
// Exit 2 if anything is an error.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs, printIssues, weekDir } from './core/project.mjs';
import { auditEvents } from './core/audit.mjs';
import { checkAdSource } from './core/ad-source.mjs';
import { parseNarracion } from './core/narracion.mjs';
import { checkNarracion } from './core/narracion-check.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2), { booleans: ['narracion'] });
const [week, ...slugs] = positional;
if (!week) {
  console.error('usage: node scripts/validate.mjs <week> [slug ...] [--narracion]');
  process.exit(1);
}
const eventsPath = join(weekDir(week), 'events.json');
if (!existsSync(eventsPath)) {
  console.error(`${eventsPath} not found. Run scripts/normalize.mjs first.`);
  process.exit(1);
}
const doc = JSON.parse(readFileSync(eventsPath, 'utf8'));

const todos = { errores: [], avisos: [] };
const juntar = (r, slug) => {
  for (const e of r.errores) todos.errores.push({ slug, ...e });
  for (const a of r.avisos) todos.avisos.push({ slug, ...a });
};

juntar(auditEvents(doc), undefined);

const seleccion = slugs.length ? slugs : doc.events.map((e) => e.slug);
for (const slug of seleccion) {
  const evento = doc.events.find((e) => e.slug === slug);
  if (!evento) {
    todos.errores.push({ regla: 'slug-desconocido', slug, mensaje: `no event with slug "${slug}" in events.json` });
    continue;
  }
  const ad = join(ROOT, 'video', 'src', 'ads', `${slug}.tsx`);
  if (existsSync(ad)) juntar(checkAdSource(readFileSync(ad, 'utf8')), slug);
  else todos.errores.push({ regla: 'sin-componente', slug, mensaje: `missing ${ad}` });
}

if (!slugs.length || flags.narracion) {
  const guion = join(weekDir(week), 'guion.md');
  if (existsSync(guion)) juntar(checkNarracion(parseNarracion(readFileSync(guion, 'utf8')), doc), undefined);
  else todos.errores.push({ regla: 'sin-guion', mensaje: `missing ${guion}` });

  if (!existsSync(join(weekDir(week), 'voz.mp3'))) {
    todos.avisos.push({ regla: 'sin-audio', mensaje: 'no voz.mp3: the weekly video will be silent' });
  }
}

printIssues(todos);
console.log(`${seleccion.length} event(s) checked: ${todos.errores.length} error(s), ${todos.avisos.length} notice(s).`);
process.exit(todos.errores.length ? 2 : 0);
```

- [ ] **Step 10: Check the CLI against the existing W39 output**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills
node scripts/validate.mjs 2026-W39 charla-familias; echo "exit=$?"
node scripts/validate.mjs 2026-W39 --narracion; echo "exit=$?"
```
Expected, first command: `1 event(s) checked: 0 error(s), 3 notice(s).` and `exit=0` (the three notices are the week's `sin-hora`, since none of W39's events has a time; component only, no script asked for). Second: `ERROR [sin-guion] missing .../out/2026-W39/guion.md`, the three `sin-hora` notices plus `[sin-audio]`, `3 event(s) checked: 1 error(s), 4 notice(s).` and `exit=2` (W39 has no weekly `guion.md` yet; Task 10 writes it).

- [ ] **Step 11: Run the whole suite and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# fail 0` (`# tests 153`: 119 + 9 + 7 + 16 + 2).

```bash
git add scripts/core/narracion-check.mjs scripts/core/guion.mjs scripts/core/audit.mjs scripts/validate.mjs scripts/test/narracion-check.test.mjs scripts/test/guion.test.mjs scripts/test/audit.test.mjs
git commit -m "Validate the weekly script: structure, intro, outro and each event line" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: One voice take for the whole week

**Files:**
- Modify: `scripts/core/tts.mjs`, `scripts/tts.mjs` (rewrite)
- Test: `scripts/test/tts.test.mjs`

**Interfaces:**
- Consumes: `parseNarracion`, `buildNarration` (Task 4); `validate.mjs --narracion` (Task 6).
- Produces:
  - `buildRequest({text, voice, voiceId, apiKey})` now targets `/v1/text-to-speech/{voiceId}/with-timestamps?output_format=...` with `accept: application/json`; `cacheKey` and `resolveCredentials` are unchanged.
  - `parseTimestampResponse(json): {audio: Buffer, alignment: {characters, character_start_times_seconds, character_end_times_seconds}}`; throws `Error('the response has no audio_base64')` or `Error('the response has no per-character alignment')`.
  - CLI `node scripts/tts.mjs [--week 2026-W39] [--force]` writes `out/<week>/voz.mp3`, `voz.json` (`{week, model, voiceId, characters, cacheKey}`) and `voz.alineacion.json` (the alignment object). Exit 0 ready, 1 usage or setup, 2 the script has errors, 3 the service could not be reached or refused.

- [ ] **Step 1: Write the failing tests**

In `scripts/test/tts.test.mjs`:
1. Change the import to `import { buildRequest, cacheKey, parseTimestampResponse, resolveCredentials } from '../core/tts.mjs';`.
2. In the first test, replace the URL assertion with:

```js
  assert.equal(r.url, 'https://api.elevenlabs.io/v1/text-to-speech/VOZ123/with-timestamps?output_format=mp3_44100_128');
```
and after the `xi-api-key` assertion add `assert.equal(r.init.headers.accept, 'application/json');`.
3. Append:

```js
const ALINEACION = {
  characters: ['H', 'o', 'l', 'a'],
  character_start_times_seconds: [0, 0.1, 0.2, 0.3],
  character_end_times_seconds: [0.1, 0.2, 0.3, 0.4],
};

test('parseTimestampResponse returns the decoded audio and the alignment', () => {
  const r = parseTimestampResponse({
    audio_base64: Buffer.from('audio').toString('base64'),
    alignment: ALINEACION,
    normalized_alignment: { characters: ['x'] },
  });
  assert.equal(r.audio.toString(), 'audio');
  assert.deepEqual(r.alignment, ALINEACION);
});

test('a response without audio or without a matching alignment is rejected', () => {
  assert.throws(() => parseTimestampResponse({ alignment: ALINEACION }), /no audio_base64/);
  assert.throws(() => parseTimestampResponse({ audio_base64: 'AA==' }), /no per-character alignment/);
  assert.throws(
    () => parseTimestampResponse({ audio_base64: 'AA==', alignment: { ...ALINEACION, character_end_times_seconds: [0.1] } }),
    /no per-character alignment/,
  );
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/tts.test.mjs 2>&1 | grep -E "^# (pass|fail)|does not provide"
```
Expected: a failure about the missing export `parseTimestampResponse`.

- [ ] **Step 3: Implement `core/tts.mjs`**

In `scripts/core/tts.mjs`, replace `buildRequest` and add `parseTimestampResponse` (leave `cacheKey` and `resolveCredentials` as they are):

```js
/** The request to send: one take of the whole script, with per-character timing. The key goes in a header, never in the URL or body. */
export function buildRequest({ text, voice, voiceId, apiKey }) {
  return {
    url: `${API}/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${voice.output_format}`,
    init: {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        text,
        model_id: voice.model,
        voice_settings: {
          stability: voice.stability,
          similarity_boost: voice.similarity_boost,
          style: voice.style,
          use_speaker_boost: voice.use_speaker_boost,
        },
      }),
    },
  };
}

/** The audio and the per-character alignment out of a with-timestamps response body. */
export function parseTimestampResponse(json) {
  if (typeof json?.audio_base64 !== 'string') throw new Error('the response has no audio_base64');
  const a = json.alignment;
  const ok =
    Array.isArray(a?.characters) &&
    a.character_start_times_seconds?.length === a.characters.length &&
    a.character_end_times_seconds?.length === a.characters.length;
  if (!ok) throw new Error('the response has no per-character alignment');
  return {
    audio: Buffer.from(json.audio_base64, 'base64'),
    alignment: {
      characters: a.characters,
      character_start_times_seconds: a.character_start_times_seconds,
      character_end_times_seconds: a.character_end_times_seconds,
    },
  };
}
```
Also update the file's header comment to say it voices the whole week in one request.

- [ ] **Step 4: Rewrite the CLI**

Replace `scripts/tts.mjs` with:

```js
#!/usr/bin/env node
// Generates the week's voiceover in one take: out/<week>/guion.md -> voz.mp3
// (+ voz.json, voz.alineacion.json).
//
//   node scripts/tts.mjs [--week 2026-W39] [--force]
//
// The whole script goes in one request so the voice reads it as one piece; the response
// carries per-character timing, which render.mjs turns into scene cuts. It refuses to
// bill while validate.mjs reports errors. Unchanged text and settings reuse the existing
// files instead of calling the API again. Model and voice settings are in
// scripts/voice.json; the API key and voice ID come from the environment or .env.
//
// Exit 0: audio ready. Exit 1: usage or configuration problem. Exit 2: the script has
// errors. Exit 3: the service could not be reached or refused; the week is then
// rendered silent and reported, it does not fail.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadEnv, parseArgs, weekDir } from './core/project.mjs';
import { buildNarration, parseNarracion } from './core/narracion.mjs';
import { buildRequest, cacheKey, parseTimestampResponse, resolveCredentials } from './core/tts.mjs';

loadEnv();
const { flags } = parseArgs(process.argv.slice(2), { booleans: ['force'] });

const semanas = existsSync(join(ROOT, 'out')) ? readdirSync(join(ROOT, 'out')).sort().reverse() : [];
const week = flags.week || semanas.find((w) => existsSync(join(weekDir(w), 'guion.md')));
const guionPath = week && join(weekDir(week), 'guion.md');
if (!guionPath || !existsSync(guionPath)) {
  console.error(`No guion.md${flags.week ? ` in ${flags.week}` : ''}. Expected out/<week>/guion.md.`);
  process.exit(1);
}

// Never pay for a script that has errors.
const validacion = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate.mjs'), week, '--narracion'], { stdio: 'inherit' });
if (validacion.status !== 0) {
  console.error('Validation failed: the voiceover was not requested.');
  process.exit(validacion.status === 1 ? 1 : 2);
}

const { text } = buildNarration(parseNarracion(readFileSync(guionPath, 'utf8')).sections);
if (!text) {
  console.error(`${guionPath} has no spoken text.`);
  process.exit(1);
}

const voice = JSON.parse(readFileSync(join(ROOT, 'scripts', 'voice.json'), 'utf8'));
const { apiKey, voiceId } = resolveCredentials(process.env);
if (!apiKey || !voiceId) {
  console.error('Missing ElevenLabs credentials: set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (or the ELEVEN_LABS_* names) in the environment or .env.');
  process.exit(1);
}

const carpeta = weekDir(week);
const mp3 = join(carpeta, 'voz.mp3');
const meta = join(carpeta, 'voz.json');
const alineacion = join(carpeta, 'voz.alineacion.json');
const llave = cacheKey({ text, voice, voiceId });

if (!flags.force && [mp3, meta, alineacion].every(existsSync) && JSON.parse(readFileSync(meta, 'utf8')).cacheKey === llave) {
  console.log(`${week}: voz.mp3 is up to date, no API call made.`);
  process.exit(0);
}

const degradar = (motivo) => {
  console.error(`${week}: voiceover unavailable (${motivo}).\nImages, scripts and a silent video can still be produced; the week will have no audio.`);
  process.exit(3);
};

const { url, init } = buildRequest({ text, voice, voiceId, apiKey });
let res;
try {
  res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
} catch (err) {
  degradar(`could not reach api.elevenlabs.io: ${err.cause?.code ?? err.name}`);
}
if (!res.ok) degradar(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);

let voz;
try {
  voz = parseTimestampResponse(await res.json());
} catch (err) {
  degradar(err.message);
}

// The metadata is written last: a run cut short leaves a stale cacheKey and is redone.
writeFileSync(mp3, voz.audio);
writeFileSync(alineacion, `${JSON.stringify(voz.alignment)}\n`);
writeFileSync(meta, `${JSON.stringify({ week, model: voice.model, voiceId, characters: text.length, cacheKey: llave }, null, 2)}\n`);
console.log(`${week}: wrote ${mp3} (${text.length} characters).`);
```

- [ ] **Step 5: Run the tests, and check the CLI's safe paths (no billing)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills
node --test scripts/test/tts.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
node scripts/tts.mjs --week 2026-W39; echo "exit=$?"
```
Expected: `# tests 6`, `# pass 6`, `# fail 0`; then `No guion.md in 2026-W39. Expected out/<week>/guion.md.` and `exit=1` (W39 has no weekly script yet, so nothing is requested). The billing path is exercised once, in Task 12.

- [ ] **Step 6: Commit**

```bash
git add scripts/core/tts.mjs scripts/tts.mjs scripts/test/tts.test.mjs
git commit -m "Voice the whole week in one take and keep the per-character timing" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: The render plan and the staged audio

`scripts/render.mjs` and the Remotion code still use the old per-event shapes until Tasks 9 and 10; `render.mjs` does not run between here and Task 10, and no test imports it.

**Files:**
- Modify: `scripts/core/render-plan.mjs` (rewrite), `scripts/core/stage-audio.mjs` (rewrite)
- Test: `scripts/test/render-plan.test.mjs` (rewrite), `scripts/test/stage-audio.test.mjs` (rewrite)

**Interfaces:**
- Consumes: `sectionTimes`, `estimateTimes` (Task 4); `cuts`, `sceneFrames` (Task 5).
- Produces:
  - `NARRATION_SRC = 'audio/semana.mp3'` (path under `video/public/`).
  - `stillFrame(durationInFrames)`: unchanged.
  - `weekPlan({doc, sections, alignment, hasMusic, motion, fps}): {items, reel}` where `motion` is `{leadSeconds, tailSeconds, transitionSeconds, outroSeconds, wordsPerSecond, slicePadBeforeSeconds, slicePadAfterSeconds}`, `alignment` is the voiceover's alignment or `null` for a silent week, and:
    - `items[i]` (EventAdProps) is `{slug, event, iglesia, voz: {src, fromSec, toSec} | null, palabras}`;
    - `reel` (WeeklyReelProps) is `{semanaTexto, iglesia, items, musicSrc, frames, voiceStartFrame, narration: {audioSrc, audioSeconds} | null}`, with `frames` the lengths of `[intro, ...events, outro]`.
    It throws `guion.md has no section for "<slug>"` when an event has none.
  - `stageAudio({carpeta, publico}): boolean`: `carpeta` is `out/<week>`, `publico` is `video/public`; returns `true` when `voz.mp3` was staged as `<publico>/audio/semana.mp3`.
  - Removed: `audioSrcFor`, `eventProps`, `reelProps`, `silentSlugs`.

- [ ] **Step 1: Rewrite the render-plan tests**

Replace `scripts/test/render-plan.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNarration } from '../core/narracion.mjs';
import { NARRATION_SRC, stillFrame, weekPlan } from '../core/render-plan.mjs';

const iglesia = { nombre: 'Iglesia Ejemplo', direccion: null, lugarPorDefecto: 'Salón Principal', llamadoAccion: 'Te esperamos', despedida: 'Dios te bendiga' };
const motion = { leadSeconds: 0.5, tailSeconds: 1, transitionSeconds: 0.5, outroSeconds: 4, wordsPerSecond: 2, slicePadBeforeSeconds: 0.05, slicePadAfterSeconds: 0.1 };
const fps = 30;
const doc = {
  semana: { texto: 'Semana del 21 al 27 de septiembre' },
  iglesia,
  events: [{ slug: 'a', titulo: 'A' }, { slug: 'b', titulo: 'B' }],
};
const SECCIONES = [
  { id: 'intro', text: 'Hola.' },
  { id: 'a', text: 'Uno.' },
  { id: 'b', text: 'Dos.' },
  { id: 'outro', text: 'Fin.' },
];

// Every character takes half a second, so the times are exact binary fractions.
const alineacion = (text) => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i * 0.5),
  character_end_times_seconds: [...text].map((_, i) => (i + 1) * 0.5),
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const plan = ({ sections = SECCIONES, alignment, hasMusic = false } = {}) =>
  weekPlan({
    doc,
    sections,
    alignment: alignment === undefined ? alineacion(buildNarration(sections).text) : alignment,
    hasMusic,
    motion,
    fps,
  });

test('the voiceover is staged under public/audio/semana.mp3 and referenced relative to public/', () => {
  assert.equal(NARRATION_SRC, 'audio/semana.mp3');
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

test('a narrated week: scenes are cut in the pauses and overlap by one transition', () => {
  // Speech: intro 0-2.5, a 3-5, b 5.5-7.5, outro 8-10 s. Cuts (lead 0.5, tail 1): 3.25, 5.75, 8.25, 11.5 s
  // = frames 98, 173, 248, 345 (halves round up). Transition 15 frames: 7 before a cut, 8 after.
  const { reel } = plan();
  assert.deepEqual(reel.frames, [106, 90, 90, 104]);
  assert.equal(reel.frames.reduce((a, b) => a + b, 0) - 3 * 15, 345);
  assert.equal(reel.voiceStartFrame, 15);
  assert.deepEqual(reel.narration, { audioSrc: NARRATION_SRC, audioSeconds: 10 });
});

test('each event carries its own slice of the one voiceover, a little padded', () => {
  const { items } = plan();
  assert.equal(items[0].voz.src, NARRATION_SRC);
  near(items[0].voz.fromSec, 2.95);
  near(items[0].voz.toSec, 5.1);
  near(items[1].voz.fromSec, 5.45);
  near(items[1].voz.toSec, 7.6);
});

test('the padding never runs past the end of the file', () => {
  // b is the last speech and ends at 7.5 s, the end of the file; 0.1 s of padding would be 7.6 s.
  const sections = [{ id: 'intro', text: 'Hola.' }, { id: 'a', text: 'Uno.' }, { id: 'b', text: 'Dos.' }];
  const { items } = plan({ sections, alignment: alineacion('Hola. Uno. Dos.') });
  assert.equal(items[1].voz.toSec, 7.5);
});

test('items carry the record, the church and the words of their line', () => {
  const { items } = plan();
  assert.deepEqual(items.map((i) => i.slug), ['a', 'b']);
  assert.equal(items[0].event, doc.events[0]);
  assert.equal(items[0].iglesia, iglesia);
  assert.equal(items[0].palabras, 1);
});

test('the reel takes the week text and church from events.json and reuses the same items', () => {
  const { items, reel } = plan();
  assert.equal(reel.semanaTexto, 'Semana del 21 al 27 de septiembre');
  assert.equal(reel.iglesia, iglesia);
  assert.equal(reel.items, items);
});

test('an outro with nothing to say lasts outroSeconds, silent, after the last event', () => {
  // Cuts: 3.25, 5.75, then b ends at 7.5 -> 0.5 + 7.5 + 1 = 9.0 s (frame 270), then 4 s more (frame 390).
  const sections = [{ id: 'intro', text: 'Hola.' }, { id: 'a', text: 'Uno.' }, { id: 'b', text: 'Dos.' }];
  const { reel } = plan({ sections, alignment: alineacion('Hola. Uno. Dos.') });
  assert.deepEqual(reel.frames, [106, 90, 112, 127]);
});

test('a week with no voiceover is silent and sized from the words', () => {
  // Estimated at 2 words/s with 0.5 s between sections: speech 0-0.5, 1-1.5, 2-2.5, 3-3.5 s.
  const { items, reel } = plan({ alignment: null });
  assert.deepEqual(items.map((i) => i.voz), [null, null]);
  assert.equal(reel.narration, null);
  assert.deepEqual(reel.frames, [46, 45, 45, 59]);
});

test('an event with no section in the script cannot be planned', () => {
  const sections = [{ id: 'intro', text: 'Hola.' }, { id: 'b', text: 'Dos.' }, { id: 'outro', text: 'Fin.' }];
  assert.throws(() => plan({ sections, alignment: alineacion('Hola. Dos. Fin.') }), /no section for "a"/);
});

test('the music bed is wired only when the file exists', () => {
  assert.equal(plan({ hasMusic: true }).reel.musicSrc, 'music/bed.mp3');
  assert.equal(plan({ hasMusic: false }).reel.musicSrc, null);
});
```

- [ ] **Step 2: Rewrite the stage-audio tests**

Replace `scripts/test/stage-audio.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageAudio } from '../core/stage-audio.mjs';

/** A fresh week folder (out/<week>) and a fresh video/public, removed after the test. */
function sandbox(t) {
  const raiz = mkdtempSync(join(tmpdir(), 'stage-audio-'));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const carpeta = join(raiz, 'out', '2026-W39');
  const publico = join(raiz, 'public');
  mkdirSync(carpeta, { recursive: true });
  mkdirSync(publico, { recursive: true });
  return { carpeta, publico, staged: join(publico, 'audio', 'semana.mp3') };
}

test('copies voz.mp3 to public/audio/semana.mp3, creating the folder, and reports audio', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  assert.equal(stageAudio({ carpeta, publico }), true);
  assert.equal(readFileSync(staged, 'utf8'), 'nueva');
});

test('a new voz.mp3 replaces what an earlier run staged', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(staged, 'vieja');
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  stageAudio({ carpeta, publico });
  assert.equal(readFileSync(staged, 'utf8'), 'nueva');
});

test('per-event files left by the old pipeline never survive next to the new audio', (t) => {
  const { carpeta, publico } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(join(publico, 'audio', 'culto.mp3'), 'de un evento');
  writeFileSync(join(carpeta, 'voz.mp3'), 'nueva');
  stageAudio({ carpeta, publico });
  assert.equal(existsSync(join(publico, 'audio', 'culto.mp3')), false);
});

test('no voz.mp3 reports silence and removes stale audio left by another week', (t) => {
  const { carpeta, publico, staged } = sandbox(t);
  mkdirSync(join(publico, 'audio'));
  writeFileSync(staged, 'de otra semana');
  assert.equal(stageAudio({ carpeta, publico }), false);
  assert.equal(existsSync(staged), false);
});

test('no voz.mp3 and nothing staged is simply silent, not an error', (t) => {
  const { carpeta, publico } = sandbox(t);
  assert.equal(stageAudio({ carpeta, publico }), false);
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/render-plan.test.mjs scripts/test/stage-audio.test.mjs 2>&1 | grep -E "^# (pass|fail)|does not provide"
```
Expected: failures about missing exports (`NARRATION_SRC`, `weekPlan`) and the old `stageAudio` signature.

- [ ] **Step 4: Implement `render-plan.mjs`**

Replace `scripts/core/render-plan.mjs` with:

```js
// What scripts/render.mjs feeds to Remotion, kept free of I/O so it is testable.
// Paths are relative to video/public/, the way staticFile() expects them.

import { cuts, sceneFrames } from './escenas.mjs';
import { estimateTimes, sectionTimes } from './narracion.mjs';

const STILL_AT = 0.6; // ad.png is taken this far into the clip, once the animation has settled
const MUSIC_SRC = 'music/bed.mp3';

/** The week's single voiceover, staged by stage-audio.mjs. */
export const NARRATION_SRC = 'audio/semana.mp3';

/** The frame to export as ad.png: about 60% in, always inside the clip. */
export const stillFrame = (durationInFrames) => Math.max(0, Math.min(durationInFrames - 1, Math.round(durationInFrames * STILL_AT)));

const palabrasDe = (texto) => (texto ? texto.split(/\s+/).filter(Boolean).length : 0);

/**
 * Everything the compositions need for one week.
 * @param {object} a
 * @param {object} a.doc events.json
 * @param {Array<{id: string, text: string}>} a.sections the parsed guion.md
 * @param {{characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[]}|null} a.alignment
 *   voz.alineacion.json, or null when the week has no voiceover
 * @param {boolean} a.hasMusic
 * @param {{leadSeconds: number, tailSeconds: number, transitionSeconds: number, outroSeconds: number, wordsPerSecond: number,
 *   slicePadBeforeSeconds: number, slicePadAfterSeconds: number}} a.motion the motion tokens of video/src/brand/tokens.ts
 * @param {number} a.fps
 * @returns {{items: object[], reel: object}} EventAdProps per event, and the WeeklyReelProps
 */
export function weekPlan({ doc, sections, alignment, hasMusic, motion, fps }) {
  const tiempos = alignment
    ? sectionTimes(sections, alignment)
    : estimateTimes(sections, { wordsPerSecond: motion.wordsPerSecond, pauseSeconds: motion.transitionSeconds });
  const audioSeconds = alignment ? alignment.character_end_times_seconds.at(-1) : null;
  const ventana = (id) => tiempos.find((t) => t.id === id) ?? { startSec: null, endSec: null };
  const textoDe = (id) => sections.find((s) => s.id === id)?.text ?? '';
  // Checked first: a missing section would otherwise surface as a confusing "cuts out of order" error.
  for (const e of doc.events) {
    if (ventana(e.slug).startSec === null) throw new Error(`guion.md has no section for "${e.slug}"`);
  }

  // Scenes are [intro card, one per event, outro card]; each is cut where the voice pauses.
  const ids = ['intro', ...doc.events.map((e) => e.slug), 'outro'];
  const transicion = Math.round(motion.transitionSeconds * fps);
  const cortes = cuts(ids.map(ventana), {
    leadSec: motion.leadSeconds,
    tailSec: motion.tailSeconds,
    silentSec: motion.outroSeconds,
  });
  const frames = sceneFrames(cortes.map((s) => Math.round(s * fps)), transicion);

  const items = doc.events.map((event) => {
    const { startSec, endSec } = ventana(event.slug);
    return {
      slug: event.slug,
      event,
      iglesia: doc.iglesia,
      voz: alignment
        ? {
            src: NARRATION_SRC,
            fromSec: Math.max(0, startSec - motion.slicePadBeforeSeconds),
            toSec: Math.min(audioSeconds, endSec + motion.slicePadAfterSeconds),
          }
        : null,
      palabras: palabrasDe(textoDe(event.slug)),
    };
  });

  return {
    items,
    reel: {
      semanaTexto: doc.semana.texto,
      iglesia: doc.iglesia,
      items,
      musicSrc: hasMusic ? MUSIC_SRC : null,
      frames,
      voiceStartFrame: Math.round(motion.leadSeconds * fps),
      narration: alignment ? { audioSrc: NARRATION_SRC, audioSeconds } : null,
    },
  };
}
```

- [ ] **Step 5: Implement `stage-audio.mjs`**

Replace `scripts/core/stage-audio.mjs` with:

```js
// Stages the week's voiceover where Remotion can serve it: video/public/audio/semana.mp3.
// video/public/ is not versioned and the name does not carry the week, so anything left
// there by an earlier run (this week's, another week's, or the per-event files of the old
// pipeline) must never survive: it would narrate the wrong video.

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION_SRC } from './render-plan.mjs';

/**
 * @param {{carpeta: string, publico: string}} dirs the week folder (out/<week>) and video/public
 * @returns {boolean} true if the week has a voiceover, false if it will be silent
 */
export function stageAudio({ carpeta, publico }) {
  const origen = join(carpeta, 'voz.mp3');
  rmSync(join(publico, 'audio'), { recursive: true, force: true });
  if (!existsSync(origen)) return false;
  mkdirSync(join(publico, 'audio'), { recursive: true });
  copyFileSync(origen, join(publico, NARRATION_SRC));
  return true;
}
```

- [ ] **Step 6: Run to verify they pass**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/render-plan.test.mjs scripts/test/stage-audio.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)|^not ok"
```
Expected: `# tests 17`, `# pass 17`, `# fail 0` (12 in render-plan, 5 in stage-audio). If a frame assertion is off by one, recompute it from the comment above the test before changing the code: the cut times and the rounding are spelled out there.

- [ ] **Step 7: Run the whole suite and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# fail 0` (`# tests 158`: 155 after Task 7, minus the 10 render-plan and 4 stage-audio tests replaced, plus 12 and 5 new).

```bash
git add scripts/core/render-plan.mjs scripts/core/stage-audio.mjs scripts/test/render-plan.test.mjs scripts/test/stage-audio.test.mjs
git commit -m "Plan the week's scenes from one narration and stage its single audio file" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Remotion plays one narration

**Files:**
- Modify: `video/src/types.ts`, `timing.ts`, `AdScene.tsx`, `EventAd.tsx`, `WeeklyReel.tsx`, `cards.tsx`, `sample.ts`, `brand/tokens.ts`
- Verify with: `(cd video && npx tsc --noEmit)` (there is no TypeScript test runner in this repo; the type-check is the test here, and Task 10 renders the result)

**Interfaces:**
- Consumes: the prop shapes `weekPlan` produces (Task 8): `EventAdProps {slug, event, iglesia, voz: {src, fromSec, toSec} | null, palabras}` and `WeeklyReelProps {semanaTexto, iglesia, items, musicSrc, frames, voiceStartFrame, narration: {audioSrc, audioSeconds} | null}`.
- Produces: `Iglesia.despedida: string | null`; motion tokens `slicePadBeforeSeconds`, `slicePadAfterSeconds` (and no `introSeconds`); `timing.ts` exports `voiceSeconds` (now synchronous), `sceneFrames`, `transitionFrames`, `reelFrames(frames: number[], fps: number)`.

- [ ] **Step 0: Preflight for the shared working tree**

```bash
cd /home/bryanjaramillo/decom-skills && git status --short video/
```
Expected: no line for `video/src/cards.tsx`, `video/src/WeeklyReel.tsx` or `video/src/brand/tokens.ts`. If any of them shows as modified, that is the user's uncommitted branding work, and this task edits the same files, so its commit would sweep their hunks in under this plan's message. **Stop and ask the user** to commit that work first (or to tell you to commit it for them). Never stash, revert or `git add -p` around it silently.

Once it is committed, re-read `video/src/cards.tsx` and `video/src/WeeklyReel.tsx`: the snippets below were written against the branding work as it stood (`Logo` instead of `Wordmark`, and `IntroCard` taking only `semanaTexto`). Where the files differ, pass exactly the props `cards.tsx` declares.

- [ ] **Step 1: Types**

Replace `video/src/types.ts` with:

```ts
import type React from 'react';

export type Plantilla = 'destacado' | 'estandar' | 'virtual';

/** One record of out/<week>/events.json. Ads may state nothing that is not in it. */
export type EventRecord = {
  slug: string;
  eventId: string | null;
  titulo: string;
  ministerio: string | null;
  fecha: string;
  fechaFin?: string;
  diaSemana: string;
  fechaTexto: string;
  hora: string | null;
  horaTexto: string | null;
  horaHablada: string | null;
  horaFuente: string | null;
  horaNota?: string;
  lugar: string | null;
  lugarFuente: string | null;
  modalidad: 'presencial' | 'virtual';
  plantilla: Plantilla;
};

/** The `iglesia` block of events.json, taken from church-info.md. */
export type Iglesia = {
  nombre: string | null;
  direccion: string | null;
  lugarPorDefecto: string | null;
  llamadoAccion: string | null;
  /** Said and shown right after the call to action (e.g. a blessing); null when church-info.md has none. */
  despedida: string | null;
};

export type AdProps = {event: EventRecord; iglesia: Iglesia};

/** What every video/src/ads/<slug>.tsx exports as `Ad`. */
export type AdComponent = React.FC<AdProps>;

/** Props of the single-event composition; render.mjs builds them from out/<week>/ (core/render-plan.mjs). */
export type EventAdProps = {
  slug: string;
  event: EventRecord;
  iglesia: Iglesia;
  /** The slice of the week's voiceover this event speaks (seconds into the file), or null for a silent clip. */
  voz: {src: string; fromSec: number; toSec: number} | null;
  /** Words of this event's line in guion.md; sizes the clip when there is no voiceover. */
  palabras: number;
};

export type WeeklyReelProps = {
  semanaTexto: string;
  iglesia: Iglesia;
  items: EventAdProps[];
  /** Path under public/ of the music bed, or null for none. */
  musicSrc: string | null;
  /** Length in frames of each scene, in order: intro card, one per item, outro card. Overlaps count once (see timing.reelFrames). */
  frames: number[];
  /** Frame at which the narration starts: after the lead-in. */
  voiceStartFrame: number;
  /** The one voiceover of the whole reel, or null for a silent reel. */
  narration: {audioSrc: string; audioSeconds: number} | null;
};
```

- [ ] **Step 2: Timing, scene and single-event clip**

Replace `video/src/timing.ts` with:

```ts
import {brand} from './brand/tokens';
import type {EventAdProps} from './types';

/** Seconds of narration a standalone clip carries: its slice of the voiceover, or an estimate from its words when there is none yet. */
export const voiceSeconds = ({voz, palabras}: Pick<EventAdProps, 'voz' | 'palabras'>): number =>
  voz ? voz.toSec - voz.fromSec : palabras / brand.motion.wordsPerSecond;

/** A standalone clip lasts its narration plus lead-in and tail: no dead air, never cut mid-sentence. */
export const sceneFrames = (seconds: number, fps: number): number =>
  Math.ceil((brand.motion.leadSeconds + seconds + brand.motion.tailSeconds) * fps);

export const transitionFrames = (fps: number): number => Math.round(brand.motion.transitionSeconds * fps);

/** Frames of a TransitionSeries made of these scenes: each overlap is counted once. */
export const reelFrames = (frames: number[], fps: number): number =>
  frames.reduce((a, b) => a + b, 0) - (frames.length - 1) * transitionFrames(fps);
```

Replace `video/src/AdScene.tsx` with:

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ads} from './ads/registry.gen';
import type {EventAdProps} from './types';

/**
 * One event's picture: its ad component. Sound is not its business: the single-event clip
 * (EventAd) plays its own slice of the narration, and the weekly reel plays the whole
 * narration once over all its scenes.
 */
export const AdScene: React.FC<Pick<EventAdProps, 'slug' | 'event' | 'iglesia'>> = ({slug, event, iglesia}) => {
  const Ad = ads[slug];
  if (!Ad) throw new Error(`No ad component registered for "${slug}". Run: node scripts/gen-registry.mjs`);
  return (
    <AbsoluteFill>
      <Ad event={event} iglesia={iglesia} />
    </AbsoluteFill>
  );
};
```

Replace `video/src/EventAd.tsx` with:

```tsx
import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {AdScene} from './AdScene';
import {brand} from './brand/tokens';
import {sceneFrames, voiceSeconds} from './timing';
import type {EventAdProps} from './types';

/** Single-event composition: exported as ad.png (a still) and clip.mp4. It plays its own slice of the week's narration. */
export const EventAd: React.FC<EventAdProps> = ({slug, event, iglesia, voz}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <AdScene slug={slug} event={event} iglesia={iglesia} />
      {voz ? (
        <Sequence from={Math.round(brand.motion.leadSeconds * fps)}>
          <Html5Audio src={staticFile(voz.src)} trimBefore={Math.round(voz.fromSec * fps)} trimAfter={Math.round(voz.toSec * fps)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** The clip lasts exactly as long as its slice of the narration, plus lead-in and tail. */
export const calculateEventAd: CalculateMetadataFunction<EventAdProps> = async ({props}) => ({
  durationInFrames: sceneFrames(voiceSeconds(props), brand.video.fps),
});
```

- [ ] **Step 3: The weekly reel**

Replace `video/src/WeeklyReel.tsx` with:

```tsx
import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {linearTiming, TransitionSeries, type TransitionPresentation} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {AdScene} from './AdScene';
import {IntroCard, OutroCard} from './cards';
import {brand} from './brand/tokens';
import {reelFrames, transitionFrames} from './timing';
import type {WeeklyReelProps} from './types';

const {fps} = brand.video;

/** How far the audio file's length may differ from where its alignment ends, in seconds. */
const AUDIO_TOLERANCE_SECONDS = 0.5;

/** Fade, slide and wipe in rotation, so consecutive cuts do not repeat. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentationFor = (i: number): TransitionPresentation<any> =>
  [fade(), slide({direction: 'from-right'}), wipe({direction: 'from-left'})][i % 3];

/**
 * The scene lengths come from the voiceover's per-character timing (core/render-plan.mjs);
 * here they are only summed, and the audio file is checked against that timing.
 */
export const calculateWeeklyReel: CalculateMetadataFunction<WeeklyReelProps> = async ({props}) => {
  const escenas = props.items.length + 2;
  if (props.frames.length !== escenas) {
    throw new Error(`WeeklyReel needs ${escenas} scene lengths (intro, each event, outro), got ${props.frames.length}`);
  }
  if (props.narration) {
    const real = await getAudioDurationInSeconds(staticFile(props.narration.audioSrc));
    if (Math.abs(real - props.narration.audioSeconds) > AUDIO_TOLERANCE_SECONDS) {
      throw new Error(
        `${props.narration.audioSrc} lasts ${real.toFixed(2)} s but its alignment ends at ${props.narration.audioSeconds.toFixed(2)} s: regenerate the voiceover (node scripts/tts.mjs --force)`,
      );
    }
  }
  return {durationInFrames: reelFrames(props.frames, fps)};
};

export const WeeklyReel: React.FC<WeeklyReelProps> = ({semanaTexto, iglesia, items, musicSrc, frames, voiceStartFrame, narration}) => {
  const timing = linearTiming({durationInFrames: transitionFrames(fps)});
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={frames[0]}>
          <IntroCard semanaTexto={semanaTexto} />
        </TransitionSeries.Sequence>
        {items.flatMap((item, i) => [
          <TransitionSeries.Transition key={`t-${item.slug}`} presentation={presentationFor(i)} timing={timing} />,
          <TransitionSeries.Sequence key={item.slug} durationInFrames={frames[i + 1]}>
            <AdScene slug={item.slug} event={item.event} iglesia={item.iglesia} />
          </TransitionSeries.Sequence>,
        ])}
        <TransitionSeries.Transition presentation={presentationFor(items.length)} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={frames[items.length + 1]}>
          <OutroCard iglesia={iglesia} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {/* One voice over the whole reel: it starts after the lead-in and is never cut at a scene boundary. */}
      {narration ? (
        <Sequence from={voiceStartFrame}>
          <Html5Audio src={staticFile(narration.audioSrc)} />
        </Sequence>
      ) : null}
      {/* Music bed slot: pass musicSrc (a file under public/) to turn it on; null keeps the reel voice-only. */}
      {musicSrc ? <Html5Audio src={staticFile(musicSrc)} volume={brand.audio.musicVolume} loop /> : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: The outro shows the blessing, and the tokens and samples follow**

In `video/src/cards.tsx`, in `OutroCard`, right after the block

```tsx
        <Reveal delay={8}>
          <Cta text={iglesia.llamadoAccion} align="center" />
        </Reveal>
```
add:

```tsx
        {iglesia.despedida ? (
          <Reveal delay={14}>
            <Headline text={iglesia.despedida} size={brand.type.subtitle} align="center" />
          </Reveal>
        ) : null}
```

In `video/src/brand/tokens.ts`, in `motion`, replace

```ts
  transitionSeconds: 0.5,
  introSeconds: 3,
  outroSeconds: 4,
```
with

```ts
  transitionSeconds: 0.5,
  /** Length of the outro card when there is no closing line to narrate; otherwise it lasts as long as the line. */
  outroSeconds: 4,
  /** Extra audio a standalone clip keeps around its slice of the narration, so no consonant onset or tail is clipped. */
  slicePadBeforeSeconds: 0.05,
  slicePadAfterSeconds: 0.1,
```

In `video/src/sample.ts`:
1. In `sampleIglesia`, after `llamadoAccion: 'Te esperamos',` add `despedida: 'Dios te bendiga',`.
2. In `sampleProps`, replace `  audioSrc: null,` with `  voz: null,`.
3. Replace the whole `sampleReel` definition with:

```ts
const sampleItems = (['virtual', 'destacado', 'estandar'] as const).map(sampleProps);

export const sampleReel: WeeklyReelProps = {
  semanaTexto: 'Semana del 21 al 27 de septiembre',
  iglesia: sampleIglesia,
  items: sampleItems,
  musicSrc: null,
  // Studio preview only: a silent reel of 5 s per scene. A real week gets its lengths from core/render-plan.mjs.
  frames: [150, ...sampleItems.map(() => 150), 150],
  voiceStartFrame: 0,
  narration: null,
};
```

- [ ] **Step 5: Type-check**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && (cd video && npx tsc --noEmit; echo "tsc exit=$?")
```
Expected: no output and `tsc exit=0`. Typical failures and fixes: a leftover `introSeconds` or `audioSrc` reference means a file was missed (`grep -rn "introSeconds\|audioSrc" video/src`); an `Iglesia` object literal missing `despedida` needs the field.

- [ ] **Step 6: Commit**

```bash
git add video/src/types.ts video/src/timing.ts video/src/AdScene.tsx video/src/EventAd.tsx video/src/WeeklyReel.tsx video/src/cards.tsx video/src/sample.ts video/src/brand/tokens.ts
git commit -m "Play one narration over the weekly reel and give each clip its own slice" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Wire `render.mjs` and smoke-test a silent week

Renders the real W39 with no voiceover, using the estimated timing, so the whole path (validate, plan, Remotion) is proven before any money is spent in Task 12.

**Files:**
- Modify: `scripts/render.mjs` (rewrite)
- Create (generated, git-ignored): `out/2026-W39/guion.md`

**Interfaces:**
- Consumes: `weekPlan` (Task 8), `stageAudio` (Task 8), `parseNarracion` (Task 4), `validate.mjs --narracion` (Task 6), the Remotion props (Task 9), `brand` from `video/src/brand/tokens.ts`.
- Produces: `out/<week>/<slug>/{ad.png, clip.mp4}` and `out/<week>/semana.mp4`. Usage is unchanged: `node scripts/render.mjs <week> [slug ...]`; with slugs the weekly video is skipped.

- [ ] **Step 1: Rewrite `scripts/render.mjs`**

Replace the file with:

```js
#!/usr/bin/env node
// Renders a week: per event an ad.png and a clip.mp4, then the combined semana.mp4.
//
//   node scripts/render.mjs <week> [slug ...]
//
// With slugs, only those events are rendered and the weekly video is skipped: a
// reel built from a subset would be a wrong reel. Renders run one after another
// on purpose: rendering is CPU-bound, and only the orchestrator renders.
//
// Validates first (an error in any delivery or in guion.md stops the run, nothing is
// rendered), regenerates the ad registry, stages the week's voiceover into
// video/public/audio/, turns guion.md plus the voice's timing into scene lengths
// (core/render-plan.mjs), bundles once, then renders. A week with no voz.mp3 is rendered
// silent, sized from the words, and reported at the end. REMOTION_BROWSER_EXECUTABLE
// selects the browser, else Remotion's own download is used.
//
// Exit 0: done. Exit 1: usage. Exit 2: validation failed. Exit 4: some renders failed.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { brand } from '../video/src/brand/tokens.ts';
import { ROOT, loadEnv, parseArgs, weekDir } from './core/project.mjs';
import { parseNarracion } from './core/narracion.mjs';
import { stillFrame, weekPlan } from './core/render-plan.mjs';
import { stageAudio } from './core/stage-audio.mjs';

loadEnv();
const [week, ...slugs] = parseArgs(process.argv.slice(2)).positional;
if (!week) {
  console.error('usage: node scripts/render.mjs <week> [slug ...]');
  process.exit(1);
}
const carpetaSemana = weekDir(week);
const eventsPath = join(carpetaSemana, 'events.json');
if (!existsSync(eventsPath)) {
  console.error(`${eventsPath} not found. Run scripts/normalize.mjs first.`);
  process.exit(1);
}
const doc = JSON.parse(readFileSync(eventsPath, 'utf8'));

// 1. Nothing renders until the deliveries and the script are valid and the registry is current.
const correr = (script, args) => spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { stdio: 'inherit' });
const validacion = correr('validate.mjs', [week, ...slugs, '--narracion']);
if (validacion.status !== 0) {
  console.error('Validation failed: nothing was rendered.');
  process.exit(validacion.status === 1 ? 1 : 2);
}
if (correr('gen-registry.mjs', []).status !== 0) process.exit(1);

// 2. Stage the week's voiceover and plan the scenes from the script and the voice's timing.
const publico = join(ROOT, 'video', 'public');
const conAudio = stageAudio({ carpeta: carpetaSemana, publico });
const alineacionPath = join(carpetaSemana, 'voz.alineacion.json');
if (conAudio && !existsSync(alineacionPath)) {
  console.error(`voz.mp3 has no voz.alineacion.json, so its timing is unknown. Run: node scripts/tts.mjs --week ${week} --force`);
  process.exit(1);
}
const { sections } = parseNarracion(readFileSync(join(carpetaSemana, 'guion.md'), 'utf8'));
const plan = weekPlan({
  doc,
  sections,
  alignment: conAudio ? JSON.parse(readFileSync(alineacionPath, 'utf8')) : null,
  hasMusic: existsSync(join(publico, 'music', 'bed.mp3')),
  motion: brand.motion,
  fps: brand.video.fps,
});
const items = slugs.length ? plan.items.filter((i) => slugs.includes(i.slug)) : plan.items;

// 3. Bundle once, then render one thing at a time.
const require = createRequire(join(ROOT, 'video', 'package.json'));
const { bundle } = require('@remotion/bundler');
const { renderMedia, renderStill, selectComposition } = require('@remotion/renderer');

const inicio = Date.now();
let ultimo = -1;
const avance = (etiqueta) => (fraccion) => {
  const paso = Math.floor(fraccion * 4) * 25; // report every 25%
  if (paso !== ultimo) console.log(`  ${etiqueta} ${paso}%`);
  ultimo = paso;
};
const nuevo = () => (ultimo = -1);
const largo = (composition) => `${composition.durationInFrames} frames (${(composition.durationInFrames / brand.video.fps).toFixed(1)} s)`;

console.log('Bundling...');
const serveUrl = await bundle({
  entryPoint: join(ROOT, 'video', 'src', 'index.ts'),
  publicDir: publico,
  onProgress: (p) => avance('bundle')(p / 100),
});
const comun = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null, logLevel: 'warn' };

const fallos = [];
const intentar = async (nombre, tarea) => {
  try {
    await tarea();
  } catch (err) {
    fallos.push({ nombre, mensaje: err.message.split('\n')[0] });
    console.error(`FAILED ${nombre}: ${err.message.split('\n')[0]}`);
  }
};

for (const props of items) {
  const carpeta = join(carpetaSemana, props.slug);
  mkdirSync(carpeta, { recursive: true });
  await intentar(props.slug, async () => {
    const composition = await selectComposition({ ...comun, id: 'EventAd', inputProps: props });
    console.log(`${props.slug}${props.voz ? '' : ' (silent)'}: ${largo(composition)}`);
    await renderStill({
      ...comun,
      composition,
      inputProps: props,
      output: join(carpeta, 'ad.png'),
      frame: stillFrame(composition.durationInFrames),
      imageFormat: 'png',
    });
    nuevo();
    await renderMedia({
      ...comun,
      composition,
      inputProps: props,
      codec: 'h264',
      outputLocation: join(carpeta, 'clip.mp4'),
      onProgress: ({ progress }) => avance('clip')(progress),
    });
  });
}

if (!slugs.length && items.length) {
  await intentar('semana', async () => {
    const composition = await selectComposition({ ...comun, id: 'WeeklyReel', inputProps: plan.reel });
    console.log(`semana: ${largo(composition)}`);
    nuevo();
    await renderMedia({
      ...comun,
      composition,
      inputProps: plan.reel,
      codec: 'h264',
      outputLocation: join(carpetaSemana, 'semana.mp4'),
      onProgress: ({ progress }) => avance('reel')(progress),
    });
  });
}

// 4. Report.
const segundos = Math.round((Date.now() - inicio) / 1000);
console.log(`\n${items.length} event(s) in ${carpetaSemana} (${segundos}s).`);
if (slugs.length) console.log('Weekly video skipped: it is only built when no slugs are given.');
if (!conAudio) console.log(`No voiceover, rendered silent. Run: node scripts/tts.mjs --week ${week}`);
if (fallos.length) {
  console.error(`${fallos.length} render(s) failed: ${fallos.map((f) => f.nombre).join(', ')}`);
  process.exit(4);
}
```

- [ ] **Step 2: Bring W39's `events.json` up to date**

`events.json` predates `semana.hablada` and `iglesia.despedida`. It is generated from the raw calendar file already in `out/2026-W39/raw/`, so no calendar call is needed:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills
node scripts/normalize.mjs --week 2026-W39; echo "exit=$?"
grep -n '"hablada"\|"despedida"' out/2026-W39/events.json
```
Expected: `exit=0`, then `"hablada": "del veintiuno al veintisiete de septiembre"` and `"despedida": "Dios te bendiga"`. The three events keep their slugs and have no time, as before.

- [ ] **Step 3: Write W39's script**

```bash
cat > out/2026-W39/guion.md <<'EOF'
## intro
Bienvenidos a IPUC Envigado Central, estos son nuestros eventos del veintiuno al veintisiete de septiembre.

## oracion-virtual
El lunes es la oración virtual de jóvenes.

## refam-juvenil
El miércoles, el Refam juvenil, en el Templo.

## charla-familias
Y el viernes, la charla familias, también en el Templo.

## outro
Te esperamos, Dios te bendiga.
EOF
```
Each event line uses only its record (title, day, place; no time exists), the titles keep the calendar's own words, and only the outro carries the call to action.

- [ ] **Step 4: Validate**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node scripts/validate.mjs 2026-W39 --narracion; echo "exit=$?"
```
Expected: `exit=0`, no `ERROR` lines, and notices only: three `sin-hora` (no time exists for these events; the ads give the date only, by design) and one `sin-audio`. Anything else, such as `apertura-repetida` or `longitud`, is a script wording problem to fix in `guion.md` before going on.

- [ ] **Step 5: Render the silent week (CPU-bound, a few minutes; run nothing else meanwhile)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node scripts/render.mjs 2026-W39 2>&1 | tail -25; echo "exit=${PIPESTATUS[0]}"
```
Expected: one harmless `MODULE_TYPELESS_PACKAGE_JSON` warning at the top (see "Decisions" 6); `Bundling...`; three lines like `oracion-virtual (silent): NNN frames (N.N s)`; `semana: NNN frames (NN.N s)`; the summary line; `No voiceover, rendered silent. Run: node scripts/tts.mjs --week 2026-W39`; `exit=0`. No `FAILED` lines.

- [ ] **Step 6: Check the reel's length against its plan**

```bash
D=/home/bryanjaramillo/decom-skills/video/node_modules/@remotion/compositor-linux-arm64-gnu
LD_LIBRARY_PATH=$D $D/ffprobe -v error -show_entries format=duration -of csv=p=0 out/2026-W39/semana.mp4
```
Expected: the number matches the `semana: ... (NN.N s)` line to within 0.1 s. Then open `out/2026-W39/oracion-virtual/ad.png` and `charla-familias/ad.png` (the Read tool shows images) and confirm they look like the previous run's stills. Nothing in the picture should have changed, only the timing.

- [ ] **Step 7: Run everything and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)" && (cd video && npx tsc --noEmit; echo "tsc exit=$?")
```
Expected: `# tests 158`, `# fail 0`, `tsc exit=0`.

```bash
git add scripts/render.mjs
git commit -m "Render the week from one script and one voiceover, silent when there is none" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Update the docs and the designer's contract

After this task the docs describe the pipeline as it now works, and the orchestrator has the script rules it needs in Task 12. All edits are to existing files; make the `Edit`s with the exact strings given (each is unique in its file), and re-read the file after if a string does not match, because the user has edited `PLAN.md`, `README.md` and `design.md` recently.

**Files:**
- Modify: `.claude/skills/church-ads/script.md` (rewrite), `.claude/agents/ad-designer.md` (rewrite), `.claude/skills/church-ads/SKILL.md`, `CLAUDE.md`, `PLAN.md`, `README.md`

**Interfaces:**
- Consumes: the behaviour built in Tasks 2-10 (`guion.md` sections, `Despedida`, `semana.hablada`, `tts.mjs --week`, `validate.mjs --narracion`).
- Produces: nothing code depends on; Task 12 follows `script.md` and `SKILL.md`.

- [ ] **Step 1: Rewrite `.claude/skills/church-ads/script.md`**

Replace the whole file with:

````markdown
# Script rules (`guion.md`)

The narration of the whole week, in one file: `out/<week>/guion.md`. The orchestrator
writes it, once, with every event of `events.json` in view; that is what lets the video
sound like one piece instead of separate ads. It is read aloud to the church and
published, so an invented detail here reaches real people.
`node scripts/validate.mjs <week> --narracion` catches many slips; it is a net, not
proof, and the orchestrator reads the whole script against `events.json` before it is
voiced.

## The one rule

State nothing that is not in `out/<week>/events.json`: the event's own record and
the `iglesia` block. That covers everything you would be tempted to add: a speaker,
a topic, a theme, "trae tu Biblia", food, a dress code, an age range, a price, "es
gratis", an address that is not `iglesia.direccion`. If it is not in the record, it
is not in the script. A short script that says less is correct.

## Language and register

- Spanish (Colombia). Address the listener as **tú**: "te invitamos", "ven", "trae".
  Never `usted`, `ustedes`, "los esperamos", "les invitamos".
- The intro's "Bienvenidos" is the church's own greeting: keep it.
- Warm and direct, spoken sentences. No slogans, no hype, no exclamation stacks.
- Write for the ear: real accents and punctuation (the voice reads them), no
  abbreviations, no emoji, and no digits: dates are spoken as words.

## Shape of the piece

Three kinds of section, in this order, each under a `## <id>` heading: `intro`, one
section per event (its `slug`, in `events.json` order), and `outro`.

### intro

"Bienvenidos a *iglesia.nombre*, estos son nuestros eventos *semana.hablada*."
`semana.hablada` is copied verbatim from `events.json` ("del veintiuno al veintisiete de
septiembre"). If `iglesia.nombre` is `null`, leave the name out and add nothing in its
place.

### Event lines

- One or two spoken sentences: what (the title, and `ministerio` if there is one), the
  day (`diaSemana`), the time if there is one, the place if there is one.
- Put the parts in whatever order suits the sentence. Do not use one template for every
  event: vary how each line opens, and let the lines lead into each other ("El lunes…",
  "Después, el miércoles…", "Y el viernes…"). No two neighbouring events open with the
  same words.
- A connector may only say something true of the list order. Never "el último evento de
  la semana", "no te lo pierdas", "este fin de semana": the calendar may hold events the
  list does not.
- No greeting, no call to action, no blessing: they belong to the intro and the outro.
- About 8 to 25 words. `validate` gives a notice outside 6 to 30.

### outro

The church's own closing words, verbatim and in this order: `iglesia.llamadoAccion`, then
`iglesia.despedida` ("Te esperamos, Dios te bendiga."). One missing from `church-info.md`
is simply absent; both missing means no outro section.

## Time

- Say the time exactly as `event.horaHablada` ("a las siete de la noche"). Do not
  re-derive it from `hora`, and do not convert it to digits.
- `hora` is `null`: **mention no time at all.** No clock time, no "por la noche",
  no "a la hora de siempre", no "por confirmar". The line gives the day only.
- The day of the week, if named, is `event.diaSemana`, or one the title itself
  already contains.

## Relative dates

Avoid "hoy", "mañana", "pasado mañana", "esta noche", "ayer". The video is watched
on any day of the week, so a relative word is wrong most of the time. Say "el
viernes".

## Place

- Use `event.lugar` as written. `lugar` is `null`: name no place.
- `modalidad: "virtual"`: never point it at an in-person place. `modalidad:
  "presencial"`: never say Zoom, virtual, online, "enlace" or "link". A meeting ID,
  a link or a password is never in the script.

## Numbers

A digit may appear only if it is already in the record (the title, `fechaTexto`,
`horaTexto`, `lugar`), and never in the intro or the outro. Do not add counts, ages,
years or prices.

## Odd words

Keep the words of an event's title as the calendar wrote them ("Refam", "Oracion
virtual"): that is the church's own name for the event. Fit them into a natural
sentence, but do not rename the event. The intro speaks the church's name aloud, which
no script did before. If the name or a title looks like an acronym the voice may
mispronounce ("IPUC", "Refam"), do not respell it in the script: tell the person to
listen right after the first voicing.

## Format of `guion.md`

Spoken text only. `# ` lines and `<!-- ... -->` comments are ignored by both
`validate.mjs` and `tts.mjs`; a section starts at each `## <id>` line, and everything
else is sent to the voice in one request, so a note to yourself belongs in a comment.

A fictional week, one event with a time and one without:

```markdown
## intro
Bienvenidos a Iglesia Ejemplo, estos son nuestros eventos del veintiuno al veintisiete de septiembre.

## retiro-familias
<!-- sin hora en el registro: la línea no menciona ninguna -->
El viernes, el retiro de familias, en el Salón Principal.

## culto-jovenes
Y el sábado, el culto de jóvenes, a las seis y cuarenta y cinco de la tarde, también en el Salón Principal.

## outro
Te esperamos, Dios te bendiga.
```

Check the whole script against these before voicing it; every edit is a new charge for
the entire week:

- Is every fact in the record? Delete each one that is not.
- Is there a time? Then is it `horaHablada`, verbatim? No time: is there no hint of one?
- Does an event line say the call to action or the blessing? Move it to the outro.
- Do two neighbouring events open with the same words? Rewrite one.
- Is the intro's week exactly `semana.hablada`, and the outro exactly the closing words?
- Is it `tú` all the way through?
````

- [ ] **Step 2: Rewrite `.claude/agents/ad-designer.md`**

Replace the whole file with:

````markdown
---
name: ad-designer
description: Designs the ad for ONE church event: a Remotion component. Launch one per event, in parallel, after events.json exists. Writes no script and makes no audio. Never renders.
tools: Read, Write, Edit, Glob, Grep, Bash
---

You are the designer for one event of the weekly church ad video. You are given a
`week` (e.g. `2026-W39`) and a `slug`. You deliver one component and stop.

## Read first

1. `.claude/skills/church-ads/design.md`: the brand and component contract.
2. `out/<week>/events.json`: your event is the record whose `slug` matches, plus the
   `iglesia` block. **These are the only facts that exist.** Show nothing that is not
   in them. If a fact you would like is missing (a time, a place, a topic), the ad
   simply does not have it: do not guess and do not ask.

## Deliver

1. `video/src/ads/<slug>.tsx`, exporting `Ad`, props-driven (see `design.md`).
2. A manifest fragment as your final message (format below).

The narration is not yours. The orchestrator writes one script for the whole week, with
every event in view, and voices it once. Do not write a `guion.md`, do not call
`scripts/tts.mjs`, and do not make audio.

## Check your work

- `node scripts/validate.mjs <week> <slug>` checks your component against the source
  rules. Fix every error. (With a slug it does not ask for the week's script.)
- `(cd video && npx tsc --noEmit)` type-checks; the subshell keeps your working
  directory at the repo root, where every `scripts/` command expects to run. Only
  errors in your own file are yours; other designers are writing theirs at the
  same time.
- Re-read what your component shows against `events.json`, line by line. Is every word
  and figure supported?

## Never

- **Render.** No `remotion render`, `remotion still`, `remotion studio` and no
  `scripts/render.mjs`. Rendering is CPU-bound and the orchestrator serializes it.
- Touch any file that is not your own component: not another slug's file, `events.json`,
  `church-info.md`, `overrides/`, `tokens.ts`, `templates/`, or `registry.gen.ts`.
  (`registry.gen.ts` is rebuilt by the orchestrator; never edit it.)
- Choose the `destacado` template or change `plantilla`. The orchestrator decides.
- Commit, or print the contents of `.env`.

## Final message

Only this JSON, in a code block, and one line before it if something needs a person:

```json
{
  "slug": "<slug>",
  "plantilla": "<event.plantilla>",
  "avisos": []
}
```

`avisos` lists anything a human should look at before publishing: a validate notice you
could not resolve, or a word shown on screen that a reader might misread. Empty if there
is nothing.
````

- [ ] **Step 3: Edit `.claude/skills/church-ads/SKILL.md`**

Read the file first; its front matter may carry keys beyond `name` and `description`, so edit rather than replace it. Make these edits:

1. In the front matter `description`, replace `fans out one ad-designer per event, validates, and renders` with `fans out one ad-designer per event for the visuals, writes one narration for the whole week and voices it once, validates, and renders`.
2. Replace the paragraph

```
You are the video editor. Designers write components, scripts and audio in
parallel. **You render, and only you**: rendering is CPU-bound and is serialized by
`scripts/render.mjs`.

Read `design.md` (the visual and component contract) and `script.md` (the Spanish
copy rules) before briefing anyone; the designers read them too.
```
with

```
You are the video editor. Designers write components in parallel. **You write the
week's narration, voice it once, and render, and only you render**: rendering is
CPU-bound and is serialized by `scripts/render.mjs`.

Read `design.md` (the visual and component contract) before briefing anyone; the
designers read it too. Read `script.md` (the Spanish copy rules) before writing the
narration: it is yours, not theirs.
```
3. In "Hard rules" item 4, replace `call to action,\n   recurring services) live in` with `call to action,\n   blessing (`Despedida`), recurring services) live in`.
4. Replace everything from the line `### 5. Fan out one `ad-designer` per event` up to (not including) the line `## Overrides` with:

````markdown
### 5. Fan out one `ad-designer` per event

One subagent per event, all in a single message so they run in parallel. Each prompt
is just the `week` and the `slug`; they read everything else themselves. They deliver
`video/src/ads/<slug>.tsx` and a JSON manifest fragment (`slug`, `plantilla`,
`avisos`). They write no script and make no audio. Collect the fragments; gather every
`avisos` entry for the final report.

### 6. Write the week's narration

Write `out/<week>/guion.md` yourself, once, with every event of `events.json` in view,
following `script.md`: `## intro`, one `## <slug>` per event in `events.json` order, and
`## outro`. This is what makes the video one piece instead of separate ads: vary how each
event line opens, let the lines lead into one another, and keep the church's call to
action for the outro alone.

### 7. Validate

```bash
node scripts/validate.mjs 2026-W39
```

This checks each ad file against the source rules and the narration against the
record: the sections, the intro (church name, the week as `semana.hablada`), each event
line's facts, and the outro (exactly the church's closing words). Exit **2** blocks
rendering: send a component error back to that event's designer (or fix the file
yourself), fix a script error in `guion.md`, then validate again. Notices do not block.

Then read `guion.md` against `events.json` yourself. The checker is a net, not proof:
it will not notice an invented topic. A time in a church ad that is not in the record
sends real people to a locked door.

### 8. Voice the week

```bash
node scripts/tts.mjs --week 2026-W39
```

One request voices the whole script in a single take and keeps its per-character timing
(`voz.mp3`, `voz.json`, `voz.alineacion.json`). It refuses to run while validation has
errors and reuses the files when the text is unchanged. It costs money and every edit
re-voices the whole week, so validate and read first. Exit **3** (ElevenLabs unreachable)
is a valid outcome: the week is rendered silent and reported. After the first voicing,
ask the person to listen: this is the first time the voice says the church's name.

### 9. Render

```bash
node scripts/render.mjs 2026-W39            # every event, then semana.mp4
node scripts/render.mjs 2026-W39 <slug>     # one event only, no weekly video
```

`render.mjs` validates again, regenerates `video/src/ads/registry.gen.ts`, stages
the week's `voz.mp3` into `video/public/audio/semana.mp3`, cuts the scenes where the
voice pauses, bundles once, and renders one thing at a time: per event `ad.png` and
`clip.mp4` (its own slice of the narration), then `semana.mp4` (an intro card, the
events in order with transitions, an outro, one continuous narration over all of it; a
music bed only if `video/public/music/bed.mp3` exists). Set
`REMOTION_BROWSER_EXECUTABLE` where Remotion cannot download its own Chromium.

Look at the stills (`out/<week>/<slug>/ad.png`) before calling it done. Generated
output is disposable and is never edited by hand: change the source and render again.

### 10. Report

Say what was produced, then the things the person must know: the events made
without a time or place, whether the week was rendered silent (and the command to retry
the voice: `node scripts/tts.mjs --week <week>`), the designers' `avisos`, and any word
in the script the voice may mispronounce.

````
5. Replace the three-line paragraph

```
After editing an override, run step 3 again, then re-run the affected designer. A
designer's script and component follow `events.json`, so an outdated one fails
`validate.mjs`.
```
with

```
After editing an override, run step 3 again, then rewrite that event's line in `guion.md`
(and re-run its designer if the template changed) and voice the week again (step 8). A
script or component that no longer follows `events.json` fails `validate.mjs`.
```
6. In "Layout of a week", replace the line `  <slug>/{guion.md, voz.mp3, voz.json, ad.png, clip.mp4}` with:

```
  guion.md                 the week's narration, written by the orchestrator
  voz.mp3, voz.json, voz.alineacion.json   the one voiceover and its per-character timing
  <slug>/{ad.png, clip.mp4}
```

- [ ] **Step 4: Edit `CLAUDE.md`**

Make these edits (each old string is unique):

1. `Generator of weekly advertisement videos for IPUC Envigado Central. Reads a week\nof events from Google Calendar and produces, per event, a branded image, a\nSpanish voiceover and a video clip — then edits them into one weekly video.` becomes `Generator of weekly advertisement videos for IPUC Envigado Central. Reads a week\nof events from Google Calendar and produces, per event, a branded image and a\nvideo clip, plus one Spanish narration for the whole week — then edits them into\none weekly video.`
2. In hard rule 2, replace the line `   it is "Te esperamos"); if the file has none, the ads have none. Code,` with:

```
   it is "Te esperamos"), spoken once, in the weekly outro, followed by the
   church's `Despedida` if it has one ("Dios te bendiga"); event lines carry
   neither. If the file has none, the ads have none. Code,
```
3. Hard rule 4 becomes:

```
4. **Subagents never render.** They write components. The orchestrator writes
   the week's narration, voices it once and renders — rendering is CPU-bound
   and must be serialized.
```
4. In hard rule 6, replace `   place, ministries, call to action and recurring services come from` with `   place, ministries, call to action, blessing (\`Despedida\`) and recurring\n   services come from`.
5. In Commands, replace `node scripts/validate.mjs 2026-W39 [slug]     # audit events.json and each delivery` with `node scripts/validate.mjs 2026-W39 [slug] [--narracion]   # audit events.json, each ad, the week's guion.md`, and `node scripts/tts.mjs <slug> --week 2026-W39   # one voiceover (costs money)` with `node scripts/tts.mjs --week 2026-W39            # the week's one voiceover (costs money)`.
6. In Conventions, replace the bullet

```
- Scene durations come from voiceover length via `calculateMetadata` +
  `getAudioDurationInSeconds` — never hardcoded frame counts for ad scenes.
```
with

```
- Scene durations come from the voiceover's per-character timing
  (`voz.alineacion.json`), turned into props by `scripts/core/render-plan.mjs`;
  `calculateMetadata` only sums them and checks the mp3 against that timing —
  never hardcoded frame counts for ad scenes.
- The week's script is `out/<week>/guion.md`: `## intro`, one `## <slug>` per
  event, `## outro`, written by the orchestrator (rules: `.claude/skills/church-ads/script.md`).
```

- [ ] **Step 5: Edit `PLAN.md`**

1. Replace the line `  <slug>/{ad.png, voz.mp3, clip.mp4, guion.md}` with:

```
  guion.md, voz.mp3, voz.json, voz.alineacion.json   the week's narration
  <slug>/{ad.png, clip.mp4}
```
2. Replace the Phase 3 body, from the line ``.claude/agents/ad-designer.md` defines one designer-publicist per event.` through the line ``events.json`.` that ends the paragraph starting ``script.md` fixes register, CTA` (leave the `**Checkpoint:**` line after it), with:

```
`.claude/agents/ad-designer.md` defines one designer per event. Each reads `design.md` and
its own event record, then delivers `video/src/ads/<slug>.tsx` (a props-driven Remotion
component) and a manifest fragment (template, warnings). *Amended 2026-09-21:* designers
no longer write scripts or voice. The orchestrator writes one narration for the whole week
(`out/<week>/guion.md`: intro, one section per event, outro), voices it in one ElevenLabs
`with-timestamps` take, and the scenes are cut where the voice pauses. `script.md` fixes
register and the closing words, and forbids stating any fact absent from `events.json`.
Design: `docs/superpowers/specs/2026-09-21-weekly-narration-design.md`.
```
3. In Phase 4, replace the paragraph

```
The detail that makes it read as *edited* rather than a slideshow:
`calculateMetadata` + `getAudioDurationInSeconds`, so each scene lasts exactly as
long as its own voiceover plus padding. No scene ends mid-sentence, no dead air.
```
with

```
The detail that makes it read as *edited* rather than a slideshow (*amended
2026-09-21*): one continuous narration over the whole reel, and each scene cut where the
voice pauses, from the voice's per-character timing (`voz.alineacion.json`); the clip of
one event plays only its own slice. `calculateMetadata` checks the mp3 against that
timing. No scene ends mid-sentence, no dead air.
```
4. In the decisions table, replace the row that starts `| Closing CTA |` with:

```
| Closing CTA | The church's own, read from `church-info.md` (`Llamado a la accion`). For IPUC Envigado Central that is **"Te esperamos"**, spoken once in the weekly outro, followed by the optional `Despedida` (**"Dios te bendiga"**, added 2026-09-21). Event lines carry neither. If the file has none, the ads have none. |
```
and add, right after it:

```
| Weekly narration | *2026-09-21.* One script for the whole week, voiced in one take, so the video sounds like one ad and not five joined ones. The intro and outro are narrated ("Bienvenidos a <Nombre>, estos son nuestros eventos del … al …"; the call to action and `Despedida`). |
```

- [ ] **Step 6: Edit `README.md`**

1. Replace the three list items

```
4. **Crea un anuncio por evento**: el diseño, el guion y la voz.
5. **Revisa** que ningún guion diga algo que no esté en el evento.
6. **Genera los videos.**
```
with

```
4. **Crea el diseño de cada evento.**
5. **Escribe la narración de la semana**: un solo guion (bienvenida, un evento tras
   otro y el cierre) y una sola voz que lo lee de corrido.
6. **Revisa** que el guion no diga algo que no esté en el evento.
7. **Genera los videos.**
```
2. In the folder listing, replace the lines from `  charla-familias/` through `    voz.mp3                  la locución` with:

```
  guion.md                   lo que dice la voz, de principio a fin
  voz.mp3                    la locución de toda la semana
  charla-familias/
    ad.png                   la imagen del anuncio
    clip.mp4                 el clip de ese evento, con su parte de la voz
```
3. Replace ``- **Las horas y las fechas** de cada `ad.png` y de cada `guion.md`.`` with ``- **Las horas y las fechas** de cada `ad.png` y del `guion.md`.``, and `- **Escucha cada voz.**` with `- **Escucha la voz completa.**`.
4. In the church-info table, replace the `Llamado a la accion` row with these two rows:

```
   | `Llamado a la accion` | La frase con la que termina el video de la semana (por ejemplo, "Te esperamos") |
   | `Despedida` | Opcional: lo que se dice justo después (por ejemplo, "Dios te bendiga") |
```

- [ ] **Step 7: Verify nothing still points at the old flow**

```bash
cd /home/bryanjaramillo/decom-skills && grep -rn "tts.mjs <slug>\|<slug>/guion.md\|<slug>/voz.mp3\|introSeconds\|Wordmark iglesia" --include=*.md --include=*.mjs --include=*.ts --include=*.tsx . 2>/dev/null | grep -v node_modules | grep -v "^./docs/" | grep -v "^./out/"
```
Expected: no output. Any hit is a place that still describes the old per-event flow: fix it the same way as the sections above.

- [ ] **Step 8: Run everything and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# tests 158`, `# fail 0`.

```bash
git add .claude/skills/church-ads/script.md .claude/skills/church-ads/SKILL.md .claude/agents/ad-designer.md CLAUDE.md PLAN.md README.md
git commit -m "Document the weekly narration flow and take scripts and voice off the designers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
`PLAN.md` and `README.md` are known to carry the user's uncommitted edits (the `Nombre` row of the README table, the Deferred paragraph of the plan). Run `git diff --stat -- PLAN.md README.md` first, and stage only the hunks of this task with `git add -p PLAN.md README.md` (or ask the user to commit theirs before you start).

---

### Task 12: The real week, voiced once, measured, and handed to the user

**Files:**
- Generated only (git-ignored): `out/2026-W39/{voz.mp3, voz.json, voz.alineacion.json, semana.mp4, <slug>/{ad.png, clip.mp4}}`

**Interfaces:**
- Consumes: everything above. This is the acceptance run for the spec.

- [ ] **Step 1: Confirm a clean starting point**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills
node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"; (cd video && npx tsc --noEmit; echo "tsc exit=$?"); git status --short
```
Expected: `# fail 0`, `tsc exit=0`, and no modified tracked files other than the user's own work in progress.

- [ ] **Step 2: Read the script against the record, as the orchestrator does**

Open `out/2026-W39/events.json` and `out/2026-W39/guion.md` side by side and confirm, event by event: the title is the calendar's own (`Oracion virtual` becomes "la oración virtual de jóvenes", where "de jóvenes" is the record's `ministerio`); each weekday equals `diaSemana` (lunes, miércoles, viernes); the place is the record's (`Templo` for the two in-person events, none stated for the virtual one); no time is stated anywhere because none exists (`hora: null`); the call to action and blessing appear only in the outro. If you change a word, run the validator again (next step).

- [ ] **Step 3: Validate**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node scripts/validate.mjs 2026-W39 --narracion; echo "exit=$?"
```
Expected: `exit=0`; notices are only the three `sin-hora` and `sin-audio`.

- [ ] **Step 4: Voice the week (spends about 280 characters of ElevenLabs quota, once)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node scripts/tts.mjs --week 2026-W39; echo "exit=$?"
```
Expected: the validation output, then `2026-W39: wrote .../out/2026-W39/voz.mp3 (NNN characters).` and `exit=0`. If `exit=3`, the service was unreachable or refused: report it, do not retry in a loop; the reel can still be rendered silent. Then confirm the cache works, which costs nothing:

```bash
node scripts/tts.mjs --week 2026-W39; echo "exit=$?"
```
Expected: `2026-W39: voz.mp3 is up to date, no API call made.` and `exit=0`.

- [ ] **Step 5: Render (CPU-bound; run nothing else meanwhile)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node scripts/render.mjs 2026-W39 2>&1 | tail -20; echo "exit=${PIPESTATUS[0]}"
```
Expected: no `(silent)` in the per-event lines, no `No voiceover` line, no `FAILED`, `exit=0`.

- [ ] **Step 6: Measure the result (the same kind of evidence that found the original problem)**

The bundled ffmpeg has `silencedetect` but not `volumedetect` (see the memory note on VM media tooling).

```bash
D=/home/bryanjaramillo/decom-skills/video/node_modules/@remotion/compositor-linux-arm64-gnu
export LD_LIBRARY_PATH=$D
cd /home/bryanjaramillo/decom-skills
echo "--- reel duration"; $D/ffprobe -v error -show_entries format=duration -of csv=p=0 out/2026-W39/semana.mp4
echo "--- silences of 0.6 s or more in the reel"; $D/ffmpeg -hide_banner -nostats -i out/2026-W39/semana.mp4 -vn -af silencedetect=noise=-40dB:d=0.6 -f null - 2>&1 | grep silence_
```
Expected: the reel's duration matches the `semana: ... (NN.N s)` line from the render to within 0.1 s. Silences: exactly one that starts at 0 and ends near 0.6-0.8 s (the lead-in), and one that starts about 1 s before the end (the tail). **Any silence in between means the voice paused 0.6 s or longer inside the piece**: report it to the user; the fix is the one constant `JOINER` in `scripts/core/narracion.mjs` (or a rewording), and it needs a new voicing.

Then check that each clip carries only its own line. This prints how long each clip should last (lead + its slice + tail):

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseNarracion, sectionTimes } from './scripts/core/narracion.mjs';
import { brand } from './video/src/brand/tokens.ts';
const d = 'out/2026-W39';
const t = sectionTimes(parseNarracion(readFileSync(d + '/guion.md', 'utf8')).sections, JSON.parse(readFileSync(d + '/voz.alineacion.json', 'utf8')));
const m = brand.motion;
for (const x of t) console.log(x.id.padEnd(16), 'speech', x.startSec.toFixed(2), '-', x.endSec.toFixed(2), '| clip should last about', (m.leadSeconds + (x.endSec - x.startSec) + m.slicePadBeforeSeconds + m.slicePadAfterSeconds + m.tailSeconds).toFixed(2), 's');
"
for s in oracion-virtual refam-juvenil charla-familias; do printf '%s ' $s; LD_LIBRARY_PATH=$D $D/ffprobe -v error -show_entries format=duration -of csv=p=0 out/2026-W39/$s/clip.mp4; done
```
The `MODULE_TYPELESS_PACKAGE_JSON` warning is harmless. Expected: each clip's measured duration is within 0.1 s of its "should last" figure, and the `intro` and `outro` lines are just the speech windows for reference.

- [ ] **Step 7: Full suite, type-check, and the state of the tree**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && cd /home/bryanjaramillo/decom-skills && node --test scripts/test/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"; (cd video && npx tsc --noEmit; echo "tsc exit=$?"); git status --short
```
Expected: `# tests 158`, `# fail 0`, `tsc exit=0`, and a clean tree apart from the user's own work in progress.

- [ ] **Step 8: Hand it to the user for listening**

Tell the user, in a few lines: the files are `out/2026-W39/semana.mp4` and the three clips; what the measurement showed (speech in the intro, all three events and the outro; the silences found, if any); and ask them to listen for three things I cannot judge from measurements: (1) how the voice says "IPUC" and "Refam", (2) whether the events sound like one telling rather than a list, and (3) whether the cuts land where the voice breathes. If "IPUC" is wrong, respelling it in the script is the user's call, and it needs a small follow-up (the intro check compares the church name as `church-info.md` writes it).

The per-event `guion.md`, `voz.mp3` and `voz.json` inside `out/2026-W39/<slug>/` are leftovers of the old pipeline. They are disposable and nothing reads them; offer to delete them, do not delete them unasked.

---

## Done when

- The weekly video has a narrated intro ("Bienvenidos a …, estos son nuestros eventos del … al …"), narrated events, and a narrated outro ("Te esperamos, Dios te bendiga."), with the call to action said once.
- The three event lines open differently, and `validate` would flag it if they did not.
- One voice take covers the whole reel, with no pause of 0.6 s or more inside it.
- Each `clip.mp4` plays only its own line.
- `node --test scripts/test/*.test.mjs` shows 158 passing, `tsc` exits 0, and every doc that described per-event scripts now describes the weekly narration.
