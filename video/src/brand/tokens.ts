// Single source of truth for the visual language: colors, spacing, type scale,
// motion timing. Nothing else in the codebase may hardcode these values.
//
// PLACEHOLDER: every value below is a neutral stand-in until the church's real
// brand (colors, fonts, logo) is supplied. Swapping the brand means editing
// this file, dropping files into brand/, and nothing else.

export const video = {width: 1920, height: 1080, fps: 30} as const;

export const color = {
  background: '#0F1B3D',
  surface: '#182A5A',
  primary: '#2F5BEA',
  accent: '#F2B632',
  text: '#FFFFFF',
  textMuted: '#B9C4E4',
  onAccent: '#0F1B3D',
} as const;

/** Font families are registered by brand/fonts.ts from these files (under public/). */
export const font = {display: 'Brand Display', body: 'Brand Body'} as const;
export const fontFiles = [
  {family: font.display, file: 'brand/fonts/montserrat-latin-800-normal.woff2', weight: '800'},
  {family: font.body, file: 'brand/fonts/montserrat-latin-500-normal.woff2', weight: '500'},
  {family: font.body, file: 'brand/fonts/montserrat-latin-700-normal.woff2', weight: '700'},
] as const;

/** Path under public/ of the church logo (SVG preferred), or null to show the name as a wordmark. */
export const logo: string | null = null;

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

/** "#RRGGBB" + opacity -> "rgba(...)". Use this instead of writing rgba() in components. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

export const brand = {video, color, font, fontFiles, logo, space, type, motion, audio} as const;
