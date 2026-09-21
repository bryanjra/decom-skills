---
name: church-ads
description: Produce the weekly church ad video. Pulls a week of events from Google Calendar, builds events.json, fans out one ad-designer per event for the visuals, writes one narration for the whole week and voices it once, validates, and renders per-event images and clips plus one combined weekly video. Use when asked to make, redo or check a week of church ads.
---

# Weekly church ads: orchestrator workflow

You are the video editor. Designers write components in parallel. **You write the
week's narration, voice it once, and render, and only you render**: rendering is
CPU-bound and is serialized by `scripts/render.mjs`.

Read `design.md` (the visual and component contract) and `creative-ads.md` (how much
creativity each kind of event gets) before briefing anyone; the designers read them
too. Read `script.md` (the Spanish copy rules) before writing the narration: it is
yours, not theirs.

## Hard rules

1. **Never invent an event fact.** A time, place, name or detail may only come from
   the calendar card, `church-info.md`, or the person you are working for. What is
   unknown stays absent: the ad is made without it.
2. All audience-facing text is Spanish (Colombia), addressing the reader as `tú`.
3. All video is 16:9, 1920x1080, 30 fps.
4. The church's facts (name, address, default place, ministries, call to action,
   blessing (`Despedida`), recurring services) live in `church-info.md`, never in code. See
   `church-info.example.md` for the format.

## Flow

### 1. Ask which calendar and which week

Use `list_calendars` if the calendar is not obvious. The week is an ISO week
(`2026-W39`, Monday to Sunday); its dates:

```bash
node -e "import('./scripts/core/spanish.mjs').then(m => console.log(m.weekRange('2026-W39')))"
```

### 2. Pull the events and save the raw response

Call Google Calendar `list_events` for that calendar, with `startTime` at the
Monday 00:00 and `endTime` at the following Monday 00:00 in the calendar's own
time zone, and `orderBy: startTime`. Page through `nextPageToken` until it is
exhausted. Save the response **verbatim** as JSON (`summary`, `timeZone`, `events`)
to `out/<week>/raw/<name>.json`. One file per calendar. The normalizer also drops
anything outside the week, so a slightly wide window is safe.

### 3. Normalize

```bash
node scripts/normalize.mjs --week 2026-W39
```

This writes `out/<week>/events.json` and prints one line per event. The time of
each event comes from, in order: the card, the title (`2pm ...`), `church-info.md`
(an untimed event on a service day takes that service's start time; Sundays with
two named services are matched by name), and otherwise it has none.

- Exit **2** means integrity errors: a malformed time, an untrusted `horaFuente`
  (`inferido`), a duplicate slug, an override that names no event. Fix the cause
  (an override, the raw file, `church-info.md`) and run it again. Do not continue.
- Exit **0** approves the file for the next step.

### 4. Report what has no time or place. This does not block.

Tell the person, in one message, which events will be made **without a time** and
which **without a place**, using the `sin-hora` / `sin-lugar` notices. Then carry on:
those ads give the date only. Offer the fix once: an override (below) or an update to
`church-info.md`, followed by a re-run of step 3. Do not ask for permission to
continue, and do not guess a time to fill the gap.

### 5. Fan out one `ad-designer` per event

One subagent per event, all in a single message so they run in parallel. Each prompt
is just the `week` and the `slug`; they read everything else themselves. They deliver
`video/src/ads/<slug>.tsx` and a JSON manifest fragment (`slug`, `plantilla`, `nivel`,
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

A single-slug render still needs a valid weekly `guion.md`: every clip is a slice of the
one narration, so a facts error in another event's line blocks it too.

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

## Overrides

Human answers live in `overrides/<week>.json`, keyed by slug, and are applied by
step 3. An override is how a person supplies a time or place, changes the layout, or
drops an event. All keys are optional:

```json
{
  "culto-especial": {"hora": "19:00", "lugar": "Salón Principal", "plantilla": "destacado"},
  "reunion-interna": {"omitir": true}
}
```

| Key | Value | Effect |
|---|---|---|
| `hora` | `"HH:MM"`, 24 h | sets the time; its source becomes `usuario` |
| `lugar` | text | sets the place |
| `modalidad` | `presencial` or `virtual` | if you set `virtual`, set `plantilla: "virtual"` too |
| `plantilla` | `estandar`, `destacado` or `virtual` | `destacado` is only ever chosen this way |
| `omitir` | `true` | drops the event from the week |

After editing an override, run step 3 again, then rewrite that event's line in `guion.md`
(and re-run its designer if the template changed) and voice the week again (step 8). A
script or component that no longer follows `events.json` fails `validate.mjs`.

## Layout of a week

```
out/<week>/
  raw/<calendar>.json      calendar response, verbatim
  events.json              the contract
  guion.md                 the week's narration, written by the orchestrator
  voz.mp3, voz.json, voz.alineacion.json   the one voiceover and its per-character timing
  <slug>/{ad.png, clip.mp4}
  semana.mp4
```
