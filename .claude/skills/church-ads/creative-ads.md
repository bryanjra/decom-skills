# Creative levels

`design.md` holds the rules that never move: tokens only, facts only from `events.json`,
the logo on a flat panel, Spanish with `tú`. This file decides **how much creativity an
ad gets and how to spend it**. Read it after `design.md`, pick a level for your event
(§ 1), and build to that level. Every rule of `design.md` still holds at all three.

The levels come from how the church's own designers work. They have five reference
pieces (§ 8); the images are not in the repo, so each is described in words there.

## 1. Pick the level

Take the first match. Decide from `events.json` only, never from a guess about what the
event is. If two seem to fit, or you cannot tell, take the more sober one (the higher
number is the bolder one).

| Level (`nivel`) | Pick it when | Look |
|---|---|---|
| **3 `juvenil`** | `ministerio` names a youth group (Jóvenes, Adolescentes) or the title says *juvenil* / *jóvenes* / *adolescentes* | Joyful and attractive for young people: big, energetic, warm |
| **2 `tematico`** | Not youth, and either `plantilla` is `destacado` (a person marked it special) or the title names a themed edition or a subject of its own (a family service, a campaign, a retreat), not a regular service under its usual name | The subject shown as a drawn motif |
| **1 `institucional`** | Everything else, above all a regular service under its usual name (a prayer service, Sunday school) | The corporate brand manual, as written |

A `horaFuente` of `church-info.md` means the time came from the church's recurring
services. It is a hint of a regular service, not proof: an untimed event inherits the time
of the service on its weekday even when it is a themed edition of it (ad2 is a family
service in the Sunday-school slot, and it is `tematico`).

Audience beats recurrence: a weekly youth prayer hour is still `juvenil` (reference ad3).
If the title's meaning is unclear (a nickname, an acronym) do not guess it: judge by
`ministerio`, and draw that ministry's motif, never an invented one.

`plantilla` is the structure and the level is the finish. A `virtual` event still reads
as online and a `destacado` one keeps its hero scale, whatever the level.

## 2. The three levels at a glance

| | 1 `institucional` | 2 `tematico` | 3 `juvenil` |
|---|---|---|---|
| Idea | Sober, trustworthy: the manual | One idea: the event's subject, drawn | Energy: the audience is young |
| Build | The `design.md` wrapper: `<Layout>` chosen by `plantilla` | Custom composition from `parts.tsx` plus one large motif | Custom composition from `parts.tsx` plus motif, brush bands, icon chips |
| Type | `Headline` as is | Two sizes: a small lead-in, the subject word at `hero` scale | Uppercase, weight 800, tight tracking, one giant word, a slight skew |
| Color | Field, white type, cyan secondary, gold as one small mark | Radial gradient from `background` to `primary`, tints of `primary`, gold highlight | Dark field, gold and cyan as the two pops, white type. **No new hues** |
| Motif | None, or one tonal texture | One large, anchored to a side | A group of figures or raised hands with a warm gold glow |
| Motion | Calm `Reveal` stagger | Motif springs in, then a very slow drift | Snappy: springs with overshoot, 4 to 6 frames between elements, sparks pop |
| Density | Title, info, call to action | Title, info, call to action, motif | The same content, more graphic devices. Never more text |

## 3. Level 1: `institucional`

This is the manual: a flat dark-blue field, the logo, restrained type, little text. The
wrapper in `design.md` is already a complete Level 1 ad, and the three layouts
(`Estandar`, `Virtual`, `Destacado`) are all this level. Deliver it as it is: your work on
this event is then its script and voice. Choosing this level is not an obligation to decorate.

- One optional extra: a single tonal motif behind the title as texture, in `surface` or
  `primary` at 0.25 alpha or less, like the faded collage in ad5. Skipping it is correct.
- Gold marks one thing (the tag, a rule). It is an accent, never a background.
- Motion is `Reveal`. Nothing loops, nothing bounces.

## 4. Level 2: `tematico`

The event has a subject, so show it. Draw one large motif (§ 6) related to a word in the
`titulo` or `ministerio`: family for a family talk, hands for a prayer, raised hands and a
sunrise for a campaign.

- Field: a radial gradient from `brand.color.background` to `brand.color.primary` (the
  manual's own *degradé radial*), built from tokens in a template string. White type
  is weak on the cyan end, so put the dark end under the text and the light end behind
  the motif.
- Composition: motif on one side, the text block on the other (ad2). Text never sits on
  the motif unless it has a solid or shaded panel under it (`design.md` § Legibility).
- Title: split it into words from the title itself, a small lead-in and the subject word
  large (ad2 sets "Culto de" small over a huge "Familias"). Only the words the record has.
- Info: date and time may share one pill (ad2). A null time or place drops its part.
- Motion: the motif springs in over the first second, then drifts slowly for the rest of
  the scene. Light rays behind it can turn slowly, driven by the frame.

## 5. Level 3: `juvenil`

Make it joyful and attractive to a young audience, using the palette only (`tokens.ts`
does not change). The energy comes from scale, angle, shape and motion, not from new colors.

- **Type.** Uppercase, `brand.font.display`, weight 800, tight tracking. One word at
  `brand.type.hero` scale or larger and everything else far smaller (ad1's giant
  "Jóvenes"). A `skewX` of a few degrees and an outline (`WebkitTextStroke`) on the giant
  word add attitude. Brush lettering is not available: only Montserrat is vendored, and
  fonts cannot be imported.
- **Brush band.** A rough-edged SVG band in `accent` or `primary` behind a secondary line
  (the blue strip behind "Juvenil" in ad3, the black one in ad4). Wipe it in with a
  `scaleX` from the frame. A few short angled strokes ("sparks") around the headline pop in
  after it.
- **Color.** Keep at least 60% of the frame on the dark field. Gold and cyan are the only
  pops. Where the examples use pink or orange, use gold or cyan.
- **Motif.** Silhouettes of people in a circle, or raised hands, in `surface` and
  `primary` tints, lit by a low-alpha radial glow in `accent` (ad3's glow, ad4's sunrise).
  The warmth comes from the glow, not from a new hue.
- **Info chips.** Date and time as outlined pills (ad1), or an icon row (ad3, ad4) with a
  drawn calendar, clock and pin, each heading its own chip. An icon exists only for a field
  the record has: no time, no clock chip.
- **Motion.** Headline words spring in one by one with slight overshoot, the band wipes,
  the sparks pop, the motif floats a few pixels. Everything must be in by 60% of the clip.
- **Tone.** Joyful is not flippant: no jokes, no slang, no emoji. The manual asks for a
  serious and trustworthy voice, and prayer and worship are sincere.

## 6. The motif: drawn in code

The pipeline has no photos and a designer adds none: draw the motif as inline SVG or
CSS shapes inside your own `<slug>.tsx`, as a small component. Flat silhouettes read well
and are safe: a circle for a head, a rounded body, one tint per figure.

| The title or ministry says | A motif to draw |
|---|---|
| familia, familias | Three or four figures of different heights, close together |
| oración, orar | Two hands pressed together, or seated figures in a circle around a glow |
| jóvenes, juvenil | Figures in a circle with arms over shoulders, or a crowd of raised hands |
| evangelismo, campaña | Raised hands against a sunrise, rays fanning from the horizon |
| alabanza, adoración | Raised hands, sound waves or a musical note |
| escuela dominical, enseñanza | An open book. The manual's own graphic is the open-book wave (p.56) |
| bautismo | Layered water waves (the manual reads blue as water and new birth) |
| anything else | The radial gradient with slow light rays. Do not invent a subject |

The table is a starting point. What is fixed:

- **A motif makes no claim.** Figures are anonymous. Draw no place, crowd count, person or
  object that the record does not name.
- **No text in a motif.** No SVG `<text>`, no verse, no slogan.
- **Never echo the logo.** No lone globe, ring or lettered arc: the manual forbids using
  its parts separately (pp.17 to 19). If you draw a book, use the wave graphic of p.56,
  never the logo's four gold lines.
- **Keep the logo's field flat.** The logo (`Logo`, or `CornerLogo` in left-aligned layouts;
  `design.md` § Brand) sits on a flat area of `brand.color.background`: no gradient, glow,
  band or motif behind it or over it. Levels 2 and 3 reserve its corner or footer strip and
  keep the gradient, the glow and the motif out of it.
- **Colors come from `brand.color.*`** on every `fill` and `stroke`. No `#hex`, no
  `rgb()`, no named colors such as `white`. Gradients and glows are built from tokens
  with `alpha()`.
- **Drive it with the frame.** `spring()` and `interpolate()` on `useCurrentFrame()`, with
  `useLayout().durationInFrames` for the slow drift. No SVG `<animate>`, no CSS animation.
- **Scale with `u` and lay out with flex or `inset`.** In `portrait` the motif moves above
  or below the text instead of beside it.

## 7. You cannot see your work

You never render, and the orchestrator will look at the still and may send it back. So
build so it cannot go wrong quietly:

- Give the motif its own region (the side or the bottom) and the text its own region. Let
  them overlap only where the text has a panel behind it.
- Use `Headline` or `fitSize` for every title, so a long one fits.
- Keep the motif's opacity and size modest: a motif that is too quiet costs the ad a
  little, one that crowds the title costs the whole ad.
- Keep all text inside the `brand.space.xl` margin and all of it in by 60% of the clip.
- Type-check with `(cd video && npx tsc --noEmit)` and run `validate.mjs`. That is all the
  checking there is.

## 8. What the five references teach

The church's own pieces. Copy the method, never the contents: they carry colors, photos and
copy that this pipeline cannot use, listed under each.

| Ref | Piece | What it teaches | Do not copy |
|---|---|---|---|
| **ad1** | *Integración Jóvenes, Mente y fe*: a purple duotone photo of young people hugging in a circle; a giant white "JÓVENES" with a thin script word across it; date and time in outlined pills at the top corners; two line icons beside a bold subtitle | Level 3. One giant word against small type; pills for date and time; a circle of people as the motif | The purple, the photo, the quotation under the subtitle, the script face, the missing logo |
| **ad2** | *Culto de Familias, Escuela Dominical*: a sky-blue glow with light rays and a large arc; a smiling family in front of the title; a small navy script line over a heavy white "CULTO DE FAMILIAS"; one white and blue pill "date, time"; the logo at the bottom | Level 2 in brand blues. The subject beside the title; two title sizes; one info pill | The photo, the script face, the logo sitting on a gradient (the manual wants a flat panel) |
| **ad3** | *Hora de oración juvenil*: near-black navy; white and gold brush lettering; a blue brush strip behind "Juvenil"; five silhouetted young people praying in a circle around a warm glow; a three-column icon row (calendar, clock, video call) | Level 3 closest to the palette. Glow and silhouettes; the icon row; the brush strip | "Todos los lunes" (a recurrence the record lacks), "por Google Meet" (a platform the record lacks), the purpose line, "Invita Comité de Jóvenes", the four-word footer, the missing logo |
| **ad4** | *Campaña Evangelista*: a sunset crowd with raised hands; a cream paint-stroke banner behind black brush lettering; orange, pink, yellow and cyan highlights; three round icon badges (place, time, everyone); a boxed footer | Level 3 scale. A crowd of raised hands is the motif; the banner; round icon badges | The orange and pink, "Todos invitados", "¡No faltes!", the invitation line, the second event folded into the footer, the missing logo |
| **ad5** | *Culto de Oración*: a blue monochrome collage of people praying, faded; a huge script "Oración" with a small white bold "CULTO DE"; the logo and "Envigado Central" at the bottom; no date, no time | Level 1. One field, one dominant word, the logo. Imagery, when present, is tonal | The photos, the script face |

The secondary copy in the references (a quotation, a purpose line, an "everyone is invited"
line, a slogan) is not in `events.json`, so it is not on screen. The space it filled goes
to the motif or to air. Nor does the logo go missing: it is mandatory (`brand/corporate-brand.md`).
The church name appears only inside the logo (`design.md` § Facts), so a typed name such as
ad5's "Envigado Central" is not reproduced either.

## 9. Report your level

Add `nivel` to your manifest fragment (see `.claude/agents/ad-designer.md`): `institucional`,
`tematico` or `juvenil`. If it was a judgement call, say why in one line of `avisos`. The
orchestrator reads the stills against the level you chose.
