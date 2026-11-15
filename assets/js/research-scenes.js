/**
 * The nine research simulations shown by research-viewer.js, one per research
 * interest (the key is the interest's data-scene). Each is built from boxes,
 * cylinders and struts with the viewer's kit (k), on a stage about 12 m
 * across, in metres. The scenes are in scenes/, one file each, with what they
 * share in scenes/props.js.
 *
 * A scene is { duration, poster, alt, build }, with scale for one modelled at
 * full size and reach for one that needs a wider view when the stage is
 * turned (see the viewer). build(k) adds objects to k.root and returns
 * update(t), which poses the scene for a moment t of its loop (0 to duration,
 * in seconds). update is a pure function of t: that is what makes the loop
 * seamless, lets the viewer hold a still frame (poster) under
 * prefers-reduced-motion, and keeps a scene correct after a theme change.
 *
 * Every scene has the same structure: its subject stands whole for the loop
 * while four beats each show one idea, a caption names the beat, and the
 * numbers on screen are measured from the scene (rates and time-lapse factors
 * are illustrative, and named as constants where they are used).
 */
import { bim } from './scenes/bim.js';
import { xr } from './scenes/xr.js';
import { dfma } from './scenes/dfma.js';
import { informatics } from './scenes/informatics.js';
import { robotics } from './scenes/robotics.js';
import { twin } from './scenes/twin.js';
import { ai } from './scenes/ai.js';
import { interop } from './scenes/interop.js';
import { navigation } from './scenes/navigation.js';

export const SCENES = { bim, informatics, xr, robotics, dfma, ai, twin, interop, navigation };
