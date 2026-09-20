# CLAUDE.md

Generator of weekly advertisement videos for IPUC Envigado Central. Reads a week
of events from Google Calendar and produces, per event, a branded image, a
Spanish voiceover and a video clip — then edits them into one weekly video.

Read `PLAN.md` first: it holds the build contract, the phase breakdown and the
verified feasibility findings.

## Hard rules

1. **Never invent event facts.** Times, places, names and details may only come
   from the event card, `church-info.md`, or the user. If a required field is
   still unknown, stop and ask. A wrong time in a church ad sends real people to
   a locked door. `events.json` carries a `horaFuente` field for exactly this —
   audit it before rendering.
2. **All audience-facing output is in Spanish** (Colombia). Code, comments and
   these docs are in English.
3. **All video is 16:9, 1920x1080, 30fps.** Templates must re-layout rather than
   hardcode, so 9:16 remains possible later.
4. **Subagents never render.** They write components, scripts and audio. The
   orchestrator renders — it is CPU-bound and must be serialized.
5. **`video/src/brand/tokens.ts` is the single source of truth** for colors,
   spacing and type scale. No hardcoded hex values in ad components.

## Commands

```bash
cd video
npx remotion studio                      # live preview, scrub the timeline
npx remotion render <CompId> out/x.mp4   # render a composition
npx remotion still <CompId> out/x.png    # export a frame as PNG
node ../scripts/tts.mjs <slug>           # generate one voiceover
```

## Environment

- Node 22+ (verified on v22.22.2)
- `ELEVENLABS_API_KEY` required for voiceovers
- Google Calendar connector must be enabled in the client; calendar access does
  not travel with the repo
- `REMOTION_BROWSER_EXECUTABLE` — optional. Set it to an existing Chromium when
  Remotion cannot download its own (see `PLAN.md` § Environment). Render scripts
  fall back to Remotion's default when unset.

## Conventions

- Remotion animations are driven by `useCurrentFrame()` + `interpolate()`. CSS
  `transition`/`animation` and Tailwind animation classes do **not** render.
- Scene durations come from voiceover length via `calculateMetadata` +
  `getAudioDurationInSeconds` — never hardcoded frame counts for ad scenes.
- One component per event at `video/src/ads/<slug>.tsx`, props-driven so it can
  be re-rendered from `events.json` alone.
- Slugs are lowercase, accent-stripped, hyphenated: `Charla familias` ->
  `charla-familias`.
- Generated output lives in `out/<YYYY>-W<NN>/` and is disposable; never edit it
  by hand.

## Reference

Official Remotion agent skills are worth installing for animation, transition
and voiceover guidance:

```bash
npx skills add remotion-dev/skills
```

Remotion is free to use here under its non-profit clause.
