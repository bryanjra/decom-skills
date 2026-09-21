import {Config} from '@remotion/cli/config';

Config.setOverwriteOutput(true);

// Use an existing Chromium when Remotion cannot download its own. Unset means
// Remotion's default, so the repo runs unchanged on any machine.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
