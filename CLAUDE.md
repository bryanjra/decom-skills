# CLAUDE.md

Generator of weekly advertisement videos for IPUC Envigado Central. Reads a week
of events from Google Calendar and produces, per event, a branded image, a
Spanish voiceover and a video clip — then edits them into one weekly video.

Read `PLAN.md` first: it holds the build contract, the phase breakdown and the
verified feasibility findings.

## Hard rules

1. **Never invent event facts.** Times, places, names and details may only come
   from the event card, `church-info.md`, or the user. A wrong time in a church
   ad sends real people to a locked door, so what is unknown stays *absent*: an
   event whose time cannot be found is advertised by date only. That is a
   non-blocking report to the user, not a stop. What does block is an integrity
   error: an `inferido` time source, a malformed time, a duplicate slug, an
   override that names no event. `events.json` carries `horaFuente` for exactly
   this; `scripts/validate.mjs` audits it before rendering.
2. **All audience-facing output is in Spanish** (Colombia), addressing the
   reader as `tú` — never `usted`. The closing call to action is the church's
   own, from `church-info.md` (`Llamado a la accion`; for IPUC Envigado Central
   it is "Te esperamos"); if the file has none, the ads have none. Code,
   comments and these docs are in English.
3. **All video is 16:9, 1920x1080, 30fps.** Templates must re-layout rather than
   hardcode, so 9:16 remains possible later.
4. **Subagents never render.** They write components, scripts and audio. The
   orchestrator renders — it is CPU-bound and must be serialized.
5. **`video/src/brand/tokens.ts` is the single source of truth** for colors,
   spacing and type scale. No hardcoded hex values in ad components.
6. **Church facts are reference data, never code.** Name, address, default
   place, ministries, call to action and recurring services come from
   `church-info.md` (format: `church-info.example.md`); the time zone comes from
   the calendar itself. Nothing about a specific church is written in `scripts/`
   or `video/src/`, so another church can reuse the tool. Tests use a fictional
   church ("Iglesia Ejemplo").

## Commands

Run them from the repo root with a subshell for `video/`, so the working
directory does not drift.

```bash
node scripts/normalize.mjs --week 2026-W39    # raw calendar -> out/<week>/events.json
node scripts/validate.mjs 2026-W39 [slug]     # audit events.json and each delivery
node scripts/gen-registry.mjs                 # rebuild video/src/ads/registry.gen.ts
node scripts/tts.mjs <slug> --week 2026-W39   # one voiceover (costs money)
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

- Node 22+ (verified on v22.23.2), on arm64 Linux.
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
- Scene durations come from voiceover length via `calculateMetadata` +
  `getAudioDurationInSeconds` — never hardcoded frame counts for ad scenes.
- One component per event at `video/src/ads/<slug>.tsx`, props-driven so it can
  be re-rendered from `events.json` alone.
- Slugs are lowercase, accent-stripped, hyphenated: `Charla familias` ->
  `charla-familias`.
- An event's time is taken from, in order: the calendar card, the title
  (`2pm ...`), then `church-info.md`. An untimed event on a service day inherits
  that service's *start* time; Sundays have two named services, so they are
  matched by name. No match means no time. Human answers go in
  `overrides/<week>.json`, keyed by slug (`hora`, `lugar`, `modalidad`,
  `plantilla`, `omitir`); see `.claude/skills/church-ads/SKILL.md`.
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
