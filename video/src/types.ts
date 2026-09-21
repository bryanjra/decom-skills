import type React from 'react';

export type Plantilla = 'destacado' | 'estandar' | 'virtual';

/** One record of out/<week>/events.json. Ads may state nothing that is not in it. */
export type EventRecord = {
  slug: string;
  eventId: string | null;
  titulo: string;
  ministerio: string | null;
  fecha: string;
  fechaFin?: string;
  diaSemana: string;
  fechaTexto: string;
  hora: string | null;
  horaTexto: string | null;
  horaHablada: string | null;
  horaFuente: string | null;
  horaNota?: string;
  lugar: string | null;
  lugarFuente: string | null;
  modalidad: 'presencial' | 'virtual';
  plantilla: Plantilla;
};

/** The `iglesia` block of events.json, taken from church-info.md. */
export type Iglesia = {
  nombre: string | null;
  direccion: string | null;
  lugarPorDefecto: string | null;
  llamadoAccion: string | null;
};

export type AdProps = {event: EventRecord; iglesia: Iglesia};

/** What every video/src/ads/<slug>.tsx exports as `Ad`. */
export type AdComponent = React.FC<AdProps>;

/** Props of the single-event composition; render.mjs builds them from out/<week>/. */
export type EventAdProps = {
  slug: string;
  event: EventRecord;
  iglesia: Iglesia;
  /** Path under public/ of the voiceover, or null for a silent event. */
  audioSrc: string | null;
  /** Words in guion.md; sizes the scene when there is no audio. */
  palabras: number;
};

export type WeeklyReelProps = {
  semanaTexto: string;
  iglesia: Iglesia;
  items: EventAdProps[];
  /** Path under public/ of the music bed, or null for none. */
  musicSrc: string | null;
  /** Filled in by calculateMetadata: each event scene's length in frames. */
  frames?: number[];
};
