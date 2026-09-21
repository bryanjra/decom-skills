# Weekly narration: one script, one voice take

Status: design approved in conversation 2026-09-21, awaiting spec review. Not implemented.

## Problem

Watching `out/2026-W39/semana.mp4` showed two things wrong.

1. **The ads sound like five blocks glued together.** The three `guion.md` files are the
   same sentence: "Te invitamos a… Será el *día*, en el Templo. Te esperamos." Causes, all
   in the pipeline rather than in any one script:
   - `script.md` prescribes one fixed four-part structure and gives a literal example.
   - It also requires every script to close with `llamadoAccion`; `validate` warns when
     one does not (`sin-cta`).
   - One `ad-designer` runs per event, in parallel, allowed to touch only its own files,
     so no writer sees the others.
   - Each event has its own voice take plus its own 0.6 s lead-in and 1.0 s tail.
2. **The intro and outro are silent.** The reel's audio carries three voiceovers and
   nothing else: 3.2 s of silence at the start, two gaps of about 1.5 s, and 4.8 s at the
   end (measured on the rendered file; both stereo channels are intact).

## Goal

The weekly video is one continuous piece: a spoken welcome, the week's events told in
varied phrasing that flows from one to the next, and a single spoken close. The church's
call to action is said once, at the end.

Target narration for W39, for illustration only (facts come from `events.json`; the
phrasing is the writer's, and event titles keep the calendar's own words):

> Bienvenidos a IPUC Envigado Central, estos son nuestros eventos del veintiuno al
> veintisiete de septiembre. El lunes es la oración virtual de jóvenes. El miércoles, el
> Refam juvenil, en el Templo. Y el viernes, la charla familias, también en el Templo.
> Te esperamos, Dios te bendiga.

## Non-goals

- No music bed. The `musicSrc` slot in `WeeklyReel` stays as it is.
- No new visual templates; `Estandar`, `Virtual`, `Destacado` are untouched.
- No change to how events, times and places are found (`normalize.mjs`, `audit.mjs`).
- Individual events are not re-voiced as standalone ads (see Assumptions).

## Design

### 1. The script: `out/<week>/guion.md`

One file for the whole week, replacing the per-event `out/<week>/<slug>/guion.md`. Written
by the orchestrator in a single pass with every event in view.

```markdown
## intro
Bienvenidos a IPUC Envigado Central, estos son nuestros eventos del veintiuno al veintisiete de septiembre.

## oracion-virtual
…

## outro
Te esperamos, Dios te bendiga.
```

Section ids are `intro`, each event's `slug`, and `outro`, in that order, events in
`events.json` order. `<!-- … -->` comments and `# ` title lines are still ignored. A slug
equal to `intro` or `outro` is an audit error (`slug-reservado`).

Writing rules replace the fixed template in `script.md`:
- Keep "the one rule" (nothing outside `events.json`), the `tú` register, the time rules
  (`horaHablada` verbatim, none when `hora` is null), no relative dates, place and
  modality rules, numbers rule, and the odd-words rule.
- An event section is one or two spoken sentences with what, day, time if any, and place
  if any, in whatever order suits the sentence.
- No two neighbouring events open with the same words. Sequence connectors ("El lunes…",
  "Después, el miércoles…", "Y el viernes…") are fine because they are true of the list
  order; claims like "el último evento de la semana" are not, since the calendar may hold
  events the list does not.
- Event sections carry no greeting and no call to action.
- **Intro:** welcomes, names the church (`iglesia.nombre`, omitted if null) and says the
  week range exactly as `semana.hablada` (new field, below).
- **Outro:** `llamadoAccion`, then `despedida`, verbatim. Either one missing from
  `church-info.md` is simply absent; both missing means no outro line.

### 2. Church facts

`church-info.md` gains one optional field, `Despedida: Dios te bendiga`, parsed by
`church-info.mjs` into `iglesia.despedida` (null when absent), copied into the `iglesia`
block of `events.json` by `normalize.mjs`, added to the `Iglesia` type, and documented in
`church-info.example.md`. This keeps the blessing out of the code, per hard rule 6. The
`OutroCard` also shows it under the call to action.

`spanish.mjs` gains `semanaHablada(inicio, fin)`: "del veintiuno al veintisiete de
septiembre", or "del veintiocho de septiembre al cuatro de octubre" across a month.
`normalize.mjs` writes it to `semana.hablada`. Day numbers 1–31 are spoken as words, like
`horaHablada`.

### 3. One voice take, with timestamps

`scripts/tts.mjs` becomes weekly: `node scripts/tts.mjs --week 2026-W39 [--force]`.

- Sends the cleaned section texts joined with a single space as one request to
  `/v1/text-to-speech/{voice_id}/with-timestamps`, same REST-only access, same
  `scripts/voice.json`.
- Writes `out/<week>/voz.mp3`, `out/<week>/voz.json` (model, voice, character count,
  `cacheKey`) and `out/<week>/voz.alineacion.json` (the raw per-character alignment).
- `cacheKey` covers the full text and the voice settings, so an unchanged script costs
  nothing. Editing any word re-voices the whole week, about 400 characters.
- Same failure contract: exit 3 when the service is unreachable or refuses; the week is
  then rendered silent and reported.
- The old per-slug mode and per-event `voz.mp3` files go away.

### 4. From alignment to scenes (pure functions, unit-tested)

A new `scripts/core/narracion.mjs` holds the logic that has no I/O:

- `parseNarracion(md)` → ordered `[{id, text}]`.
- `sectionTimes(sections, alignment)` → `[{id, startSec, endSec}]`. Each section's
  character span in the exact string sent maps to the alignment's start of its first
  character and end of its last.
- `cuts(times, {leadSec, tailSec})` → the reel-time instants where one scene hands over to
  the next: the midpoint of the pause between one section's end and the next's start, so
  the visual cut lands in a natural breath. The voice starts `leadSec` after frame 0 and
  the last scene ends `tailSec` after the final word.
- `sceneFrames(cutFrames, transitionFrames)` → each scene's length such that
  `TransitionSeries` overlaps line up with the cuts: the transition straddles the cut
  (`floor(tf/2)` before, the rest after), so scene *i+1* starts exactly `tf` before scene
  *i* ends, and the narration never drifts against the picture.

Because derivation is a pure function of `guion.md` and the stored alignment, changing the
cut rule never needs another API call.

### 5. Rendering

- `WeeklyReel` plays one `Html5Audio` at reel level (from `leadFrames`); the intro card, the
  event scenes and the outro card get their lengths from `sceneFrames`, passed in as props by
  `render-plan.mjs`. `calculateMetadata` sums them and checks the mp3's length
  (`getAudioDurationInSeconds`) against the alignment's end, throwing if they differ by more
  than 0.5 s. This replaces the CLAUDE.md convention "durations come from
  `getAudioDurationInSeconds`" with "durations come from the voiceover's timestamps and are
  checked against the file".
- Without `voz.mp3`, sections are sized from word counts (`wordsPerSecond`) and the intro
  and outro cards fall back to `introSeconds` / `outroSeconds`, as today.
- `EventAd` (clip.mp4, ad.png) plays its own slice of the same file with `trimBefore` /
  `trimAfter` (both exist in the installed Remotion 4.0.526) and is as long as the slice
  plus lead and tail.
- `stage-audio.mjs` stages `out/<week>/voz.mp3` to `video/public/audio/semana.mp3` and deletes
  a stale copy when the week has none, the same rule it applies per slug today.

### 6. Validation (`validate.mjs`, `narracion.mjs`)

- Structure errors: missing section for an event, unknown section id, wrong order, empty
  section, reserved slug.
- Each event section runs through the existing `checkGuion` (day, time, place, numbers,
  register), minus the `sin-cta` notice.
- New notices: an event section containing `llamadoAccion` or `despedida`
  (`cta-fuera-del-cierre`); two neighbouring event sections opening with the same first two
  words (`apertura-repetida`), the very complaint that started this.
- Intro errors: it does not contain `semana.hablada` verbatim; `iglesia.nombre` is set but
  absent from it.
- Outro error: it is not exactly `llamadoAccion` and `despedida` as `church-info.md` gives
  them (punctuation and case aside).
- Length notice per event section retuned for a line with no call to action (about 12–30
  words); the numbers are set in the plan.

### 7. Roles and docs that change

- `ad-designer` delivers the component only. Its script, `tts.mjs` call, the TTS cost
  paragraph and the `palabras` field leave `ad-designer.md`.
- `SKILL.md` flow: fan out designers (components) → the orchestrator writes `guion.md` →
  validate → `tts.mjs` once → render.
- `CLAUDE.md`: hard rule 4 ("subagents write components, scripts and audio") becomes
  "components"; the `tts.mjs` command line and the durations convention change as above;
  the rule-2 call-to-action sentence says it is spoken once, in the outro. `PLAN.md` records
  the `Despedida` decision.

## Assumptions to confirm at review

1. Individual `clip.mp4` files are slices of the weekly narration and end without "Te
   esperamos". If the clips are posted standalone, they need their own closing and this
   design does not give them one.
2. "Bienvenidos" stays plural as the user wrote it, although the project rule is `tú`;
   the validator's register check is about `usted/ustedes` forms and does not flag it.

## Risks

- **`with-timestamps` with the church's voice is unverified.** Task 1 of the plan is one real
  call (about 100 characters) to confirm a 200 with `audio_base64` and per-character
  `alignment` for this shared-library voice and `eleven_multilingual_v2`. If it fails, fall
  back to one take per section with request stitching. Sections 1, 2, 6 and 7 apply
  unchanged; `cuts` and `sceneFrames` (section 4) and the rendering (section 5) still
  apply, fed by each file's measured duration instead of the alignment.
- **"IPUC" has never been spoken by the voice.** The current scripts never say the church's
  name. On first listen, check the pronunciation; if it is wrong, a phonetic respelling of
  the spoken text is a choice for the person, and the intro check then compares the name
  after that respelling.
- **Any edit re-voices the whole week.** Acceptable at about 400 characters, but the script
  should be validated and read before the single `tts.mjs` call.
- **Seam feel.** Sections are joined by a single space so the voice reads one flowing
  paragraph; the joiner is one constant to change if a listen says it is too rushed.

## Testing

Unit tests in `scripts/test/` using the fictional "Iglesia Ejemplo" fixtures:
`parseNarracion`, `sectionTimes` on a fixture alignment (accents included), `cuts` and
`sceneFrames` (sum of scenes minus overlaps equals reel length; no drift at each cut),
`semanaHablada` (same month, across months, days 30 and 31), `Despedida` parsing, the new
validation rules, and `stage-audio` for the weekly file.

Then verification by measurement, using the same decode-and-RMS approach that found the
current gaps: render W39 and confirm speech in the intro, all three events and the outro,
with no silence longer than about 0.6 s between the first and last word, and a listen by the
user for pronunciation and flow.
