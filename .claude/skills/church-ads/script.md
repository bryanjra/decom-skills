# Script rules (`guion.md`)

The voiceover of one event: about 20-25 words, roughly ten seconds. The script is
read aloud to the church and published, so an invented detail here reaches real
people. `node scripts/validate.mjs` catches many slips; it is a net, not proof, and
the orchestrator still reads every script.

## The one rule

State nothing that is not in `out/<week>/events.json`: the event's own record and
the `iglesia` block. That covers everything you would be tempted to add: a speaker,
a topic, a theme, "trae tu Biblia", food, a dress code, an age range, a price, "es
gratis", an address that is not `iglesia.direccion`. If it is not in the record, it
is not in the script. A short script that says less is correct.

## Language and register

- Spanish (Colombia). Address the listener as **tú**: "te invitamos", "ven", "trae".
  Never `usted`, `ustedes`, "los esperamos", "les invitamos".
- Warm and direct, spoken sentences. No slogans, no hype, no exclamation stacks.
- Write for the ear: real accents and punctuation (the voice reads them), no
  abbreviations, no emoji, no digits where a word reads better.

## Structure

1. **What and for whom.** The title (`titulo`), and `ministerio` if there is one.
2. **When.** The day as `diaSemana` ("el viernes"), then the time if there is one.
3. **Where.** `lugar` if there is one; for a virtual event, say that it is virtual.
4. **Close** with `iglesia.llamadoAccion`, word for word. If it is `null`, close
   with nothing invented; do not make up a call to action.

Name the church (`iglesia.nombre`) at most once, and only when it is not `null`.

## Time

- Say the time exactly as `event.horaHablada` ("a las siete de la noche"). Do not
  re-derive it from `hora`, and do not convert it to digits.
- `hora` is `null`: **mention no time at all.** No clock time, no "por la noche",
  no "a la hora de siempre", no "por confirmar". The ad gives the day only.
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
`horaTexto`, `lugar`). Do not add counts, ages, years or prices.

## Odd words in a title

Keep the words of the title as the calendar wrote them ("Refam", "Oracion virtual"):
that is the church's own name for the event. Fit them into a natural sentence, but do
not rename the event. If a title looks like an acronym or a word the voice may
mispronounce, do not "fix" it in the script. Mention it in `avisos` so a person
can listen before it is published.

## Format of `guion.md`

Spoken text only. Lines starting with `#` and `<!-- ... -->` comments are ignored by
both `validate.mjs` and `tts.mjs`; everything else is sent to the voice, so it is
useful for a title or a note to yourself, and nothing else.

Event with a time (`hora: "18:45"`, `horaHablada: "a las seis y cuarenta y cinco de la tarde"`,
`lugar: "Salón Principal"`, `diaSemana: "sábado"`, `llamadoAccion: "Te esperamos"`):

```markdown
# Culto de jóvenes
Te invitamos al culto de jóvenes, el sábado a las seis y cuarenta y cinco de la tarde, en el Salón Principal. Te esperamos.
```

Event with no time (`hora: null`): the day is all it says.

```markdown
# Retiro de familias
<!-- sin hora en el registro: el guion no menciona ninguna -->
Te invitamos al retiro de familias el viernes, en el Salón Principal. Ven y comparte con nosotros. Te esperamos.
```

Check every script against these before delivering:

- Is every fact in the record? Delete each one that is not.
- Is there a time? Then is it `horaHablada`, verbatim? No time: is there no hint of one?
- Does it end with `llamadoAccion`?
- Is it `tú` all the way through, and between 15 and 32 words?
