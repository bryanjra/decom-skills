import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {alpha, brand} from '../brand/tokens';
import {useIglesia} from '../church';
import {useLayout} from '../layout';
import type {EventRecord, Iglesia} from '../types';

export type TemplateProps = {event: EventRecord; iglesia: Iglesia; headline?: string};

export const capitalizeFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Longer titles get a smaller size so they always fit. */
export const fitSize = (text: string, base: number): number =>
  text.length <= 20 ? base : text.length <= 32 ? base * 0.82 : text.length <= 46 ? base * 0.68 : base * 0.56;

/** 0 -> 1 over `duration` frames after `delay`, eased out. */
export function useEnter(delay = 0, duration = 20): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

export const Reveal: React.FC<{delay?: number; children: React.ReactNode}> = ({delay = 0, children}) => {
  const {u} = useLayout();
  const p = useEnter(delay);
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 40 * u}px)`}}>{children}</div>;
};

/**
 * Solid background with two soft shapes that drift slowly over the whole scene. Both hang off
 * the bottom edge, low enough to stay clear of the logo's zone across the top: the manual wants
 * the logo on a flat field, so nothing may be drawn behind it.
 */
export const Backdrop: React.FC<{zoom?: boolean}> = ({zoom = false}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, u} = useLayout();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  const scale = zoom ? 1 + t * 0.06 : 1;
  return (
    <AbsoluteFill style={{backgroundColor: brand.color.background}}>
      <div
        style={{
          position: 'absolute',
          width: 1400 * u,
          height: 1400 * u,
          borderRadius: '50%',
          right: -420 * u + t * 60 * u,
          bottom: -700 * u,
          backgroundColor: alpha(brand.color.primary, 0.35),
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900 * u,
          height: 900 * u,
          borderRadius: '50%',
          left: -300 * u - t * 40 * u,
          bottom: -420 * u,
          backgroundColor: alpha(brand.color.accent, 0.16),
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The church's mark, alone, and the only way its name reaches the screen: an ad never types the
 * name or renders `iglesia.nombre` itself. The logo image carries the name. A brand with no logo
 * (`brand.logo` is null) gets the name from church-info.md, via IglesiaProvider, as a wordmark
 * instead; with no name either, nothing is drawn. Keep everything else clear of it: no shapes
 * behind, nothing over it (brand/corporate-brand.md § 3).
 */
export const Logo: React.FC = () => {
  const {u} = useLayout();
  const nombre = useIglesia()?.nombre;
  if (brand.logo) return <Img src={staticFile(brand.logo)} style={{display: 'block', height: brand.logoHeight * u}} />;
  if (!nombre) return null;
  return (
    <div style={{maxWidth: brand.logoHeight * 5 * u}}>
      <Headline text={nombre} size={brand.type.subtitle} align="center" />
    </div>
  );
};

/**
 * The logo for the left-aligned layouts. Landscape: top-right corner, where the manual puts it
 * on screen pieces (p.56) and where it costs no height. Portrait: first row of the column.
 */
export const CornerLogo: React.FC = () => {
  const {u, portrait} = useLayout();
  if (portrait) {
    return (
      <Reveal>
        <Logo />
      </Reveal>
    );
  }
  return (
    <>
      {/* Empty row: the column keeps its three-row spacing without the logo taking height. */}
      <div />
      <div style={{position: 'absolute', top: brand.space.xl * u, right: brand.space.xl * u}}>
        <Reveal>
          <Logo />
        </Reveal>
      </div>
    </>
  );
};

export const MinistryTag: React.FC<{text: string}> = ({text}) => {
  const {u} = useLayout();
  return (
    <div
      style={{
        width: 'fit-content', // hugs its text in a block parent (Reveal) as well as in a flex one
        fontFamily: brand.font.body,
        fontWeight: 700,
        fontSize: brand.type.caption * u,
        letterSpacing: 3 * u,
        textTransform: 'uppercase',
        color: brand.color.onAccent,
        backgroundColor: brand.color.accent,
        padding: `${brand.space.xs * u}px ${brand.space.md * u}px`,
        borderRadius: 999,
      }}
    >
      {text}
    </div>
  );
};

export const Headline: React.FC<{text: string; size: number; align?: 'left' | 'center'}> = ({text, size, align = 'left'}) => {
  const {u} = useLayout();
  return (
    <div
      style={{
        fontFamily: brand.font.display,
        fontWeight: 800,
        fontSize: fitSize(text, size) * u,
        lineHeight: 1.05,
        textAlign: align,
        textWrap: 'balance', // an even break, not a dangling "de" at the end of the first line
        color: brand.color.text,
      }}
    >
      {text}
    </div>
  );
};

const InfoLine: React.FC<{text: string; delay: number; center: boolean}> = ({text, delay, center}) => {
  const {u} = useLayout();
  const size = brand.type.subtitle * u;
  return (
    <Reveal delay={delay}>
      <div style={{display: 'flex', alignItems: 'center', gap: brand.space.sm * u, justifyContent: center ? 'center' : 'flex-start'}}>
        <div style={{width: 10 * u, height: size * 1.05, borderRadius: 5 * u, backgroundColor: brand.color.accent}} />
        <span style={{fontFamily: brand.font.body, fontWeight: 700, fontSize: size, color: brand.color.text}}>{text}</span>
      </div>
    </Reveal>
  );
};

/** Date, time and place, straight from the event record. A missing time or place drops its row. */
export const EventInfo: React.FC<{event: EventRecord; delay?: number; center?: boolean}> = ({event, delay = 20, center = false}) => {
  const {u} = useLayout();
  const lines = [capitalizeFirst(event.fechaTexto), event.horaTexto, event.lugar].filter((l): l is string => Boolean(l));
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: brand.space.sm * u, alignItems: center ? 'center' : 'flex-start'}}>
      {lines.map((text, i) => (
        <InfoLine key={text} text={text} delay={delay + i * 8} center={center} />
      ))}
    </div>
  );
};

/** The church's closing call to action, from church-info.md. Nothing renders when it has none. */
export const Cta: React.FC<{text: string | null; align?: 'flex-start' | 'center'}> = ({text, align = 'flex-start'}) => {
  const {u} = useLayout();
  if (!text) return null;
  return (
    <div style={{display: 'flex', justifyContent: align}}>
      <div
        style={{
          fontFamily: brand.font.display,
          fontWeight: 800,
          fontSize: brand.type.headline * 0.75 * u,
          color: brand.color.onAccent,
          backgroundColor: brand.color.accent,
          padding: `${brand.space.sm * u}px ${brand.space.lg * u}px`,
          borderRadius: 999,
        }}
      >
        {text}
      </div>
    </div>
  );
};
