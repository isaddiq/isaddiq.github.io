/**
 * What the research simulations share: timing helpers, and the props they are
 * built from with the viewer's kit (k): a building, a tree, a person, a desk,
 * routes, holograms. See research-scenes.js for what a scene is.
 */
import * as THREE from '../../vendor/three.module.min.js';

// ---- Timing helpers -----------------------------------------------------------
export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, k) => a + (b - a) * k;
/** Progress of t through [a, b], clamped to 0..1. */
export const seg = (t, a, b) => (b > a ? clamp01((t - a) / (b - a)) : t >= a ? 1 : 0);
export const smooth = x => x * x * (3 - 2 * x);
export const easeOut = x => 1 - Math.pow(1 - x, 3);
export const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Envelope: fades in after a, holds, fades out before b. */
export const pulse = (t, a, b, fade = 0.3) => Math.min(seg(t, a, a + fade), 1 - seg(t, b - fade, b));
/** Value of a piecewise track [[time, value], ...] at t, eased between keys. */
export function track(keys, t, ease = easeInOut) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(seg(t, keys[i - 1][0], keys[i][0])));
    }
    return keys[keys.length - 1][1];
}

export const v0 = new THREE.Vector3();

// ---- Shared props -------------------------------------------------------------

/**
 * A framed building on 3 m bays, detailed on all four faces (the stage can be
 * turned): a stone ground storey with shop windows, under awnings on the
 * front, and a glazed entrance with a canopy, rendered upper storeys with
 * casement windows, timber infill and a balcony over the door, floor bands,
 * downpipes, planting and a flat roof with its plant. A storey lists its
 * windows front faces first (the entrance end, then the front), then the
 * rear ones. Every part that a scene may move or restyle is listed in
 * elements, with userData.kind (slab, column, wall, window, door, roof,
 * plant) and userData.storey; a window or door lists its glass in
 * userData.panes.
 * @param {object} k - the viewer's kit
 * @param {{nx: number, nz: number, storeys: number, x?: number, z?: number, plant?: string, roof?: boolean, mat?: Function, parent?: object}} o
 */
export function building(k, o) {
    const { nx, nz, storeys } = o;
    const BAY = 3, H = 3, BASE = 0.3;
    const mat = o.mat || (name => name);          // a scene may substitute its own materials
    const W = nx * BAY, D = nz * BAY;
    const g = k.group(o.parent, o.x || 0, 0, o.z || 0);
    const b = { group: g, W, D, H, base: BASE, top: BASE + storeys * H, storeys: [], elements: [], roof: [] };
    const element = (object, kind, storey) => {
        object.userData.kind = kind;
        object.userData.storey = storey;
        b.elements.push(object);
        return object;
    };
    const isLit = (s, onEnd, i, n) => (s * 3 + i * 5 + n * 3 + (onEnd ? 2 : 0)) % 4 !== 0;
    const tagged = (object, kind) => {
        object.userData.kind = kind;
        return object;
    };

    b.plinth = k.box(g, mat('paving'), W + 1.6, BASE, D + 1.6);

    // A band along each floor plate and a pilaster on each grid line: they
    // give the facades their bays
    const fascia = (y, kind) => {
        tagged(k.box(g, mat('coping'), W + 0.2, 0.36, 0.12, 0.04, y, D / 2 + 0.04), kind);
        tagged(k.box(g, mat('coping'), 0.12, 0.36, D + 0.08, W / 2 + 0.04, y, 0), kind);
        tagged(k.box(g, mat('coping'), W + 0.2, 0.36, 0.12, -0.04, y, -D / 2 - 0.04), kind);
        tagged(k.box(g, mat('coping'), 0.12, 0.36, D + 0.08, -W / 2 - 0.04, y, 0), kind);
    };
    for (let i = 0; i <= nx; i++) {
        const x = Math.min(W / 2 - 0.1, -W / 2 + i * BAY + (i ? 0 : 0.1));
        tagged(k.box(g, mat('coping'), 0.2, b.top - BASE, 0.09, x, BASE, D / 2 + 0.03), 'wall');
        tagged(k.box(g, mat('coping'), 0.2, b.top - BASE, 0.09, -x, BASE, -D / 2 - 0.03), 'wall');
    }
    for (let j = 0; j < nz; j++) {
        const z = Math.max(-D / 2 + 0.1, -D / 2 + j * BAY);
        tagged(k.box(g, mat('coping'), 0.09, b.top - BASE, 0.2, W / 2 + 0.03, BASE, z), 'wall');
        tagged(k.box(g, mat('coping'), 0.09, b.top - BASE, 0.2, -W / 2 - 0.03, BASE, -z), 'wall');
    }
    tagged(k.bars(g, mat('metal'), 0.08, [
        [-W / 2 + 0.36, BASE, D / 2 + 0.12, -W / 2 + 0.36, b.top + 0.2, D / 2 + 0.12],
        [W / 2 + 0.12, BASE, -D / 2 + 0.36, W / 2 + 0.12, b.top + 0.2, -D / 2 + 0.36]
    ]), 'plant');

    // One bay of facade: its wall and what opens in it
    const facade = (st, s, y, turn, cx, cz, i, kind, windows = st.windows) => {
        const ground = s === 0;
        const wall = k.group(g, cx, y, cz);
        wall.rotation.y = turn;
        k.box(wall, mat(ground ? 'stone' : 'wall'), BAY, H - 0.3, 0.2, 0, 0, -0.1);
        st.walls.push(element(wall, 'wall', s));
        if (!kind) return;
        if (ground) k.box(wall, mat('concrete'), BAY, 0.3, 0.05, 0, 0, 0.02);

        const opening = k.group(g, cx, y, cz);
        opening.rotation.y = turn;
        const onEnd = turn !== 0;
        const panes = opening.userData.panes = [];
        const glass = (w, h, x, yy, depth = 0.11) => panes.push(k.box(opening, mat(isLit(s, onEnd, i, panes.length) ? 'glassLit' : 'glass'), w, h, depth, x, yy, 0));

        if (kind === 'door') {
            // Glazed double doors with a fanlight, under a canopy hung on rods
            k.box(opening, mat('dark'), 2, 2.52, 0.1, 0, 0, 0);
            glass(0.84, 2, -0.45, 0.06, 0.13);
            glass(0.84, 2, 0.45, 0.06, 0.13);
            glass(1.78, 0.32, 0, 2.13, 0.13);
            [-0.08, 0.08].forEach(x => k.box(opening, mat('metal'), 0.04, 0.55, 0.06, x, 0.82, 0.08));
            k.box(opening, mat('coping'), 2.7, 0.1, 1.15, 0, 2.62, 0.58);
            k.box(opening, mat('accent'), 2.72, 0.13, 0.04, 0, 2.6, 1.16);
            k.bars(opening, mat('dark'), 0.035, [[-1.25, 3.35, 0, -1.25, 2.7, 1.05], [1.25, 3.35, 0, 1.25, 2.7, 1.05]]);
            k.box(opening, mat('dark'), 1.7, 0.025, 0.7, 0, 0, 0.45);
            k.box(opening, mat('accent'), 0.5, 0.32, 0.03, -1.22, 1.5, 0.01);
            k.box(opening, mat('coping'), 0.12, 0.2, 0.1, 1.22, 2.05, 0.03);
            k.glow(opening, 1.22, 2.05, 0.3, 1.5);
            k.glow(opening, 0, 1.4, 0.5, 2.6);
            windows.push(element(opening, 'door', s));
        } else if (kind === 'balcony') {
            // French windows onto a balcony, over the entrance
            k.box(opening, mat('dark'), 1.9, 2.25, 0.08, 0, 0.05, 0);
            glass(0.84, 2.08, -0.45, 0.11);
            glass(0.84, 2.08, 0.45, 0.11);
            k.box(opening, mat('coping'), 2.5, 0.12, 0.85, 0, -0.06, 0.42);
            const rail = [[-1.2, 1.05, 0.8, 1.2, 1.05, 0.8], [-1.2, 1.05, 0, -1.2, 1.05, 0.8], [1.2, 1.05, 0, 1.2, 1.05, 0.8]];
            for (let n = 0; n <= 8; n++) rail.push([-1.2 + n * 0.3, 0.06, 0.8, -1.2 + n * 0.3, 1.05, 0.8, 0.025]);
            k.bars(opening, mat('dark'), 0.05, rail);
            windows.push(element(opening, 'window', s));
        } else if (ground) {
            // Shop window: two lights and a transom, under an awning on the front
            k.box(opening, mat('dark'), 2.2, 1.98, 0.08, 0, 0.45, 0);
            glass(1.02, 1.36, -0.54, 0.51);
            glass(1.02, 1.36, 0.54, 0.51);
            glass(2.08, 0.44, 0, 1.93);
            k.box(opening, mat('concrete'), 2.4, 0.08, 0.2, 0, 0.38, 0.03);
            if (!onEnd) {
                const awning = k.box(opening, mat('accent'), 2.36, 0.05, 0.85, 0, 2.52, 0.4);
                awning.rotation.x = 0.38;
            }
            windows.push(element(opening, 'window', s));
        } else {
            // Casement window with a top light, a sill and a hood, beside timber infill
            const w = 1.7, x = -0.3;
            k.box(opening, mat('dark'), w, 1.52, 0.08, x, 0.9, 0);
            glass(w / 2 - 0.09, 1, x - w / 4 + 0.015, 0.96);
            glass(w / 2 - 0.09, 1, x + w / 4 - 0.015, 0.96);
            glass(w - 0.12, 0.36, x, 2.01);
            k.box(opening, mat('coping'), w + 0.24, 0.07, 0.2, x, 0.83, 0.03);
            k.box(opening, mat('coping'), w + 0.16, 0.06, 0.14, x, 2.44, 0.02);
            k.box(opening, mat('timber'), 0.56, 1.52, 0.05, 0.92, 0.9, 0.005);
            windows.push(element(opening, 'window', s));
        }
    };

    const doorBay = nz - 1 - Math.floor(nz / 2);
    for (let s = 0; s < storeys; s++) {
        const y = BASE + s * H;
        const st = { y, slab: null, columns: [], walls: [], windows: [] };
        if (s > 0) {
            st.slab = element(k.box(g, mat('concrete'), W, 0.3, D, 0, y - 0.3, 0), 'slab', s);
            fascia(y - 0.33, 'slab');
        }
        for (let i = 0; i <= nx; i++) {
            for (let j = 0; j <= nz; j++) {
                const x = Math.max(-W / 2 + 0.42, Math.min(W / 2 - 0.42, -W / 2 + i * BAY));
                const z = Math.max(-D / 2 + 0.42, Math.min(D / 2 - 0.42, -D / 2 + j * BAY));
                st.columns.push(element(k.box(g, mat('concrete'), 0.32, H - 0.3, 0.32, x, y, z), 'column', s));
            }
        }
        const rear = [];
        for (let i = 0; i < nx; i++) facade(st, s, y, Math.PI, -W / 2 + (i + 0.5) * BAY, -D / 2, i, 'window', rear);
        for (let j = 0; j < nz; j++) facade(st, s, y, -Math.PI / 2, -W / 2, -D / 2 + (j + 0.5) * BAY, j, 'window', rear);
        for (let j = 0; j < nz; j++) {
            const kind = j !== doorBay ? 'window' : s === 0 ? 'door' : s === 1 ? 'balcony' : 'window';
            facade(st, s, y, Math.PI / 2, W / 2, D / 2 - (j + 0.5) * BAY, j, kind);
        }
        for (let i = 0; i < nx; i++) facade(st, s, y, 0, -W / 2 + (i + 0.5) * BAY, D / 2, i, 'window');
        st.windows.push(...rear);
        b.storeys.push(st);
    }

    // A planted bed along the front
    const bed = tagged(k.group(g, -0.2, BASE, D / 2 + 0.52), 'site');
    k.box(bed, mat('concrete'), W - 1.2, 0.22, 0.42);
    for (let n = 0; n < nx * 2; n++) {
        const shrub = k.mesh(bed, k.GEO.blob, mat(n % 3 ? 'leaf' : 'leafDark'), -W / 2 + 1.2 + n * ((W - 2.4) / (nx * 2 - 1)), 0.36, 0);
        shrub.scale.set(0.34, 0.27 + (n % 2) * 0.06, 0.26);
    }

    if (o.roof !== false) {
        const top = b.top;
        const roof = (object, kind = 'roof') => (b.roof.push(element(object, kind, storeys)), object);
        roof(k.box(g, mat('concrete'), W, 0.3, D, 0, top - 0.3, 0));
        fascia(top - 0.33, 'roof');
        roof(k.box(g, mat('roof'), W - 0.44, 0.05, D - 0.44, 0, top, 0));
        [[W, 0.22, 0, D / 2 - 0.11], [W, 0.22, 0, -D / 2 + 0.11], [0.22, D - 0.44, W / 2 - 0.11, 0], [0.22, D - 0.44, -W / 2 + 0.11, 0]]
            .forEach(([w, d, x, z]) => roof(k.box(g, mat('coping'), w, 0.5, d, x, top, z)));

        if (o.plant === 'solar') {
            for (let n = 0; n < nx; n++) {
                const panel = k.group(g, -W / 2 + (n + 0.5) * BAY, top + 0.05, 0.2);
                const face = k.box(panel, mat('solar'), 2.1, 0.07, D - 2.4, 0, 0.42, 0);
                face.rotation.z = -0.2;
                k.box(panel, mat('metal'), 0.08, 0.6, D - 2.6, 0.75, 0, 0);
                roof(panel, 'plant');
            }
        } else if (o.plant) {
            // Stair core, an air handling unit, a rooflight and a mast
            const core = k.group(g, -W / 2 + 2, top + 0.05, -D / 2 + 1.7);
            k.box(core, mat('wall'), 2.6, 2.1, 2.2);
            k.box(core, mat('coping'), 2.8, 0.12, 2.4, 0, 2.1, 0);
            k.box(core, mat('dark'), 0.9, 1.7, 0.06, 0.3, 0, 1.1);
            roof(core, 'plant');
            const unit = k.group(g, W / 2 - 2.6, top + 0.05, -D / 2 + 1.6);
            k.box(unit, mat('metal'), 2.2, 0.95, 1.5);
            k.cyl(unit, mat('dark'), 0.48, 0.06, -0.45, 0.95, 0);
            k.cyl(unit, mat('dark'), 0.48, 0.06, 0.55, 0.95, 0);
            k.box(unit, mat('metal'), 0.5, 0.4, 1.3, -1.35, 0, 0);
            roof(unit, 'plant');
            const light = k.group(g, 0.6, top + 0.05, D / 2 - 1.5);
            k.box(light, mat('coping'), 1.9, 0.22, 1.3);
            k.box(light, mat('glassLit'), 1.66, 0.06, 1.06, 0, 0.22, 0);
            roof(light, 'plant');
            const mast = k.group(g, W / 2 - 0.8, top + 0.05, -D / 2 + 0.8);
            k.box(mast, mat('dark'), 0.08, 2.4, 0.08);
            k.box(mast, mat('dark'), 0.7, 0.06, 0.06, 0, 1.9, 0);
            k.sphere(mast, k.basic(['#e5383b', '#ff5a5c']), 0.1, 0, 2.45, 0);
            k.glow(mast, 0, 2.45, 0, 1.3, '#ff5a5c', 0.8);
            roof(mast, 'plant');
        }
    }
    return b;
}

/** A broadleaf tree: trunk and three masses of foliage. */
export function tree(k, parent, x, z, size = 1) {
    const g = k.group(parent, x, 0, z);
    k.cyl(g, 'trunk', 0.11 * size, 1.5 * size);
    [[0, 2.1, 0, 1.05, 'leaf'], [0.55, 1.75, 0.3, 0.75, 'leafDark'], [-0.5, 1.7, -0.25, 0.8, 'leaf'], [0.1, 2.75, -0.1, 0.7, 'leaf']]
        .forEach(([dx, y, dz, r, material]) => {
            const blob = k.mesh(g, k.GEO.blob, material, dx * size, y * size, dz * size);
            blob.scale.setScalar(r * size);
        });
    return g;
}

export const SKIN = ['#e6c2a2', '#c9966e', '#8f5d3f', '#efd0b4'];
export const HAIR = ['#2a2320', '#5b3d2a', '#16161b', '#8a6a4a'];

/**
 * A person 1.76 m tall, facing +z: legs that bend at the knee, a torso, arms
 * that bend at the elbow, head and hair. Colours are '#hex' or the name of a
 * shared material.
 * look: { top, legs, skin (0-3), hair (0-3), hat (hard-hat colour), vest
 * (true for hi-vis), headset (true for an XR headset) }.
 * The group's userData holds the joints (legL, legR, kneeL, kneeR, armL,
 * armR, foreL, foreR) and walk(phase), which poses one step cycle.
 */
export function person(k, parent, x, z, look = {}) {
    const g = k.group(parent, x, 0, z);
    const tints = k.tints || (k.tints = {});
    const tint = spec => (spec[0] === '#' ? tints[spec] || (tints[spec] = k.standard(spec)) : spec);
    const skin = tint(SKIN[look.skin || 0]);
    const top = tint(look.vest ? 'vest' : look.top || '#3d5a80');
    const sleeve = tint(look.top || '#3d5a80');
    const legs = tint(look.legs || '#2c3340');
    const joints = g.userData;

    k.box(g, legs, 0.34, 0.2, 0.2, 0, 0.8, 0);
    [['L', 0.095], ['R', -0.095]].forEach(([side, dx]) => {
        const leg = joints[`leg${side}`] = k.group(g, dx, 0.92, 0);
        k.cyl(leg, legs, 0.085, 0.46, 0, -0.46, 0);
        const knee = joints[`knee${side}`] = k.group(leg, 0, -0.46, 0);
        k.cyl(knee, legs, 0.07, 0.42, 0, -0.42, 0);
        k.box(knee, 'dark', 0.13, 0.09, 0.28, 0, -0.46, 0.05);
    });

    const torso = k.mesh(g, k.GEO.capsule, top, 0, 0.88, 0);
    torso.scale.set(0.94, 0.56, 0.64);
    if (look.vest) k.box(g, 'white', 0.4, 0.05, 0.27, 0, 1.12, 0);

    [['L', 0.235], ['R', -0.235]].forEach(([side, dx]) => {
        const arm = joints[`arm${side}`] = k.group(g, dx, 1.42, 0);
        k.cyl(arm, sleeve, 0.055, 0.3, 0, -0.3, 0);
        const fore = joints[`fore${side}`] = k.group(arm, 0, -0.3, 0);
        k.cyl(fore, look.sleeves === 'short' ? skin : sleeve, 0.046, 0.27, 0, -0.27, 0);
        k.sphere(fore, skin, 0.058, 0, -0.31, 0);
        fore.rotation.x = -0.2;
    });

    k.cyl(g, skin, 0.052, 0.1, 0, 1.47, 0);
    const head = k.sphere(g, skin, 1, 0, 1.635, 0);
    head.scale.set(0.106, 0.128, 0.116);
    if (look.hat) {
        const hat = k.mesh(g, k.GEO.dome, tint(look.hat), 0, 1.675, 0);
        hat.scale.set(0.135, 0.105, 0.148);
        k.cyl(g, tint(look.hat), 0.155, 0.02, 0, 1.672, 0.03);
    } else {
        const hair = k.mesh(g, k.GEO.dome, tint(HAIR[look.hair || 0]), 0, 1.655, -0.012);
        hair.scale.set(0.114, 0.118, 0.126);
        hair.rotation.x = -0.22;
    }
    if (look.headset) {
        k.box(g, 'dark', 0.24, 0.1, 0.12, 0, 1.6, 0.075);
        k.box(g, 'white', 0.25, 0.035, 0.24, 0, 1.66, -0.02);
    }

    /** One step cycle: phase in radians, stride 0 (standing) to 1 (walking). */
    joints.walk = (phase, stride = 1) => {
        const s = Math.sin(phase) * stride, c = Math.cos(phase) * stride;
        joints.legL.rotation.x = -0.55 * s;
        joints.legR.rotation.x = 0.55 * s;
        joints.kneeL.rotation.x = 0.85 * Math.max(0, c);
        joints.kneeR.rotation.x = 0.85 * Math.max(0, -c);
        joints.armL.rotation.x = 0.45 * s;
        joints.armR.rotation.x = -0.45 * s;
    };
    return g;
}

/** A desk with a monitor, and a chair on its +z side. */
export function desk(k, parent, x, y, z, turn = 0) {
    const g = k.group(parent, x, y, z);
    g.rotation.y = turn;
    k.box(g, 'timber', 1.3, 0.05, 0.65, 0, 0.68, 0);
    k.bars(g, 'dark', 0.05, [[-0.6, 0, -0.27, -0.6, 0.68, -0.27], [0.6, 0, -0.27, 0.6, 0.68, -0.27], [-0.6, 0, 0.27, -0.6, 0.68, 0.27], [0.6, 0, 0.27, 0.6, 0.68, 0.27]]);
    k.box(g, 'dark', 0.55, 0.34, 0.04, 0, 0.83, -0.15);
    k.box(g, 'dark', 0.06, 0.1, 0.06, 0, 0.73, -0.15);
    k.box(g, 'rubber', 0.44, 0.07, 0.44, 0, 0.42, 0.62);
    k.box(g, 'rubber', 0.44, 0.42, 0.06, 0, 0.49, 0.84);
    k.cyl(g, 'metal', 0.04, 0.42, 0, 0, 0.62);
    return g;
}

export const AXIS_Z = new THREE.Vector3(0, 0, 1), aimA = new THREE.Vector3(), aimB = new THREE.Vector3();

/** Stretch a box (made with k.box) between two points of its parent's space, as a strut or a ram. */
export function aim(mesh, ax, ay, az, bx, by, bz) {
    aimA.set(ax, ay, az);
    aimB.set(bx, by, bz).sub(aimA);
    const length = aimB.length();
    mesh.quaternion.setFromUnitVectors(AXIS_Z, aimB.divideScalar(length || 1));
    // The box stands on its base: lie it along the strut, centred on its axis
    mesh.position.copy(aimA).addScaledVector(aimB, length / 2);
    aimA.set(0, 1, 0).applyQuaternion(mesh.quaternion);
    mesh.position.addScaledVector(aimA, -mesh.scale.y / 2);
    mesh.scale.z = length;
}

/** Every box of a subtree (or those that keep(mesh) accepts) as a flat list of edge points, in k.root space. */
export function boxEdges(k, object, keep) {
    const source = k.GEO.edges.attributes.position;
    const points = [];
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
        if (!o.isMesh || o.geometry !== k.GEO.box || (keep && !keep(o))) return;
        for (let j = 0; j < source.count; j++) {
            v0.fromBufferAttribute(source, j).applyMatrix4(o.matrixWorld);
            points.push(v0.x, v0.y, v0.z);
        }
    });
    return points;
}

/** Every box of a subtree (or those that keep(mesh) accepts) merged into one geometry (positions only), in k.root space. */
export function boxShell(k, object, keep) {
    const source = k.GEO.box.attributes.position, index = k.GEO.box.index;
    const position = [], indices = [];
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
        if (!o.isMesh || o.geometry !== k.GEO.box || (keep && !keep(o))) return;
        const offset = position.length / 3;
        for (let j = 0; j < source.count; j++) {
            v0.fromBufferAttribute(source, j).applyMatrix4(o.matrixWorld);
            position.push(v0.x, v0.y, v0.z);
        }
        for (let j = 0; j < index.count; j++) indices.push(index.getX(j) + offset);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setIndex(indices);
    return geometry;
}

/** A line through count points, to be written into its position attribute each frame. */
export function polyline(k, parent, material, count) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    (parent || k.root).add(line);
    return line;
}

/** A route through way-points [x, z], with rounded corners, measured along its length. */
export function route(points, radius = 0.5) {
    const samples = [];
    points.forEach((p, i) => {
        if (i === 0 || i === points.length - 1) return samples.push([p[0], p[1]]);
        const a = points[i - 1], b = points[i + 1];
        const inLength = Math.hypot(p[0] - a[0], p[1] - a[1]), outLength = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const r = Math.min(radius, inLength / 2, outLength / 2);
        const ax = p[0] - ((p[0] - a[0]) / inLength) * r, az = p[1] - ((p[1] - a[1]) / inLength) * r;
        const bx = p[0] + ((b[0] - p[0]) / outLength) * r, bz = p[1] + ((b[1] - p[1]) / outLength) * r;
        for (let s = 0; s <= 6; s++) {
            const u = s / 6, v = 1 - u;
            samples.push([v * v * ax + 2 * v * u * p[0] + u * u * bx, v * v * az + 2 * v * u * p[1] + u * u * bz]);
        }
        return 0;
    });
    const lengths = [0];
    for (let i = 1; i < samples.length; i++) {
        lengths.push(lengths[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
    }
    const length = lengths[lengths.length - 1];
    return {
        length,
        /** Point at distance s along the route, written to out.x and out.z. */
        at(s, out) {
            const d = Math.max(0, Math.min(length, s));
            let i = 1;
            while (i < samples.length - 1 && lengths[i] < d) i++;
            const u = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
            out.x = lerp(samples[i - 1][0], samples[i][0], u);
            out.z = lerp(samples[i - 1][1], samples[i][1], u);
            return out;
        }
    };
}
