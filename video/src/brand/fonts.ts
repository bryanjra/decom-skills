import {loadFont} from '@remotion/fonts';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {brand} from './tokens';

let started = false;

/**
 * Registers the vendored brand fonts and holds every render until they are
 * ready. A failure cancels the render: a silent fallback font would ship a
 * wrong-looking ad without anyone noticing.
 */
export function loadBrandFonts(): void {
  if (started) return;
  started = true;
  const handle = delayRender('Loading brand fonts');
  Promise.all(
    brand.fontFiles.map((f) => loadFont({family: f.family, url: staticFile(f.file), weight: f.weight})),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
}
