import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, track, tree, v0 } from './props.js';
import { captions } from './overlays.js';

/**
 * What the 5D beat prices the model at, in US dollars per unit measured.
 * The rates are illustrative; the quantities are measured from the scene.
 */
const BIM_RATES = { slab: 190, column: 1250, curtain: 950, opening: 650 };
const BIM_WEEKS = 38;                                    // length of the programme in the 4D beat
const FACES = [[0, 1], [1, 0], [0, -1], [-1, 0]];        // outward normal (x, z) of a facade, by quarter turn

/**
 * A nine-storey mixed-use building that stands complete for the whole loop,
 * while four beats show what the one model yields: a clash found and
 * resolved between a duct and a beam (3D), a floor plan cut from a storey
 * (documentation), quantities and cost by class of element (5D), and the
 * programme and the solar exposure of the glazing (4D, 6D). Every element
 * has a material of its class, posed from t on every frame, so nothing keeps
 * a tint after its beat. Modelled at full size, shown at bim.scale.
 */
function build(k) {
    // Towards the front of the grid, which leaves the height of the stage to the tower
    const GX = 5.6, GZ = 5.2;
    const g = k.group(null, GX, 0, GZ);
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23;   // the four beats; the building rests before and after
    const levels = [];
    // Everything above this plane is cut away in the documentation beat
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);

    const lit = n => ((n * 7 + 3) % 5 > 1 ? 'glassLit' : 'glass');
    const part = (x, y, z, turn = 0) => {
        const group = k.group(g, x, y, z);
        group.rotation.y = turn;
        return group;
    };
    /** A level, and the plan and height of the storey it carries. */
    const level = (y, x0, x1, z0, z1, h) => {
        const l = { y, x0, x1, z0, z1, h, parts: [], meshes: [], tinted: false };
        levels.push(l);
        return l;
    };
    /** File objects under a level as one class of element; userData.kind on a child overrides it. */
    const put = (l, kind, ...objects) => {
        objects.forEach(object => l.parts.push([object, kind]));
        return objects[0];
    };
    const as = (kind, ...objects) => {
        objects.forEach(object => { object.userData.kind = kind; });
        return objects[0];
    };
    /** A structural plate, measured as slab area. */
    const plate = mesh => {
        mesh.userData.plate = true;
        return mesh;
    };

    // Site
    k.box(g, 'paving', 16.4, 0.3, 13);
    tree(k, g, -7.2, 5.6, 1.7).position.y = 0.3;
    tree(k, g, 7.3, 5.5, 1.35).position.y = 0.3;
    const lamp = part(2.2, 0.3, 6);
    k.box(lamp, 'dark', 0.12, 3.4, 0.12);
    k.box(lamp, 'dark', 0.12, 0.1, 0.8, 0, 3.4, -0.3);
    k.glow(lamp, 0, 3.3, -0.6, 2.6);
    k.pool(g, 2.2, 5.2, 3.2).position.y = 0.33;

    /** A window in a wall that is already there: its frame and two lights. */
    const opening = (l, x, y, z, turn, w, h, n) => {
        const frame = part(x, y, z, turn);
        k.box(frame, 'dark', w, h, 0.1);
        [-1, 1].forEach((side, m) => k.box(frame, lit(n + m), w / 2 - 0.09, h - 0.12, 0.12, side * (w / 4 - 0.015), 0.06, 0));
        put(l, 'opening', frame);
    };

    // ---- Podium, level 1: a colonnade with the glazing set back behind it
    const PX = 6.5, PZ = 4.75;
    {
        const y = 0.45, h = 3.75;
        const l = level(y, -PX, PX, -PZ, PZ, h + 0.3);
        put(l, 'slab', plate(k.box(g, 'concrete', 13, 0.15, 9.5, 0, 0.3, 0)));
        [-6.15, -3.075, 0, 3.075, 6.15].forEach(x => put(l, 'column', k.box(g, 'coping', 0.5, h, 0.5, x, y, PZ - 0.35)));
        [1.47, -1.47, -4.4].forEach(z => put(l, 'column', k.box(g, 'coping', 0.5, h, 0.5, PX - 0.35, y, z)));
        put(l, 'wall', k.box(g, 'wall', 13, h, 0.3, 0, y, -PZ + 0.15), k.box(g, 'wall', 0.3, h, 9.2, -PX + 0.15, y, 0.15));
        // The back of the podium: high windows, and a service door
        for (let i = 0; i < 4; i++) {
            if (i === 1) {
                const service = part(-4.6125 + i * 3.075, y, -PZ, Math.PI);
                k.box(service, 'dark', 1.8, 2.5, 0.08);
                [-0.44, 0.44].forEach(dx => k.box(service, 'metal', 0.82, 2.36, 0.1, dx, 0.04, 0));
                put(l, 'opening', service);
            } else opening(l, -4.6125 + i * 3.075, y + 2, -PZ, Math.PI, 2.2, 1.1, i);
        }
        for (let j = 0; j < 3; j++) opening(l, -PX, 2.935 - j * 2.935 + 0.15, y + 1.3, -Math.PI / 2, 2.2, 1.8, j + 3);
        const shopfront = (x, z, turn, width, n) => {
            const bay = part(x, y, z, turn);
            k.box(bay, lit(n), width - 0.16, 3, 0.1);
            k.box(bay, 'dark', width, 0.75, 0.16, 0, 3, 0);
            [-1, 1].forEach(side => k.box(bay, 'dark', 0.1, 3, 0.16, side * (width / 2 - 0.05), 0, 0));
            if (n === 3) {
                const door = as('opening', k.group(bay));
                k.box(door, 'dark', 1.9, 2.45, 0.2, 0, 0, 0.02);
                [-0.45, 0.45].forEach(dx => k.box(door, 'glassLit', 0.82, 2.3, 0.24, dx, 0.05, 0.02));
                [-0.07, 0.07].forEach(dx => k.box(door, 'metal', 0.04, 0.6, 0.05, dx, 0.9, 0.16));
            }
            put(l, 'curtain', bay);
        };
        for (let i = 0; i < 4; i++) shopfront(-4.6125 + i * 3.075, PZ - 1, 0, 3.075, i);
        for (let j = 0; j < 3; j++) shopfront(PX - 1, 2.935 - j * 2.935, Math.PI / 2, 2.935, j + 5);
        const canopy = part(4.6125, 3.15, PZ + 0.75);
        k.box(canopy, 'coping', 3.5, 0.16, 2.7);
        k.box(canopy, 'dark', 3.54, 0.2, 0.08, 0, -0.02, 1.36);
        k.glow(canopy, 0, -0.9, 0.2, 3.2);
        put(l, 'trim', canopy);
    }

    // ---- Podium, level 2: cladding panels, ribbon windows behind louvres
    {
        const y = 4.5, h = 3.3;
        const l = level(y, -PX, PX, -PZ, PZ, h + 0.3);
        put(l, 'slab', plate(k.box(g, 'concrete', 13.5, 0.3, 10, 0, 4.2, 0)));
        put(l, 'wall', k.box(g, 'wall', 13, h, 0.3, 0, y, -PZ + 0.15), k.box(g, 'wall', 0.3, h, 9.2, -PX + 0.15, y, 0.15));
        [[-3.25, 2.4], [3.25, 2.4], [3.25, -2.4], [0, 2.4]].forEach(([x, z]) => put(l, 'column', k.box(g, 'concrete', 0.45, h, 0.45, x, y, z)));
        const panel = (x, z, turn, width, n) => {
            const bay = part(x, y, z, turn);
            k.box(bay, 'wall', width, h, 0.25, 0, 0, -0.125);
            as('opening', k.box(bay, 'dark', width - 0.6, 1.5, 0.1, 0, 0.95, 0));
            [-1, 1].forEach((side, m) => as('opening', k.box(bay, lit(n + m), width / 2 - 0.36, 1.38, 0.12, side * (width / 4 - 0.14), 1.01, 0)));
            put(l, 'wall', bay);
        };
        for (let i = 0; i < 4; i++) panel(-4.875 + i * 3.25, PZ, 0, 3.25, i + 1);
        for (let j = 0; j < 3; j++) panel(PX, 3.167 - j * 3.167, Math.PI / 2, 3.167, j + 2);
        // Round the back the same ribbon windows are set in the wall itself
        for (let i = 0; i < 4; i++) opening(l, -4.875 + i * 3.25, y + 0.95, -PZ, Math.PI, 2.65, 1.5, i + 3);
        for (let j = 0; j < 3; j++) opening(l, -PX, 3.167 - j * 3.167 + 0.15, y + 0.95, -Math.PI / 2, 2.567, 1.5, j + 1);
        const slats = [];
        [5.62, 5.98, 6.34, 6.7].forEach(sy => {
            slats.push([-6.4, sy, PZ + 0.24, 6.4, sy, PZ + 0.24], [PX + 0.24, sy, 4.65, PX + 0.24, sy, -4.65]);
        });
        put(l, 'trim', k.bars(g, 'coping', 0.09, slats));
    }

    // ---- Tower: five storeys of curtain wall above the podium roof terrace
    const TX0 = -6.3, TX1 = 1.7, TZ0 = -4.55, TZ1 = 1.45;
    const QX1 = TX1 - 2, QZ1 = TZ1 - 1.6;                  // the penthouse is set back to here
    const fascia = (slab, x0, x1, z0, z1, y) => {
        k.box(slab, 'coping', x1 - x0 + 0.4, 0.42, 0.22, (x0 + x1) / 2 + 0.1, y - 0.06, z1 + 0.09);
        k.box(slab, 'coping', 0.22, 0.42, z1 - z0 + 0.2, x1 + 0.09, y - 0.06, (z0 + z1) / 2);
        k.box(slab, 'coping', x1 - x0 + 0.4, 0.42, 0.22, (x0 + x1) / 2 - 0.1, y - 0.06, z0 - 0.09);
        k.box(slab, 'coping', 0.22, 0.42, z1 - z0 + 0.2, x0 - 0.09, y - 0.06, (z0 + z1) / 2);
    };
    /** Windows in the two rear walls of a storey, clear of the core. */
    const rearOf = (l, y, x1, z1, n) => {
        for (let x = TX0 + 3.6; x <= x1 - 0.75; x += 1.6) opening(l, x, y + 0.95, TZ0, Math.PI, 1.2, 1.5, n + Math.round(x));
        for (let z = TZ0 + 3.6; z <= z1 - 0.75; z += 1.6) opening(l, TX0, y + 0.95, z, -Math.PI / 2, 1.2, 1.5, n + Math.round(z) + 1);
    };
    const frameOf = (l, y, x1, z1) => {
        rearOf(l, y, x1, z1, levels.length);
        put(l, 'core', k.box(g, 'concrete', 2.6, 2.9, 2.6, TX0 + 1.5, y, TZ0 + 1.5));
        [[x1 - 0.3, z1 - 0.3], [TX0 + 0.3, z1 - 0.3], [x1 - 0.3, TZ0 + 0.3], [(TX0 + x1) / 2, z1 - 0.3]]
            .forEach(([x, z]) => put(l, 'column', k.box(g, 'concrete', 0.4, 2.9, 0.4, x, y, z)));
        put(l, 'wall', k.box(g, 'wall', x1 - TX0, 2.9, 0.25, (TX0 + x1) / 2, y, TZ0 + 0.125), k.box(g, 'wall', 0.25, 2.9, z1 - TZ0, TX0 + 0.125, y, (TZ0 + z1) / 2));
    };
    const glazing = (l, x, y, z, turn, width, n) => {
        const unit = part(x, y, z, turn);
        k.box(unit, lit(n), width - 0.08, 2.9, 0.12);
        k.box(unit, 'dark', width - 0.08, 0.06, 0.15, 0, 2.15, 0);
        put(l, 'curtain', unit);
        return unit;
    };

    // What the coordination and documentation beats work on: storey 5
    const STOREY = 4;                                      // its place in levels
    const CORE_Z = TZ0 + 2.8, MID_X = (TX0 + TX1) / 2;     // front face of the core; the middle column line
    const BEAM = { x: 0.25, w: 0.3, depth: 0.45 };
    const DOORS = [];                                      // [hinge x, z, open towards x, z, closed towards x, z]

    for (let n = 0; n < 5; n++) {
        const y = 8.1 + n * 3.2;
        const l = level(y, TX0, TX1, TZ0, TZ1, 3.2);
        const slab = part(0, 0, 0);
        if (n === 0) {
            // The podium roof is a terrace: paving, a parapet, planting
            plate(k.box(slab, 'concrete', 13.5, 0.3, 10, 0, 7.8, 0));
            k.box(slab, 'paving', 13.1, 0.05, 9.6, 0, 8.1, 0);
            const parapet = part(0, 8.1, 0);
            k.box(parapet, 'coping', 13.5, 0.55, 0.22, 0, 0, PZ + 0.14);
            k.box(parapet, 'coping', 0.22, 0.55, 9.8, PX + 0.14, 0, 0);
            // ...and round the two rear edges, as far as the tower
            k.box(parapet, 'coping', PX + 0.25 - TX1, 0.55, 0.22, (PX + 0.25 + TX1) / 2, 0, -PZ - 0.14);
            k.box(parapet, 'coping', 0.22, 0.55, PZ + 0.25 - TZ1, -PX - 0.14, 0, (PZ + 0.25 + TZ1) / 2);
            put(l, 'trim', parapet);
            [[4.2, 2.9, 1.05], [4.4, -2.4, 0.9], [-3.2, 3.3, 0.95]].forEach(([x, z, size]) => {
                const planter = part(x, 8.15, z);
                k.box(planter, 'timber', 1.5, 0.5, 1.5);
                tree(k, planter, 0, 0, size).position.y = 0.4;
                put(l, 'planting', planter);
            });
        } else {
            plate(k.box(slab, 'concrete', TX1 - TX0, 0.3, TZ1 - TZ0, (TX0 + TX1) / 2, y - 0.3, (TZ0 + TZ1) / 2));
            fascia(slab, TX0, TX1, TZ0, TZ1, y - 0.3);
        }
        put(l, 'slab', slab);
        frameOf(l, y, TX1, TZ1);
        for (let i = 0; i < 4; i++) glazing(l, TX0 + 1 + i * 2, y, TZ1 - 0.06, 0, 2, n * 3 + i);
        for (let j = 0; j < 2; j++) glazing(l, TX1 - 0.06, y, TZ1 - 1 - j * 2, Math.PI / 2, 2, n * 2 + j + 1);
        // The rear bay of the end wall is solid, with a slot window
        const solid = part(TX1, y, TZ1 - 5, Math.PI / 2);
        k.box(solid, 'wall', 2, 2.9, 0.25, 0, 0, -0.125);
        as('opening', k.box(solid, 'dark', 0.62, 2.2, 0.06, 0.3, 0.4, 0.01));
        as('opening', k.box(solid, lit(n + 2), 0.5, 2.08, 0.08, 0.3, 0.46, 0.01));
        put(l, 'wall', solid);
        // Fins along the front, every other one in timber
        const fins = part(0, y - 0.1, TZ1 + 0.22);
        for (let i = 0; i <= 4; i++) k.box(fins, i === (n * 2 + 1) % 5 ? 'timber' : 'coping', 0.13, 3.05, 0.42, TX0 + i * 2, 0, 0);
        put(l, 'trim', fins);
        const balcony = part(TX1, y, TZ1 - 2);
        as('slab', plate(k.box(balcony, 'coping', 1.45, 0.2, 4.1, 0.72, -0.2, 0)));
        k.box(balcony, 'glass', 0.05, 1, 4.1, 1.42, 0, 0);
        [-2.03, 2.03].forEach(z => k.box(balcony, 'glass', 1.4, 1, 0.05, 0.72, 0, z));
        k.box(balcony, 'dark', 0.08, 0.05, 4.14, 1.42, 1, 0);
        put(l, 'trim', balcony);

        if (n === STOREY - 2) {
            // A downstand beam under the slab above, which the duct to the
            // east runs into; partitions with door openings; a door to the core
            put(l, 'beam', k.box(g, 'concrete', BEAM.w, BEAM.depth, TZ1 - TZ0 - 0.37, BEAM.x, y + 2.9 - BEAM.depth, (TZ0 + TZ1) / 2 + 0.065));
            const PH = 2.3, PT = 0.15, across = CORE_Z - PT / 2;
            put(l, 'wall',
                k.box(g, 'wall', 0.2, PH, PT, TX0 + 2.9, y, across),
                k.box(g, 'wall', TX1 - 0.125 - (TX0 + 3.9), PH, PT, (TX0 + 3.9 + TX1 - 0.125) / 2, y, across),
                k.box(g, 'wall', PT, PH, 1.35, MID_X, y, CORE_Z + 0.675),
                k.box(g, 'wall', PT, PH, TZ1 - 0.5 - (CORE_Z + 2.25), MID_X, y, (CORE_Z + 2.25 + TZ1 - 0.5) / 2));
            put(l, 'opening', k.box(g, 'dark', 0.9, 2.1, 0.05, TX0 + 1.5, y, CORE_Z + 0.025)).userData.leaf = true;
            DOORS.push([TX0 + 1.05, CORE_Z, 0, 1, 1, 0], [TX0 + 3, across, 0, -1, 1, 0], [MID_X, CORE_Z + 1.35, 1, 0, 0, 1]);
        }
    }

    // ---- Penthouse: two storeys set back behind a terrace, in a portal frame
    for (let n = 5; n < 7; n++) {
        const y = 8.1 + n * 3.2;
        const l = level(y, TX0, QX1, TZ0, QZ1, 3.2);
        const slab = part(0, 0, 0);
        const [x1, z1] = n === 5 ? [TX1, TZ1] : [QX1, QZ1];
        plate(k.box(slab, 'concrete', x1 - TX0, 0.3, z1 - TZ0, (TX0 + x1) / 2, y - 0.3, (TZ0 + z1) / 2));
        fascia(slab, TX0, x1, TZ0, z1, y - 0.3);
        put(l, 'slab', slab);
        frameOf(l, y, QX1, QZ1);
        for (let i = 0; i < 3; i++) glazing(l, TX0 + 1 + i * 2, y, QZ1 - 0.06, 0, 2, n + i);
        for (let j = 0; j < 2; j++) glazing(l, QX1 - 0.06, y, QZ1 - 1.1 - j * 2.2, Math.PI / 2, 2.2, n + j + 2);
        if (n === 5) {
            const terrace = part(0, y, 0);
            k.box(terrace, 'timber', TX1 - TX0 - 0.2, 0.05, 1.5, (TX0 + TX1) / 2, 0, TZ1 - 0.8);
            k.box(terrace, 'timber', 1.9, 0.05, QZ1 - TZ0, TX1 - 1, 0, (TZ0 + QZ1) / 2);
            k.box(terrace, 'glass', TX1 - TX0, 1, 0.05, (TX0 + TX1) / 2, 0, TZ1 - 0.05);
            k.box(terrace, 'glass', 0.05, 1, TZ1 - TZ0, TX1 - 0.05, 0, (TZ0 + TZ1) / 2);
            put(l, 'trim', terrace);
        } else {
            const fz = QZ1 + 0.55, fx = QX1 + 0.55, top = y + 2.9, foot = y - 3.2;
            put(l, 'trim', k.bars(g, 'coping', 0.3, [
                [TX0 + 0.15, foot, fz, TX0 + 0.15, top, fz], [fx, foot, fz, fx, top, fz], [fx, foot, TZ0 + 0.15, fx, top, TZ0 + 0.15],
                [TX0, top, fz, fx + 0.15, top, fz], [fx, top, fz, fx, top, TZ0]
            ]));
        }
    }

    // ---- Roof: a floating slab, plant, a lift overrun with a beacon
    const ROOF = 8.1 + 7 * 3.2;
    let beacon;
    {
        const l = level(ROOF, TX0 - 0.45, QX1 + 1.05, TZ0 - 0.45, QZ1 + 1.05, 2.2);
        const roof = part((TX0 + QX1) / 2 + 0.3, ROOF - 0.3, (TZ0 + QZ1) / 2 + 0.3);
        plate(k.box(roof, 'coping', QX1 - TX0 + 1.5, 0.3, QZ1 - TZ0 + 1.5));
        k.box(roof, 'roof', QX1 - TX0 + 0.9, 0.04, QZ1 - TZ0 + 0.9, 0, 0.3, 0);
        put(l, 'slab', roof);
        const plant = part(-2, ROOF, -1.5);
        k.box(plant, 'metal', 2.6, 1.2, 1.7);
        k.cyl(plant, 'dark', 0.5, 0.06, -0.55, 1.2, 0);
        k.cyl(plant, 'dark', 0.5, 0.06, 0.6, 1.2, 0);
        const overrun = part(TX0 + 1.5, ROOF, TZ0 + 1.5);
        k.box(overrun, 'concrete', 2.6, 1.9, 2.6);
        k.box(overrun, 'coping', 2.8, 0.14, 2.8, 0, 1.9, 0);
        k.box(overrun, 'dark', 0.09, 1.7, 0.09, 0.9, 2, 0.9);
        beacon = k.group(overrun, 0.9, 3.75, 0.9);
        k.sphere(beacon, k.basic(['#e5383b', '#ff5a5c']), 0.14);
        k.glow(beacon, 0, 0, 0, 2.2, '#ff5a5c', 0.8);
        put(l, 'core', overrun);
        put(l, 'trim', plant);
    }

    // ---- Building services: risers through every floor, ducts and pipes branching off
    const RX = QX1 - 0.7, RZ = QZ1 - 0.7;
    // In the colours of a coordination model: air, cable trays, chilled water, sprinklers
    // (lit a little at night, so that they read through the faded envelope)
    const service = spec => k.standard(spec, {}, { e: spec, ei: [0, 0.55] });
    const air = service(['#2f9e8f', '#49bfae']), tray = service(['#e0a030', '#f0b84c']);
    const chilled = service(['#3f7fd9', '#6aa0ee']), sprinkler = service(['#d9534a', '#ee7168']);
    const services = k.group(g);
    const run = (material, axis, w, h, x, y, z, from, length, sign) => {
        const mesh = k.box(services, material, w, h, w, x, y, z);
        mesh.scale[axis] = length;
        if (axis !== 'y') mesh.position[axis] = from + (sign * length) / 2;
    };
    [[air, 0.7, 0, 0], [chilled, 0.2, 0.55, 0.2], [sprinkler, 0.2, -0.55, 0.2], [tray, 0.3, 0.1, -0.55]]
        .forEach(([material, w, dx, dz]) => run(material, 'y', w, 1, RX + dx, 0.45, RZ + dz, 0.45, ROOF - 0.75, 1));
    // The duct that meets the beam is in five lengths: the middle one can
    // drop below the beam, on an offset at each end
    const DUCT = { y: 0, h: 0.4, w: 0.7, x: [RX + 0.35, -0.5, -0.2, 0.7, 1, TX1 - 0.5] };
    const CLEARANCE = 0.15;
    let DROP = 0, ductMid, offsets;
    /** Lay a length of duct between two points of its run, keeping its section upright. */
    const lay = (mesh, x0, y0, x1, y1) => {
        const turn = Math.atan2(y1 - y0, x1 - x0);
        mesh.rotation.z = turn;
        mesh.scale.x = Math.hypot(x1 - x0, y1 - y0);
        mesh.position.set((x0 + x1) / 2 + (Math.sin(turn) * DUCT.h) / 2, (y0 + y1) / 2 - (Math.cos(turn) * DUCT.h) / 2, RZ);
    };
    levels.slice(0, 9).forEach((l, n) => {
        const y = l.y + (n === 0 ? 3.2 : n === 1 ? 2.85 : 2.5);
        const [x0, x1, z0, z1] = n < 2 ? [-6, 6, -4.3, 4.2] : n < 7 ? [TX0 + 0.5, TX1 - 0.5, TZ0 + 0.5, TZ1 - 0.5] : [TX0 + 0.5, QX1 - 0.4, TZ0 + 0.5, QZ1 - 0.4];
        run(air, 'x', 0.7, 0.4, 0, y - 0.1, RZ, RX - 0.35, RX - 0.35 - x0, -1);
        run(tray, 'z', 0.5, 0.12, RX, y + 0.15, 0, RZ - 0.35, RZ - 0.35 - z0, -1);
        if (n === STOREY) {
            const [a, b, c, d, e, f] = DUCT.x;
            DUCT.y = y - 0.1;
            DROP = DUCT.y + DUCT.h - (l.y + 2.9 - BEAM.depth) + CLEARANCE;
            k.box(services, air, b - a, DUCT.h, DUCT.w, (a + b) / 2, DUCT.y, RZ);
            k.box(services, air, f - e, DUCT.h, DUCT.w, (e + f) / 2, DUCT.y, RZ);
            ductMid = k.box(services, air, d - c, DUCT.h, DUCT.w, (c + d) / 2, DUCT.y, RZ);
            offsets = [k.box(services, air, 1, DUCT.h, DUCT.w), k.box(services, air, 1, DUCT.h, DUCT.w)];
        } else if (x1 - RX > 1.2) run(air, 'x', 0.7, 0.4, 0, y - 0.1, RZ, RX + 0.35, x1 - RX - 0.35, 1);
        if (z1 - RZ > 1.2) run(tray, 'z', 0.5, 0.12, RX, y + 0.15, 0, RZ + 0.35, z1 - RZ - 0.35, 1);
        run(chilled, 'x', 0.18, 0.18, 0, y + 0.05, RZ + 0.62, RX, RX - x0, -1);
        run(sprinkler, 'z', 0.18, 0.18, RX + 0.62, y + 0.05, 0, RZ, RZ - z0, -1);
    });

    // ---- One material per class of element (and, for glazing, per facade),
    // in place of the shared ones: a class can then fade, take a tint or be
    // cut by the section plane without touching the rest. The quantities of
    // the 5D beat are measured from the same boxes.
    const named = new Map(['concrete', 'coping', 'wall', 'roof', 'paving', 'dark', 'glass', 'glassLit', 'timber', 'metal', 'leaf', 'leafDark', 'trunk']
        .map(name => [k.mat(name), name]));
    const variants = [], byKey = {};
    const qty = { slab: 0, column: 0, columns: 0, curtain: 0, opening: 0, openings: 0 };
    const variant = (kind, face, name) => {
        const glazed = name.startsWith('glass') && (kind === 'curtain' || kind === 'opening');
        const key = `${kind}|${glazed ? face : ''}|${name}`;
        if (!byKey[key]) {
            byKey[key] = {
                material: k.mat(name, { transparent: true, clippingPlanes: [cut], clipShadows: true }),
                kind, face: glazed ? face : -1, base: new THREE.Color(), glow: new THREE.Color(), ei: 0
            };
            variants.push(byKey[key]);
        }
        return byKey[key].material;
    };
    levels.forEach(l => l.parts.forEach(([object, filed]) => {
        const face = ((Math.round(object.rotation.y / (Math.PI / 2)) % 4) + 4) % 4;
        const visit = (o, inherited) => {
            const kind = o.userData.kind || inherited;
            const name = o.isMesh && named.get(o.material);
            if (name) {
                o.material = variant(kind, face, name);
                o.castShadow = true;
                o.userData.kind = kind;
                if (kind !== 'planting') l.meshes.push([o, o.material]);
                if (o.userData.plate) qty.slab += o.scale.x * o.scale.z;
                else if (kind === 'column') {
                    qty.columns++;
                    qty.column += o.scale.x * o.scale.y * o.scale.z;
                } else if (kind === 'curtain' && name !== 'dark') qty.curtain += o.scale.x * o.scale.y;
                else if (kind === 'opening' && name === 'dark') {
                    qty.openings++;
                    qty.opening += o.scale.x * o.scale.y;
                }
            }
            o.children.forEach(child => visit(child, kind));
        };
        visit(object, filed);
    }));
    // Lights are drawn after the building, as they were over the shared materials
    g.traverse(o => { if (o.isSprite || o.geometry === k.GEO.disc) o.renderOrder = 1; });

    const SIGNAL = new THREE.Color(), OK = new THREE.Color(), WARM = new THREE.Color(), MILD = new THREE.Color(), COOL = new THREE.Color();
    const tint = new THREE.Color();
    let hotGlow = 0.2, sunGlow = 0.15;
    k.onTheme(night => {
        variants.forEach(v => {
            const theme = v.material.userData.theme;
            k.color(theme.c, v.base);
            if (theme.e) k.color(theme.e, v.glow);
            else v.glow.set(0);
            v.ei = theme.ei ? theme.ei[night ? 1 : 0] : 0;
        });
        k.color('signal', SIGNAL);
        k.color('ok', OK);
        k.color(['#ef6c2a', '#ff8f4d'], WARM);
        k.color(['#ece6d8', '#d8d6d0'], MILD);
        k.color(['#3f86d6', '#5aa2ee'], COOL);
        hotGlow = night ? 0.9 : 0.2;
        sunGlow = night ? 0.75 : 0.12;
    });

    // Overlays are drawn last, over whatever of the building is translucent
    const over = (object, parent = k.root) => {
        object.renderOrder = 2;
        parent.add(object);
        return object;
    };
    const edgesOf = material => new THREE.LineSegments(k.GEO.edges, material);
    /** Flat rectangles [x0, z0, x1, z1] at one height, as one geometry. */
    const flats = (rects, y) => {
        const position = [];
        rects.forEach(([x0, z0, x1, z1]) => position.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        return geometry;
    };

    // ---- Beat 1, coordination: the duct through the beam
    const storey = levels[STOREY];
    const DUCT_AXIS = DUCT.y + DUCT.h / 2;
    const CLASH = new THREE.Vector3(GX + BEAM.x, DUCT.y + DUCT.h / 2, GZ + RZ);
    const clashLine = k.lineMaterial('signal', { transparent: true });
    const clashFill = k.basic('signal', { transparent: true, opacity: 0.2, depthWrite: false });
    const CLASH_SIZE = [BEAM.w + 1, DUCT.h + 0.9, DUCT.w + 0.9];
    const clashBox = k.group(null, CLASH.x, CLASH.y, CLASH.z);
    over(edgesOf(clashLine), clashBox);
    over(new THREE.Mesh(k.GEO.box, clashFill), clashBox);
    // Its tag stands clear of the tower, on a leader
    const CLASH_TAG = new THREE.Vector3(CLASH.x + 6.1, CLASH.y + 2, CLASH.z - 6.1);
    const clashLeader = over(k.lines(null, clashLine, [CLASH.x + 0.3, CLASH.y, CLASH.z - 0.3, CLASH_TAG.x, CLASH_TAG.y, CLASH_TAG.z]));
    const clashTag = k.label().at(CLASH_TAG.x, CLASH_TAG.y, CLASH_TAG.z);

    // ---- Beat 2, documentation: a section plane, and the plan it yields.
    // The plan is generated: every box of the storey that the plane cuts
    // leaves its outline, in the order walls, columns, core, fittings.
    const CUT = storey.y + 1.2, SKY = ROOF + 5.5;
    const PLAN = { x: 1.6, y: 0.06, z: -16.1 };            // where the plan lies, from the storey it is cut from
    const ORDER = { curtain: 0, wall: 1, opening: 2, column: 3, core: 4, trim: 5 };
    k.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    const footprints = [];
    storey.meshes.forEach(([mesh]) => {
        if (mesh.geometry !== k.GEO.box || mesh.userData.leaf) return;
        bounds.setFromObject(mesh);
        if (bounds.min.y < CUT - 0.01 && bounds.max.y > CUT + 0.01) {
            footprints.push({ kind: mesh.userData.kind, rect: [bounds.min.x, bounds.min.z, bounds.max.x, bounds.max.z] });
        }
    });
    footprints.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);

    const segments = [];                                   // the plan, [x0, z0, x1, z1] in the order it is drawn
    const outline = ([x0, z0, x1, z1]) => segments.push([x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]);
    const caps = [], fills = [];
    let fillFrom = 0, fillTo = 0;
    footprints.forEach(({ kind, rect }) => {
        const [x0, z0, x1, z1] = rect;
        outline(rect);
        if (kind === 'column') {
            if (!fills.length) fillFrom = segments.length - 4;
            fills.push(rect);
            fillTo = segments.length;
        }
        if (kind !== 'core') {
            caps.push(rect);
            return;
        }
        // The core is hollow: its walls, a lift and a stair
        const w = 0.25, mx = (x0 + x1) / 2;
        caps.push([x0, z0, x1, z0 + w], [x0, z1 - w, x1, z1], [x0, z0 + w, x0 + w, z1 - w], [x1 - w, z0 + w, x1, z1 - w]);
        outline([x0 + w, z0 + w, x1 - w, z1 - w]);
        segments.push([mx, z0 + w, mx, z1 - w], [x0 + w, z0 + w, mx, z1 - w], [x0 + w, z1 - w, mx, z0 + w]);
        for (let n = 1; n < 6; n++) segments.push([mx, z0 + w + n * 0.35, x1 - w, z0 + w + n * 0.35]);
    });
    // Doors, each as its leaf and its swing
    DOORS.forEach(([hx, hz, ax, az, bx, bz]) => {
        const r = 0.9, X = GX + hx, Z = GZ + hz;
        segments.push([X, Z, X + ax * r, Z + az * r]);
        for (let n = 0; n < 6; n++) {
            const a0 = (n / 6) * Math.PI / 2, a1 = ((n + 1) / 6) * Math.PI / 2;
            segments.push([
                X + r * (Math.cos(a0) * ax + Math.sin(a0) * bx), Z + r * (Math.cos(a0) * az + Math.sin(a0) * bz),
                X + r * (Math.cos(a1) * ax + Math.sin(a1) * bx), Z + r * (Math.cos(a1) * az + Math.sin(a1) * bz)
            ]);
        }
    });
    // The balcony, seen below the cut, and one dimension
    {
        const x0 = GX + TX1, x1 = GX + TX1 + 1.45, z0 = GZ + TZ1 - 4.05, z1 = GZ + TZ1 + 0.05;
        segments.push([x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1]);
    }
    const DIM_Z = GZ + TZ0 - 1.1;
    segments.push(
        [GX + TX0, GZ + TZ0 - 0.3, GX + TX0, DIM_Z - 0.3], [GX + TX1, GZ + TZ0 - 0.3, GX + TX1, DIM_Z - 0.3],
        [GX + TX0, DIM_Z, GX + TX1, DIM_Z],
        [GX + TX0 - 0.2, DIM_Z + 0.2, GX + TX0 + 0.2, DIM_Z - 0.2], [GX + TX1 - 0.2, DIM_Z + 0.2, GX + TX1 + 0.2, DIM_Z - 0.2]);

    const sheet = k.group(null, PLAN.x, PLAN.y, PLAN.z);
    const planLine = k.lineMaterial('ink', { transparent: true });
    const planLines = over(k.lines(sheet, planLine, segments.flatMap(([x0, z0, x1, z1]) => [x0, 0, z0, x1, 0, z1])), sheet);
    const planFill = k.basic('ink', { transparent: true, side: THREE.DoubleSide, depthWrite: false });
    over(new THREE.Mesh(flats(fills, 0), planFill), sheet);
    const capFill = k.basic('ink', { transparent: true, side: THREE.DoubleSide });
    const capMesh = over(new THREE.Mesh(flats(caps, CUT + 0.012), capFill));

    // The plane itself, and the outline of what it cuts
    const section = k.group(null, GX, 0, GZ);
    const sectionFill = k.basic('signal', { transparent: true, opacity: 0.1, depthWrite: false });
    const sectionLine = k.lineMaterial('signal', { transparent: true });
    const sectionSheet = over(new THREE.Mesh(k.GEO.box, sectionFill), section);
    sectionSheet.scale.set(TX1 - TX0 + 4.4, 0.001, TZ1 - TZ0 + 3.4);
    sectionSheet.position.set((TX0 + TX1) / 2 + 0.6, 0, (TZ0 + TZ1) / 2 + 0.1);
    const sectionRing = over(edgesOf(sectionLine), section);

    // Projection lines from the corners of the cut down to the plan, in dashes
    const DASHES = 26;
    const projection = [];
    for (let n = 0; n < DASHES; n++) {
        [[TX0, TZ0], [TX1, TZ0], [TX1, TZ1], [TX0, TZ1]].forEach(([x, z]) => {
            const a = n / DASHES, b = (n + 0.55) / DASHES;
            projection.push(
                GX + x + PLAN.x * a, lerp(CUT, PLAN.y, a), GZ + z + PLAN.z * a,
                GX + x + PLAN.x * b, lerp(CUT, PLAN.y, b), GZ + z + PLAN.z * b);
        });
    }
    const projectionLine = k.lineMaterial('ink', { transparent: true });
    const projectionLines = over(k.lines(null, projectionLine, projection));

    const planTag = k.label(`Level ${STOREY + 1} plan · 1:100`, 'generated from the model').at(GX + TX0 + PLAN.x, PLAN.y, GZ + TZ0 + PLAN.z);
    const dimTag = k.label(`${(TX1 - TX0).toFixed(2)} m`, '', 'mini').at(GX + (TX0 + TX1) / 2 + PLAN.x, PLAN.y, DIM_Z + PLAN.z - 0.9);

    // ---- Beat 3, quantities and cost: one class of element at a time
    const whole = x => Math.round(x).toLocaleString('en-US');
    const CLASSES = [
        { kind: 'slab', rate: BIM_RATES.slab, unit: 'm²', amount: qty.slab, name: c => `IfcSlab · ${whole(qty.slab * c)} m²` },
        { kind: 'column', rate: BIM_RATES.column, unit: 'm³', amount: qty.column, name: c => `IfcColumn · ${Math.round(qty.columns * c)} no. · ${(qty.column * c).toFixed(1)} m³` },
        { kind: 'curtain', rate: BIM_RATES.curtain, unit: 'm²', amount: qty.curtain, name: c => `IfcCurtainWall · ${whole(qty.curtain * c)} m²` },
        { kind: 'opening', rate: BIM_RATES.opening, unit: 'm²', amount: qty.opening, name: c => `IfcDoor · IfcWindow · ${Math.round(qty.openings * c)} no. · ${(qty.opening * c).toFixed(1)} m²` }
    ];
    const SLOT = 1.15, FIRST = 0.5;
    let before = 0;
    CLASSES.forEach((c, n) => {
        c.from = FIRST + n * SLOT;
        c.before = before;
        before += c.amount * c.rate;
    });
    const focus = {};
    const DIMMED = 0.4;
    /** A point to the left of the tower as the camera sees it, m metres out. */
    const beside = (y, m, x = TX0, z = TZ1) => v0.set(GX + x - m * Math.SQRT1_2, y, GZ + z + m * Math.SQRT1_2);
    const scheduleTag = k.label('', '', 'query');
    scheduleTag.position.copy(beside(18.6, 8));

    // ---- Beat 4, programme and energy
    const progress = k.standard('accent', { roughness: 0.5 }, { e: 'accent', ei: [0, 0.5] });
    const bandLine = k.lineMaterial('accent', { transparent: true });
    const band = over(edgesOf(bandLine), g);
    const weekTag = k.label('', '', 'mini');

    // The sun crosses the sky from the east to the south-west, over the tower
    const SUN = { x: GX + (TX0 + TX1) / 2, y: 14, z: GZ + (TZ0 + TZ1) / 2, r: 21.5, from: 0.66, to: Math.PI - 0.66 };
    const sunAt = (a, target) => target.set(SUN.x + SUN.r * Math.cos(a) * Math.SQRT1_2, SUN.y + SUN.r * Math.sin(a), SUN.z - SUN.r * Math.cos(a) * Math.SQRT1_2);
    const sun = k.group();
    const sunMaterial = k.basic(['#f59f00', '#ffd166'], { transparent: true });
    over(k.sphere(sun, sunMaterial, 0.75), sun);
    k.glow(sun, 0, 0, 0, 6.5, '#ffc56b', 0.9).renderOrder = 2;
    const path = [];
    for (let n = 0; n < 40; n++) {
        const a = lerp(SUN.from - 0.12, SUN.to + 0.12, n / 40), b = lerp(SUN.from - 0.12, SUN.to + 0.12, (n + 0.5) / 40);
        path.push(...sunAt(a, v0).toArray(), ...sunAt(b, v0).toArray());
    }
    const sunPath = k.lineMaterial(['#f59f00', '#ffd166'], { transparent: true });
    const sunArc = over(k.lines(null, sunPath, path));
    const energyTag = k.label('Energy · 86 kWh/m² a', 'solar gain on south facade', 'mini');
    energyTag.position.copy(beside(18.6, 8));

    const caption = captions(k, [
        [B1, B2, '3D · Coordination'],
        [B2, B3, 'Documentation · drawings from the model'],
        [B3, B4, '5D · Quantities and cost'],
        [B4, B4 + 2.85, '4D · Programme'],
        [B4 + 2.85, END, '6D · Energy']
    ]);

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;

        // ---- Beat 1: the envelope and the slabs fade; a clash is found and resolved
        const xray = pulse(u1, 0.1, 5.3, 0.6);
        services.visible = xray > 0.001;
        // Once resolved the duct stays so, and is put back unseen while the building rests
        const drop = t < END + 0.5 ? smooth(seg(u1, 2.7, 3.4)) * DROP : 0;
        ductMid.position.y = DUCT.y - drop;
        lay(offsets[0], DUCT.x[1], DUCT_AXIS, DUCT.x[2], DUCT_AXIS - drop);
        lay(offsets[1], DUCT.x[3], DUCT_AXIS - drop, DUCT.x[4], DUCT_AXIS);

        const clash = pulse(u1, 0.9, 4.7, 0.25);
        const settled = seg(u1, 3.2, 3.5);
        clashBox.visible = clashLeader.visible = clash > 0.01;
        // The outline beats while the clash stands, and comes to rest once it is resolved
        const throb = 1 + 0.16 * Math.sin(u1 * 11) * (1 - settled);
        clashBox.scale.set(CLASH_SIZE[0] * throb, CLASH_SIZE[1] * throb, CLASH_SIZE[2] * throb);
        clashBox.position.y = CLASH.y - clashBox.scale.y / 2;
        tint.lerpColors(SIGNAL, OK, settled);
        clashLine.color.copy(tint);
        clashFill.color.copy(tint);
        clashLine.opacity = clash * lerp(0.6 + 0.4 * Math.sin(u1 * 11), 1, settled);
        clashFill.opacity = 0.3 * clash;
        const resolved = u1 >= 3.35;
        if (clash > 0) {
            clashTag.set(resolved ? 'Resolved' : 'Clash 1', resolved ? `Clearance ${CLEARANCE * 1000} mm` : 'IfcDuctSegment × IfcBeam')
                .tone(resolved ? 'ok' : 'signal');
        }
        clashTag.show(clash * Math.min(1, Math.abs(u1 - 3.35) / 0.15));

        // ---- Beat 2: the section plane comes down, and the plan is drawn from the cut
        const cutY = track([[0.25, SKY], [1.45, CUT], [4.5, CUT], [5.3, SKY]], u2);
        cut.constant = k.root.position.y + k.root.scale.y * cutY;
        const cutting = pulse(u2, 0.15, 5.4, 0.25);
        const footprint = cutY < storey.y + 9.3 ? levels[STOREY] : levels[8];
        section.visible = cutting > 0.01;
        section.position.y = cutY;
        sectionFill.opacity = 0.1 * cutting;
        sectionRing.visible = cutY < ROOF - 0.3;
        sectionRing.scale.set(footprint.x1 - footprint.x0 + 0.1, 0.001, footprint.z1 - footprint.z0 + 0.1);
        sectionRing.position.set((footprint.x0 + footprint.x1) / 2, 0, (footprint.z0 + footprint.z1) / 2);
        sectionLine.opacity = cutting;
        beacon.visible = cutY > ROOF + 3.9;

        const cap = pulse(u2, 1.4, 4.6, 0.2);
        capMesh.visible = cap > 0.01;
        capFill.opacity = cap;

        const drawn = pulse(u2, 1.6, 4.5, 0.35);
        projectionLines.visible = sheet.visible = drawn > 0.01;
        projectionLine.opacity = 0.55 * drawn;
        projectionLines.geometry.setDrawRange(0, Math.round(DASHES * easeOut(seg(u2, 1.6, 2.3))) * 8);
        const lines = Math.round(segments.length * seg(u2, 2, 3.5));
        planLines.geometry.setDrawRange(0, lines * 2);
        planLine.opacity = drawn;
        planFill.opacity = drawn * seg(lines, fillFrom, fillTo);
        planTag.show(pulse(u2, 2.1, 4.5, 0.3));
        dimTag.show(pulse(u2, 3.4, 4.5, 0.25));

        // ---- Beat 3: each class of element in turn, measured and priced
        const dim = pulse(u3, 0.2, 5.3, 0.4);
        const which = Math.min(CLASSES.length - 1, Math.max(0, Math.floor((u3 - FIRST) / SLOT)));
        CLASSES.forEach(c => { focus[c.kind] = pulse(u3, c.from, c.from + SLOT, 0.18); });
        const item = CLASSES[which], counted = easeOut(seg(u3, item.from + 0.05, item.from + 0.75));
        const total = (item.before + item.amount * item.rate * counted) / 1e6;
        const scheduled = pulse(u3, 0.3, 5.2, 0.25);
        if (scheduled > 0) scheduleTag.set(item.name(counted), `× $${whole(item.rate)}/${item.unit} · Total $${total.toFixed(2)} M`);
        scheduleTag.show(scheduled);

        // ---- Beat 4: a storey at a time in progress, then the sun on the glazing
        const building = u4 > 0.35 && u4 < 2.65;
        const programme = seg(u4, 0.35, 2.65);
        const active = building ? Math.min(levels.length - 1, Math.floor(programme * levels.length)) : -1;
        levels.forEach((l, n) => {
            const on = n === active;
            if (on === l.tinted) return;
            l.tinted = on;
            l.meshes.forEach(([mesh, material]) => { mesh.material = on ? progress : material; });
        });
        band.visible = building;
        const weeks = pulse(u4, 0.3, 2.75, 0.2);
        if (weeks > 0) {
            const at = Math.min(levels.length - 1, Math.floor(programme * levels.length)), l = levels[at];
            band.scale.set(l.x1 - l.x0 + 0.7, l.h, l.z1 - l.z0 + 0.7);
            band.position.set((l.x0 + l.x1) / 2, l.y - 0.3, (l.z0 + l.z1) / 2);
            weekTag.set(`Week ${Math.min(BIM_WEEKS, 1 + Math.floor(programme * BIM_WEEKS))} of ${BIM_WEEKS}`, at < levels.length - 1 ? `Level ${at + 1} in progress` : 'Roof in progress');
            weekTag.position.copy(beside(l.y + l.h / 2, 5.6, l.x0, l.z1));
        }
        weekTag.show(weeks);

        const energy = pulse(u4, 2.95, 5.3, 0.35);
        const angle = lerp(SUN.from, SUN.to, seg(u4, 3.05, 5.15));
        sun.visible = sunArc.visible = energy > 0.01;
        sunAt(angle, sun.position);
        sun.scale.setScalar(0.6 + 0.4 * energy);
        sunMaterial.opacity = energy;
        sunPath.opacity = 0.5 * energy;
        energyTag.show(pulse(u4, 3.1, 5.25, 0.25));

        // ---- Every material of the building, from t alone
        variants.forEach(v => {
            const material = v.material;
            let opacity = v.kind === 'column' || v.kind === 'core' || v.kind === 'beam' ? 1 : lerp(1, 0.2, xray);
            let amount = 0, strength = 0;
            if (dim > 0) {
                const picked = focus[v.kind] || 0;
                opacity = lerp(1, DIMMED, dim * (1 - picked));
                if (picked > 0) {
                    tint.copy(SIGNAL);
                    amount = picked;
                    strength = hotGlow;
                }
            }
            if (energy > 0 && v.face >= 0) {
                // Exposure: how squarely the sun faces this facade
                const [nx, nz] = FACES[v.face];
                const exposure = clamp01(0.5 + (Math.cos(angle) * Math.SQRT1_2 * (nx - nz)) / 1.1);
                if (exposure < 0.5) tint.lerpColors(COOL, MILD, exposure * 2);
                else tint.lerpColors(MILD, WARM, exposure * 2 - 1);
                amount = energy;
                strength = sunGlow;
            }
            material.color.copy(v.base).lerp(tint, amount);
            material.emissive.copy(v.glow).lerp(tint, amount);
            material.emissiveIntensity = lerp(v.ei, strength, amount);
            material.opacity = opacity;
            material.depthWrite = opacity > 0.98;
        });

        caption(t);
    };
}

export const bim = {
    duration: 24,
    poster: 10.4,
    scale: 0.45,
    reach: 0.16,
    alt: 'One model of a nine-storey building yields four outputs in turn: a clash between a duct and a beam is found and resolved, a floor plan is cut from one storey and drawn beside the building, slabs, columns, curtain wall and openings are measured and priced, and the programme and the solar exposure of the glazing are played over the facade.',
    build
};
