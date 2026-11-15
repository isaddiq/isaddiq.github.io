import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, track, person, polyline } from './props.js';
import { captions, ribbon, dots, ring, random } from './overlays.js';

// The programme: five storeys, each of nine columns and a slab cast in four bays, ten days a storey
const STOREYS = 5, PER_STOREY = 10;
const TODAY = 28;                    // the day of the programme the site is seen on
const PACE = 6 / 7;                  // how fast the work has gone, as a share of the planned pace
const START = Date.UTC(2026, 1, 2);  // day 0 of the programme
const LAPSE = 30;                    // seconds of site time to one second of the animation
const CLOCK = 9.5;                   // the hour on site when the loop begins
const GEOFENCE = 1.7;                // radius kept clear under a suspended load, m
const date = day => new Date(START + Math.round(day) * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const hhmm = seconds => {
    const minutes = Math.floor(CLOCK * 60 + seconds / 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/**
 * A concrete frame going up, and what its data is for. Four beats: a drone
 * flies a lawnmower path over the frame and its scan builds up as a point
 * cloud; the cloud is compared with the model, built elements turning green
 * and late ones orange, a storey at a time; the crane's hook is tracked with
 * a cycle timer, a truck is logged at the gate, and a worker under the load
 * trips the geofence, which holds the crane; and the planned and actual
 * S-curves are drawn beside the site, out to a forecast finish. Progress,
 * delay and forecast all come from the programme above and what is built.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.8, END = 23.3;
    const E = k.edge;
    const FX = -2.6, FZ = -2.6, H = 3, DECK = 0.3 + 2 * H;
    const frame = k.group(null, FX, 0, FZ);
    k.box(frame, 'paving', 7.4, 0.3, 7.4);

    // ---- The programme, element by element: when each was planned, and whether it stands
    const elements = [];
    for (let s = 0; s < STOREYS; s++) {
        for (let n = 0; n < 9; n++) elements.push({ s, kind: 'column', x: -2.8 + (n % 3) * 2.8, z: -2.8 + Math.floor(n / 3) * 2.8, planned: s * PER_STOREY + 0.4 + n * 0.45 });
        // The slab, front bays first
        [[-1.6, 1.6], [1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]].forEach(([x, z], m) => elements.push({ s, kind: 'slab', x, z, planned: s * PER_STOREY + 5.5 + m * 1.5 }));
    }
    elements.forEach(e => {
        e.actual = e.planned / PACE;
        e.built = e.actual <= TODAY;
        e.due = e.planned <= TODAY;
        e.box = e.kind === 'column' ? [0.36, 2.7, 0.36, e.x, 0.3 + e.s * H, e.z] : [3.2, 0.3, 3.2, e.x, e.s * H + H, e.z];
    });
    const built = elements.filter(e => e.built);
    // Earned schedule: the day by which the plan had this much built
    const EARNED = Math.max(...built.map(e => e.planned));
    const BEHIND = TODAY - EARNED;
    const PLANNED_END = STOREYS * PER_STOREY, FORECAST_END = PLANNED_END / (EARNED / TODAY);
    const levels = [0, 1, 2].map(s => {
        const due = elements.filter(e => e.s === s && e.due), done = due.filter(e => e.built);
        return { s, due: due.length, done: done.length, late: due.filter(e => !e.built) };
    });

    const check = [0, 1, 2].map(() => k.basic('ok', { transparent: true, depthWrite: false }));
    built.forEach(e => {
        const [w, h, d, x, y, z] = e.box;
        k.box(frame, 'concrete', w, h, d, x, y, z);
        const tint = k.box(frame, check[e.s], w + 0.06, h + 0.04, d + 0.06, x, y - 0.02, z);
        tint.renderOrder = 2;
    });
    const lateFill = k.basic('signal', { transparent: true, depthWrite: false });
    const lateLine = k.lineMaterial('signal', { transparent: true });
    const lateBoxes = elements.filter(e => e.due && !e.built).map(e => {
        const [w, h, d, x, y, z] = e.box;
        const ghost = k.box(frame, lateFill, w, h, d, x, y, z);
        ghost.renderOrder = 2;
        ghost.add(new THREE.LineSegments(k.GEO.edges, lateLine));
        return ghost;
    });
    // What stands on the working deck: starter bars, a stack of formwork, edge protection
    const starters = [];
    [[-2.8, -2.8], [0, -2.8], [2.8, -2.8], [-2.8, 0], [0, 0], [2.8, 0], [-2.8, 2.8], [0, 2.8], [2.8, 2.8]].forEach(([x, z]) => {
        [-0.1, 0.1].forEach(dx => [-0.1, 0.1].forEach(dz => starters.push([x + dx, DECK + 2.7, z + dz, x + dx, DECK + 3.5, z + dz])));
    });
    k.bars(frame, 'steel', 0.04, starters);
    k.box(frame, 'timber', 2.2, 0.36, 1.2, 1.2, DECK, -1.3);
    const rail = [];
    for (let n = 0; n <= 4; n++) {
        const p = -3.15 + n * 1.575;
        [-3.15, 3.15].forEach(q => rail.push([p, DECK, q, p, DECK + 1, q], [q, DECK, p, q, DECK + 1, p]));
    }
    [0.5, 1].forEach(h => [-3.15, 3.15].forEach(q => rail.push([-3.15, DECK + h, q, 3.15, DECK + h, q], [q, DECK + h, -3.15, q, DECK + h, 3.15])));
    k.bars(frame, 'signal', 0.045, rail);
    // Scaffold along the front
    const scaffold = [], posts = [-3.2, -1.6, 0, 1.6, 3.2], lifts = [2.3, 4.3, 6.3, 8.3];
    posts.forEach((x, n) => {
        [3.5, 4.3].forEach(z => scaffold.push([x, 0.3, z, x, 8.9, z]));
        lifts.forEach(y => scaffold.push([x, y, 3.5, x, y, 4.3]));
        if (n) {
            lifts.forEach(y => [3.5, 4.3].forEach(z => scaffold.push([posts[n - 1], y, z, x, y, z])));
            scaffold.push(n % 2 ? [posts[n - 1], 0.3, 4.3, x, 2.3, 4.3] : [posts[n - 1], 2.3, 4.3, x, 4.3, 4.3], n % 2 ? [posts[n - 1], 4.3, 4.3, x, 6.3, 4.3] : [posts[n - 1], 6.3, 4.3, x, 8.3, 4.3]);
        }
    });
    k.bars(frame, 'steel', 0.06, scaffold);
    lifts.slice(0, 3).forEach(y => k.box(frame, 'timber', 6.4, 0.06, 0.7, 0, y, 3.9));

    // ---- Tower crane: mast, slewing jib with a trolley, and a hook with its load
    const CRANE = { x: 3.4, z: -5, top: 13.4 };
    const crane = k.group(null, CRANE.x, 0, CRANE.z);
    k.box(crane, 'concrete', 2.3, 0.35, 2.3);
    const mast = [], hw = 0.42, PANELS = 11, PANEL = (CRANE.top - 0.65) / PANELS;
    [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].forEach(([x, z], n, corners) => {
        const [nx, nz] = corners[(n + 1) % 4];
        mast.push([x, 0.35, z, x, CRANE.top - 0.3, z]);
        for (let level = 0; level < PANELS; level++) {
            const y0 = 0.35 + level * PANEL, y1 = y0 + PANEL;
            mast.push([x, y1, z, nx, y1, nz, 0.05], level % 2 ? [x, y0, z, nx, y1, nz, 0.05] : [nx, y0, nz, x, y1, z, 0.05]);
        }
    });
    k.bars(crane, 'yellow', 0.09, mast);
    k.cyl(crane, 'dark', 0.72, 0.3, 0, CRANE.top - 0.3, 0);
    const upper = k.group(crane, 0, CRANE.top, 0);
    const jib = [], JIB = 8, TAIL = -3;
    [-0.3, 0.3].forEach(x => jib.push([x, 0, TAIL, x, 0, JIB]));
    jib.push([0, 0.75, -0.2, 0, 0.75, JIB - 0.5]);
    for (let n = 0; n < 10; n++) {
        const z0 = 0.2 + n * 0.78, z1 = z0 + 0.78;
        jib.push([-0.3, 0, z0, 0, 0.75, z0 + 0.39, 0.045], [0.3, 0, z0, 0, 0.75, z0 + 0.39, 0.045]);
        jib.push([0, 0.75, z0 + 0.39, -0.3, 0, z1, 0.045], [0, 0.75, z0 + 0.39, 0.3, 0, z1, 0.045], [-0.3, 0, z1, 0.3, 0, z1, 0.045]);
    }
    [-0.4, 0.4].forEach(x => jib.push([x, 0, -0.5, 0, 2.3, 0], [x, 0, 0.5, 0, 2.3, 0]));
    jib.push([0, 2.3, 0, 0, 0.75, 5.4, 0.04], [0, 2.3, 0, 0, 0.1, TAIL + 0.4, 0.04]);
    k.bars(upper, 'yellow', 0.08, jib);
    k.box(upper, 'concrete', 1, 0.8, 1.2, 0, -0.75, TAIL + 0.7);
    const cab = k.group(upper, 0.75, -0.95, 0.5);
    k.box(cab, 'white', 0.8, 0.9, 1);
    k.box(cab, 'glassLit', 0.7, 0.45, 0.06, 0, 0.35, 0.5);
    [-0.41, 0.41].forEach(x => k.box(cab, 'glass', 0.03, 0.45, 0.8, x, 0.35, 0));
    k.sphere(upper, k.basic(['#e5383b', '#ff5a5c']), 0.09, 0, 0.1, JIB);
    k.glow(upper, 0, 0.1, JIB, 1.2, '#ff5a5c', 0.8);
    k.glow(upper, 0.75, -0.5, 1.1, 1.6);
    const trolley = k.box(upper, 'dark', 0.7, 0.18, 0.5, 0, -0.2, 3);
    const cable = k.box(upper, 'rubber', 0.045, 1, 0.045);
    const hook = k.group(upper);
    k.box(hook, 'yellow', 0.3, 0.3, 0.3, 0, -0.3, 0);
    k.bars(hook, 'dark', 0.03, [[0, -0.3, 0, 0, -1.05, -0.8], [0, -0.3, 0, 0, -1.05, 0.8]]);
    // The load: a bundle of reinforcement, slung at two points
    const load = k.group();
    k.box(load, 'steel', 0.5, 0.2, 2.4, 0, -0.2, 0);
    [-0.8, 0.8].forEach(z => k.box(load, 'yellow', 0.56, 0.24, 0.06, 0, -0.22, z));

    // ---- Laydown, the road, the gate
    const PICK = { x: 4.3, z: 1.1 }, PLACE = { x: FX - 0.9, z: FZ + 1.3 };
    k.box(null, 'timber', 1.2, 0.1, 2.8, PICK.x, 0, PICK.z);
    k.box(null, 'steel', 0.5, 0.2, 2.4, PICK.x + 0.2, 0.1, PICK.z + 0.1);
    const stack = k.group(null, 3, 0, 3.5);
    k.box(stack, 'timber', 1.5, 0.14, 1.1);
    k.box(stack, 'concrete', 1.3, 0.5, 0.9, 0, 0.14, 0);
    k.box(stack, 'concrete', 1.3, 0.5, 0.9, 0.05, 0.66, 0);
    const ROAD = 7, GATE = 5.2;
    k.box(null, E('asphalt'), 3.2, 0.05, 40, ROAD, 0, 0);
    [-1.66, 1.66].forEach(dx => k.box(null, E('paving'), 0.14, 0.09, 40, ROAD + dx, 0, 0));
    const fence = [];
    for (let x = ROAD - 4.2; x <= ROAD - 2.19; x += 1) fence.push([x, 0, GATE, x, 1.9, GATE]);
    [0.3, 1.1, 1.85].forEach(y => fence.push([ROAD - 4.2, y, GATE, ROAD - 2.2, y, GATE, 0.04]));
    k.bars(null, 'steel', 0.07, fence);
    const gate = k.group(null, ROAD - 1.9, 0, GATE);
    k.box(gate, 'yellow', 0.3, 1.1, 0.3);
    k.box(gate, 'dark', 0.22, 1.5, 0.22, -0.5, 0, 0);
    k.box(gate, 'white', 0.3, 0.3, 0.12, -0.5, 1.5, 0);
    const reader = k.sphere(gate, k.basic('ok'), 0.08, -0.5, 1.92, 0);
    const readerGlow = k.glow(gate, -0.5, 1.92, 0, 1.6, 'ok', 0.9);
    const boom = k.group(gate, 0, 1, 0);
    k.box(boom, 'white', 3.7, 0.1, 0.1, 1.95, 0, 0);
    [0.7, 1.7, 2.7].forEach(x => k.box(boom, 'signal', 0.5, 0.11, 0.11, x, -0.005, 0));

    // The truck: a mixer, in by the gate and out along the road
    const truck = k.group(null, ROAD, 0, 14);
    truck.rotation.y = Math.PI;
    k.box(truck, E('dark'), 1.1, 0.24, 5.4, 0, 0.5, -0.5);
    const cabin = k.group(truck, 0, 0.74, 1.5);
    k.box(cabin, E('white'), 2, 1.5, 1.5);
    k.box(cabin, E('accent'), 2.02, 0.2, 1.52, 0, 0.42, 0);
    k.box(cabin, E('glassLit'), 1.8, 0.6, 0.06, 0, 0.8, 0.76);
    [-1.01, 1.01].forEach(x => k.box(cabin, E('glass'), 0.04, 0.5, 0.8, x, 0.82, 0.2));
    const drum = k.mesh(truck, k.own(new THREE.CylinderGeometry(0.62, 1.02, 3, 20).rotateX(Math.PI / 2)), E('white'), 0, 1.75, -1.25);
    drum.rotation.x = -0.2;
    const stripes = k.mesh(drum, k.own(new THREE.CylinderGeometry(0.87, 0.95, 0.5, 20, 1, true, 0, Math.PI).rotateX(Math.PI / 2)), E('accent'), 0, 0, 0.5);
    k.box(truck, E('steel'), 0.3, 0.9, 0.3, 0, 0.74, -2.9);
    k.box(truck, E('steel'), 0.24, 0.1, 1.3, 0, 1.1, -3.4).rotation.x = 0.5;
    const wheels = [];
    [1.5, -1.1, -2.3].forEach(z => [-0.86, 0.86].forEach(x => {
        const wheel = k.cyl(truck, E('rubber'), 0.46, 0.34, x - 0.17, 0.46, z);
        wheel.rotation.z = -Math.PI / 2;
        wheels.push(wheel);
    }));
    const lamps = [-0.7, 0.7].map(x => k.glow(truck, x, 0.95, 2.4, 1.1, '#fff1c9'));
    const PARK = 0.2;
    const truckZ = t => (t < B3 ? 14 : t < END ? lerp(14, PARK, easeOut(seg(t, B3 + 0.3, B3 + 2.9))) : lerp(PARK, -15, Math.pow(seg(t, END, END + 1), 2)));
    let logged = B3 + 0.3;
    while (truckZ(logged) > GATE) logged += 0.01;

    // ---- The crane's cycle, on a clock that the geofence can stop
    const polar = p => ({ angle: Math.atan2(p.x - CRANE.x, p.z - CRANE.z), reach: Math.hypot(p.x - CRANE.x, p.z - CRANE.z) });
    const from = polar(PICK), to = polar(PLACE);
    const LOW = 1.45, HIGH = 11.6, SET = DECK + 1.4;                // height of the hook
    const groundAt = (p, out) => {
        const angle = lerp(from.angle, to.angle, p), r = lerp(from.reach, to.reach, p);
        out.x = CRANE.x + r * Math.sin(angle);
        out.z = CRANE.z + r * Math.cos(angle);
        return out;
    };
    // A worker crosses the site, under where the load will pass
    const WALK = { from: [3.6, 3.4], to: [1.3, -2.2], start: 1.2, end: 3.5 };
    const walkerAt = (u, out) => {
        const q = seg(u, WALK.start, WALK.end);
        out.x = lerp(WALK.from[0], WALK.to[0], q);
        out.z = lerp(WALK.from[1], WALK.to[1], q);
        return out;
    };
    const STEP = 1 / 60, SLEW = 1.5, LIFTED = 1;
    const slewTable = [0], a = { x: 0, z: 0 }, b = { x: 0, z: 0 };
    let arrived = 0;
    for (let u = LIFTED; u < 9; u += STEP) {
        const p = slewTable[slewTable.length - 1];
        groundAt(smooth(p), a);
        walkerAt(u, b);
        const held = Math.hypot(a.x - b.x, a.z - b.z) < GEOFENCE;
        slewTable.push(Math.min(1, p + (held ? 0 : STEP / SLEW)));
        if (!arrived && slewTable[slewTable.length - 1] >= 1) arrived = u + STEP;
    }
    const RELEASE = arrived + 1;
    const slewAt = u => {
        if (u <= LIFTED) return 0;
        const n = Math.min(slewTable.length - 1, (u - LIFTED) / STEP), i = Math.floor(n);
        return smooth(lerp(slewTable[i], slewTable[Math.min(slewTable.length - 1, i + 1)], n - i));
    };
    const hookAt = u => track([[0.2, LOW], [LIFTED, HIGH], [arrived, HIGH], [arrived + 0.9, SET], [RELEASE + 0.2, SET], [RELEASE + 1, HIGH]], u);

    // ---- The drone, and the point cloud its scan leaves on what is built
    const FLY = 12.6, STRIPS = [-3.3, -1.65, 0, 1.65, 3.3];
    const drone = k.group();
    k.box(drone, 'dark', 0.5, 0.14, 0.5, 0, -0.07, 0);
    k.bars(drone, 'dark', 0.06, [[-0.6, 0, -0.6, 0.6, 0, 0.6], [-0.6, 0, 0.6, 0.6, 0, -0.6]]);
    k.sphere(drone, 'metal', 0.12, 0, -0.16, 0.12);
    const rotors = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].map(([x, z]) => {
        k.cyl(drone, 'dark', 0.05, 0.1, x, 0, z);
        const blade = k.box(drone, 'white', 0.62, 0.015, 0.07, x, 0.1, z);
        return blade;
    });
    k.sphere(drone, k.basic('accent'), 0.06, 0, 0.02, -0.3);
    k.glow(drone, 0, 0.02, -0.3, 1.2, 'accent', 0.9);
    const fanMaterial = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const fanGeometry = new THREE.BufferGeometry();
    fanGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.2, 0, 0, -1, -0.2, 0, -1, 0.2], 3));
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.renderOrder = 3;
    drone.add(fan);
    const PAD = { x: -7.6, z: 0.2 };
    k.box(null, 'dark', 1.2, 0.05, 1.2, PAD.x, 0, PAD.z);
    k.box(null, 'white', 0.9, 0.06, 0.12, PAD.x, 0, PAD.z);
    k.box(null, 'white', 0.12, 0.06, 0.9, PAD.x, 0, PAD.z);
    /** Where the drone is on its survey, 0..1: strip after strip, there and back. */
    const surveyAt = (s, out) => {
        const n = Math.min(STRIPS.length - 1, Math.floor(s * STRIPS.length)), q = s * STRIPS.length - n;
        out.x = FX + (n % 2 ? lerp(3.9, -3.9, q) : lerp(-3.9, 3.9, q));
        out.z = FZ + STRIPS[n];
        return out;
    };
    const rnd = random(11), cloud = [];
    built.forEach(e => {
        const [w, h, d, x, y, z] = e.box;
        // Points on the top and the four sides, as many as their area asks for
        [[w, d, 'y'], [w, h, 'z'], [d, h, 'x']].forEach(([p, q, axis]) => {
            const count = Math.round(p * q * (axis === 'y' ? 26 : 13));
            for (let n = 0; n < count * (axis === 'y' ? 1 : 2); n++) {
                const u = (rnd() - 0.5) * p, v = rnd(), side = n % 2 ? 1 : -1;
                const point = axis === 'y' ? [x + u, y + h, z + (v - 0.5) * q] : axis === 'z' ? [x + u, y + v * q, z + (side * d) / 2] : [x + (side * w) / 2, y + v * q, z + u];
                const strip = STRIPS.reduce((best, sz, i) => (Math.abs(sz - point[2]) < Math.abs(STRIPS[best] - point[2]) ? i : best), 0);
                const across = clamp01((point[0] + 3.9) / 7.8);
                cloud.push({ point, when: (strip + (strip % 2 ? 1 - across : across)) / STRIPS.length });
            }
        });
    });
    cloud.sort((p, q) => p.when - q.when);
    const scan = dots(k, frame, 'accent', 2.1, cloud.length);
    cloud.forEach(({ point }, n) => scan.geometry.attributes.position.setXYZ(n, point[0] + (rnd() - 0.5) * 0.03, point[1] + (rnd() - 0.5) * 0.03, point[2] + (rnd() - 0.5) * 0.03));

    // ---- The geofence under the load, the hook's trail, the people on site
    const fenceFill = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const fenceRing = ring(k, null, fenceFill, GEOFENCE - 0.16, GEOFENCE, 0, 0.05, 0);
    const fenceDisc = ring(k, null, k.basic('signal', { transparent: true, depthWrite: false, side: THREE.DoubleSide }), 0, GEOFENCE - 0.16, 0, 0.045, 0);
    const TRAIL = 90;
    const trailMaterial = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const trail = polyline(k, null, trailMaterial, TRAIL);
    trail.renderOrder = 3;
    const crew = { vest: true, hat: 'yellow' };
    const signaller = person(k, null, PICK.x + 1.3, PICK.z + 1.6, { ...crew, top: '#e8590c' });
    signaller.rotation.y = -2.4;
    const fixer = person(k, frame, -2, 0.4, { ...crew, skin: 2 });
    fixer.position.y = DECK;
    fixer.rotation.y = 2.2;
    const foreman = person(k, frame, 1.3, 1.9, { ...crew, hat: 'white', skin: 1 });
    foreman.position.y = DECK;
    foreman.rotation.y = -2.2;
    const walker = person(k, null, WALK.from[0], WALK.from[1], { ...crew, top: '#3d5a80', skin: 3 });
    walker.rotation.y = Math.atan2(WALK.to[0] - WALK.from[0], WALK.to[1] - WALK.from[1]);
    const pilot = person(k, null, PAD.x + 0.4, PAD.z + 1.5, { vest: true, hat: 'white', top: '#5a6b85', skin: 1 });
    pilot.rotation.y = 2.4;
    pilot.userData.armL.rotation.x = pilot.userData.armR.rotation.x = -0.6;
    pilot.userData.foreL.rotation.x = pilot.userData.foreR.rotation.x = -1;
    k.box(pilot, 'dark', 0.3, 0.06, 0.16, 0, 1.08, 0.34);

    // ---- The S-curves, drawn on the ground beside the site
    // (its axes lie along the diagonals of the grid, so that from the opening view time runs across the stage and progress up it)
    const CHART = { across: [-9.8, -1.9], near: 9.3, far: 3.5, y: 0.04 };
    const TOTAL = elements.length;
    const onChart = (day, share) => {
        const across = lerp(CHART.across[0], CHART.across[1], day / (FORECAST_END + 2)), towards = lerp(CHART.near, CHART.far, share);
        return [(across + towards) * Math.SQRT1_2, (towards - across) * Math.SQRT1_2];
    };
    const curve = (count, first, last) => {
        const points = [];
        for (let day = first; day <= last + 1e-6; day += 0.5) points.push(onChart(day, count(day) / TOTAL));
        return points;
    };
    const plannedBy = day => elements.filter(e => e.planned <= day).length;
    const actualBy = day => elements.filter(e => e.actual <= day).length;
    const inkBand = k.basic(['#8794a8', '#7f93bd'], { side: THREE.DoubleSide, transparent: true });
    const accentBand = k.basic('accent', { side: THREE.DoubleSide, transparent: true });
    const signalBand = k.basic('signal', { side: THREE.DoubleSide, transparent: true });
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute('position', new THREE.Float32BufferAttribute([[-1.5, -0.12], [FORECAST_END + 3.5, -0.12], [FORECAST_END + 3.5, 1.14], [-1.5, 1.14]]
        .flatMap(([day, share]) => { const [x, z] = onChart(day, share); return [x, 0.02, z]; }), 3));
    sheet.setIndex([0, 1, 2, 0, 2, 3]);
    const sheetMaterial = k.basic(['#ffffff', '#101a33'], { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const sheetMesh = new THREE.Mesh(sheet, sheetMaterial);
    sheetMesh.renderOrder = 2;
    k.root.add(sheetMesh);
    const END_DAY = FORECAST_END + 2;
    const axes = ribbon(k, null, inkBand, [onChart(0, 1.05), onChart(0, 0), onChart(END_DAY, 0)], 0.08, CHART.y);
    const rules = k.lines(null, k.lineMaterial('ink', { transparent: true, opacity: 0.22 }),
        [0.25, 0.5, 0.75, 1].flatMap(share => [...onChart(0, share), ...onChart(END_DAY, share)].flatMap((v, n) => (n % 2 ? [v] : [v, CHART.y]))
            .reduce((out, v, n, all) => (n % 3 === 0 ? out.concat([all[n], all[n + 1], all[n + 2]]) : out), [])));
    const plannedBand = ribbon(k, null, inkBand, curve(plannedBy, 0, PLANNED_END), 0.17, CHART.y);
    const actualBand = ribbon(k, null, accentBand, curve(actualBy, 0, TODAY), 0.24, CHART.y + 0.005);
    const forecastBand = ribbon(k, null, signalBand, curve(actualBy, TODAY, FORECAST_END), 0.17, CHART.y + 0.005);
    const tick = (day, material) => {
        const [x0, z0] = onChart(day, 0), [x1, z1] = onChart(day, 1.05);
        return k.lines(null, material, [x0, CHART.y, z0, x1, CHART.y, z1]);
    };
    const todayLine = tick(TODAY, k.lineMaterial('ink', { transparent: true, opacity: 0.7 }));
    const mark = (day, share) => { const [x, z] = onChart(day, share); return [x, CHART.y, z]; };
    const todayTag = k.label(`Day ${TODAY} · ${actualBy(TODAY)} of ${plannedBy(TODAY)} elements due are built`, '', 'mini').at(...mark(TODAY - 4, -0.08));
    const forecastTag = k.label(`Forecast finish · ${date(FORECAST_END)}`, `${Math.round(FORECAST_END - PLANNED_END)} days after the planned ${date(PLANNED_END)}`).tone('signal').at(...mark(FORECAST_END, 1));

    const droneTag = k.label();
    const levelTags = levels.map(l => k.label().at(FX + 3.5, 0.3 + l.s * H + 1.6, FZ + 3.6));
    const craneTag = k.label();
    const gateTag = k.label('Gate log', `Truck T-07 in at ${hhmm((logged - 0) * LAPSE)} · 8 m³ of concrete`).tone('ok').at(ROAD - 2.4, 2.1, GATE);
    const fenceTag = k.label();
    const caption = captions(k, [
        [B1, B2, 'Capture · a drone scan becomes a point cloud'],
        [B2, B3, 'Compare · the cloud against the model'],
        [B3, B4, 'Track · the crane, the gate and a geofence'],
        [B4, END, 'Forecast · planned and actual, to a finish date']
    ]);
    const at = new THREE.Vector3(), under = { x: 0, z: 0 }, feet = { x: 0, z: 0 }, tone = new THREE.Color();
    const placeHook = (u, out) => {
        groundAt(slewAt(u), under);
        return out.set(under.x, hookAt(u), under.z);
    };

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;

        // ---- Beat 1: the drone's survey, strip by strip, and the cloud it leaves
        const survey = seg(u1, 1, 4.5);
        surveyAt(survey, under);
        const out = smooth(seg(u1, 0.2, 1)), home = smooth(seg(u1, 4.5, 5.3));
        const flying = out * (1 - home);
        drone.position.set(lerp(PAD.x, under.x, flying), lerp(0.25, FLY, smooth(Math.min(seg(u1, 0.2, 0.8), 1 - seg(u1, 4.7, 5.3)))), lerp(PAD.z, under.z, flying));
        const heading = Math.floor(survey * STRIPS.length) % 2 ? -Math.PI / 2 : Math.PI / 2;
        drone.rotation.y = heading;
        drone.rotation.z = 0.05 * Math.sin(t * 3);
        rotors.forEach((blade, n) => { blade.rotation.y = t * 40 + n; });
        const scanning = pulse(u1, 0.95, 4.55, 0.15);
        fan.visible = scanning > 0.01;
        fanMaterial.opacity = 0.26 * scanning;
        // The fan reaches down to the deck, as wide as the strips are apart
        fan.scale.set(1, FLY - DECK - 0.2, 4.4);
        let seen = 0;
        while (seen < cloud.length && cloud[seen].when <= survey) seen++;
        scan.geometry.setDrawRange(0, seen);
        const clouded = pulse(t, B1 + 0.9, B3 + 0.5, 0.5);
        scan.visible = clouded > 0.01 && seen > 0;
        scan.material.opacity = clouded;
        droneTag.set('Survey drone', `${Math.round(survey * 100)} % of the flight · ${seen.toLocaleString('en-US')} points`)
            .at(drone.position.x, drone.position.y + 0.5, drone.position.z).show(pulse(u1, 0.5, 5, 0.3));

        // ---- Beat 2: the cloud against the model, a storey at a time
        levels.forEach((l, n) => {
            const checked = pulse(t, B2 + 0.5 + n * 0.8, B3 + 0.3, 0.4);
            check[l.s].opacity = 0.5 * checked;
            const pct = Math.round((l.done / l.due) * 100);
            levelTags[n].set(`Level ${l.s + 1} · ${pct} %`, l.late.length ? `${l.done} of ${l.due} elements · ${Math.round(BEHIND)} days behind` : `${l.done} of ${l.due} elements · on programme`)
                .tone(l.late.length ? 'signal' : 'ok').show(pulse(t, B2 + 0.8 + n * 0.8, B3 + 0.3, 0.3));
        });
        const late = pulse(t, B2 + 2.4, B3 + 0.3, 0.4);
        lateBoxes.forEach(ghost => { ghost.visible = late > 0.01; });
        lateFill.opacity = late * (0.32 + 0.12 * Math.sin(t * 7));
        lateLine.opacity = late;

        // ---- Beat 3: the crane's cycle, timed; the truck at the gate; the geofence
        const u = t < B3 ? 0 : t < END ? u3 : 0;
        const slew = slewAt(u), hookY = hookAt(u);
        const reach = lerp(from.reach, to.reach, slew);
        upper.rotation.y = lerp(from.angle, to.angle, slew);
        trolley.position.z = reach;
        cable.position.set(0, hookY - CRANE.top, reach);
        cable.scale.y = CRANE.top - 0.2 - hookY;
        hook.position.set(0, hookY - CRANE.top + 0.3, reach);
        placeHook(u, at);
        const slung = u > 0.15 && u < RELEASE;
        const landed = t >= B3 && t < END && u >= RELEASE;
        load.visible = slung || landed;
        if (slung) load.position.set(at.x, hookY - 1.05, at.z);
        else load.position.set(PLACE.x, DECK + 0.2, PLACE.z);
        load.rotation.y = upper.rotation.y;
        const tracking = pulse(t, B3 + 0.1, B4 + 0.4, 0.3);
        trail.visible = tracking > 0.01;
        trailMaterial.opacity = tracking;
        const position = trail.geometry.attributes.position;
        for (let n = 0; n < TRAIL; n++) {
            placeHook(lerp(0.2, Math.max(0.21, Math.min(u, RELEASE + 1)), n / (TRAIL - 1)), at);
            position.setXYZ(n, at.x, at.y, at.z);
        }
        position.needsUpdate = true;
        placeHook(u, at);

        walkerAt(u, feet);
        walker.position.set(feet.x, 0, feet.z);
        const walking = u > WALK.start && u < WALK.end;
        walker.userData.walk(((u - WALK.start) * 2.6 / 0.72) * Math.PI, walking ? 1 : 0);
        walker.visible = t > B3 - 0.3 && t < END;
        // Measured: is anyone inside the ring under the hook?
        const inside = t >= B3 && t < END && slung && Math.hypot(feet.x - at.x, feet.z - at.z) < GEOFENCE;
        const fenced = tracking * (slung ? 1 : 0);
        fenceRing.position.set(at.x, 0.05, at.z);
        fenceDisc.position.set(at.x, 0.045, at.z);
        fenceRing.visible = fenceDisc.visible = fenced > 0.01;
        fenceFill.color.copy(k.color(inside ? 'signal' : 'accent', tone));
        fenceFill.opacity = fenced * 0.9;
        fenceDisc.material.opacity = inside ? 0.28 + 0.1 * Math.sin(t * 12) : 0;
        fenceTag.set('Geofence breached', 'Crane held until the worker is clear').tone('signal').at(feet.x, 2.1, feet.z).show(inside ? 1 : 0);
        const cycle = Math.max(0, Math.min(u, RELEASE) - 0.2) * LAPSE;
        craneTag.set(u >= RELEASE ? 'Lift complete' : inside ? 'Tower crane · held' : 'Tower crane', `Cycle ${Math.floor(cycle / 60)}:${String(Math.floor(cycle % 60)).padStart(2, '0')} · hook at ${hookY.toFixed(1)} m`)
            .tone(u >= RELEASE ? 'ok' : inside ? 'signal' : '').at(at.x, hookY + 0.9, at.z).show(pulse(u3, 0.2, 5.6, 0.3));
        signaller.userData.armR.rotation.x = u > 0 && u < LIFTED + 0.4 ? -2.5 + 0.3 * Math.sin(t * 5) : -0.1;

        truck.position.z = truckZ(t);
        wheels.forEach(wheel => { wheel.rotation.x = -truck.position.z / 0.46; });
        drum.rotation.z = t * 1.6;
        stripes.visible = true;
        lamps.forEach(lamp => { lamp.visible = Math.abs(truck.position.z) < 9; });
        const raised = pulse(t, logged - 0.9, logged + 0.9, 0.4) + pulse(t, END - 0.1, END + 0.9, 0.3);
        boom.rotation.z = 1.25 * smooth(clamp01(raised));
        const read = pulse(t, logged - 0.1, logged + 0.5, 0.1);
        reader.scale.setScalar(0.08 * (1 + 1.2 * read));
        readerGlow.visible = read > 0.05;
        gateTag.show(pulse(t, logged, B4 + 0.3, 0.3));

        // ---- Beat 4: planned against actual, and where that is heading
        const charted = pulse(u4, 0.2, 5.5, 0.4);
        inkBand.opacity = accentBand.opacity = signalBand.opacity = charted;
        sheetMesh.visible = rules.visible = charted > 0.01;
        sheetMaterial.opacity = 0.72 * charted;
        axes.userData.show(0, charted > 0 ? seg(u4, 0.2, 0.8) : 0);
        plannedBand.userData.show(0, charted > 0 ? seg(u4, 0.7, 1.9) : 0);
        actualBand.userData.show(0, charted > 0 ? seg(u4, 1.8, 2.9) : 0);
        // The forecast is drawn in dashes: it has not happened
        const reachTo = charted > 0 ? seg(u4, 3, 4) : 0;
        forecastBand.userData.show(0, reachTo);
        forecastBand.visible = forecastBand.visible && Math.floor(t * 6) % 3 !== 0;
        todayLine.visible = charted > 0.01 && u4 > 1.8;
        todayTag.show(pulse(u4, 1.9, 5.4, 0.3));
        forecastTag.show(pulse(u4, 3.9, 5.4, 0.3));
        caption(t);
    };
}

export const informatics = {
    duration: 24.3,
    poster: 9.6,
    scale: 0.74,
    reach: 0.1,
    alt: 'A concrete frame under construction with a tower crane. A drone flies a lawnmower path over the frame and its scan builds up as a point cloud; the cloud is checked against the model storey by storey, built elements turning green and two late slab bays orange, with the third level at 82 per cent and four days behind; the crane hook draws its path with a cycle timer, a truck is logged at the gate and a worker under the load trips a geofence that holds the crane; and planned and actual S-curves are drawn on the ground, ending at a forecast finish date.',
    build
};
