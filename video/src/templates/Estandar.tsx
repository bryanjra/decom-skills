import React from 'react';
import {AbsoluteFill} from 'remotion';
import {brand} from '../brand/tokens';
import {useLayout} from '../layout';
import {Backdrop, Cta, EventInfo, Headline, MinistryTag, Reveal, CornerLogo, type TemplateProps} from './parts';

/** Left-aligned everyday layout: name at the top, event in the middle, call to action at the bottom. */
export const Estandar: React.FC<TemplateProps> = ({event, iglesia, headline}) => {
  const {u, portrait} = useLayout();
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
        <div style={{display: 'flex', flexDirection: 'column', gap: brand.space.md * u, maxWidth: portrait ? undefined : 1300 * u}}>
          {event.ministerio ? (
            <Reveal delay={4}>
              <MinistryTag text={event.ministerio} />
            </Reveal>
          ) : null}
          <Reveal delay={8}>
            <Headline text={headline ?? event.titulo} size={brand.type.title} />
          </Reveal>
          <EventInfo event={event} iglesia={iglesia} delay={22} />
        </div>
        <Reveal delay={40}>
          <Cta text={iglesia.llamadoAccion} />
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
