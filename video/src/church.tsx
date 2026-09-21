import React, {createContext, useContext} from 'react';
import type {Iglesia} from './types';

const IglesiaContext = createContext<Iglesia | null>(null);

/**
 * Makes the church's facts from church-info.md available to the parts that draw them (the Logo's
 * wordmark), so an ad never has to read `iglesia.nombre` itself. Wrapped once around each
 * composition: EventAd and WeeklyReel.
 */
export const IglesiaProvider: React.FC<{iglesia: Iglesia; children: React.ReactNode}> = ({iglesia, children}) => (
  <IglesiaContext.Provider value={iglesia}>{children}</IglesiaContext.Provider>
);

export const useIglesia = (): Iglesia | null => useContext(IglesiaContext);
