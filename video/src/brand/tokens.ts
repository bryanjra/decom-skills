// Single source of truth for the visual language: colors, spacing, type scale,
// motion timing. Nothing else in the codebase may hardcode these values.
//
// Colors and logo are the IPUC's official identity: Manual de Identidad
// Corporativa (p.14), distilled in brand/corporate-brand.md. The fonts are still
// a PLACEHOLDER: the manual's Myriad Pro is not vendored, so Montserrat stands in.
// Swapping the brand means editing this file, dropping files into brand/, and
// nothing else.

export const video = {width: 1920, height: 1080, fps: 30} as const;

/** The manual's three colors, with the HTML values it states, plus white for inverted type. */
const palette = {
  blue: '#00338D', // Azul oscuro, Pantone 287 C
  cyan: '#009FDA', // Azul claro (cyan), Pantone Process Cyan C
  gold: '#F0AB00', // Amarillo ocre, Pantone 130 C
  white: '#FFFFFF',
} as const;

/** Every ad sits on the dark-blue field, the manual's inverted-type version. */
export const color = {
  background: palette.blue,
  /** A card lifted off the background: cyan tinted into the blue, not a new hue. */
  surface: mix(palette.blue, palette.cyan, 0.2),
  primary: palette.cyan,
  accent: palette.gold,
  text: palette.white,
  /** White pulled 20% toward the blue; stays legible where cyan would be too weak. */
  textMuted: mix(palette.white, palette.blue, 0.2),
  onAccent: palette.blue,
} as const;

/** Font families are registered by brand/fonts.ts from these files (under public/). */
export const font = {display: 'Brand Display', body: 'Brand Body'} as const;
export const fontFiles = [
  {family: font.display, file: 'brand/fonts/montserrat-latin-800-normal.woff2', weight: '800'},
  {family: font.body, file: 'brand/fonts/montserrat-latin-500-normal.woff2', weight: '500'},
  {family: font.body, file: 'brand/fonts/montserrat-latin-700-normal.woff2', weight: '700'},
] as const;

/**
 * Path under public/ of the church logo (SVG preferred), or null to show the name as a wordmark.
 * The full-color version for dark backgrounds: white verse and a white reserve line around the ring.
 */
export const logo: string | null = 'brand/logo/IPUC_COLOR para fondo oscuro.png';

/** Sizes in px at the 1080-short-side base. Templates scale them by the layout unit. */
export const space = {xs: 8, sm: 16, md: 32, lg: 64, xl: 96, xxl: 144} as const;
export const type = {hero: 168, title: 132, headline: 88, subtitle: 56, body: 44, caption: 32} as const;

export const motion = {
  /** Silence before the voiceover starts; must be at least transitionSeconds. */
  leadSeconds: 0.6,
  /** Room after the last word; must be at least transitionSeconds. */
  tailSeconds: 1.0,
  transitionSeconds: 0.5,
  introSeconds: 3,
  outroSeconds: 4,
  /** Narration pace, only used to size a scene that has no audio yet. */
  wordsPerSecond: 2.5,
} as const;

export const audio = {musicVolume: 0.12} as const;

/** Opaque blend of two "#RRGGBB" colors: `amount` of `to` over `from`. Tints derive from the palette, never invented. */
function mix(from: string, to: string, amount: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  const rgb = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`;
}

/** "#RRGGBB" + opacity -> "rgba(...)". Use this instead of writing rgba() in components. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

export const brand = {video, color, font, fontFiles, logo, space, type, motion, audio} as const;
