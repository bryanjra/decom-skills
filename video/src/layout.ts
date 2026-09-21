import {useVideoConfig} from 'remotion';

/**
 * Everything a template needs to lay itself out without hardcoding 1920x1080.
 * `u` scales the 1080-base sizes in tokens.ts; `portrait` flips the arrangement,
 * so a 9:16 render is a config change, not a rewrite.
 */
export function useLayout() {
  const {width, height, durationInFrames, fps} = useVideoConfig();
  return {width, height, durationInFrames, fps, portrait: height > width, u: Math.min(width, height) / 1080};
}
