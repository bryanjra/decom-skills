import React from 'react';
import {Virtual} from '../templates/Virtual';
import type {AdComponent} from '../types';

// Reference ad for the "virtual" template. A real ad is props-driven the same way:
// every fact comes from `event` / `iglesia`, nothing about the church or the
// date is written here.
export const Ad: AdComponent = ({event, iglesia}) => <Virtual event={event} iglesia={iglesia} />;
