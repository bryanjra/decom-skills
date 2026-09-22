# Church reference data — example

Copy this file to `church-info.md` and fill in your church's facts. Claude reads it
as plain text, so there is no format to get right: write it however is natural to you,
in lists, sentences or a table, and typos are fine. Nothing about any specific church is
written in the code. Anything you leave out is simply absent from the ads, never guessed.

What is useful to say:

- The church's name (Claude says it once in the voiceover; on screen the logo carries it).
- The address.
- The usual place where events happen, when the calendar card names none.
- The ministries or groups (Jóvenes, Familias...), so events can be tagged with their audience.
- The closing words of the weekly video, e.g. "Te esperamos", and an optional blessing
  after them, e.g. "Dios te bendiga".
- The recurring services: the day, the start time, and its name if there are two on one
  day. Each becomes its own weekly ad by default, since it is not always put on the
  calendar (it is assumed everyone already knows about it, but it still happens); when a
  calendar event turns out to be that same service, Claude asks you and uses the card
  instead.
- Optional: how you want the narration to sound. Claude reads this too, so if you have a
  house style — how to name who leads a service ("dirigido por el comité de X"), whether
  to repeat the usual place in every line or only when it is different — write it here in
  your own words and Claude follows it. Say nothing and Claude uses `script.md`'s plain
  defaults.

Example:

    Nombre: Iglesia Ejemplo
    Direccion: Calle 1 #2-3, Ciudad Ejemplo
    Lugar por defecto: Salón Principal
    Ministerios: Jóvenes, Adolescentes, Familias
    Llamado a la accion: Te esperamos
    Despedida: Dios te bendiga

    Servicios recurrentes
    Martes: 7:00 PM - 8:30 PM
    Jueves: 7:00 PM - 8:30 PM
    Domingos (1er servicio - Culto de adoración): 9:00 AM - 10:30 AM
    Domingos (2do servicio - Escuela dominical): 11:00 AM - 12:30 PM

Only the start time of a service matters. If two services share a day, Claude tells them
apart by the event's title, and asks you when it cannot.
