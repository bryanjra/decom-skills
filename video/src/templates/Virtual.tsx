import React from 'react';
import {AbsoluteFill} from 'remotion';
import {alpha, brand} from '../brand/tokens';
import {useLayout} from '../layout';
import {Backdrop, Cta, EventInfo, Headline, MinistryTag, Reveal, CornerLogo, type TemplateProps} from './parts';

/** For online events: the event sits inside a window card, so it reads as "on your screen". */
export const Virtual: React.FC<TemplateProps> = ({event, iglesia, headline}) => {
  const {u, portrait} = useLayout();
  const dot = (c: string) => (
    <div key={c} style={{width: 20 * u, height: 20 * u, borderRadius: '50%', backgroundColor: c}} />
  );
  return (
    <AbsoluteFill style={{fontFamily: brand.font.body, color: brand.color.text}}>
      <Backdrop />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: brand.space.xl * u,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <CornerLogo />
        <Reveal delay={6}>
          <div
            style={{
              backgroundColor: alpha(brand.color.surface, 0.92),
              border: `${3 * u}px solid ${alpha(brand.color.text, 0.14)}`,
              borderRadius: 32 * u,
              overflow: 'hidden',
              maxWidth: portrait ? undefined : 1400 * u,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: brand.space.sm * u * 0.6,
                padding: `${brand.space.sm * u}px ${brand.space.md * u}px`,
                backgroundColor: alpha(brand.color.text, 0.08),
              }}
            >
              {[brand.color.accent, brand.color.textMuted, brand.color.primary].map(dot)}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: brand.space.md * u, padding: brand.space.lg * u}}>
              {event.ministerio ? <MinistryTag text={event.ministerio} /> : null}
              <Headline text={headline ?? event.titulo} size={brand.type.title * 0.9} />
              <EventInfo event={event} iglesia={iglesia} delay={26} />
            </div>
          </div>
        </Reveal>
        <Reveal delay={44}>
          <Cta text={iglesia.llamadoAccion} />
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
