import {registerRoot} from 'remotion';
import {loadBrandFonts} from './brand/fonts';
import {Root} from './Root';

loadBrandFonts();
registerRoot(Root);
