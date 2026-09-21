// Reads church-info.md, the one place every church-specific fact lives. Nothing
// about any particular church is written in the code: whatever this file does
// not say stays null/empty and is never defaulted.

import { nombreDia, stripAccents } from './spanish.mjs';

const norm = (s) => stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();

const CAMPOS = {
  nombre: 'nombre',
  direccion: 'direccion',
  'lugar por defecto': 'lugarPorDefecto',
  ministerios: 'ministerios',
  'llamado a la accion': 'llamadoAccion',
};

/** Start time of "6:45 PM - 8:00 PM" as "18:45". Only the start is read. */
function horaInicio(valor) {
  const m = /(\d{1,2})\s*:\s*(\d{2})\s*([ap])\.?\s*m\.?/i.exec(valor);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) > 59) return null;
  const h12 = Number(m[1]) % 12;
  const h24 = m[3].toLowerCase() === 'p' ? h12 + 12 : h12;
  return `${String(h24).padStart(2, '0')}:${m[2]}`;
}

function parseServicio(clave, valor, linea) {
  const m = /^(\p{L}+)\s*(?:\(([^)]*)\))?$/u.exec(clave);
  const dia = m && nombreDia(m[1]);
  const hora = horaInicio(valor);
  if (!dia || !hora) return { problema: `unreadable service line: "${linea}"` };

  let nombre = null;
  if (m[2]?.trim()) {
    const trozos = m[2].split(/\s+[-–—]\s+/);
    nombre = (trozos.length > 1 ? trozos.slice(1).join(' - ') : trozos[0]).trim();
  }
  return { servicio: { dia, hora, nombre } };
}

export function parseChurchInfo(texto) {
  const info = {
    nombre: null,
    direccion: null,
    lugarPorDefecto: null,
    ministerios: [],
    llamadoAccion: null,
    servicios: [],
    problemas: [],
  };

  let enServicios = false;
  for (const cruda of texto.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const linea = cruda.trim();
    if (!linea) continue;

    const encabezado = /^#{1,6}\s*(.+)$/.exec(linea);
    if (encabezado) {
      enServicios = /servicio|horario/.test(norm(encabezado[1]));
      continue;
    }

    const kv = /^([^:]+?)\s*:\s*(.*)$/.exec(linea);
    if (!kv) continue;
    const [, clave, valor] = kv;

    const campo = CAMPOS[norm(clave)];
    if (campo && valor.trim()) {
      if (campo === 'ministerios') {
        info.ministerios = valor.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      } else {
        info[campo] ??= valor.trim();
      }
    } else if (enServicios) {
      const { servicio, problema } = parseServicio(clave.trim(), valor, linea);
      if (servicio) info.servicios.push(servicio);
      else info.problemas.push(problema);
    }
  }
  return info;
}

/**
 * The recurring service an untimed event on that weekday happens at.
 * One service that day -> it. Several -> only if the title names exactly one.
 * Otherwise no guess: `servicio` is null and `candidatos` lists the options.
 */
export function findService(servicios, { diaSemana, titulo }) {
  const delDia = servicios.filter((s) => s.dia === diaSemana);
  if (delDia.length === 1) return { servicio: delDia[0] };

  const t = norm(titulo);
  const porNombre = delDia.filter((s) => s.nombre && t.includes(norm(s.nombre)));
  if (porNombre.length === 1) return { servicio: porNombre[0] };
  return { servicio: null, candidatos: delDia };
}
