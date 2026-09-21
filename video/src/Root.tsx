import React from 'react';
import {Composition, Folder} from 'remotion';
import {EventAd, calculateEventAd} from './EventAd';
import {WeeklyReel, calculateWeeklyReel} from './WeeklyReel';
import {brand} from './brand/tokens';
import {sampleProps, sampleReel} from './sample';

const {width, height, fps} = brand.video;

// durationInFrames is required by the API but always replaced by calculateMetadata.
export const Root: React.FC = () => (
  <>
    <Composition
      id="EventAd"
      component={EventAd}
      width={width}
      height={height}
      fps={fps}
      durationInFrames={1}
      defaultProps={sampleProps('estandar')}
      calculateMetadata={calculateEventAd}
    />
    <Composition
      id="WeeklyReel"
      component={WeeklyReel}
      width={width}
      height={height}
      fps={fps}
      durationInFrames={1}
      defaultProps={sampleReel}
      calculateMetadata={calculateWeeklyReel}
    />
    <Folder name="Muestras">
      {(['estandar', 'destacado', 'virtual'] as const).map((plantilla) => (
        <Composition
          key={plantilla}
          id={`Muestra-${plantilla}`}
          component={EventAd}
          width={width}
          height={height}
          fps={fps}
          durationInFrames={1}
          defaultProps={sampleProps(plantilla)}
          calculateMetadata={calculateEventAd}
        />
      ))}
    </Folder>
  </>
);
