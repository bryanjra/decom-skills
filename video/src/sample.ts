// Fictional data for Studio previews and the reference ads. Not a real church
// and not a real week: nothing here may ever reach a published video.

import type {EventAdProps, EventRecord, Iglesia, Plantilla, WeeklyReelProps} from './types';

export const sampleIglesia: Iglesia = {
  nombre: 'Iglesia Ejemplo',
  direccion: 'Calle 1 #2-3, Ciudad Ejemplo',
  lugarPorDefecto: 'Salón Principal',
  llamadoAccion: 'Te esperamos',
  despedida: 'Dios te bendiga',
};

const base = {eventId: null, origen: 'calendario', horaFuente: null, lugarFuente: 'church-info.md'} as const;

export const sampleEvents: Record<Plantilla, EventRecord> = {
  estandar: {
    ...base,
    slug: 'ejemplo-estandar',
    titulo: 'Culto de jóvenes',
    ministerio: 'Jóvenes',
    fecha: '2026-09-26',
    diaSemana: 'sábado',
    fechaTexto: 'sábado 26 de septiembre',
    hora: '18:45',
    horaTexto: '6:45 p. m.',
    horaHablada: 'a las seis y cuarenta y cinco de la tarde',
    horaFuente: 'church-info.md',
    lugar: 'Salón Principal',
    modalidad: 'presencial',
    plantilla: 'estandar',
  },
  destacado: {
    ...base,
    slug: 'ejemplo-destacado',
    titulo: 'Retiro de familias',
    ministerio: 'Familias',
    fecha: '2026-09-25',
    diaSemana: 'viernes',
    fechaTexto: 'viernes 25 de septiembre',
    hora: null,
    horaTexto: null,
    horaHablada: null,
    lugar: 'Salón Principal',
    modalidad: 'presencial',
    plantilla: 'destacado',
  },
  virtual: {
    ...base,
    slug: 'ejemplo-virtual',
    titulo: 'Oración virtual',
    ministerio: null,
    fecha: '2026-09-21',
    diaSemana: 'lunes',
    fechaTexto: 'lunes 21 de septiembre',
    hora: '19:00',
    horaTexto: '7:00 p. m.',
    horaHablada: 'a las siete de la noche',
    horaFuente: 'usuario',
    lugar: 'Zoom',
    lugarFuente: 'titulo',
    modalidad: 'virtual',
    plantilla: 'virtual',
  },
};

export const sampleProps = (plantilla: Plantilla): EventAdProps => ({
  slug: sampleEvents[plantilla].slug,
  event: sampleEvents[plantilla],
  iglesia: sampleIglesia,
  voz: null,
  palabras: 24,
});

const sampleItems = (['virtual', 'destacado', 'estandar'] as const).map(sampleProps);

export const sampleReel: WeeklyReelProps = {
  semanaTexto: 'Semana del 21 al 27 de septiembre',
  iglesia: sampleIglesia,
  items: sampleItems,
  musicSrc: null,
  // Studio preview only: a silent reel of 5 s per scene. A real week gets its lengths from core/render-plan.mjs.
  frames: [150, ...sampleItems.map(() => 150), 150],
  voiceStartFrame: 0,
  narration: null,
};
