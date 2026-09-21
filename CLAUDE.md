# CLAUDE.md

Generator of weekly advertisement videos for the IPUC (Iglesia Pentecostal Unida
de Colombia) congregations; today, IPUC Envigado Central. Reads a week of events
from Google Calendar and produces, per event, a branded image and a video clip,
plus one Spanish narration for the whole week — then edits them into one weekly
video.

**Scope: the IPUC organization only.** Every congregation shares the
organization's identity (colors, logo, fonts), so the brand lives in code on
purpose (`video/src/brand/tokens.ts`, `brand/`). Do not move it into
`church-info.md` or generalize it to other brands. Only each congregation's own
facts change (its name, address, services), and those live in `church-info.md`.

Read `PLAN.md` first: it holds the build contract, the phase breakdown and the
verified feasibility findings.

## Hard rules

1. **Never invent event facts.** Times, places, names and details may only come
   from the event card, `church-info.md`, or the user. A wrong time in a church
   ad sends real people to a locked door, so what is unknown stays *absent*: an
   event whose time cannot be found is advertised by date only. Doubts about an
   event are asked once, in plain Spanish, at a checkpoint before anything is
   made, each with a safe suggested answer; the user's "sigue" accepts only what
   the sources say and never adds a fact. What does block is an integrity
   error: an `inferido` time source, a malformed time, a duplicate slug, an
   override that names no event. `events.json` carries `horaFuente` for exactly
   this; `scripts/validate.mjs` audits it before rendering.
2. **All audience-facing output is in Spanish** (Colombia), addressing the
   reader as `tú` — never `usted`. The closing call to action is the church's
   own, from `church-info.md` (`Llamado a la accion`; for IPUC Envigado Central
   it is "Te esperamos"), spoken once, in the weekly outro, followed by the
   church's `Despedida` if it has one ("Dios te bendiga"); event lines carry
   neither. If the file has none, the ads have none. Code, comments and these
   docs are in English; `README.md`, the church team's guide, is the exception
   and is in Spanish.
3. **All video is 16:9, 1920x1080, 30fps.** Templates must re-layout rather than
   hardcode, so 9:16 remains possible later.
4. **Subagents never render.** They write components. The orchestrator writes
   the week's narration, voices it once and renders — rendering is CPU-bound
   and must be serialized.
5. **`video/src/brand/tokens.ts` is the single source of truth** for colors,
   spacing and type scale. No hardcoded hex values in ad components. It holds
   the IPUC's identity, in code by design (see Scope).
6. **Church facts are reference data, never code.** Name, address, default
   place, ministries, call to action, blessing (`Despedida`) and recurring
   services come from
   `church-info.md`, free text that the orchestrator reads (no code parses it;
   `church-info.example.md` only suggests what to say); the time zone comes from
   the calendar itself. Nothing about a specific congregation is written in
   `scripts/` or `video/src/` (the organization's brand is not a congregation's
   fact), so another IPUC congregation reuses the tool by swapping only
   `church-info.md`. Tests and their fixtures use a fictional church ("Iglesia
   Ejemplo"): no real congregation's name, not even as a calendar name.

## Commands

Run them from the repo root with a subshell for `video/`, so the working
directory does not drift.

```bash
node scripts/normalize.mjs --week 2026-W39    # raw calendar -> out/<week>/events.json
node scripts/validate.mjs 2026-W39 [slug] [--narracion]   # audit events.json, each ad, the week's guion.md
node scripts/gen-registry.mjs                 # rebuild video/src/ads/registry.gen.ts
node scripts/tts.mjs --week 2026-W39            # the week's one voiceover (costs money)
node scripts/render.mjs 2026-W39 [slug]       # stills, clips, then semana.mp4
node --test scripts/test/*.test.mjs           # unit tests (use the glob)

(cd video && npx remotion studio)                      # live preview
(cd video && npx remotion still <CompId> out/x.png)    # one frame as PNG
(cd video && npx tsc --noEmit)                         # type-check
```

`render.mjs` is the way to render a week; the raw `remotion` commands are for
previewing a single composition.

## Environment

Harness is the Claude Code CLI. Machine setup is assumed done and is not
tracked in this repo.

- Node 22+ (verified on v22.23.2), on arm64 Linux. In the Claude Code Bash tool
  `node` is not on PATH: run
  `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` first.
- There is no system `ffmpeg`/`ffprobe`. Remotion bundles them in
  `video/node_modules/@remotion/compositor-linux-arm64-gnu/`; set `LD_LIBRARY_PATH`
  to that directory or they fail to load. That build is trimmed: no `volumedetect`,
  `astats` or `s16le`. To measure audio levels, decode to `pcm_s16le` WAV and
  compute the RMS in Node.
- `.env` (git-ignored) holds `ELEVEN_LABS_API_KEY` and `ELEVEN_LABS_VOICE_ID`;
  `scripts/core/tts.mjs` also accepts the `ELEVENLABS_*` spelling. Never print
  their values. The voice ID lives there, while the model and voice settings are
  in `scripts/voice.json` (version-controlled). TTS goes through
  `scripts/tts.mjs` against the REST API — not the MCP connector — so that a past
  week re-renders identically.
- `REMOTION_BROWSER_EXECUTABLE` — optional. Set it to an existing Chromium when
  Remotion cannot download its own (see `PLAN.md` § Environment). Render scripts
  fall back to Remotion's default when unset. On Linux, Remotion's own headless
  Chromium also needs system libraries (`libnss3`, `libnspr4`, ...); `ldd` on
  its `headless_shell` names any that are missing.

## Conventions

- Remotion animations are driven by `useCurrentFrame()` + `interpolate()`. CSS
  `transition`/`animation` and Tailwind animation classes do **not** render.
- Scene durations come from the voiceover's per-character timing
  (`voz.alineacion.json`), turned into props by `scripts/core/render-plan.mjs`;
  `calculateMetadata` only sums them and checks the mp3 against that timing —
  never hardcoded frame counts for ad scenes.
- The week's script is `out/<week>/guion.md`: `## intro`, one `## <slug>` per
  event, `## outro`, written by the orchestrator (rules: `.claude/skills/church-ads/script.md`).
- One component per event at `video/src/ads/<slug>.tsx`, props-driven so it can
  be re-rendered from `events.json` alone.
- Slugs are lowercase, accent-stripped, hyphenated: `Charla familias` ->
  `charla-familias`.
- Code does dates and numbers; the orchestrator reads the words. The calendar
  titles and `church-info.md` are typed by non-technical staff, so no code parses
  them: after a first `normalize` run the orchestrator writes
  `out/<week>/lectura.json` (the church facts, and per event its clean title, time,
  place, ministry and modality, each with its source) and runs `normalize` again.
  Checkpoint 1 is the only gate on that reading. An event's time is taken from, in
  order: the calendar card (code), the title (`2pm ...`), then `church-info.md` (an
  untimed event on a service day takes that service's *start* time; a day with
  several services, the one the title names). No match means no time. Human answers go in
  `overrides/<week>.json`, keyed by slug (`hora`, `lugar`, `modalidad`,
  `plantilla`, `omitir`); `hora: null` and `lugar: null` announce the event
  without it. The orchestrator writes that file from the user's answers; users
  never edit it. See `.claude/skills/church-ads/SKILL.md`.
- The users are non-technical church staff, so the orchestrator proposes instead
  of asking for a perfect prompt: the week (current one Mon-Fri, the upcoming one
  on Sat/Sun) and the calendars whose name contains the church's. It talks to them
  in plain Spanish (`tú`; never slug, override, JSON or ISO week) in two
  checkpoints: one before anything is made (the events with the time and place each
  will use, and only the real doubts, each with a suggested answer) and one showing
  the script before the paid voice. Details in the skill.
- The church name reaches the audience in two places only. The voice says it once,
  in the weekly intro ("Bienvenidos a <name>"), and `validate.mjs` checks the intro
  against `church-info.md`. On screen it appears only through `Logo`: the logo image
  carries it, and only when `brand.logo` is null does `Logo` draw the name as a
  wordmark, reading it from `IglesiaProvider` (`video/src/church.tsx`, wrapped once
  in `EventAd` and `WeeklyReel`); this org does not need that fallback. By the
  script rules, event lines and the outro do not say the name, so a single-event
  clip never speaks it. An ad never types the name, reads `iglesia.nombre` (by
  property or by destructuring) or calls `useIglesia()`: `scripts/core/ad-source.mjs`
  rejects those (`nombre-literal`, `nombre-en-texto`). Aliasing
  (`const i = iglesia; i.nombre`) cannot be detected, so review catches it.
- Work on `scripts/` test-first (`node --test scripts/test/*.test.mjs`). Remotion
  components have no test harness: check them with `tsc --noEmit` and a rendered
  still. To see a token-dependent path (for example the no-logo wordmark), change
  the token temporarily, render a still to a scratch directory, and restore the
  file.
- The `destacado` template is only ever chosen through an override.
- Never name a directory `lib`: the `.gitignore` is the Python template and
  ignores it.
- Generated output lives in `out/<YYYY>-W<NN>/` and is disposable; never edit it
  by hand.

## Reference

Official Remotion agent skills are worth installing for animation, transition
and voiceover guidance:

```bash
npx skills add remotion-dev/skills
```

Remotion is free to use here under its non-profit clause.
