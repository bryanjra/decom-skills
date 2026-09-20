# Anuncios IPUC — Weekly Church Ad Video Generator

Pulls a week of events from Google Calendar, fans out one subagent per event to
design an ad and record a Spanish voiceover, then edits everything into one
professionally-cut video plus per-event assets.

**Status:** planned, not yet implemented. This document is the build contract.
**Target runtime:** Claude Code on the desktop app (see [Environment](#environment)).
**Branch:** `claude/church-ad-video-generator-rn8pnl`

---

## 1. Feasibility — verified 2026-09-20

Everything below was tested in a live container, not assumed.

| Capability | Verdict | Evidence |
|---|---|---|
| Google Calendar pull | Works | Listed calendars; pulled real events from both church calendars |
| Remotion render @ 1920x1080 | Works | Rendered h264 mp4 + PNG still, 30fps |
| Remotion licence | Free to use | Licence grants free use to "a non-profit or not-for-profit organization" |
| Official Remotion skills | Exist | `remotion-dev/skills` — install with `npx skills add remotion-dev/skills` |
| Spanish accents / Google Fonts | Works | Accented text rendered correctly; `fonts.gstatic.com` reachable |
| ffmpeg | Bundled | Ships inside `@remotion/compositor-linux-x64-gnu`; no system ffmpeg needed |
| ElevenLabs TTS | Blocked on web, fine on desktop | `api.elevenlabs.io` returned 403 from the web sandbox egress proxy |
| Remotion Chromium download | Blocked on web, fine on desktop | `remotion.media` returned 403; worked around with `--browser-executable` |

Measured: 2 seconds of 1080p took ~19s on 4 cores (~10x realtime). Rendering is
the bottleneck and scales with core count.

### The finding that shapes the design

The calendars do not carry enough information to write an honest ad. From a real
sample:

- `Charla familias` — all-day, no time, no location, no description
- `(Jóvenes) - Oracion virtual` — all-day, no time
- `2pm Ecos del Futuro Jovenes Distrito 9` — all-day, **time buried in the title**
- `Integración maestros Adolescentes` — has a real start/end time
- **No event** in either calendar has `location` or `description` populated

So the pipeline must reconstruct time and place from three sources, in order:
the event card, then `church-info.md`, then the human. It must never guess.

---

## 2. Architecture

```
Orchestrator (main session — "professional video editor")
  1. ask: which calendar? which week?
  2. pull events via Google Calendar MCP (America/Bogota)
  3. normalize + enrich -> out/<week>/events.json     <- the contract
  4. GATE: any event missing a time -> stop, ask, do not invent
  5. fan out one ad-designer subagent per event
  6. validate every delivery against events.json
  7. render stills, per-event clips, and the combined weekly video
```

Subagents write files and call APIs in parallel (I/O-bound, cheap). They never
render — rendering is CPU-bound and is serialized by the orchestrator.

Fan-out is what keeps this tractable: each designer's React source, script drafts
and API chatter stay inside its own context window, and only a short manifest
fragment comes back to the orchestrator.

### Repo layout

```
.claude/
  agents/ad-designer.md          subagent: designer + publicist
  skills/church-ads/
    SKILL.md                     orchestrator workflow
    design.md                    brand contract: format, fonts, colors, logo
    script.md                    Spanish copywriting rules
brand/
  logo.svg                       church logo (to be supplied)
  fonts/                         vendored font files for deterministic renders
church-info.md                   recurring event schedules + venue defaults
video/                           Remotion project (16:9, 1920x1080, 30fps)
  src/
    brand/tokens.ts              colors, spacing, type scale — single source of truth
    brand/fonts.ts               font loading
    templates/                   layout variants: destacado / estandar / virtual
    ads/<slug>.tsx               one component per event, written by subagents
    EventAd.tsx                  single-event composition
    WeeklyReel.tsx               TransitionSeries of all events
  public/audio/<slug>.mp3        voiceovers
scripts/
  tts.mjs                        ElevenLabs text-to-speech
  render.mjs                     stills, clips, weekly reel
out/<YYYY>-W<NN>/
  events.json
  <slug>/{ad.png, voz.mp3, clip.mp4, guion.md}
  semana.mp4
```

### The `events.json` contract

Every subagent reads this and may state nothing that is not in it.

```jsonc
{
  "week": "2026-W39",
  "calendar": "IPUC Envigado Central",
  "timezone": "America/Bogota",
  "events": [
    {
      "slug": "charla-familias",
      "titulo": "Charla familias",
      "ministerio": "Familias",        // parsed from "(Jóvenes)"-style prefix
      "fecha": "2026-09-25",
      "diaSemana": "viernes",
      "hora": "19:00",                 // from card | title regex | church-info.md
      "horaFuente": "church-info.md",  // provenance — audited by the orchestrator
      "lugar": "Templo",               // default; "Zoom"/"Virtual" inferred from title
      "modalidad": "presencial",       // presencial | virtual
      "plantilla": "estandar"
    }
  ]
}
```

`horaFuente` exists so the orchestrator can prove where every time came from. A
value of `inferido` is not allowed to reach a rendered ad.

---

## 3. Phases

### Phase 0 — Inputs needed (Bryan)

Environment is assumed working: Claude Code CLI with Google Calendar access and
`ELEVENLABS_API_KEY` already configured. Machine setup is out of scope for this
plan.

1. Church logo into `brand/` (SVG preferred, else high-res PNG).
2. Brand colors + fonts — or an existing flyer / Instagram post to extract from.
3. An ElevenLabs Spanish voice ID (Latin-American, `eleven_multilingual_v2`),
   pinned in the repo. The MCP connector is a good way to audition candidates.

### Phase 1 — Scaffold + brand system
Remotion project at 16:9 1920x1080 30fps. `tokens.ts` as the single source of
truth for the visual language. Fonts vendored locally so renders are
reproducible. `design.md` written as the contract subagents must obey.
Chromium path configurable via env var, defaulting to Remotion's own download.

**Checkpoint:** render one hardcoded sample ad to PNG + clip and review the frame.

### Phase 2 — Calendar to `events.json`
Normalizer handling the real mess found in the calendars:
- all-day vs. timed events
- regex extraction of times hiding in titles (`2pm ...`)
- ministry prefix `(Jóvenes)` to audience tag, which drives template and tone
- place defaults to the temple; `virtual` / `zoom` / `online` in the title
  switches to the virtual template
- merge recurring schedules from `church-info.md`
- **hard gate:** any event still missing a time halts the run with a precise list

**Checkpoint:** run against a real week; confirm the gate fires on `Charla familias`.

### Phase 3 — Subagent fleet
`.claude/agents/ad-designer.md` defines one designer-publicist per event. Each reads
`design.md` + `script.md` + its own event record, then delivers:
- `video/src/ads/<slug>.tsx` — props-driven Remotion component
- `out/<week>/<slug>/guion.md` — Spanish script, ~20-25 words (~10s read)
- `out/<week>/<slug>/voz.mp3` — ElevenLabs audio
- a manifest fragment: duration, template chosen, warnings

`script.md` fixes register, CTA, and forbids stating any fact absent from
`events.json`.

**Checkpoint:** one subagent end-to-end on a single event.

### Phase 4 — Assembly
Orchestrator validates each delivery against `events.json` (this is what catches a
hallucinated time), then renders stills, per-event clips, and `semana.mp4`:
intro card, events joined by `<TransitionSeries>` with fade/slide/wipe, outro,
music bed underneath.

The detail that makes it read as *edited* rather than a slideshow:
`calculateMetadata` + `getAudioDurationInSeconds`, so each scene lasts exactly as
long as its own voiceover plus padding. No scene ends mid-sentence, no dead air.

### Phase 5 — Dry run + docs
Full end-to-end on a real week; `README.md` for the church team.

---

## 4. Decisions made

| Question | Decision |
|---|---|
| Image generation | Design authored as a Remotion component. `remotion still` exports the PNG; the same component animates in the video. One source of truth. |
| Output format | 16:9 1920x1080 for everything. Templates built to re-layout to 9:16 later without a rewrite. |
| Deliverables | Per event: image, audio, clip. Plus one combined weekly video. |
| Missing location | Default to the temple. Infer "Zoom"/"virtual" from the event card. No address or phone needed. |
| Missing schedule | Recurring events from `church-info.md`; special events from the event card; otherwise stop and ask. |
| Harness | Claude Code CLI, so the pipeline can run over SSH on a Linux VM rather than only at a desk. |
| TTS access | ElevenLabs REST API via `scripts/tts.mjs`. Not the MCP connector: the pipeline must re-render a past week identically, and voice, model and stability belong in version control. The MCP server is still useful in Phase 0 for auditioning voices. |
| TTS billing | Pay-as-you-go, `eleven_multilingual_v2` at $0.10 per 1,000 characters. About $0.52/month at ~5,200 characters — cheaper per character than Starter's effective $0.20/1,000, and no subscription. Flash/Turbo halves the cost but loses quality on Spanish narration; not worth $0.25/month. |
| TTS licensing | Cleared. Confirmed directly with ElevenLabs that API use is good to go for this project; no attribution constraint blocks publishing. |
| Register | `tú`. Warm and direct, never formal `usted`. Applies to every script and every on-screen line. |
| Standard CTA | **"Te esperamos"**. Closes each ad unless an event has a genuinely different call. |
| Intro card | Yes. The weekly video opens with a dated card, e.g. "Semana del 21 al 27 de septiembre" — Spanish month names, lowercase. |
| Music bed | None for now. `WeeklyReel` still wires the audio slot so adding a track later is a config change, not a rewrite. |

## 5. Deferred

- **Music bed.** Shipping without one. The slot exists in `WeeklyReel`, so this
  stays a one-file change whenever a royalty-free track is chosen.

Still needed to start Phase 1, tracked in § 3 Phase 0: the logo, the brand
colors and fonts, and an ElevenLabs Spanish voice ID.

---

## 6. Environment

Assumed configured; setup is out of scope. Built and verified against Node
v22.22.2.

Two things the code must honor regardless of machine:

- **`REMOTION_BROWSER_EXECUTABLE`.** Render scripts use it when set and fall back
  to Remotion's own Chromium otherwise, so the repo runs unchanged where Remotion
  cannot download its browser.
- **Degrade rather than fail on TTS.** When ElevenLabs is unreachable, still
  produce images, scripts and a silent video, and report which events lack audio.

**Planning fact.** Rendering is the bottleneck and scales with core count:
measured ~10x realtime at 1080p on 4 cores. A six-event week, counting the
per-event clips, is a 20-25 minute job there.

**The gate is deliberately blocking.** An event with no known time halts the
pipeline and asks. That is correct for church ads but rules out an unattended
cron job until `church-info.md` covers every recurring event — worth revisiting
once the knowledge base has proven complete over a few weeks.
