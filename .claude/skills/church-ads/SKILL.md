---
name: church-ads
description: Produce the weekly church ad video. Pulls a week of events from Google Calendar, builds events.json, fans out one ad-designer per event, validates, and renders per-event images and clips plus one combined weekly video. Use when asked to make, redo or check a week of church ads.
---

# Weekly church ads: orchestrator workflow

You are the video editor. Designers write components, scripts and audio in
parallel. **You render, and only you**: rendering is CPU-bound and is serialized by
`scripts/render.mjs`.

Read `design.md` (the visual and component contract), `script.md` (the Spanish
copy rules) and `creative-ads.md` (how much creativity each kind of event gets) before
briefing anyone; the designers read them too.

## Hard rules

1. **Never invent an event fact.** A time, place, name or detail may only come from
   the calendar card, `church-info.md`, or the person you are working for. What is
   unknown stays absent: the ad is made without it.
2. All audience-facing text is Spanish (Colombia), addressing the reader as `tú`.
3. All video is 16:9, 1920x1080, 30 fps.
4. The church's facts (name, address, default place, ministries, call to action,
   recurring services) live in `church-info.md`, never in code. See
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
`video/src/ads/<slug>.tsx`, `out/<week>/<slug>/guion.md`, `voz.mp3` and a JSON
manifest fragment (`slug`, `plantilla`, `nivel`, `palabras`, `audio`, `avisos`). Collect the
fragments; gather every `avisos` entry for the final report.

A designer that reports `audio: "silent"` (ElevenLabs unreachable) is a valid
delivery: the event is rendered without a voiceover and listed at the end.

### 6. Validate every delivery

```bash
node scripts/validate.mjs 2026-W39
```

This checks each ad file against the source rules and each script against its
record. Exit **2** blocks rendering: send the error back to that event's designer (or
fix the file yourself), then validate again. Notices do not block.

Then read every `guion.md` against `events.json` yourself. The checker is a net, not
proof: it will not notice an invented topic. A time in a church ad that is not in
the record sends real people to a locked door.

### 7. Render

```bash
node scripts/render.mjs 2026-W39            # every event, then semana.mp4
node scripts/render.mjs 2026-W39 <slug>     # one event only, no weekly video
```

`render.mjs` validates again, regenerates `video/src/ads/registry.gen.ts`, stages
each `voz.mp3` into `video/public/audio/`, bundles once, and renders one thing at a
time: per event `ad.png` and `clip.mp4`, then `semana.mp4` (an intro card with the
dated week text, the events in order with transitions, an outro; a music bed only
if `video/public/music/bed.mp3` exists). Set `REMOTION_BROWSER_EXECUTABLE` where
Remotion cannot download its own Chromium.

Look at the stills (`out/<week>/<slug>/ad.png`) before calling it done. Generated
output is disposable and is never edited by hand: change the source and render again.

### 8. Report

Say what was produced, then the things the person must know: the events made
without a time or place, any event rendered silent (and the command to retry its
voice: `node scripts/tts.mjs <slug> --week <week>`), and the designers' `avisos`.

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

After editing an override, run step 3 again, then re-run the affected designer. A
designer's script and component follow `events.json`, so an outdated one fails
`validate.mjs`.

## Layout of a week

```
out/<week>/
  raw/<calendar>.json      calendar response, verbatim
  events.json              the contract
  <slug>/{guion.md, voz.mp3, voz.json, ad.png, clip.mp4}
  semana.mp4
```
