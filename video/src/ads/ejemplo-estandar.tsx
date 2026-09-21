import React from 'react';
import {Estandar} from '../templates/Estandar';
import type {AdComponent} from '../types';

// Reference ad for the "estandar" template. A real ad is props-driven the same way:
// every fact comes from `event` / `iglesia`, nothing about the church or the
// date is written here.
export const Ad: AdComponent = ({event, iglesia}) => <Estandar event={event} iglesia={iglesia} />;
