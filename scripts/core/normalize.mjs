// Turns raw calendar events plus church-info.md into the events.json contract.
// Every time and place carries its provenance, and nothing is guessed: what
// cannot be established from the card, the title, church-info.md or an explicit
// override stays null and is reported.

import {
  addDays,
  diaSemana,
  fechaTexto,
  horaHablada,
  horaTexto,
  isHora,
  rangoTexto,
  semanaHablada,
  semanaTexto,
  slugify,
  weekRange,
} from './spanish.mjs';
import { findService } from './church-info.mjs';
import { parseTitulo } from './titulo.mjs';

const PLANTILLAS = ['destacado', 'estandar', 'virtual'];

/** Local date and 24h time of an instant in a given IANA timezone. */
function partesLocales(dateTime, timeZone) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(dateTime))
      .map((p) => [p.type, p.value]),
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

/**
 * All-day events arrive as "2026-09-26T00:00:00Z" with an exclusive end. The
 * date part is the calendar day as written; converting it to local time would
 * move it back a day.
 */
function leerFechas(raw, zonaCalendario) {
  const { start, end } = raw;
  if (start?.date) {
    const fecha = start.date.slice(0, 10);
    const finInclusivo = end?.date ? addDays(end.date.slice(0, 10), -1) : fecha;
    return { fecha, fechaFin: finInclusivo > fecha ? finInclusivo : null, horaTarjeta: null };
  }
  if (start?.dateTime) {
    const { fecha, hora } = partesLocales(start.dateTime, start.timeZone ?? zonaCalendario);
    return { fecha, fechaFin: null, horaTarjeta: hora };
  }
  return null;
}

function resolverHora({ horaTarjeta, parsed, fecha, churchInfo }) {
  if (horaTarjeta) return { hora: horaTarjeta, fuente: 'calendario' };
  if (parsed.hora) return { hora: parsed.hora, fuente: 'titulo' };

  const dia = diaSemana(fecha);
  if (parsed.horaAmbigua) {
    return { hora: null, nota: `the title says "${parsed.horaAmbigua}" without AM/PM, so it was not used` };
  }
  const { servicio, candidatos } = findService(churchInfo.servicios, { diaSemana: dia, titulo: parsed.titulo });
  if (servicio) return { hora: servicio.hora, fuente: 'church-info.md' };
  if (candidatos.length) {
    const lista = candidatos.map((s) => `${s.hora}${s.nombre ? ` ${s.nombre}` : ''}`).join(', ');
    return { hora: null, nota: `${dia} has several services (${lista}) and the title does not name one` };
  }
  return { hora: null, nota: `no time on the card or in the title, and church-info.md lists no service on ${dia}` };
}

function resolverLugar({ location, parsed, churchInfo }) {
  if (location?.trim()) return { lugar: location.trim(), fuente: 'calendario' };
  if (parsed.virtual) return { lugar: parsed.virtual, fuente: 'titulo' };
  if (churchInfo.lugarPorDefecto) return { lugar: churchInfo.lugarPorDefecto, fuente: 'church-info.md' };
  return { lugar: null, fuente: null };
}

function descartar(raw, motivo) {
  return { titulo: raw.summary ?? '(untitled)', motivo };
}

function asignarSlugs(eventos) {
  const cuenta = new Map();
  for (const e of eventos) cuenta.set(e.base, (cuenta.get(e.base) ?? 0) + 1);

  const usados = new Set();
  for (const e of eventos) {
    let slug = cuenta.get(e.base) > 1 ? `${e.base}-${slugify(e.diaSemana)}` : e.base;
    for (let n = 2; usados.has(slug); n++) slug = `${e.base}-${slugify(e.diaSemana)}-${n}`;
    usados.add(slug);
    e.slug = slug;
  }
}

const comparar = (a, b) =>
  a.fecha.localeCompare(b.fecha) ||
  (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
  a.titulo.localeCompare(b.titulo, 'es');

function aplicarOverrides(eventos, overrides, problemas, descartados) {
  const porSlug = new Map(eventos.map((e) => [e.slug, e]));
  for (const [slug, o] of Object.entries(overrides)) {
    const e = porSlug.get(slug);
    if (!e) {
      problemas.push(`override "${slug}": no event in this week has that slug`);
      continue;
    }
    if (o.omitir) {
      e.omitido = true;
      descartados.push({ titulo: e.titulo, motivo: 'omitted by override' });
      continue;
    }
    // null is a decision, not a gap: announce the event without the time (or place) the sources gave it.
    if (o.hora === null) {
      e.hora = null;
      e.horaFuente = null;
      e.horaNota = 'the person asked for it to be announced without a time';
    } else if (o.hora !== undefined) {
      if (isHora(o.hora)) {
        e.hora = o.hora;
        e.horaFuente = 'usuario';
        delete e.horaNota;
      } else {
        problemas.push(`override "${slug}": hora "${o.hora}" is not HH:MM (24h), ignored`);
      }
    }
    if (o.lugar === null) [e.lugar, e.lugarFuente, e.lugarNota] = [null, null, 'the person asked for it to be announced without a place'];
    else if (o.lugar) [e.lugar, e.lugarFuente] = [o.lugar, 'usuario'];
    if (o.modalidad) e.modalidad = o.modalidad;
    if (o.plantilla) {
      if (PLANTILLAS.includes(o.plantilla)) e.plantilla = o.plantilla;
      else problemas.push(`override "${slug}": plantilla "${o.plantilla}" is not one of ${PLANTILLAS.join('/')}, ignored`);
    }
  }
  return eventos.filter((e) => !e.omitido);
}

function registroFinal(e) {
  const r = {
    slug: e.slug,
    eventId: e.eventId,
    titulo: e.titulo,
    ministerio: e.ministerio,
    fecha: e.fecha,
  };
  if (e.fechaFin) r.fechaFin = e.fechaFin;
  Object.assign(r, {
    diaSemana: e.diaSemana,
    fechaTexto: e.fechaFin ? rangoTexto(e.fecha, e.fechaFin) : fechaTexto(e.fecha),
    hora: e.hora,
    horaTexto: e.hora ? horaTexto(e.hora) : null,
    horaHablada: e.hora ? horaHablada(e.hora) : null,
    horaFuente: e.hora ? e.horaFuente : null,
  });
  if (!e.hora && e.horaNota) r.horaNota = e.horaNota;
  Object.assign(r, {
    lugar: e.lugar,
    lugarFuente: e.lugarFuente,
    modalidad: e.modalidad,
    plantilla: e.plantilla,
  });
  if (!e.lugar && e.lugarNota) r.lugarNota = e.lugarNota;
  return r;
}

/**
 * @param {object} args
 * @param {string} args.week ISO week, e.g. "2026-W39"
 * @param {Array<{summary?: string, timeZone?: string, events: object[]}>} args.calendars raw calendar responses
 * @param {ReturnType<import('./church-info.mjs').parseChurchInfo>} args.churchInfo
 * @param {Record<string, object>} [args.overrides] human answers keyed by slug
 * @returns {{doc: object, problemas: string[]}}
 */
export function normalizeWeek({ week, calendars, churchInfo, overrides = {} }) {
  const { inicio, fin } = weekRange(week);
  const problemas = churchInfo.problemas.map((p) => `church-info.md: ${p}`);
  const descartados = [];
  let eventos = [];

  for (const calendario of calendars) {
    for (const raw of calendario.events ?? []) {
      if (raw.status === 'cancelled') {
        descartados.push(descartar(raw, 'cancelled'));
        continue;
      }
      if (raw.eventType && raw.eventType !== 'DEFAULT') {
        descartados.push(descartar(raw, `event type ${raw.eventType}`));
        continue;
      }
      const fechas = leerFechas(raw, calendario.timeZone);
      if (!fechas || !raw.summary) {
        descartados.push(descartar(raw, 'no usable start date or title'));
        continue;
      }
      const { fecha, fechaFin, horaTarjeta } = fechas;
      if ((fechaFin ?? fecha) < inicio || fecha > fin) {
        descartados.push(descartar(raw, 'outside the week'));
        continue;
      }

      const parsed = parseTitulo(raw.summary, { ministerios: churchInfo.ministerios });
      const { hora, fuente, nota } = resolverHora({ horaTarjeta, parsed, fecha, churchInfo });
      const { lugar, fuente: lugarFuente } = resolverLugar({ location: raw.location, parsed, churchInfo });
      const virtual = Boolean(parsed.virtual);

      eventos.push({
        eventId: raw.id ?? null,
        titulo: parsed.titulo,
        base: slugify(parsed.titulo) || 'evento',
        ministerio: parsed.ministerio ?? parsed.ministerioClave,
        fecha,
        fechaFin,
        diaSemana: diaSemana(fecha),
        hora,
        horaFuente: fuente ?? null,
        horaNota: nota,
        lugar,
        lugarFuente,
        modalidad: virtual ? 'virtual' : 'presencial',
        plantilla: virtual ? 'virtual' : 'estandar',
      });
    }
  }

  eventos.sort(comparar);
  asignarSlugs(eventos);
  eventos = aplicarOverrides(eventos, overrides, problemas, descartados);
  eventos.sort(comparar);

  const nombres = [...new Set(calendars.map((c) => c.summary).filter(Boolean))];
  const doc = {
    week,
    semana: { inicio, fin, texto: semanaTexto(inicio, fin), hablada: semanaHablada(inicio, fin) },
    calendar: nombres.join(' + '),
    timezone: calendars[0]?.timeZone ?? null,
    iglesia: {
      nombre: churchInfo.nombre,
      direccion: churchInfo.direccion,
      lugarPorDefecto: churchInfo.lugarPorDefecto,
      llamadoAccion: churchInfo.llamadoAccion,
      despedida: churchInfo.despedida,
    },
    events: eventos.map(registroFinal),
    descartados,
  };
  return { doc, problemas };
}
