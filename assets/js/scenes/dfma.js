import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, easeInOut, pulse, track, v0, person, aim } from './props.js';
import { captions, ring, frame } from './overlays.js';

const M = { l: 3.2, h: 2.7, d: 2.6 };          // a module: length (x), height, depth (z), m
// What a module weighs, taken off its parts: tonnes per square metre of floor, roof and wall, and a services pod
const WEIGHT = { floor: 0.26, roof: 0.12, wall: 0.075, pod: 0.9 };
const ROAD_ENVELOPE = { w: 3, h: 4.2 };        // the widest and highest load the road allows, m
const CRANE_MOMENT = 80, CRANE_MAX = 25;       // the crane's load chart: tonne-metres, and its limit near the mast, t
const RINGS = [20, 12, 8];                     // capacities drawn as rings on the ground, t
const TAKT = 3;                                // hours a module spends at each station
const PER_DAY = 4;                             // modules set in a day on site

/**
 * A modular building, and one of its modules from the factory to its place.
 * Four beats: the building pulls apart into its kit of modules, bolt-on
 * panels and plant pods; the last module goes down the factory line, a
 * station at a time; it travels by road, through the gauge of what the road
 * allows, with its lifting points and centre of gravity marked; and the
 * mobile crane sets it into the last place, inside its capacity rings.
 * Counts, weights, clearances and radii are measured from the scene.
 * Modelled at full size, shown at dfma.scale.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23.5;
    const E = k.edge;                                   // what comes by road fades in at the edge of the stage
    const ROAD = 6.4, DECK = 1.25, RIG = 1.1, PAD_TOP = 0.3;
    const BX = 7.2, BZ = -3.6;                          // the middle of the building
    const LINE = -1.6, STATIONS = [-12.6, -8.7, -4.8];  // the factory line, and its stations along it

    // ---- Ground: the road, the hardstanding, the pad
    k.box(null, E('asphalt'), 44, 0.06, 3.8, 0, 0, ROAD);
    [ROAD - 1.98, ROAD + 1.98].forEach(z => k.box(null, E('paving'), 44, 0.11, 0.16, 0, 0, z));
    for (let x = -20.4; x < 21; x += 2.4) k.box(null, E('white'), 1.2, 0.012, 0.12, x, 0.06, ROAD);
    k.box(null, 'gravel', 12.6, 0.04, 4.9, BX, 0, 1.9);
    k.box(null, 'concrete', 3 * M.l + 0.9, PAD_TOP, 2 * M.d + 0.9, BX, 0, BZ);

    // ---- A module, in the four parts the factory makes it of
    const lit = n => ((n * 7 + 3) % 5 > 1 ? 'glassLit' : 'glass');
    /** faces: which sides are outside (front +z, back, left -x, right +x, top); kind: 'A' end, 'B' middle, 'C' stair and entrance. */
    const makeModule = (parent, kind, faces, seed, mat = name => name) => {
        const g = k.group(parent);
        const { l, h, d } = M;
        const chassis = k.group(g), shell = k.group(g), envelope = k.group(g);
        k.box(chassis, mat('steel'), l, 0.15, d);
        [-1, 1].forEach(sx => [-1, 1].forEach(sz => k.box(shell, mat('dark'), 0.14, h - 0.15, 0.14, sx * (l / 2 - 0.07), 0.15, sz * (d / 2 - 0.07))));
        k.box(shell, mat('roof'), l, 0.2, d, 0, h - 0.2, 0);
        k.box(envelope, mat('wall'), l - 0.1, h - 0.35, d - 0.1, 0, 0.15, 0);
        const opening = (turn, at, w, ht, y, n, off = 0) => {
            const o = k.group(envelope, 0, 0, 0);
            o.rotation.y = turn;
            k.box(o, mat('dark'), w, ht, 0.08, off, y, at);
            k.box(o, mat(lit(seed + n)), w - 0.14, ht - 0.14, 0.1, off, y + 0.07, at);
            if (ht < 1.8) k.box(o, mat('coping'), w + 0.2, 0.06, 0.16, off, y - 0.06, at + 0.03);
            return o;
        };
        [[faces.front, 0], [faces.back, Math.PI]].forEach(([outside, turn], n) => {
            if (!outside) return;
            if (kind === 'C') opening(turn, d / 2 - 0.03, 1.1, 2.1, 0.25, n);
            else {
                opening(turn, d / 2 - 0.03, 1.5, 1.3, 0.95, n, -0.45);
                k.box(envelope, mat('timber'), 0.8, h - 0.5, 0.05, (turn ? -1 : 1) * (l / 2 - 0.62), 0.25, (turn ? -1 : 1) * (d / 2 - 0.04));
            }
        });
        [[faces.right, Math.PI / 2], [faces.left, -Math.PI / 2]].forEach(([outside, turn], n) => { if (outside) opening(turn, l / 2 - 0.03, 0.9, 1.2, 1, n + 2, 0.3); });
        if (faces.top) {
            k.box(shell, mat('gravel'), l - 0.3, 0.03, d - 0.3, 0, h, 0);
            if (faces.front) k.box(shell, mat('coping'), l, 0.4, 0.12, 0, h, d / 2 - 0.06);
            if (faces.back) k.box(shell, mat('coping'), l, 0.4, 0.12, 0, h, -d / 2 + 0.06);
            if (faces.right) k.box(shell, mat('coping'), 0.12, 0.4, d, l / 2 - 0.06, h, 0);
            if (faces.left) k.box(shell, mat('coping'), 0.12, 0.4, d, -l / 2 + 0.06, h, 0);
        }
        return { g, chassis, shell, envelope };
    };

    // ---- The building: three modules long, two deep, four storeys high
    const kindOf = (i, j) => (i !== 1 ? 'A' : j ? 'B' : 'C');
    const TINT = { A: k.basic('accent', { transparent: true, depthWrite: false }), B: k.basic('ok', { transparent: true, depthWrite: false }), C: k.basic('#f0b429', { transparent: true, depthWrite: false }) };
    const kit = [], count = { A: 0, B: 0, C: 0 };
    let LAST;
    for (let level = 0; level < 4; level++) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const kind = kindOf(i, j);
                const home = new THREE.Vector3(BX + (i - 1) * M.l, PAD_TOP + level * M.h, BZ + (j ? -M.d / 2 : M.d / 2));
                const spread = new THREE.Vector3((i - 1) * 1.5, level * 1, j ? -0.9 : 0.9);
                const faces = { front: !j, back: !!j, left: i === 0, right: i === 2, top: level === 3 };
                count[kind]++;
                if (level === 3 && i === 2 && !j) {
                    LAST = { home, spread, faces, kind };
                    continue;
                }
                const module = makeModule(null, kind, faces, level * 5 + i * 3 + j);
                const tint = k.box(module.g, TINT[kind], M.l + 0.04, M.h + 0.02, M.d + 0.04, 0, -0.01, 0);
                tint.renderOrder = 2;
                if (kind === 'C' && level === 0) {
                    // The entrance: a door in place of the stair window
                    k.box(module.envelope, 'accent', 0.95, 2.05, 0.06, 0, 0.17, M.d / 2 + 0.01);
                    k.box(module.envelope, 'metal', 0.05, 0.4, 0.05, 0.3, 1, M.d / 2 + 0.06);
                }
                kit.push({ g: module.g, home, spread, kind });
            }
        }
    }
    const MODULES = count.A + count.B + count.C;
    // Bolt-on panels (balconies, the entrance canopy) and plant pods on the roof
    const panels = [];
    for (let level = 1; level < 4; level++) {
        const g = k.group(null);
        k.box(g, 'coping', 2.5, 0.14, 0.95, 0, -0.14, 0.47);
        k.box(g, 'glass', 2.5, 1, 0.05, 0, 0, 0.92);
        [-1.25, 1.25].forEach(x => k.box(g, 'glass', 0.05, 1, 0.92, x, 0, 0.46));
        k.box(g, 'dark', 2.54, 0.05, 0.08, 0, 1, 0.92);
        panels.push({ g, home: new THREE.Vector3(BX - M.l - 0.3, PAD_TOP + level * M.h, BZ + M.d), spread: new THREE.Vector3(-1.5, level, 2.3), kind: 'panel' });
    }
    const canopy = k.group(null);
    k.box(canopy, 'coping', 2.2, 0.12, 1.3, 0, 0, 0.65);
    k.box(canopy, 'accent', 2.24, 0.14, 0.05, 0, -0.01, 1.3);
    panels.push({ g: canopy, home: new THREE.Vector3(BX, PAD_TOP + 2.5, BZ + M.d), spread: new THREE.Vector3(0, 0.2, 2.6), kind: 'panel' });
    const pods = [0, 1].map(n => {
        const g = k.group(null);
        k.box(g, 'metal', 2, 0.95, 1.4);
        [-0.45, 0.5].forEach(x => k.cyl(g, 'dark', 0.42, 0.06, x, 0.95, 0));
        return { g, home: new THREE.Vector3(BX + (n ? 0.6 : -3), PAD_TOP + 4 * M.h + 0.03, BZ - M.d / 2), spread: new THREE.Vector3(n ? 0.2 : -1.6, 4.7, -1.2), kind: 'pod' };
    });
    const pieces = [...kit, ...panels, ...pods];
    const slotLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const slot = frame(k, null, slotLine, M.l, M.h, M.d);

    // ---- The module that is followed: made in parts, with its weight taken off
    const last = makeModule(null, LAST.kind, LAST.faces, 4);
    const pod = k.group(last.g, -0.75, 0.15, -0.35);
    k.box(pod, 'white', 1.3, 2.1, 1.5);
    k.box(pod, 'metal', 1.34, 0.08, 1.54, 0, 2.1, 0);
    k.bars(pod, 'steel', 0.06, [[0.3, 2.18, -0.5, 0.3, 2.18, 0.6], [-0.2, 2.18, -0.5, -0.2, 2.18, 0.6, 0.04]]);
    const lugs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => k.box(last.g, 'yellow', 0.2, 0.1, 0.2, sx * (M.l / 2 - 0.1), M.h, sz * (M.d / 2 - 0.1)));
    const takeOff = [
        [WEIGHT.floor * M.l * M.d, 0, 0.08, 0],
        [WEIGHT.roof * M.l * M.d, 0, M.h - 0.1, 0],
        [WEIGHT.wall * 2 * (M.l + M.d) * (M.h - 0.35), 0, M.h / 2, 0],
        [WEIGHT.pod, pod.position.x, 1.2, pod.position.z]
    ];
    const TONNES = takeOff.reduce((sum, [mass]) => sum + mass, 0);
    const COG = new THREE.Vector3();
    takeOff.forEach(([mass, x, y, z]) => COG.add(v0.set(x, y, z).multiplyScalar(mass / TONNES)));
    const cogMaterial = k.basic('#f0b429');
    const cog = k.group(last.g, COG.x, COG.y, M.d / 2 + 0.03);
    k.cyl(cog, cogMaterial, 0.2, 0.03).rotation.x = Math.PI / 2;
    k.box(cog, 'dark', 0.4, 0.05, 0.05, 0, -0.025, 0.02);
    k.box(cog, 'dark', 0.05, 0.4, 0.05, 0, -0.2, 0.02);
    const plumb = k.lines(last.g, k.lineMaterial('#f0b429', { transparent: true }), [COG.x, COG.y, M.d / 2 + 0.05, COG.x, M.h + RIG, M.d / 2 + 0.05]);
    const plates = k.group(null, LAST.home.x, LAST.home.y, LAST.home.z);
    const plateMaterial = k.basic('signal');
    [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => k.box(plates, plateMaterial, 0.3, 0.3, 0.3, (sx * M.l) / 2, -0.15, (sz * M.d) / 2));

    // ---- The factory: an open frame over a line of three stations
    const hall = [], X0 = STATIONS[0] - 2.1, X1 = STATIONS[2] + 2.1, Z0 = LINE - 2.7, Z1 = LINE + 2.7;
    k.box(null, 'concrete', X1 - X0 + 0.8, 0.1, Z1 - Z0 + 0.8, (X0 + X1) / 2, 0, LINE);
    for (let n = 0; n < 4; n++) {
        const x = lerp(X0, X1, n / 3);
        hall.push([x, 0, Z0, x, 4.9, Z0, 0.22], [x, 0, Z1, x, 4.9, Z1, 0.22], [x, 4.9, Z0, x, 5.9, LINE, 0.18], [x, 4.9, Z1, x, 5.9, LINE, 0.18]);
    }
    [[Z0, 4.9], [(Z0 + LINE) / 2, 5.4], [LINE, 5.9], [(Z1 + LINE) / 2, 5.4], [Z1, 4.9]].forEach(([z, y]) => hall.push([X0, y, z, X1, y, z, 0.1]));
    [Z0, Z1].forEach(z => hall.push([X0, 3.6, z, X1, 3.6, z, 0.1]));
    k.bars(null, 'steel', 0.14, hall);
    [-0.9, 0.9].forEach(dz => k.box(null, 'dark', X1 - X0, 0.06, 0.12, (X0 + X1) / 2, 0.1, LINE + dz));
    [-0.9, 0.9].forEach(dx => k.box(null, 'dark', 0.12, 0.06, ROAD - LINE - 1.4, STATIONS[2] + dx, 0.02, (LINE + ROAD - 1.4) / 2));
    // What waits at each station: a jig, pods, a rack of cladding
    k.bars(null, 'yellow', 0.1, [[-1.9, 0, -2, -1.9, 3.3, -2], [1.9, 0, -2, 1.9, 3.3, -2], [-1.9, 3.3, -2, 1.9, 3.3, -2]].map(([a, b, c, d, e, f]) => [a + STATIONS[0], b + 0.1, c + LINE, d + STATIONS[0], e + 0.1, f + LINE]));
    [0, 1].forEach(n => k.box(null, 'white', 1.3, 2.1, 1.5, STATIONS[1] + 2.4 + n * 0.1, 0.1, LINE + 1.6 - n * 3.3));
    const rack = k.group(null, STATIONS[2] - 2.3, 0.1, LINE - 1.9);
    k.bars(rack, 'steel', 0.08, [[-0.4, 0, 0, 0, 2.5, 0], [0.4, 0, 0, 0, 2.5, 0], [-0.4, 0, 0, 0.4, 0, 0]]);
    [0.14, 0.26].forEach(x => { k.box(rack, 'timber', 0.06, 2.3, 1.3, x, 0, 0).rotation.z = -0.14; });
    const hands = STATIONS.map((x, n) => {
        const worker = person(k, null, x + 1.95, LINE + 1.2, { vest: true, hat: n === 1 ? 'white' : 'yellow', top: ['#3d5a80', '#e8590c', '#5a6b85'][n], skin: n });
        worker.position.y = 0.1;
        worker.rotation.y = -2.2;
        return worker;
    });
    k.glow(null, (X0 + X1) / 2, 4.6, LINE, 7, '#fff1c9', 0.5);
    k.pool(null, (X0 + X1) / 2, LINE, 6.5, '#fff1c9', 0.3).position.y = 0.12;

    // ---- The truck: a tractor unit and a trailer for one module, along x
    const wheel = (parent, x, z, r, w, alongX) => {
        const tyre = k.cyl(parent, E('rubber'), r, w, alongX ? x : x + w / 2, r, alongX ? z - w / 2 : z);
        const hub = k.cyl(parent, E('metal'), r * 0.48, w + 0.03, alongX ? x : x + w / 2 + 0.015, r, alongX ? z - w / 2 - 0.015 : z);
        tyre.rotation[alongX ? 'x' : 'z'] = hub.rotation[alongX ? 'x' : 'z'] = Math.PI / 2;
    };
    const truck = k.group(null, 0, 0, ROAD);
    k.box(truck, E('dark'), 5.6, 0.22, 2.5, -0.2, DECK - 0.22, 0);
    k.box(truck, E('steel'), 4.6, 0.3, 1.1, -0.2, DECK - 0.52, 0);
    [-2.3, -1.2].forEach(x => [-1.02, 1.02].forEach(z => wheel(truck, x, z, 0.46, 0.36, true)));
    k.box(truck, E('dark'), 3.4, 0.34, 1.1, 3.4, 0.52, 0);
    k.box(truck, E('white'), 1.9, 2.2, 2.4, 4.4, 0.75, 0);
    k.box(truck, E('accent'), 1.92, 0.24, 2.42, 4.4, 1.3, 0);
    k.box(truck, E('glassLit'), 0.06, 0.85, 2.1, 5.36, 1.9, 0);
    [-1.2, 1.2].forEach(z => k.box(truck, E('glass'), 0.9, 0.7, 0.06, 4.6, 1.9, z));
    k.box(truck, E('dark'), 0.12, 0.7, 2.4, 5.38, 0.5, 0);
    [4.6, 2.5].forEach(x => [-1.02, 1.02].forEach(z => wheel(truck, x, z, 0.46, 0.36, true)));
    const truckLamps = [-0.85, 0.85].map(z => k.glow(truck, 5.5, 0.95, z, 1.2, '#fff1c9'));
    const truckX = t => (t < B3 + 1.3 ? lerp(-27, STATIONS[2], easeOut(seg(t, B2 + 3.6, B2 + 5.4)))
        : t < B4 + 4.8 ? lerp(STATIONS[2], BX, easeInOut(seg(t, B3 + 1.3, B3 + 4.3))) : lerp(BX, 30, Math.pow(seg(t, B4 + 4.8, B4 + 6.4), 2)));

    // The gauge the load must pass: the road's envelope, as a wire frame
    const GAUGE = 1.2;
    const gaugeLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const gauge = frame(k, null, gaugeLine, 0.5, ROAD_ENVELOPE.h, ROAD_ENVELOPE.w, GAUGE, 0.06, ROAD);
    const gaugeFill = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const gaugeSheet = k.box(null, gaugeFill, 0.02, ROAD_ENVELOPE.h, ROAD_ENVELOPE.w, GAUGE, 0.06, ROAD);
    gaugeSheet.renderOrder = 2;
    const LOAD = { w: M.d, h: DECK + M.h };
    const SPARE = Math.min(ROAD_ENVELOPE.w - LOAD.w, ROAD_ENVELOPE.h - LOAD.h);

    // ---- The mobile crane, set up on its outriggers beside the road
    const CX = BX, CZ = 1.9, RAISED = 0.12;
    const crane = k.group(null, CX, RAISED, CZ);
    crane.rotation.y = Math.PI / 2;
    const Y = 'yellow';
    k.box(crane, Y, 2.5, 0.7, 8.6, 0, 0.75, 0.6);
    k.box(crane, 'dark', 2.3, 0.08, 5.2, 0, 1.45, -0.7);
    k.box(crane, Y, 2.4, 1.2, 1.5, 0, 0.95, 4.25);
    k.box(crane, 'glassLit', 2.2, 0.6, 0.06, 0, 1.45, 5);
    [-1.2, 1.2].forEach(x => k.box(crane, 'glass', 0.06, 0.55, 1, x, 1.5, 4.3));
    k.box(crane, 'dark', 2.5, 0.35, 0.2, 0, 0.5, 5);
    [3.6, 2.2, -1.4, -2.75].forEach(z => [-1.25, 0.8].forEach(x => {
        k.cyl(crane, 'rubber', 0.55, 0.45, x + 0.225, 0.55, z).rotation.z = Math.PI / 2;
        k.cyl(crane, 'metal', 0.26, 0.48, x + 0.24, 0.55, z).rotation.z = Math.PI / 2;
    }));
    const BEAM = 1.3, JACK_TOP = 0.68;
    [0.5, -3.55].forEach(z => {
        k.box(crane, 'dark', 2.5, 0.4, 0.5, 0, 0.5, z);
        [-1, 1].forEach(side => {
            const end = side * (1.25 + BEAM);
            k.box(crane, Y, BEAM + 0.05, 0.24, 0.3, side * (1.2 + (BEAM + 0.05) / 2), JACK_TOP, z);
            k.cyl(crane, 'metal', 0.09, JACK_TOP + RAISED - 0.15, end, 0.15 - RAISED, z);
            k.box(crane, 'dark', 0.7, 0.08, 0.7, end, 0.07 - RAISED, z);
            k.box(null, 'timber', 1.05, 0.07, 1.05, CX + z, 0.04, CZ - end);
        });
    });
    const upper = k.group(crane, 0, 1.53, 0);
    k.cyl(upper, 'dark', 1, 0.2, 0, -0.06, 0);
    k.box(upper, Y, 2.3, 0.45, 4.3, 0, 0.14, -0.95);
    k.box(upper, 'dark', 2.5, 1, 1, 0, 0.14, -2.9);
    k.box(upper, Y, 0.9, 0.8, 1.9, 0.8, 0.59, -1.3);
    k.box(upper, 'white', 0.95, 1.3, 1.5, -0.8, 0.59, 0.7);
    k.box(upper, 'glassLit', 0.85, 0.75, 0.06, -0.8, 1.05, 1.45);
    k.box(upper, 'glass', 0.06, 0.75, 1.2, -1.28, 1.05, 0.7);
    k.box(upper, 'dark', 0.9, 0.9, 0.5, 0, 0.59, -1);
    const PIVOT = { y: 1.3, back: 1, height: 1.53 + 1.3 + RAISED }, BASE_LENGTH = 6;
    const boom = k.group(upper, 0, PIVOT.y, -PIVOT.back);
    k.box(boom, Y, 0.62, 0.62, BASE_LENGTH, 0, -0.31, BASE_LENGTH / 2);
    const boomMid = k.box(boom, Y, 0.48, 0.48, 5.6, 0, -0.24, 0);
    const boomTip = k.box(boom, Y, 0.36, 0.36, 5.2, 0, -0.18, 0);
    const boomHead = k.box(boom, 'dark', 0.5, 0.56, 0.4, 0, -0.28, 0);
    const hoistPoint = new THREE.Object3D();
    boom.add(hoistPoint);
    const ram = k.box(upper, 'metal', 0.2, 0.2, 1);
    const cable = k.box(null, 'rubber', 0.05, 1, 0.05);
    const hook = k.group(null);
    k.box(hook, Y, 0.42, 0.5, 0.32);
    const rig = k.group(hook);
    const rx = M.l / 2 - 0.1, rz = M.d / 2 - 0.1, slings = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], n, corners) => {
        const [nx, nz] = corners[(n + 1) % 4];
        slings.push([0, 0, 0, sx * rx, -0.7, sz * rz, 0.03], [sx * rx, -0.7, sz * rz, sx * rx, -RIG, sz * rz, 0.03], [sx * rx, -0.7, sz * rz, nx * rx, -0.7, nz * rz, 0.1]);
    });
    k.bars(rig, Y, 0.1, slings);

    // Where the boom points, as [slew, radius]; and what the crane may lift there
    const polar = (x, z) => [Math.atan2(CZ - z, x - CX), Math.hypot(x - CX, z - CZ)];
    const PICK = polar(BX, ROAD), SET = polar(LAST.home.x, LAST.home.z);
    const capacity = radius => Math.min(CRANE_MAX, CRANE_MOMENT / radius);
    const TIP = 16.4, CARRY = LAST.home.y + M.h + RIG + 1.7;
    const LATCH = B4 + 1.4, LAND = B4 + 4.4;
    const ringFill = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const rings = RINGS.map(tonnes => {
        const radius = CRANE_MOMENT / tonnes;
        return { radius, mesh: ring(k, null, ringFill, radius - 0.07, radius + 0.07, CX, 0.07, CZ), tag: k.label(`${tonnes} t`, '', 'mini').at(CX + radius * Math.SQRT1_2, 0.1, CZ + radius * Math.SQRT1_2) };
    });

    // ---- Site crew
    const banksman = person(k, null, BX + 4.3, 4.1, { vest: true, hat: 'yellow', top: '#3d5a80' });
    banksman.rotation.y = -1.9;
    const guide = person(k, null, BX + 5.6, -0.2, { vest: true, hat: 'white', top: '#e8590c', skin: 2 });
    guide.rotation.y = -2.4;

    const kitTag = k.label('', '', 'query').at(BX, PAD_TOP + 4 * M.h + 8.4, BZ);
    const typeTags = ['A', 'B', 'C'].map(kind => ({ kind, tag: k.label(`Type ${kind} × ${count[kind]}`, '', 'mini'), of: kit.find(p => p.kind === kind && p.home.y > 5 && p.home.y < 8) }));
    const slotTag = k.label('M-24', 'the last module · in production');
    const stationTags = ['Frame', 'Services pod', 'Facade'].map((name, n) => k.label(`Station ${n + 1} · ${name}`, '', 'mini').at(STATIONS[n], 6.6, LINE));
    const lineTag = k.label();
    const gaugeTag = k.label().at(GAUGE, ROAD_ENVELOPE.h + 0.5, ROAD);
    const loadTag = k.label();
    const craneTag = k.label();
    const siteTag = k.label('', '', 'query').at(BX, PAD_TOP + 4 * M.h + 3.6, BZ);
    const caption = captions(k, [
        [B1, B2, 'Kit of parts · the building as modules, panels and pods'],
        [B2, B3, 'Factory line · one station, one takt'],
        [B3, B4, 'Transport · inside the road envelope'],
        [B4, END, 'Lift and connect · within the crane\'s capacity']
    ]);
    const tip = new THREE.Vector3(), at = new THREE.Vector3(), OKAY = new THREE.Color(), ACCENT = new THREE.Color(), tone = new THREE.Color();
    k.onTheme(() => {
        k.color('ok', OKAY);
        k.color('accent', ACCENT);
    });

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;
        const cleared = smooth(seg(t, END + 0.1, END + 0.8));

        // ---- Beat 1: the building pulls apart into what it is made of
        const split = pulse(u1, 0.4, 5, 1.1);
        pieces.forEach(p => p.g.position.copy(p.home).addScaledVector(p.spread, split));
        Object.values(TINT).forEach(material => { material.opacity = 0.42 * pulse(u1, 0.9, 4.6, 0.5); });
        slot.position.copy(LAST.home).addScaledVector(LAST.spread, split);
        const placed = t >= LAND && t < END + 0.8;
        const waiting = pulse(t, B1 + 0.5, LAND, 0.4) + (t >= END + 0.4 ? seg(t, END + 0.4, END + 0.9) : 0);
        slot.visible = waiting > 0.01;
        slotLine.opacity = waiting * (0.6 + 0.3 * Math.sin(t * 4));
        slotTag.at(slot.position.x, slot.position.y + M.h + 0.2, slot.position.z).show(pulse(u1, 1.3, 4.6, 0.3));
        typeTags.forEach(({ tag, of }) => tag.at(of.g.position.x + (of.kind === 'B' ? 0 : 0.2), of.g.position.y + 1.5, of.g.position.z + (of.kind === 'B' ? -M.d / 2 : M.d / 2)).show(pulse(u1, 1.2, 4.6, 0.3)));
        kitTag.set('Kit of parts', `${MODULES} modules · ${Object.keys(count).length} types · ${panels.length} panels · ${pods.length} pods`).show(pulse(u1, 0.6, 5, 0.3));

        // ---- Beat 2: down the line, a station at a time
        const station = u2 < 1.75 ? 0 : u2 < 3.45 ? 1 : 2;
        const lineX = track([[1.5, STATIONS[0]], [2, STATIONS[1]], [3.2, STATIONS[1]], [3.7, STATIONS[2]]], u2);
        const framed = easeOut(seg(u2, 0.4, 1.3)), fitted = easeOut(seg(u2, 2.1, 3)), clad = easeOut(seg(u2, 3.8, 4.7));
        last.shell.position.y = 3.2 * (1 - framed);
        last.shell.visible = framed > 0.01;
        pod.position.z = -0.35 + 3.3 * (1 - fitted);
        pod.visible = fitted > 0.01;
        last.envelope.position.z = 2.6 * (1 - clad);
        last.envelope.visible = clad > 0.01;
        lugs.forEach(lug => { lug.visible = framed > 0.5; });
        hands.forEach((worker, n) => {
            const busy = n === station && u2 > 0.2 && u2 < 4.8 ? 1 : 0;
            worker.userData.armL.rotation.x = worker.userData.armR.rotation.x = busy ? -1.2 + 0.25 * Math.sin(t * 8 + n) : 0;
        });
        stationTags.forEach(tag => tag.show(pulse(u2, 0.2, 5.3, 0.3)));
        const since = [0.2, 2, 3.7][station], hours = Math.min(TAKT, ((u2 - since) / 1.5) * TAKT);
        lineTag.set('Module M-24', `Station ${station + 1} of 3 · ${Math.floor(hours)}:${String(Math.floor((hours % 1) * 60)).padStart(2, '0')} of the ${TAKT}:00 h takt`)
            .show(pulse(u2, 0.4, 5.2, 0.3));

        // ---- Beat 3: onto the trailer, and through the gauge of the road
        const tx = truckX(t);
        truck.position.x = tx;
        truckLamps.forEach(lamp => { lamp.visible = Math.abs(tx) < 16; });
        const rolled = smooth(seg(u3, 0.1, 1.2));
        const passing = pulse(u3, 0.9, 4.6, 0.4);
        gauge.visible = gaugeSheet.visible = passing > 0.01;
        const through = 1 - clamp01(Math.abs(tx - GAUGE) / 2.2);
        tone.lerpColors(ACCENT, OKAY, through);
        gaugeLine.color.copy(tone);
        gaugeFill.color.copy(tone);
        gaugeLine.opacity = passing;
        gaugeFill.opacity = passing * (0.06 + 0.2 * through);
        gaugeTag.set(`Road envelope ${ROAD_ENVELOPE.w.toFixed(1)} × ${ROAD_ENVELOPE.h.toFixed(1)} m`, `Load ${LOAD.w.toFixed(2)} × ${LOAD.h.toFixed(2)} m · ${SPARE.toFixed(2)} m to spare`)
            .tone(tx > GAUGE - 2 ? 'ok' : '').show(pulse(u3, 1.1, 4.6, 0.3));
        const marked = pulse(t, B3 + 0.4, LAND, 0.4);
        cog.visible = plumb.visible = marked > 0.01;
        cog.scale.setScalar(Math.max(0.001, marked));
        plumb.material.opacity = marked * (t > LATCH - 0.6 ? 1 : 0);

        // ---- Beat 4: the lift, inside the crane's capacity, and the last connection
        const slew = track([[B4 + 2.2, PICK[0]], [B4 + 3.4, SET[0]], [END + 0.2, SET[0]], [END + 1, PICK[0]]], t);
        const radius = track([[B4 + 2.2, PICK[1]], [B4 + 3.4, SET[1]], [END + 0.2, SET[1]], [END + 1, PICK[1]]], t);
        const height = TIP - PIVOT.height, luff = Math.atan2(height, radius + PIVOT.back);
        const length = Math.hypot(height, radius + PIVOT.back), extend = length - BASE_LENGTH;
        upper.rotation.y = slew;
        boom.rotation.x = -luff;
        boomMid.position.z = 3.2 + extend / 2;
        boomTip.position.z = 3.4 + extend;
        boomHead.position.z = hoistPoint.position.z = length;
        aim(ram, 0, 0.55, 0.9, 0, PIVOT.y + 2.7 * Math.sin(luff) - 0.3 * Math.cos(luff), -PIVOT.back + 2.7 * Math.cos(luff) + 0.3 * Math.sin(luff));
        crane.updateMatrixWorld(true);
        k.local(hoistPoint, tip);
        const onDeck = DECK + M.h + RIG, inPlace = LAST.home.y + M.h + RIG;
        const hookY = Math.min(tip.y - 0.75, track([[B4 + 0.6, CARRY], [LATCH, onDeck], [LATCH + 0.1, onDeck], [B4 + 2.2, CARRY], [B4 + 3.4, CARRY], [LAND, inPlace], [LAND + 0.2, inPlace], [B4 + 5.4, CARRY]], t));
        hook.position.set(tip.x, hookY, tip.z);
        cable.position.set(tip.x, hookY + 0.5, tip.z);
        cable.scale.y = Math.max(0.01, tip.y - hookY - 0.5);
        const lifting = t >= LATCH && t < LAND;
        const capable = pulse(t, B4 + 0.2, END, 0.5);
        ringFill.opacity = 0.75 * capable;
        rings.forEach(({ mesh, tag }) => {
            mesh.visible = capable > 0.01;
            tag.show(capable);
        });
        const reach = Math.hypot(tip.x - CX, tip.z - CZ), limit = capacity(reach);
        craneTag.set('Mobile crane', `Radius ${reach.toFixed(1)} m · may lift ${limit.toFixed(1)} t · load ${lifting ? TONNES.toFixed(1) : '0.0'} t${lifting ? ` (${Math.round((TONNES / limit) * 100)} %)` : ''}`)
            .at(CX + 4.6, 1.4, CZ + 1.4).show(pulse(u4, 0.4, 5.6, 0.3));
        banksman.userData.armR.rotation.x = lifting ? -2.5 + 0.3 * Math.sin(t * 5) : 0;
        banksman.userData.armL.rotation.x = lifting ? -1.2 : 0;
        guide.userData.armL.rotation.x = guide.userData.armR.rotation.x = lifting ? -1.1 + 0.15 * Math.sin(t * 3) : 0;

        // ---- Where the module is: on the line, the trailer, the hook, or in its place
        const g = last.g;
        g.visible = t > B2 + 0.2 && t < END + 0.8;
        g.scale.setScalar(Math.max(0.001, easeOut(seg(u2, 0.2, 0.5)) * (1 - cleared)));
        if (t < B3) g.position.set(lineX, 0.35, LINE);
        else if (t < LATCH) g.position.set(lerp(STATIONS[2], tx, rolled >= 1 ? 1 : 0), lerp(0.35, DECK, smooth(seg(u3, 0.8, 1.2))), lerp(LINE, ROAD, rolled));
        else if (t < LAND) g.position.set(tip.x, hookY - RIG - M.h, tip.z);
        else g.position.copy(LAST.home);
        const fixing = pulse(t, LAND, LAND + 1, 0.2);
        plates.visible = fixing > 0.01;
        plates.scale.setScalar(0.6 + 0.6 * fixing);

        k.local(g, at);
        loadTag.set(`M-24 · ${TONNES.toFixed(1)} t`, t >= LAND ? '4 connection plates engaged' : `4 lifting points · centre of gravity ${Math.hypot(COG.x, COG.z).toFixed(2)} m off centre`)
            .tone(t >= LAND ? 'ok' : '').at(at.x, at.y + M.h + 0.3, at.z).show(pulse(t, B3 + 0.5, END - 0.2, 0.3) * (u3 > 1.1 && u3 < 4.6 ? 0 : 1));
        const set = MODULES - 1 + (placed ? 1 : smooth(seg(t, LATCH, LAND)));
        siteTag.set(placed ? 'Assembly complete' : 'On site', `${(set / PER_DAY).toFixed(2)} days · ${Math.floor(set)} of ${MODULES} modules set`)
            .show(pulse(u4, 0.3, 5.8, 0.3));
        caption(t);
    };
}

export const dfma = {
    duration: 24.5,
    poster: 3.6,
    scale: 0.58,
    reach: 0.12,
    alt: 'A four-storey building of factory-made modules. It pulls apart into its kit of 24 modules of three types, bolt-on panels and plant pods; the last module passes three stations under an open factory frame, gaining its frame, a services pod and its facade to a takt-time counter; it travels by truck through a wire-frame gauge of the road envelope with its lifting points and centre of gravity marked; and a mobile crane, with its capacity rings on the ground, sets it into the last place, where the connection plates engage and the days-on-site counter stops.',
    build
};
