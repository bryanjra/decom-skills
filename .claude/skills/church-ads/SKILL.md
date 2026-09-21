---
name: church-ads
description: Produce the weekly church ad video. Pulls a week of events from Google Calendar, builds events.json, fans out one ad-designer per event for the visuals, writes one narration for the whole week and voices it once, validates, and renders per-event images and clips plus one combined weekly video. The person needs no exact prompt: it proposes the week and the calendars and asks, in plain Spanish, about anything unclear before making anything. Use when asked to make, redo or check a week of church ads.
---

# Weekly church ads: orchestrator workflow

You are the video editor. Designers write components in parallel. **You write the
week's narration, voice it once, and render, and only you render**: rendering is
CPU-bound and is serialized by `scripts/render.mjs`.

Read `design.md` (the visual and component contract) and `creative-ads.md` (how much
creativity each kind of event gets) before briefing anyone; the designers read them
too. Read `script.md` (the Spanish copy rules) before writing the narration: it is
yours, not theirs.

The people you work for are church staff, not developers, and this tool is their
automation. They will not send a perfect prompt ("haz los anuncios" is enough), so you
propose and ask; they answer in a few words. Read *Talking to the person* before you say
anything to them.

## Hard rules

1. **Never invent an event fact.** A time, place, name or detail may only come from
   the calendar card, `church-info.md`, or the person you are working for. What is
   unknown stays absent: the ad is made without it. What is doubtful is asked once, at
   Checkpoint 1 (step 4); the person's "sigue" accepts only what the sources already
   say and never adds a fact.
2. All audience-facing text is Spanish (Colombia), addressing the reader as `tú`.
3. All video is 16:9, 1920x1080, 30 fps.
4. The church's facts (name, address, default place, ministries, call to action,
   blessing (`Despedida`), recurring services) live in `church-info.md`, never in code. See
   `church-info.example.md` for the format.

## Talking to the person

Everything you say to them follows these rules:

- **Spanish (Colombia), `tú`, short and warm, plain words.** The English of this file is
  for you, not for them.
- **Propose, do not quiz.** Every question carries a suggested answer and can be answered
  in a few words. Never ask an open question you could answer with a proposal.
- **No jargon.** Never say slug, override, JSON, `events.json`, notice ids (`sin-hora`),
  "ISO week", commands or file paths. Say "evento", "hora", "lugar", "la semana del 21 al
  27 de septiembre". Write times as "6:45 p. m." (`horaTexto`) and dates as `fechaTexto`.
- **Two checkpoints per run, one message each**: Checkpoint 1 (step 4) before anything is
  made, Checkpoint 2 (step 8) before the paid voice. Between them, do not interrupt.
  Never ask the same thing twice: what they answered lives in `overrides/<week>.json`, so
  read it before asking on a re-run.
- **Say what a problem means for them**, not the error text: "no pude generar la voz; te
  dejo el video sin audio y lo intento de nuevo cuando quieras".
- **Designers cannot reach the person** (they do not ask). Their `avisos` come to you, and
  you turn them into plain lines of the final list (step 11).

## Flow

### 1. Agree the week and the calendars

Propose; do not ask. The person may name neither, one or both, and whatever they name
wins.

- **The week** runs Monday to Sunday (an ISO week such as `2026-W39` for you, never for
  them). From today's date: Monday to Friday, propose the current week; Saturday or
  Sunday, propose the upcoming week and mention the one just ending. "La próxima semana"
  or a date they give is resolved the same way. Its dates:

  ```bash
  node -e "import('./scripts/core/spanish.mjs').then(m => console.log(m.weekRange('2026-W39')))"
  ```

- **The calendars** come from `list_calendars`: propose every calendar whose name contains
  the church's name (`Nombre` in `church-info.md`, ignoring case and accents), so
  "IPUC Ejemplo" and "IPUC Ejemplo II-2026" both match. Preview each with `list_events` for
  the week, read-only and with the window of step 2, and count its events. If no calendar
  matches, list them all and ask which are the church's: the one time step 1 asks its own
  question.

Do not send a message for this when the proposal is clear: state the week and the
calendars at the top of Checkpoint 1 (step 4), where the person can correct them.

### 2. Pull the events and save the raw response

For each proposed calendar, call Google Calendar `list_events` with `startTime` at the
Monday 00:00 and `endTime` at the following Monday 00:00 in the calendar's own
time zone, and `orderBy: startTime`: it is the same call as the step 1 preview, so save
what it returned instead of pulling again. Page through `nextPageToken` until it is
exhausted. Save the response **verbatim** as JSON (`summary`, `timeZone`, `events`)
to `out/<week>/raw/<name>.json`. One file per calendar. The normalizer also drops
anything outside the week, so a slightly wide window is safe. If the person drops a
calendar at Checkpoint 1, delete its file from `raw/` and run step 3 again.

### 3. Normalize

```bash
node scripts/normalize.mjs --week 2026-W39
```

This writes `out/<week>/events.json` and prints one line per event. The time of
each event comes from, in order: the card, the title (`2pm ...`), `church-info.md`
(an untimed event on a service day takes that service's start time; Sundays with
two named services are matched by name), and otherwise it has none. An
`overrides/<week>.json` that already exists is applied on top (see Overrides).

- Exit **2** means integrity errors: a malformed time, an untrusted `horaFuente`
  (`inferido`), a duplicate slug, an override that names no event. Fix the cause
  (an override, the raw file, `church-info.md`) and run it again. Do not continue.
- Exit **0** approves the file for the next step.

### 4. Checkpoint 1: confirm the week and ask about what is unclear

Send ONE message, in Spanish, before any designer starts. It has four parts:

1. **The week and the calendars**: "Voy a preparar la semana del lunes 21 al domingo 27 de
   septiembre con los calendarios X y Y (7 eventos)." Mention a calendar with no events
   that week; if every calendar is empty, say so and stop: there is nothing to make.
2. **Every event on one line**: day and date, title, and the time and place it will use,
   with where each comes from in plain words. Time: `calendario` "del calendario",
   `titulo` "escrita en el título", `church-info.md` "horario del culto", `usuario` "la que
   me dijiste", none "sin hora". Place: `church-info.md` "el lugar de siempre", none "sin
   lugar". Send this list even when there is nothing to ask: it is where a time taken from
   the church's schedule gets caught.
3. **Only the real doubts**, numbered, each with a suggested answer. Group the routine
   ones. The doubts:
   - **No time, or no place**: one question for all the events that will go without a time
     ("Estos saldrán solo con la fecha: A, B. Si alguno tiene hora, escríbela"), and one
     for those without a place. Suggested: leave them as they are.
   - **A time with no AM/PM** in the title (the `horaNota` says the title was not used):
     "¿2 de la mañana o de la tarde?" Suggested: date only.
   - **A Sunday with two services** where the title names neither (the `horaNota` lists
     them): which one. Suggested: date only.
   - **An all-day event that took a service time** (`horaFuente: church-info.md`): does it
     really start then? Ask it when it may not (a fast, a retreat, an event of several
     days); when it is plainly the service itself, its line in the list is enough.
     Suggested: date only.
   - **A place that is only the default** (`lugarFuente: church-info.md`): one grouped
     question ("Estos saldrán en el Templo porque el calendario no dice lugar: A, B"), and a
     separate one for an event that may be held elsewhere (a district or zone event, a
     convention, another church). Suggested: leave it.
   - **An unclear title**: an acronym or nickname you cannot read, or one that looks
     internal (a teachers' meeting, a committee). Ask what it is and whether to announce
     it; never guess its meaning. Suggested: leave it out if it looks internal, otherwise
     announce it with the title as the calendar wrote it.
4. **How to answer**, in one line: "Responde con el número y una palabra, por ejemplo «1 no,
   2 omitir, 3 solo fecha, 4 sí», o escríbeme con tus palabras. Si todo está bien,
   escribe «sigue»."

**«Sigue»** (or "todo bien", "dale") accepts every suggested answer. A suggestion is only
ever one of three things: keep what the sources say, drop a time or place, or leave an
event out. It never adds a fact, and the final report lists what was left out, so
nothing disappears silently. Do not guess a time to fill a gap.

Then apply the answers yourself: write `overrides/<week>.json` (see Overrides), run step 3
again and check that it exits 0. The person never sees a file. If an answer is unclear,
ask again about that item only, once and rephrased; if it is still unclear, use the
suggestion and say so in the final report. If they dropped a calendar, see step 2. A fix
that belongs to the church for good (a missing service, the default place) is an update to
`church-info.md`: offer it once, in plain words, after the run.

### 5. Fan out one `ad-designer` per event

One subagent per event, all in a single message so they run in parallel. Each prompt
is just the `week` and the `slug`; they read everything else themselves. They deliver
`video/src/ads/<slug>.tsx` and a JSON manifest fragment (`slug`, `plantilla`, `nivel`,
`avisos`). They write no script and make no audio, and they cannot ask the person
anything. Collect the fragments; gather every `avisos` entry for the final report.

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

### 8. Checkpoint 2: show the script before the voice

The voice is the only step that costs money, and every later edit voices the whole week
again. So once validate passes and you have read the script, show `guion.md` to the
person as what the voice will say: the welcome, each event's line under its plain title,
the closing. Point out any word the voice may say oddly (an acronym; do not respell it,
see `script.md`). Say in one line that this is the last moment to change words before the
voice is generated, and wait for a yes. Apply their changes to `guion.md` (a change to a
fact is an override, step 4), validate again and show only the changed lines.

The person may waive this checkpoint ("no me lo muestres, genera la voz"): go straight to
step 9. A waiver never relaxes the hard rules or `validate.mjs`.

### 9. Voice the week

```bash
node scripts/tts.mjs --week 2026-W39
```

One request voices the whole script in a single take and keeps its per-character timing
(`voz.mp3`, `voz.json`, `voz.alineacion.json`). It refuses to run while validation has
errors and reuses the files when the text is unchanged. It costs money and every edit
re-voices the whole week, so validate and Checkpoint 2 come first. Exit **3** (ElevenLabs
unreachable) is a valid outcome: the week is rendered silent and reported. After the first
voicing, ask the person to listen: this is the first time the voice says the church's name.

### 10. Render

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

### 11. Report

In Spanish, in plain words: what was produced and where (the week's folder under `out/`),
then a list headed **"Revisa esto antes de publicar"** with what the person must know:
the events made without a time or place, the events left out (by their answer or by
"sigue"), any answer you applied for them, whether the week was rendered silent (and how
to retry: they can ask you to voice it again; the command is `node scripts/tts.mjs --week
<week>`), the designers' `avisos` put in plain words, and any word the voice may
mispronounce. Always end with the reminder to check every time and date in the images.

## Overrides

Human answers live in `overrides/<week>.json`, keyed by slug, and are applied by
step 3. **You write this file from the person's answers** (Checkpoints 1 and 2); they never
edit it. An override is how their answers are kept: a time or place they supply, a time or
place they do not want, the layout, an event they drop. Because it persists, it is also
what stops a question being asked twice. All keys are optional:

```json
{
  "culto-especial": {"hora": "19:00", "lugar": "Salón Principal", "plantilla": "destacado"},
  "ayuno-evangelismo": {"hora": null},
  "reunion-interna": {"omitir": true}
}
```

| Key | Value | Effect |
|---|---|---|
| `hora` | `"HH:MM"`, 24 h, or `null` | `"HH:MM"` sets the time (its source becomes `usuario`); `null` announces the event without a time, even if the card, the title or a service gave one |
| `lugar` | text, or `null` | text sets the place; `null` announces the event without a place, even the default one |
| `modalidad` | `presencial` or `virtual` | if you set `virtual`, set `plantilla: "virtual"` too |
| `plantilla` | `estandar`, `destacado` or `virtual` | `destacado` is only ever chosen this way |
| `omitir` | `true` | drops the event from the week |

In the person's words: "solo con la fecha" is `hora: null`, "sin lugar" is `lugar: null`,
"omítelo" is `omitir: true`, and a time or place they give is `hora` or `lugar`.

After editing an override, run step 3 again, then rewrite that event's line in `guion.md`
(and re-run its designer if the template changed), validate, show the changed lines
(Checkpoint 2) and voice the week again (step 9). A script or component that no longer
follows `events.json` fails `validate.mjs`.

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
