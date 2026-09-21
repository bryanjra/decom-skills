# Church reference data — example

Copy this file to `church-info.md` and fill in your church's facts. The
pipeline reads `church-info.md` and nothing about any specific church is
written in the code. Every field is optional: anything left out is simply
absent from the ads, never guessed.

Format: one `Label: value` per line under any heading (indentation and a
missing space after `#` are tolerated; labels ignore case and accents).
Recurring services must sit under a heading that contains "Servicios" or
"Horarios".

#Contact info
    Nombre: Iglesia Ejemplo
    Direccion: Calle 1 #2-3, Ciudad Ejemplo
    Lugar por defecto: Salón Principal
    Ministerios: Jóvenes, Adolescentes, Familias
    Llamado a la accion: Te esperamos

<!--
  Nombre               Church name, shown on the intro/outro and in the logo slot.
  Direccion            Address, available to the outro card.
  Lugar por defecto    Where events happen when the calendar card names no place.
                       Without it, an event with no place on its card has none.
  Ministerios          Comma-separated audiences. A calendar title that contains
                       exactly one of these words is tagged with that ministry.
                       A "(Ministerio) - Título" prefix is always understood.
  Llamado a la accion  The closing call to action every ad ends with.
-->

# Servicios recurrentes
    Martes: 7:00 PM - 8:30 PM
    Jueves: 7:00 PM - 8:30 PM
    Domingos (1er servicio - Culto de adoración): 9:00 AM - 10:30 AM
    Domingos (2do servicio - Escuela dominical): 11:00 AM - 12:30 PM

<!--
  Only the START time is used. An untimed calendar event on one of these
  weekdays takes that service's time. A name in parentheses (after the dash)
  lets two services on the same day be told apart by the event title; an
  untimed event on such a day that matches neither name gets no time.
-->
