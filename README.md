# Anuncios semanales de la iglesia

Esta herramienta lee los eventos de la semana en Google Calendar y prepara, para cada
uno, una **imagen** y un **clip de video**, y escribe **una sola narración en español**
para toda la semana. Luego junta todo en **un solo video semanal** con una tarjeta de
introducción, transiciones, la voz de corrido y un cierre.

Todo sale en formato horizontal (16:9, 1920x1080), en español de Colombia y hablándole
al público de **tú**.

Es para las congregaciones de la **IPUC** (Iglesia Pentecostal Unida de Colombia). El
logo, los colores y la tipografía son los de la organización, iguales para todas, y ya
vienen dentro del proyecto. Lo único que cambia de una congregación a otra es su
`church-info.md`: su nombre, su dirección y sus horarios.

## La regla que no se rompe

**La herramienta nunca inventa datos de un evento.** Una hora, un lugar o un detalle
solo pueden venir de tres sitios: la tarjeta del evento en el calendario,
`church-info.md`, o alguien del equipo. Una hora equivocada en un anuncio manda a la
gente a una puerta cerrada.

Por eso, si no se sabe la hora de un evento, el anuncio **sale sin hora** (solo con la
fecha) y la herramienta te avisa. No se detiene y tampoco adivina.

## Lo que necesitas una sola vez

1. **Claude Code**, abierto en esta carpeta y con acceso al Google Calendar de la
   iglesia.
2. **`church-info.md`**: los datos de tu iglesia. Copia `church-info.example.md` y
   llénalo. Estos campos son opcionales, pero lo que falte no aparecerá en los anuncios:

   | Campo | Para qué sirve |
   |---|---|
   | `Nombre` | El nombre de tu congregación (por ejemplo, «IPUC Envigado Central»). Se dice una vez, en la bienvenida de la voz de la semana; en pantalla el nombre va en el logo, nunca escrito aparte |
   | `Direccion` | Aparece en el cierre del video |
   | `Lugar por defecto` | Dónde es un evento cuando su tarjeta no dice nada |
   | `Ministerios` | Lista separada por comas (Jóvenes, Familias...) para etiquetar el público |
   | `Llamado a la accion` | La frase con la que termina el video de la semana (por ejemplo, "Te esperamos") |
   | `Despedida` | Opcional: lo que se dice justo después (por ejemplo, "Dios te bendiga") |
   | `Servicios recurrentes` | Los horarios fijos de la semana; de aquí sale la hora de un evento sin hora |

3. **Una cuenta de ElevenLabs de pago** y una voz elegida. Guarda los datos en un archivo
   `.env` en esta carpeta (nunca lo compartas ni lo subas a ningún sitio):

   ```
   ELEVEN_LABS_API_KEY=...
   ELEVEN_LABS_VOICE_ID=...
   ```

   Las voces de la biblioteca de ElevenLabs solo se pueden usar por API con un plan de
   pago. El modelo y los ajustes de la voz están en `scripts/voice.json`.
4. **El logo y los colores de la IPUC.** No hay que hacer nada: ya están, y son los de la
   organización, los mismos para todas las congregaciones. El logo está en `brand/logo/` y
   los colores, tomados del manual de identidad (`brand/corporate-brand.md`), en
   `video/src/brand/tokens.ts`, el único archivo donde viven. Falta la tipografía: hoy el
   diseño usa Montserrat de muestra en lugar de Myriad Pro, que es la del manual.

> Para quien administra el equipo: hace falta Node 22 o superior y las dependencias
> instaladas en `video/`. En Linux, el navegador de Remotion necesita librerías del
> sistema (`libnss3` y otras); `CLAUDE.md` explica cómo comprobarlo.

## Cada semana

Abre Claude Code en esta carpeta y pídele, por ejemplo:

> Haz los anuncios de la semana del 21 de septiembre.

Claude sigue la guía `church-ads` (en `.claude/skills/church-ads/`). En palabras
sencillas, esto es lo que pasa:

1. **Te pregunta** qué calendario y qué semana.
2. **Trae los eventos** de esa semana y los ordena en `out/2026-W39/events.json`
   (`W39` es el número de la semana del año, de lunes a domingo).
3. **Te dice qué eventos no tienen hora o lugar.** No es un error: esos anuncios salen
   sin ese dato. Aquí puedes corregirlo (ver más abajo).
4. **Crea el diseño de cada evento.**
5. **Escribe la narración de la semana**: un solo guion (bienvenida, un evento tras
   otro y el cierre) y una sola voz que lo lee de corrido.
6. **Revisa** que el guion no diga algo que no esté en el evento.
7. **Genera los videos.**

El resultado queda en `out/<año>-W<semana>/`:

```
out/2026-W39/
  semana.mp4                 el video semanal completo
  events.json                los datos de la semana
  guion.md                   lo que dice la voz, de principio a fin
  voz.mp3                    la locución de toda la semana
  charla-familias/
    ad.png                   la imagen del anuncio
    clip.mp4                 el clip de ese evento, con su parte de la voz
```

`out/` es desechable: si algo no te gusta, cambia el origen (el guion, un dato, una
corrección) y vuelve a generar. Nunca edites esos archivos a mano.

## Cómo se decide la hora de un evento

En este orden, y se queda con la primera que encuentre:

1. La hora de la tarjeta del evento en el calendario.
2. Una hora escrita en el título (por ejemplo, `2pm ...`).
3. `church-info.md`: si el evento no tiene hora y cae en un día con servicio fijo, toma la
   hora de **inicio** de ese servicio. Los domingos hay dos servicios con nombre, así que
   se elige por el nombre del evento; si no coincide con ninguno, no se asigna hora.
4. Si nada de lo anterior aplica, **no hay hora**.

## Corregir una hora, un lugar o el diseño

Crea el archivo `overrides/<semana>.json` (por ejemplo, `overrides/2026-W39.json`). Cada
evento se identifica por su nombre corto (su *slug*: minúsculas, sin tildes y con
guiones, como `charla-familias`):

```json
{
  "charla-familias": { "hora": "19:00", "lugar": "Templo" },
  "reunion-interna": { "omitir": true }
}
```

| Clave | Valor | Efecto |
|---|---|---|
| `hora` | `"HH:MM"` en 24 horas | pone la hora; queda registrado que la dio una persona |
| `lugar` | texto | pone el lugar |
| `modalidad` | `presencial` o `virtual` | si eliges `virtual`, pon también `plantilla: "virtual"` |
| `plantilla` | `estandar`, `destacado` o `virtual` | `destacado` solo se usa por esta vía |
| `omitir` | `true` | saca el evento de la semana |

Después vuelve a pedirle a Claude que actualice la semana. Como la hora quedó en el
registro, el guion y los diseños se rehacen con ella.

## Dónde aparece el nombre de la iglesia

- **En la voz:** una sola vez, en la bienvenida del video semanal ("Bienvenidos a ..."),
  tal como está en `Nombre` de `church-info.md`. Las líneas de cada evento y el cierre no
  lo mencionan, así que el clip de un solo evento no dice el nombre en voz alta.
- **En pantalla:** solo dentro del logo. Ningún diseño escribe el nombre por su cuenta, y
  la validación lo rechaza si alguno lo hace.

## Usarlo en otra congregación de la IPUC

Copia el proyecto y llena `church-info.md` con los datos de esa congregación, a partir de
`church-info.example.md`. No hay nada que cambiar en `scripts/` ni en `video/src/`: el
nombre y los datos de la iglesia nunca están escritos en el código.

## Antes de publicar, revisa siempre

- **Las horas y las fechas** de cada `ad.png` y del `guion.md`. Es lo más importante.
- **Escucha la voz completa.** Si un nombre suena raro (por ejemplo, una sigla), avísale a
  Claude: el guion respeta los nombres tal como están en el calendario.
- **Los títulos** salen tal cual los escribió el calendario, con o sin tildes. Si en el
  calendario dice "Oracion virtual", el anuncio dirá "Oracion virtual".

## Costos

ElevenLabs cobra por caracteres del guion, y la voz de toda la semana se genera de una
sola vez. Si el texto del guion no cambia, la herramienta reutiliza la locución que ya
tiene y **no vuelve a cobrar**; cambiar una sola palabra sí genera un cobro nuevo, porque
se vuelve a leer la semana completa. Por eso conviene dejar el guion bien revisado antes
de generar la voz.

## Problemas frecuentes

| Qué ves | Qué significa |
|---|---|
| `[sin-hora]` ("has no time") | No se encontró hora. El anuncio sale con la fecha solamente. No es un error. |
| "voiceover unavailable" | No se pudo generar la voz (sin conexión o un problema con la cuenta). La semana sale **sin audio** y se avisa al final; la voz se puede volver a intentar después. |
| Un `ERROR` al validar | Un guion o un diseño dice algo que el evento no respalda. Se corrige y se vuelve a validar; hasta entonces no se genera nada. |
| La voz no dice el nombre de la iglesia, o el video sale sin la frase final | Faltan esas líneas en `church-info.md`. |

## Cambiar solo un evento

```bash
node scripts/render.mjs 2026-W39 charla-familias         # su imagen y su clip
node scripts/render.mjs 2026-W39                         # toda la semana y el video semanal
```

Al indicar un evento, no se rehace el video semanal: hace falta generar la semana
completa. La voz es una sola para toda la semana: si cambias algo del guion, se vuelve a
generar completa con `node scripts/tts.mjs --week 2026-W39`.

## Dónde está cada cosa

| Ruta | Qué contiene |
|---|---|
| `church-info.md` | Los datos de tu iglesia |
| `overrides/` | Correcciones de una persona, por semana |
| `brand/` | Logo y fuentes |
| `video/src/brand/tokens.ts` | Colores, tipografía y tamaños: el único sitio donde cambia el diseño de marca |
| `video/src/ads/` | Un archivo de diseño por evento |
| `scripts/` | Los pasos que Claude ejecuta |
| `out/` | Lo que se genera cada semana |
| `CLAUDE.md`, `PLAN.md` | Las reglas del proyecto y el plan de construcción (en inglés) |
| `.claude/skills/church-ads/` | La guía de trabajo: flujo semanal, diseño y redacción de guiones |
