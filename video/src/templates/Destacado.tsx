import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {brand} from '../brand/tokens';
import {useLayout} from '../layout';
import {Backdrop, Cta, EventInfo, Headline, MinistryTag, Reveal, Logo, useEnter, type TemplateProps} from './parts';

/** Centered, larger layout for the week's featured events: hero headline and a slow push-in. */
export const Destacado: React.FC<TemplateProps> = ({event, iglesia, headline}) => {
  const {u} = useLayout();
  const bar = useEnter(14, 26);
  return (
    <AbsoluteFill style={{fontFamily: brand.font.body, color: brand.color.text}}>
      <Backdrop zoom />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: brand.space.xl * u,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: brand.space.md * u,
        }}
      >
        <Reveal>
          <Logo />
        </Reveal>
        {event.ministerio ? (
          <Reveal delay={4}>
            <MinistryTag text={event.ministerio} />
          </Reveal>
        ) : null}
        <Reveal delay={8}>
          <Headline text={headline ?? event.titulo} size={brand.type.hero} align="center" />
        </Reveal>
        <div
          style={{
            height: 12 * u,
            width: interpolate(bar, [0, 1], [0, 420 * u]),
            borderRadius: 6 * u,
            backgroundColor: brand.color.accent,
          }}
        />
        <EventInfo event={event} iglesia={iglesia} delay={26} center />
        <div style={{marginTop: brand.space.sm * u}}>
          <Reveal delay={46}>
            <Cta text={iglesia.llamadoAccion} align="center" />
          </Reveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};
