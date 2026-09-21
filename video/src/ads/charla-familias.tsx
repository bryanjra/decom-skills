import React from 'react';
import {Destacado} from '../templates/Destacado';
import {Estandar} from '../templates/Estandar';
import {Virtual} from '../templates/Virtual';
import type {TemplateProps} from '../templates/parts';
import type {AdComponent, Plantilla} from '../types';

const layouts: Record<Plantilla, React.FC<TemplateProps>> = {destacado: Destacado, estandar: Estandar, virtual: Virtual};

export const Ad: AdComponent = ({event, iglesia}) => {
  const Layout = layouts[event.plantilla];
  return <Layout event={event} iglesia={iglesia} />;
};
