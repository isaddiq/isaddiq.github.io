/**
 * The nine research simulations shown by research-viewer.js, one per research
 * interest. Each is built from boxes, cylinders and struts with the viewer's
 * kit (k), on a stage about 12 m across, in metres.
 *
 * A scene is { duration, poster, alt, build }. build(k) adds objects to
 * k.root and returns update(t), which poses the scene for a moment t of its
 * loop (0 to duration, in seconds). update is a pure function of t: that is
 * what makes the loop seamless, lets the viewer hold a still frame (poster)
 * under prefers-reduced-motion, and keeps a scene correct after a theme change.
 */
import * as THREE from '../vendor/three.module.min.js';

// ---- Timing helpers -----------------------------------------------------------
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
/** Progress of t through [a, b], clamped to 0..1. */
const seg = (t, a, b) => (b > a ? clamp01((t - a) / (b - a)) : t >= a ? 1 : 0);
const smooth = x => x * x * (3 - 2 * x);
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Envelope: fades in after a, holds, fades out before b. */
const pulse = (t, a, b, fade = 0.3) => Math.min(seg(t, a, a + fade), 1 - seg(t, b - fade, b));
/** Value of a piecewise track [[time, value], ...] at t, eased between keys. */
function track(keys, t, ease = easeInOut) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(seg(t, keys[i - 1][0], keys[i][0])));
    }
    return keys[keys.length - 1][1];
}

const v0 = new THREE.Vector3();

// ---- Shared props -------------------------------------------------------------

/**
 * A framed building on 3 m bays, detailed on the two faces in view: a stone
 * ground storey with shop windows under awnings and a glazed entrance with a
 * canopy, rendered upper storeys with casement windows, timber infill and a
 * balcony over the door, floor bands, downpipes, planting and a flat roof
 * with its plant. Every part that a scene may move or restyle is listed in
 * elements, with userData.kind (slab, column, wall, window, door, roof,
 * plant) and userData.storey; a window or door lists its glass in
 * userData.panes.
 * @param {object} k - the viewer's kit
 * @param {{nx: number, nz: number, storeys: number, x?: number, z?: number, plant?: string, roof?: boolean, mat?: Function, parent?: object}} o
 */
function building(k, o) {
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

    // A band along each floor plate and a pilaster on each grid line, on the
    // two faces in view: they give the facade its bays
    const fascia = (y, kind) => {
        tagged(k.box(g, mat('coping'), W + 0.2, 0.36, 0.12, 0.04, y, D / 2 + 0.04), kind);
        tagged(k.box(g, mat('coping'), 0.12, 0.36, D + 0.08, W / 2 + 0.04, y, 0), kind);
    };
    for (let i = 0; i <= nx; i++) tagged(k.box(g, mat('coping'), 0.2, b.top - BASE, 0.09, Math.min(W / 2 - 0.1, -W / 2 + i * BAY + (i ? 0 : 0.1)), BASE, D / 2 + 0.03), 'wall');
    for (let j = 0; j < nz; j++) tagged(k.box(g, mat('coping'), 0.09, b.top - BASE, 0.2, W / 2 + 0.03, BASE, Math.max(-D / 2 + 0.1, -D / 2 + j * BAY)), 'wall');
    tagged(k.bars(g, mat('metal'), 0.08, [
        [-W / 2 + 0.36, BASE, D / 2 + 0.12, -W / 2 + 0.36, b.top + 0.2, D / 2 + 0.12],
        [W / 2 + 0.12, BASE, -D / 2 + 0.36, W / 2 + 0.12, b.top + 0.2, -D / 2 + 0.36]
    ]), 'plant');

    // One bay of facade: its wall and, on the faces in view, what opens in it
    const facade = (st, s, y, turn, cx, cz, i, kind) => {
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
            st.windows.push(element(opening, 'door', s));
        } else if (kind === 'balcony') {
            // French windows onto a balcony, over the entrance
            k.box(opening, mat('dark'), 1.9, 2.25, 0.08, 0, 0.05, 0);
            glass(0.84, 2.08, -0.45, 0.11);
            glass(0.84, 2.08, 0.45, 0.11);
            k.box(opening, mat('coping'), 2.5, 0.12, 0.85, 0, -0.06, 0.42);
            const rail = [[-1.2, 1.05, 0.8, 1.2, 1.05, 0.8], [-1.2, 1.05, 0, -1.2, 1.05, 0.8], [1.2, 1.05, 0, 1.2, 1.05, 0.8]];
            for (let n = 0; n <= 8; n++) rail.push([-1.2 + n * 0.3, 0.06, 0.8, -1.2 + n * 0.3, 1.05, 0.8, 0.025]);
            k.bars(opening, mat('dark'), 0.05, rail);
            st.windows.push(element(opening, 'window', s));
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
            st.windows.push(element(opening, 'window', s));
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
            st.windows.push(element(opening, 'window', s));
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
        for (let i = 0; i < nx; i++) facade(st, s, y, Math.PI, -W / 2 + (i + 0.5) * BAY, -D / 2, i, '');
        for (let j = 0; j < nz; j++) facade(st, s, y, -Math.PI / 2, -W / 2, -D / 2 + (j + 0.5) * BAY, j, '');
        for (let j = 0; j < nz; j++) {
            const kind = j !== doorBay ? 'window' : s === 0 ? 'door' : s === 1 ? 'balcony' : 'window';
            facade(st, s, y, Math.PI / 2, W / 2, D / 2 - (j + 0.5) * BAY, j, kind);
        }
        for (let i = 0; i < nx; i++) facade(st, s, y, 0, -W / 2 + (i + 0.5) * BAY, D / 2, i, 'window');
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
function tree(k, parent, x, z, size = 1) {
    const g = k.group(parent, x, 0, z);
    k.cyl(g, 'trunk', 0.11 * size, 1.5 * size);
    [[0, 2.1, 0, 1.05, 'leaf'], [0.55, 1.75, 0.3, 0.75, 'leafDark'], [-0.5, 1.7, -0.25, 0.8, 'leaf'], [0.1, 2.75, -0.1, 0.7, 'leaf']]
        .forEach(([dx, y, dz, r, material]) => {
            const blob = k.mesh(g, k.GEO.blob, material, dx * size, y * size, dz * size);
            blob.scale.setScalar(r * size);
        });
    return g;
}

const SKIN = ['#e6c2a2', '#c9966e', '#8f5d3f', '#efd0b4'];
const HAIR = ['#2a2320', '#5b3d2a', '#16161b', '#8a6a4a'];

/**
 * A person 1.76 m tall, facing +z: legs that bend at the knee, a torso, arms
 * that bend at the elbow, head and hair. Colours are '#hex' or the name of a
 * shared material.
 * look: { top, legs, skin (0-3), hair (0-3), hat (hard-hat colour), vest
 * (true for hi-vis), headset (true for an XR headset) }.
 * The group's userData holds the joints (legL, legR, kneeL, kneeR, armL,
 * armR, foreL, foreR) and walk(phase), which poses one step cycle.
 */
function person(k, parent, x, z, look = {}) {
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
function desk(k, parent, x, y, z, turn = 0) {
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

const AXIS_Z = new THREE.Vector3(0, 0, 1), aimA = new THREE.Vector3(), aimB = new THREE.Vector3();

/** Stretch a box (made with k.box) between two points of its parent's space, as a strut or a ram. */
function aim(mesh, ax, ay, az, bx, by, bz) {
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

/** Every box of a subtree as a flat list of edge points, in k.root space. */
function boxEdges(k, object) {
    const source = k.GEO.edges.attributes.position;
    const points = [];
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
        if (!o.isMesh || o.geometry !== k.GEO.box) return;
        for (let j = 0; j < source.count; j++) {
            v0.fromBufferAttribute(source, j).applyMatrix4(o.matrixWorld);
            points.push(v0.x, v0.y, v0.z);
        }
    });
    return points;
}

/** Every box of a subtree merged into one geometry (positions only), in k.root space. */
function boxShell(k, object) {
    const source = k.GEO.box.attributes.position, index = k.GEO.box.index;
    const position = [], indices = [];
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
        if (!o.isMesh || o.geometry !== k.GEO.box) return;
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
function polyline(k, parent, material, count) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    (parent || k.root).add(line);
    return line;
}

// ---- 1. Building Information Modeling -------------------------------------------

/**
 * A nine-storey mixed-use building, built up as the models of its
 * disciplines: the structure rises level by level, the building services
 * run through the open frame, the envelope closes over them, and then single
 * elements are picked out with their IFC data. At the end it comes apart in
 * the reverse order. Modelled at full size, shown at SCENES.bim.scale.
 */
function bim(k) {
    // Towards the front of the grid, which leaves the height of the stage to the tower
    const g = k.group(null, 5.6, 0, 5.2);
    const fresh = k.standard('accent', { roughness: 0.5 });      // a part on its way into place
    const TOP = 33;
    const STRUCTURE = 0.3, SERVICES = 5.4, ENVELOPE = 8.7, INSPECT = 13.6, CLEAR = 17.8;
    const levels = [], items = [], services = [];

    const lit = n => ((n * 7 + 3) % 5 > 1 ? 'glassLit' : 'glass');
    const part = (x, y, z, turn = 0) => {
        const group = k.group(g, x, y, z);
        group.rotation.y = turn;
        return group;
    };
    /** A level: its slab, its frame, the facade units that slide on, and what is set down last. */
    const level = y => {
        const l = { y, slab: [], frame: [], facade: [], trim: [], slide: [] };
        levels.push(l);
        return l;
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

    // ---- Podium, level 1: a colonnade with the glazing set back behind it
    const PX = 6.5, PZ = 4.75;
    let door, cornerColumn;
    {
        const y = 0.45, h = 3.75;
        const l = level(y);
        l.slab.push(k.box(g, 'concrete', 13, 0.15, 9.5, 0, 0.3, 0));
        [-6.15, -3.075, 0, 3.075, 6.15].forEach(x => l.frame.push(k.box(g, 'coping', 0.5, h, 0.5, x, y, PZ - 0.35)));
        cornerColumn = l.frame[4];
        [1.47, -1.47, -4.4].forEach(z => l.frame.push(k.box(g, 'coping', 0.5, h, 0.5, PX - 0.35, y, z)));
        l.frame.push(k.box(g, 'wall', 13, h, 0.3, 0, y, -PZ + 0.15), k.box(g, 'wall', 0.3, h, 9.2, -PX + 0.15, y, 0.15));
        const shopfront = (x, z, turn, width, n) => {
            const bay = part(x, y, z, turn);
            k.box(bay, lit(n), width - 0.16, 3, 0.1);
            k.box(bay, 'dark', width, 0.75, 0.16, 0, 3, 0);
            [-1, 1].forEach(side => k.box(bay, 'dark', 0.1, 3, 0.16, side * (width / 2 - 0.05), 0, 0));
            if (n === 3) {
                door = k.group(bay);
                k.box(door, 'dark', 1.9, 2.45, 0.2, 0, 0, 0.02);
                [-0.45, 0.45].forEach(dx => k.box(door, 'glassLit', 0.82, 2.3, 0.24, dx, 0.05, 0.02));
                [-0.07, 0.07].forEach(dx => k.box(door, 'metal', 0.04, 0.6, 0.05, dx, 0.9, 0.16));
            }
            l.facade.push(bay);
        };
        for (let i = 0; i < 4; i++) shopfront(-4.6125 + i * 3.075, PZ - 1, 0, 3.075, i);
        for (let j = 0; j < 3; j++) shopfront(PX - 1, 2.935 - j * 2.935, Math.PI / 2, 2.935, j + 5);
        const canopy = part(4.6125, 3.15, PZ + 0.75);
        k.box(canopy, 'coping', 3.5, 0.16, 2.7);
        k.box(canopy, 'dark', 3.54, 0.2, 0.08, 0, -0.02, 1.36);
        k.glow(canopy, 0, -0.9, 0.2, 3.2);
        l.slide.push([canopy, 0, 1]);
    }

    // ---- Podium, level 2: cladding panels, ribbon windows behind louvres
    {
        const y = 4.5, h = 3.3;
        const l = level(y);
        l.slab.push(k.box(g, 'concrete', 13.5, 0.3, 10, 0, 4.2, 0));
        l.frame.push(k.box(g, 'wall', 13, h, 0.3, 0, y, -PZ + 0.15), k.box(g, 'wall', 0.3, h, 9.2, -PX + 0.15, y, 0.15));
        [[-3.25, 2.4], [3.25, 2.4], [3.25, -2.4], [0, 2.4]].forEach(([x, z]) => l.frame.push(k.box(g, 'concrete', 0.45, h, 0.45, x, y, z)));
        const panel = (x, z, turn, width, n) => {
            const bay = part(x, y, z, turn);
            k.box(bay, 'wall', width, h, 0.25, 0, 0, -0.125);
            k.box(bay, 'dark', width - 0.6, 1.5, 0.1, 0, 0.95, 0);
            [-1, 1].forEach((side, m) => k.box(bay, lit(n + m), width / 2 - 0.36, 1.38, 0.12, side * (width / 4 - 0.14), 1.01, 0));
            l.facade.push(bay);
        };
        for (let i = 0; i < 4; i++) panel(-4.875 + i * 3.25, PZ, 0, 3.25, i + 1);
        for (let j = 0; j < 3; j++) panel(PX, 3.167 - j * 3.167, Math.PI / 2, 3.167, j + 2);
        const slats = [];
        [5.62, 5.98, 6.34, 6.7].forEach(sy => {
            slats.push([-6.4, sy, PZ + 0.24, 6.4, sy, PZ + 0.24], [PX + 0.24, sy, 4.65, PX + 0.24, sy, -4.65]);
        });
        l.trim.push(k.bars(g, 'coping', 0.09, slats));
    }

    // ---- Tower: five storeys of curtain wall above the podium roof terrace
    const TX0 = -6.3, TX1 = 1.7, TZ0 = -4.55, TZ1 = 1.45;
    const QX1 = TX1 - 2, QZ1 = TZ1 - 1.6;                  // the penthouse is set back to here
    const fascia = (slab, x0, x1, z0, z1, y) => {
        k.box(slab, 'coping', x1 - x0 + 0.4, 0.42, 0.22, (x0 + x1) / 2 + 0.1, y - 0.06, z1 + 0.09);
        k.box(slab, 'coping', 0.22, 0.42, z1 - z0 + 0.2, x1 + 0.09, y - 0.06, (z0 + z1) / 2);
    };
    const frameOf = (l, y, x1, z1) => {
        l.frame.push(k.box(g, 'concrete', 2.6, 2.9, 2.6, TX0 + 1.5, y, TZ0 + 1.5));
        [[x1 - 0.3, z1 - 0.3], [TX0 + 0.3, z1 - 0.3], [x1 - 0.3, TZ0 + 0.3], [(TX0 + x1) / 2, z1 - 0.3]]
            .forEach(([x, z]) => l.frame.push(k.box(g, 'concrete', 0.4, 2.9, 0.4, x, y, z)));
        l.frame.push(k.box(g, 'wall', x1 - TX0, 2.9, 0.25, (TX0 + x1) / 2, y, TZ0 + 0.125), k.box(g, 'wall', 0.25, 2.9, z1 - TZ0, TX0 + 0.125, y, (TZ0 + z1) / 2));
    };
    const glazing = (l, x, y, z, turn, width, n) => {
        const unit = part(x, y, z, turn);
        k.box(unit, lit(n), width - 0.08, 2.9, 0.12);
        k.box(unit, 'dark', width - 0.08, 0.06, 0.15, 0, 2.15, 0);
        l.facade.push(unit);
        return unit;
    };

    let curtainWall, balconyPick;
    for (let n = 0; n < 5; n++) {
        const y = 8.1 + n * 3.2;
        const l = level(y);
        const slab = part(0, 0, 0);
        if (n === 0) {
            // The podium roof is a terrace: paving, a parapet, planting
            k.box(slab, 'concrete', 13.5, 0.3, 10, 0, 7.8, 0);
            k.box(slab, 'paving', 13.1, 0.05, 9.6, 0, 8.1, 0);
            const parapet = part(0, 8.1, 0);
            k.box(parapet, 'coping', 13.5, 0.55, 0.22, 0, 0, PZ + 0.14);
            k.box(parapet, 'coping', 0.22, 0.55, 9.8, PX + 0.14, 0, 0);
            l.trim.push(parapet);
            [[4.2, 2.9, 1.05], [4.4, -2.4, 0.9], [-3.2, 3.3, 0.95]].forEach(([x, z, size]) => {
                const planter = part(x, 8.15, z);
                k.box(planter, 'timber', 1.5, 0.5, 1.5);
                tree(k, planter, 0, 0, size).position.y = 0.4;
                l.trim.push(planter);
            });
        } else {
            k.box(slab, 'concrete', TX1 - TX0, 0.3, TZ1 - TZ0, (TX0 + TX1) / 2, y - 0.3, (TZ0 + TZ1) / 2);
            fascia(slab, TX0, TX1, TZ0, TZ1, y - 0.3);
        }
        l.slab.push(slab);
        frameOf(l, y, TX1, TZ1);
        for (let i = 0; i < 4; i++) {
            const unit = glazing(l, TX0 + 1 + i * 2, y, TZ1 - 0.06, 0, 2, n * 3 + i);
            if (n === 2 && i === 2) curtainWall = unit;
        }
        for (let j = 0; j < 2; j++) glazing(l, TX1 - 0.06, y, TZ1 - 1 - j * 2, Math.PI / 2, 2, n * 2 + j + 1);
        // The rear bay of the end wall is solid, with a slot window
        const solid = part(TX1, y, TZ1 - 5, Math.PI / 2);
        k.box(solid, 'wall', 2, 2.9, 0.25, 0, 0, -0.125);
        k.box(solid, 'dark', 0.62, 2.2, 0.06, 0.3, 0.4, 0.01);
        k.box(solid, lit(n + 2), 0.5, 2.08, 0.08, 0.3, 0.46, 0.01);
        l.facade.push(solid);
        // Fins along the front, every other one in timber
        const fins = part(0, y - 0.1, TZ1 + 0.22);
        for (let i = 0; i <= 4; i++) k.box(fins, i === (n * 2 + 1) % 5 ? 'timber' : 'coping', 0.13, 3.05, 0.42, TX0 + i * 2, 0, 0);
        l.slide.push([fins, 0, 1]);
        const balcony = part(TX1, y, TZ1 - 2);
        k.box(balcony, 'coping', 1.45, 0.2, 4.1, 0.72, -0.2, 0);
        k.box(balcony, 'glass', 0.05, 1, 4.1, 1.42, 0, 0);
        [-2.03, 2.03].forEach(z => k.box(balcony, 'glass', 1.4, 1, 0.05, 0.72, 0, z));
        k.box(balcony, 'dark', 0.08, 0.05, 4.14, 1.42, 1, 0);
        l.slide.push([balcony, 1, 0]);
        if (n === 3) balconyPick = balcony;
    }

    // ---- Penthouse: two storeys set back behind a terrace, in a portal frame
    for (let n = 5; n < 7; n++) {
        const y = 8.1 + n * 3.2;
        const l = level(y);
        const slab = part(0, 0, 0);
        const [x1, z1] = n === 5 ? [TX1, TZ1] : [QX1, QZ1];
        k.box(slab, 'concrete', x1 - TX0, 0.3, z1 - TZ0, (TX0 + x1) / 2, y - 0.3, (TZ0 + z1) / 2);
        fascia(slab, TX0, x1, TZ0, z1, y - 0.3);
        l.slab.push(slab);
        frameOf(l, y, QX1, QZ1);
        for (let i = 0; i < 3; i++) glazing(l, TX0 + 1 + i * 2, y, QZ1 - 0.06, 0, 2, n + i);
        for (let j = 0; j < 2; j++) glazing(l, QX1 - 0.06, y, QZ1 - 1.1 - j * 2.2, Math.PI / 2, 2.2, n + j + 2);
        if (n === 5) {
            const terrace = part(0, y, 0);
            k.box(terrace, 'timber', TX1 - TX0 - 0.2, 0.05, 1.5, (TX0 + TX1) / 2, 0, TZ1 - 0.8);
            k.box(terrace, 'timber', 1.9, 0.05, QZ1 - TZ0, TX1 - 1, 0, (TZ0 + QZ1) / 2);
            k.box(terrace, 'glass', TX1 - TX0, 1, 0.05, (TX0 + TX1) / 2, 0, TZ1 - 0.05);
            k.box(terrace, 'glass', 0.05, 1, TZ1 - TZ0, TX1 - 0.05, 0, (TZ0 + TZ1) / 2);
            l.trim.push(terrace);
        } else {
            const fz = QZ1 + 0.55, fx = QX1 + 0.55, top = y + 2.9, foot = y - 3.2;
            l.trim.push(k.bars(g, 'coping', 0.3, [
                [TX0 + 0.15, foot, fz, TX0 + 0.15, top, fz], [fx, foot, fz, fx, top, fz], [fx, foot, TZ0 + 0.15, fx, top, TZ0 + 0.15],
                [TX0, top, fz, fx + 0.15, top, fz], [fx, top, fz, fx, top, TZ0]
            ]));
        }
    }

    // ---- Roof: a floating slab, plant, a lift overrun with a beacon
    const ROOF = 8.1 + 7 * 3.2;
    {
        const l = level(ROOF);
        const roof = part((TX0 + QX1) / 2 + 0.3, ROOF - 0.3, (TZ0 + QZ1) / 2 + 0.3);
        k.box(roof, 'coping', QX1 - TX0 + 1.5, 0.3, QZ1 - TZ0 + 1.5);
        k.box(roof, 'roof', QX1 - TX0 + 0.9, 0.04, QZ1 - TZ0 + 0.9, 0, 0.3, 0);
        l.slab.push(roof);
        const plant = part(-2, ROOF, -1.5);
        k.box(plant, 'metal', 2.6, 1.2, 1.7);
        k.cyl(plant, 'dark', 0.5, 0.06, -0.55, 1.2, 0);
        k.cyl(plant, 'dark', 0.5, 0.06, 0.6, 1.2, 0);
        const overrun = part(TX0 + 1.5, ROOF, TZ0 + 1.5);
        k.box(overrun, 'concrete', 2.6, 1.9, 2.6);
        k.box(overrun, 'coping', 2.8, 0.14, 2.8, 0, 1.9, 0);
        k.box(overrun, 'dark', 0.09, 1.7, 0.09, 0.9, 2, 0.9);
        k.sphere(overrun, k.basic(['#e5383b', '#ff5a5c']), 0.14, 0.9, 3.75, 0.9);
        k.glow(overrun, 0.9, 3.75, 0.9, 2.2, '#ff5a5c', 0.8);
        l.frame.push(overrun);
        l.trim.push(plant);
    }

    // ---- Building services: risers through every floor, ducts and pipes branching off
    const RX = QX1 - 0.7, RZ = QZ1 - 0.7;
    // In the colours of a coordination model: air, cable trays, chilled water, sprinklers
    const air = k.standard(['#2f9e8f', '#49bfae']), tray = k.standard(['#e0a030', '#f0b84c']);
    const chilled = k.standard(['#3f7fd9', '#6aa0ee']), sprinkler = k.standard(['#d9534a', '#ee7168']);
    const run = (material, axis, w, h, x, y, z, from, length, sign, start) => {
        const mesh = k.box(g, material, w, h, w, x, y, z);
        services.push({ mesh, axis, from, length, sign, start, y });
    };
    [[air, 0.7, 0, 0], [chilled, 0.2, 0.55, 0.2], [sprinkler, 0.2, -0.55, 0.2], [tray, 0.3, 0.1, -0.55]]
        .forEach(([material, w, dx, dz]) => run(material, 'y', w, 1, RX + dx, 0.45, RZ + dz, 0.45, ROOF - 0.75, 1, SERVICES));
    levels.slice(0, 9).forEach((l, n) => {
        const y = l.y + (n === 0 ? 3.2 : n === 1 ? 2.85 : 2.5), start = SERVICES + 0.9 + n * 0.18;
        const [x0, x1, z0, z1] = n < 2 ? [-6, 6, -4.3, 4.2] : n < 7 ? [TX0 + 0.5, TX1 - 0.5, TZ0 + 0.5, TZ1 - 0.5] : [TX0 + 0.5, QX1 - 0.4, TZ0 + 0.5, QZ1 - 0.4];
        run(air, 'x', 0.7, 0.4, 0, y - 0.1, RZ, RX - 0.35, RX - 0.35 - x0, -1, start);
        run(tray, 'z', 0.5, 0.12, RX, y + 0.15, 0, RZ - 0.35, RZ - 0.35 - z0, -1, start + 0.1);
        if (x1 - RX > 1.2) run(air, 'x', 0.7, 0.4, 0, y - 0.1, RZ, RX + 0.35, x1 - RX - 0.35, 1, start + 0.05);
        if (z1 - RZ > 1.2) run(tray, 'z', 0.5, 0.12, RX, y + 0.15, 0, RZ + 0.35, z1 - RZ - 0.35, 1, start + 0.15);
        run(chilled, 'x', 0.18, 0.18, 0, y + 0.05, RZ + 0.62, RX, RX - x0, -1, start + 0.2);
        run(sprinkler, 'z', 0.18, 0.18, RX + 0.62, y + 0.05, 0, RZ, RZ - z0, -1, start + 0.25);
    });

    // ---- The programme: structure, then services (above), then the envelope.
    // The structure has materials of its own, which turn to glass while the
    // services are laid: seen from above, the slabs would hide them.
    const solid = new Map(['concrete', 'coping', 'wall', 'roof', 'paving', 'dark'].map(name => [k.mat(name), name]));
    const ghosts = {};
    const arrive = (objects, start, step, stage, height, slide) => objects.forEach((entry, n) => {
        const [object, dx, dz] = Array.isArray(entry) ? entry : [entry, 0, 0];
        const out = slide === 'out';
        const meshes = [];
        object.traverse(o => {
            if (!o.isMesh) return;
            if (stage === 0 && solid.has(o.material)) {
                const name = solid.get(o.material);
                o.material = ghosts[name] || (ghosts[name] = k.mat(name, { transparent: true }));
                o.castShadow = true;
            }
            meshes.push([o, o.material]);
        });
        items.push({
            object, meshes, stage, height, tinted: -1, start: start + n * step, home: object.position.clone(),
            dx: out ? Math.sin(object.rotation.y) : dx, dz: out ? Math.cos(object.rotation.y) : dz
        });
    });
    levels.forEach((l, n) => {
        const rise = STRUCTURE + n * 0.5, close = ENVELOPE + n * 0.4;
        arrive(l.slab, rise, 0, 0, l.y);
        arrive(l.frame, rise + 0.14, 0.02, 0, l.y);
        arrive(l.facade, close, 0.03, 2, l.y, 'out');
        arrive(l.slide, close + 0.2, 0.05, 2, l.y);
        arrive(l.trim, close + 0.26, 0.06, 2, l.y);
    });

    // ---- Inspection: four elements picked out in turn, each with its data
    k.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3(), size = new THREE.Vector3();
    const picks = [
        [cornerColumn, 'IfcColumn · C-105', 'Level 1 · C40/50 · 500 × 500'],
        [curtainWall, 'IfcCurtainWall · CW-5-03', 'Level 5 · unitised · U 1.1 W/m²K'],
        [balconyPick, 'IfcSlab · B-6-01', 'Balcony · 200 mm · cantilever 1.45 m'],
        [door, 'IfcDoor · D-001', 'Entrance · 1.9 × 2.45 m · FD30']
    ].map(([object, title, text]) => {
        bounds.setFromObject(object);
        bounds.getSize(size);
        return {
            title, text,
            position: new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y - 0.1, (bounds.min.z + bounds.max.z) / 2),
            scale: size.clone().addScalar(0.3)
        };
    });
    const pickMaterial = k.lineMaterial('signal', { transparent: true });
    const outline = new THREE.LineSegments(k.GEO.edges, pickMaterial);
    const shade = new THREE.Mesh(k.GEO.box, k.basic('signal', { transparent: true, opacity: 0.2, depthWrite: false }));
    k.root.add(outline, shade);
    const pickTag = k.label().tone('signal');

    g.getWorldPosition(v0);
    const GXW = v0.x, GZW = v0.z;
    const stageTag = k.label('', '', 'mini').at(GXW + 9.4, 0, GZW + 7.7);
    const levelTag = k.label('', '', 'mini');
    const STAGES = [
        'Structural model · IfcSlab · IfcColumn · IfcWall',
        'Services model · IfcDuctSegment · IfcPipeSegment',
        'Architectural model · IfcCurtainWall · IfcWindow · IfcDoor',
        `Coordinated model · 9 storeys · ${items.length + services.length} elements`
    ];

    return t => {
        // Structure and envelope: each part drops or slides into place, and leaves the way it came
        items.forEach(item => {
            const { object, home } = item;
            const p = seg(t, item.start, item.start + 0.4);
            // Each level leaves as one, the top one first
            const leave = CLEAR + (2 - item.stage) * 0.35 + (1 - item.height / TOP) * 0.6;
            const v = easeOut(p) * (1 - smooth(seg(t, leave, leave + 0.5)));
            object.visible = v > 0.001;
            if (!object.visible) return;
            if (item.dx || item.dz) object.position.set(home.x + item.dx * (1 - v) * 3, home.y, home.z + item.dz * (1 - v) * 3);
            else object.position.y = home.y + (1 - v) * 2.4;
            const tinted = p < 1 ? 1 : 0;
            if (tinted !== item.tinted) {
                item.tinted = tinted;
                item.meshes.forEach(([mesh, material]) => { mesh.material = tinted ? fresh : material; });
            }
        });
        const xray = pulse(t, SERVICES - 0.2, ENVELOPE + 0.8, 0.6);
        Object.values(ghosts).forEach(material => {
            material.opacity = lerp(1, 0.2, xray);
            material.depthWrite = xray < 0.02;
        });
        // Services: each run grows from the riser
        services.forEach(s => {
            const leave = CLEAR + 0.35 + (1 - s.y / TOP) * 0.6;
            const v = easeOut(seg(t, s.start, s.start + (s.axis === 'y' ? 1.2 : 0.6))) * (1 - smooth(seg(t, leave, leave + 0.5)));
            const length = Math.max(0.001, s.length * v);
            s.mesh.visible = v > 0.001;
            s.mesh.scale[s.axis] = length;
            if (s.axis !== 'y') s.mesh.position[s.axis] = s.from + (s.sign * length) / 2;
        });

        // Inspection
        const n = Math.min(picks.length - 1, Math.max(0, Math.floor((t - INSPECT) / 1.05)));
        const pick = picks[n], shown = pulse(t, INSPECT + n * 1.05, INSPECT + (n + 1) * 1.05, 0.15);
        outline.visible = shade.visible = shown > 0.01;
        outline.position.copy(pick.position);
        outline.scale.copy(pick.scale);
        shade.position.copy(pick.position);
        shade.scale.copy(pick.scale);
        pickMaterial.opacity = shown;
        shade.material.opacity = 0.2 * shown;
        pickTag.set(pick.title, pick.text).at(pick.position.x, pick.position.y + pick.scale.y, pick.position.z).show(shown);

        const stage = t < SERVICES ? 0 : t < ENVELOPE ? 1 : t < INSPECT - 0.3 ? 2 : 3;
        stageTag.set(STAGES[stage]).show(pulse(t, 0.2, CLEAR + 0.4, 0.3));
        const rising = Math.min(levels.length - 2, Math.max(0, Math.floor((t - STRUCTURE) / 0.5)));
        levelTag.set(`Level ${rising + 1} · +${(levels[rising].y - 0.45).toFixed(1)} m`)
            .at(GXW + (rising < 2 ? -PX : TX0) - 2.2, levels[rising].y + 1.4, GZW + (rising < 2 ? PZ : TZ1) + 2.2)
            .show(pulse(t, STRUCTURE, SERVICES - 0.3, 0.2));
    };
}

// ---- 2. Construction Informatics ------------------------------------------------

function informatics(k) {
    // The structure: two storeys of frame, formwork and starter bars on the deck
    const frame = k.group(null, -2.6, 0, -1.8);
    k.box(frame, 'paving', 7.4, 0.3, 7.4);
    for (let s = 0; s < 2; s++) {
        const y = 0.3 + s * 3;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.box(frame, 'concrete', 0.36, 2.7, 0.36, -2.8 + i * 2.8, y, -2.8 + j * 2.8);
        k.box(frame, 'concrete', 6.4, 0.3, 6.4, 0, y + 2.7, 0);
    }
    const DECK = 6.3;
    [[-2.8, -2.8], [0, -2.8], [2.8, -2.8], [-2.8, 0]].forEach(([x, z]) => k.box(frame, 'timber', 0.56, 1.6, 0.56, x, DECK, z));
    const starters = [];
    [[0, 0], [2.8, 0], [-2.8, 2.8], [0, 2.8], [2.8, 2.8]].forEach(([x, z]) => {
        [-0.1, 0.1].forEach(dx => [-0.1, 0.1].forEach(dz => starters.push([x + dx, DECK, z + dz, x + dx, DECK + 1.1, z + dz])));
    });
    k.bars(frame, 'steel', 0.045, starters);
    // Edge protection along the two open edges in view
    const rail = [];
    for (let n = 0; n <= 4; n++) {
        const p = -3.15 + n * 1.575;
        rail.push([p, DECK, 3.15, p, DECK + 1, 3.15], [3.15, DECK, p, 3.15, DECK + 1, p]);
    }
    [0.5, 1].forEach(h => rail.push([-3.15, DECK + h, 3.15, 3.15, DECK + h, 3.15], [3.15, DECK + h, -3.15, 3.15, DECK + h, 3.15]));
    k.bars(frame, 'signal', 0.05, rail);
    // Scaffold along the front
    const scaffold = [];
    const posts = [-3.2, -1.6, 0, 1.6, 3.2];
    posts.forEach((x, n) => {
        [3.5, 4.3].forEach(z => scaffold.push([x, 0.3, z, x, 6.6, z]));
        [2.3, 4.3, 6.3].forEach(y => scaffold.push([x, y, 3.5, x, y, 4.3]));
        if (n) {
            [2.3, 4.3, 6.3].forEach(y => [3.5, 4.3].forEach(z => scaffold.push([posts[n - 1], y, z, x, y, z])));
            scaffold.push(n % 2 ? [posts[n - 1], 0.3, 4.3, x, 2.3, 4.3] : [posts[n - 1], 2.3, 4.3, x, 4.3, 4.3]);
        }
    });
    k.bars(frame, 'steel', 0.06, scaffold);
    [2.3, 4.3].forEach(y => k.box(frame, 'timber', 6.4, 0.06, 0.7, 0, y, 3.9));

    // Tower crane: mast, slewing jib with a trolley, a hoist and a concrete skip
    const CRANE = { x: 3.4, z: -4.6, top: 10.3 };
    const crane = k.group(null, CRANE.x, 0, CRANE.z);
    k.box(crane, 'concrete', 2.3, 0.35, 2.3);
    const mast = [];
    const h = 0.42;
    [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([x, z], n, corners) => {
        const [nx, nz] = corners[(n + 1) % 4];
        mast.push([x, 0.35, z, x, 10, z]);
        for (let level = 0; level < 8; level++) {
            const y0 = 0.35 + level * 1.206, y1 = y0 + 1.206;
            mast.push([x, y1, z, nx, y1, nz, 0.05]);
            mast.push(level % 2 ? [x, y0, z, nx, y1, nz, 0.05] : [nx, y0, nz, x, y1, z, 0.05]);
        }
    });
    k.bars(crane, 'yellow', 0.09, mast);
    k.cyl(crane, 'dark', 0.72, 0.3, 0, 10, 0);
    const upper = k.group(crane, 0, CRANE.top, 0);
    const jib = [];
    const JIB = 7.6, TAIL = -3;
    [-0.3, 0.3].forEach(x => jib.push([x, 0, TAIL, x, 0, JIB]));
    jib.push([0, 0.75, -0.2, 0, 0.75, JIB - 0.5]);
    for (let n = 0; n < 10; n++) {
        const z0 = 0.2 + n * 0.74, z1 = z0 + 0.74;
        jib.push([-0.3, 0, z0, 0, 0.75, z0 + 0.37, 0.045], [0.3, 0, z0, 0, 0.75, z0 + 0.37, 0.045]);
        jib.push([0, 0.75, z0 + 0.37, -0.3, 0, z1, 0.045], [0, 0.75, z0 + 0.37, 0.3, 0, z1, 0.045]);
        jib.push([-0.3, 0, z1, 0.3, 0, z1, 0.045]);
    }
    [-0.4, 0.4].forEach(x => jib.push([x, 0, -0.5, 0, 2.3, 0], [x, 0, 0.5, 0, 2.3, 0]));
    jib.push([0, 2.3, 0, 0, 0.75, 5.2, 0.04], [0, 2.3, 0, 0, 0.1, TAIL + 0.4, 0.04]);
    k.bars(upper, 'yellow', 0.08, jib);
    k.box(upper, 'concrete', 1, 0.8, 1.2, 0, -0.75, TAIL + 0.7);
    const cab = k.group(upper, 0.75, -0.95, 0.5);
    k.box(cab, 'white', 0.8, 0.9, 1);
    k.box(cab, 'glassLit', 0.7, 0.45, 0.06, 0, 0.35, 0.5);
    k.sphere(upper, k.basic(['#e5383b', '#ff5a5c']), 0.09, 0, 0.1, JIB);
    k.glow(upper, 0, 0.1, JIB, 1.2, '#ff5a5c', 0.8);
    k.glow(upper, 0.75, -0.5, 1.1, 1.6);
    const trolley = k.box(upper, 'dark', 0.7, 0.18, 0.5, 0, -0.2, 3);
    const cable = k.box(upper, 'rubber', 0.045, 1, 0.045);
    const hook = k.group(upper);
    k.box(hook, 'yellow', 0.3, 0.3, 0.3, 0, -0.3, 0);
    k.bars(hook, 'dark', 0.035, [[0, -0.3, 0, -0.45, -0.95, 0], [0, -0.3, 0, 0.45, -0.95, 0]]);
    const skip = k.mesh(hook, k.own(new THREE.CylinderGeometry(0.55, 0.36, 1, 18).translate(0, 0.5, 0)), 'steel', 0, -1.95, 0);
    k.cyl(hook, 'accent', 0.57, 0.14, 0, -1.2, 0);

    const PICK = { x: 3.9, z: 1.2 }, PLACE = { x: -2.6, z: -1.8 };
    const polar = p => ({ angle: Math.atan2(p.x - CRANE.x, p.z - CRANE.z), reach: Math.hypot(p.x - CRANE.x, p.z - CRANE.z) });
    const from = polar(PICK), to = polar(PLACE);
    const LOW = 2.0, HIGH = 9.5, POUR = 8.65;       // height of the hook
    const hookKeys = [[0, LOW], [1.2, LOW], [3.6, HIGH], [6.4, HIGH], [8.2, POUR], [9.6, POUR], [10.8, HIGH], [13.8, HIGH], [16, LOW]];
    const slewKeys = [[0, 0], [3.2, 0], [6.6, 1], [10.6, 1], [14, 0]];

    // Laydown: where the skip is filled, and stacked material
    k.box(null, 'timber', 1.6, 0.12, 1.6, PICK.x, 0, PICK.z);
    const stack = k.group(null, 5.6, 0, -1.2);
    k.box(stack, 'timber', 1.5, 0.14, 1.1);
    k.box(stack, 'concrete', 1.3, 0.5, 0.9, 0, 0.14, 0);
    k.box(stack, 'concrete', 1.3, 0.5, 0.9, 0.05, 0.66, 0);
    const pile = k.mesh(null, k.own(new THREE.ConeGeometry(1.25, 0.95, 20).translate(0, 0.475, 0)), 'sand', 1.5, 0, 5.0);

    // Tipper truck, backing up to the pile and driving off again
    const truck = k.group(null, 5, 0, 5);
    k.box(truck, 'dark', 3.1, 0.22, 1.2, 0, 0.42, 0);
    const cabin = k.group(truck, 1.05, 0.64, 0);
    k.box(cabin, 'accent', 0.95, 1.05, 1.36);
    k.box(cabin, 'glassLit', 0.06, 0.45, 1.14, 0.48, 0.5, 0);
    const bed = k.group(truck, -1.5, 0.66, 0);
    k.box(bed, 'steel', 2.1, 0.14, 1.36, 1.05, 0, 0);
    [-0.64, 0.64].forEach(z => k.box(bed, 'steel', 2.1, 0.62, 0.08, 1.05, 0.14, z));
    k.box(bed, 'steel', 0.08, 0.62, 1.36, 2.06, 0.14, 0);
    const load = k.box(bed, 'sand', 1.9, 0.34, 1.16, 1.05, 0.14, 0);
    const wheels = [];
    [-1.05, -0.3, 1.05].forEach(x => [-0.56, 0.56].forEach(z => {
        const wheel = k.cyl(truck, 'rubber', 0.34, 0.24, x, 0.34, z - 0.12);
        wheel.rotation.x = Math.PI / 2;
        wheels.push(wheel);
    }));
    k.glow(truck, 1.6, 0.8, 0.45, 0.9, '#fff1c9');
    k.glow(truck, 1.6, 0.8, -0.45, 0.9, '#fff1c9');
    const truckKeys = [[0, 5.2], [2.4, 3.5], [5.4, 3.5], [7.5, 5.2], [8, 5.2]];
    const tipKeys = [[2.5, 0], [3.5, 0.62], [4.4, 0.62], [5.3, 0]];

    // Site office: the hub the equipment reports to
    const office = k.group(null, -2.6, 0, 6.5);
    k.box(office, 'dark', 4.3, 0.2, 2.3);
    k.box(office, 'wallAlt', 4.4, 2.3, 2.4, 0, 0.2, 0);
    k.box(office, 'accent', 4.42, 0.22, 2.42, 0, 2.06, 0);
    k.box(office, 'dark', 1.5, 0.95, 0.06, -0.9, 1.05, 1.2);
    k.box(office, 'glassLit', 1.38, 0.83, 0.08, -0.9, 1.11, 1.2);
    k.box(office, 'dark', 0.06, 1.85, 0.85, 2.2, 0.2, 0.2);
    k.box(office, 'white', 0.08, 1.75, 0.75, 2.2, 0.24, 0.2);
    k.box(office, 'glassLit', 0.1, 0.5, 0.42, 2.2, 1.3, 0.2);
    k.box(office, 'metal', 0.12, 0.05, 0.14, 2.2, 1.1, -0.08);
    k.box(office, 'steel', 0.75, 0.2, 1.1, 2.58, 0, 0.2);
    k.box(office, 'dark', 1, 0.95, 0.06, 1.15, 1.05, 1.2);
    k.box(office, 'glassLit', 0.88, 0.83, 0.08, 1.15, 1.11, 1.2);
    k.box(office, 'dark', 0.05, 0.83, 0.09, -0.9, 1.11, 1.2);
    k.box(office, 'metal', 0.9, 0.4, 0.7, 1.2, 2.5, -0.5);
    const ribs = [];
    for (let x = -2.1; x <= 2.11; x += 0.3) if (Math.abs(x + 0.9) > 0.85 && Math.abs(x - 1.15) > 0.6) ribs.push([x, 0.25, 1.21, x, 2.05, 1.21]);
    for (let z = -1.05; z <= 1.06; z += 0.3) if (Math.abs(z - 0.2) > 0.5) ribs.push([2.21, 0.25, z, 2.21, 2.05, z]);
    k.bars(office, 'metal', 0.035, ribs);
    k.bars(office, 'dark', 0.07, [[-1.8, 2.5, -0.8, -1.8, 4.4, -0.8], [-2.05, 3.9, -0.8, -1.55, 3.9, -0.8, 0.05]]);
    const dish = k.sphere(office, 'white', 0.34, -1.8, 3.35, -0.62);
    dish.scale.set(0.34, 0.34, 0.1);
    k.glow(office, -0.9, 1.5, 1.5, 2.4);
    k.pool(office, -0.9, 2.3, 1.9);
    const HUB = new THREE.Vector3(-2.6 - 1.8, 4.45, 6.5 - 0.8);
    k.sphere(null, k.basic('accent'), 0.11, HUB.x, HUB.y, HUB.z);

    // Data links: an arc from each source to the hub, with packets along it
    const linkMaterial = k.lineMaterial('accent', { transparent: true, opacity: 0.55 });
    const packetMaterial = k.basic('accent');
    const sources = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(-2.6, DECK + 1.7, -1.8 - 2.8)];
    const links = sources.map(source => ({
        source,
        line: polyline(k, null, linkMaterial, 24),
        packets: [0, 1].map(() => k.sphere(null, packetMaterial, 0.1))
    }));
    const curve = new THREE.QuadraticBezierCurve3();

    // The crew: a signaller at the laydown, two on the deck, a manager with a tablet
    const crew = { vest: true, hat: 'yellow' };
    const signaller = person(k, null, 5.3, 2.6, { ...crew, top: '#e8590c' });
    signaller.rotation.y = -2.2;
    const pourer = person(k, frame, 1.6, 2.2, { ...crew, skin: 2 });
    pourer.position.y = DECK;
    pourer.rotation.y = -2.4;
    pourer.userData.armL.rotation.x = pourer.userData.armR.rotation.x = -0.9;
    const finisher = person(k, frame, -1.4, 1.4, { ...crew, hat: 'white', skin: 1 });
    finisher.position.y = DECK;
    finisher.rotation.y = 0.9;
    const manager = person(k, null, 0.6, 7.3, { vest: true, hat: 'white', top: '#eef0f2', skin: 3 });
    manager.rotation.y = -1.9;
    manager.userData.armL.rotation.x = manager.userData.armR.rotation.x = -0.5;
    manager.userData.foreL.rotation.x = manager.userData.foreR.rotation.x = -1.1;
    k.box(manager, 'dark', 0.34, 0.02, 0.24, 0, 1.06, 0.36).rotation.x = -0.5;

    const hoistTag = k.label('Tower crane');
    const truckTag = k.label('Truck T-07');
    const hubTag = k.label('Site data hub').at(HUB.x, HUB.y + 0.2, HUB.z);
    const deckTag = k.label('Level 3 pour', '', 'mini');
    const hookWorld = new THREE.Vector3();

    return t => {
        const s = track(slewKeys, t);
        const hookY = track(hookKeys, t);
        const reach = lerp(from.reach, to.reach, s);
        upper.rotation.y = lerp(from.angle, to.angle, s);
        trolley.position.z = reach;
        cable.position.set(0, hookY - CRANE.top, reach);
        cable.scale.y = CRANE.top - 0.2 - hookY;
        hook.position.set(0, hookY - CRANE.top + 0.3, reach);
        // The skip is full on the way up and empty on the way back
        const carrying = t > 1 && t < 9;
        skip.material = k.mat(carrying ? 'concrete' : 'steel');

        const tt = t % 8;
        truck.position.x = track(truckKeys, tt);
        const tip = track(tipKeys, tt);
        bed.rotation.z = tip;
        load.scale.y = 0.34 * (1 - smooth(seg(tt, 3.2, 4.4))) + 0.001;
        load.visible = tt < 4.4 || tt > 7.6;
        const roll = truck.position.x / 0.34;
        wheels.forEach(wheel => { wheel.rotation.y = roll; });
        pile.scale.setScalar(1 + 0.05 * Math.sin((t / 8) * Math.PI * 2 - 1.2));

        k.local(trolley, hookWorld);
        sources[0].set(CRANE.x, CRANE.top + 2.3, CRANE.z);
        sources[1].set(truck.position.x + 1.05, 1.85, truck.position.z);
        links.forEach((link, n) => {
            curve.v0.copy(link.source);
            curve.v2.copy(HUB);
            curve.v1.copy(link.source).lerp(HUB, 0.5).setY(Math.max(link.source.y, HUB.y) + 2.2);
            const position = link.line.geometry.attributes.position;
            for (let i = 0; i < 24; i++) {
                curve.getPoint(i / 23, v0);
                position.setXYZ(i, v0.x, v0.y, v0.z);
            }
            position.needsUpdate = true;
            link.packets.forEach((packet, m) => curve.getPoint((t / 1.6 + m / 2 + n * 0.3) % 1, packet.position));
        });

        // The signaller guides the skip off the ground and back onto it
        signaller.userData.armR.rotation.x = t < 3.4 || t > 13.6 ? -2.5 + 0.3 * Math.sin(t * 5) : -0.1;

        const tonnes = carrying ? 2.4 : 0.6;
        hoistTag.set('Tower crane', `Load ${tonnes.toFixed(1)} t · hook ${(hookY - 1.95).toFixed(1)} m`)
            .at(hookWorld.x, hookWorld.y + 1.1, hookWorld.z).show(1);
        truckTag.set('Truck T-07', tt < 2.4 ? 'Reversing to stockpile' : tt < 5.4 ? 'Unloading · 8 m³ sand' : 'Leaving site')
            .at(truck.position.x + 0.4, 2.1, truck.position.z).show(1);
        hubTag.set('Site data hub', `3 live feeds · wind ${(4.2 + 0.7 * Math.sin((t / 16) * Math.PI * 2)).toFixed(1)} m/s`).show(1);
        const pouring = seg(t, 8.2, 9.6);
        deckTag.set(`Level 3 pour · ${(61.5 + pouring * 1.5).toFixed(1)} %`).at(-2.6 + 2.8, DECK + 2.2, -1.8 + 2.8).show(pulse(t, 7.6, 11.2));
    };
}

// ---- 3. Extended Reality ----------------------------------------------------------

function xr(k) {
    // The same building twice: as built (clipped on one side of the scan
    // plane) and as a hologram (clipped on the other)
    const keepSolid = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const keepHolo = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const variants = {};
    const solid = name => variants[name] || (variants[name] = k.mat(name, { clippingPlanes: [keepSolid], clipShadows: true }));
    const b = building(k, { nx: 3, nz: 2, storeys: 2, plant: 'solar', x: -0.9, z: -1.2, mat: solid });
    const X0 = -0.9 - b.W / 2 - 0.9, X1 = -0.9 + b.W / 2 + 0.9;

    const holoLines = k.lines(null, k.lineMaterial('accent', { clippingPlanes: [keepHolo], transparent: true, opacity: 0.95 }, { glow: true }), boxEdges(k, b.group));
    const holoFaces = new THREE.Mesh(boxShell(k, b.group), k.basic('accent', {
        clippingPlanes: [keepHolo], transparent: true, opacity: 0.1, depthWrite: false
    }, { o: [0.09, 0.13], glow: true }));
    k.root.add(holoFaces);

    // The scan plane
    const sheet = k.group(null, 0, 0, -1.2);
    const sheetMaterial = k.basic('accent', { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const SH = b.top + 1.6, SD = b.D + 2.6;
    const sheetMesh = new THREE.Mesh(k.own(new THREE.PlaneGeometry(SD, SH).rotateY(Math.PI / 2).translate(0, SH / 2, 0)), sheetMaterial);
    sheet.add(sheetMesh);
    const sheetEdge = k.lines(sheet, k.lineMaterial('accent', { transparent: true }, { glow: true }), [
        0, 0, -SD / 2, 0, 0, SD / 2, 0, 0, SD / 2, 0, SH, SD / 2, 0, SH, SD / 2, 0, SH, -SD / 2, 0, SH, -SD / 2, 0, 0, -SD / 2
    ]);

    tree(k, null, -6.3, 3.4, 1.05);

    // The reviewer: a headset, and a controller pointing into the model
    const viewer = person(k, null, 2.6, 4.6, { top: 'accent', hair: 1, headset: true, sleeves: 'short' });
    viewer.rotation.y = Math.PI + 0.35;
    const pose = viewer.userData;
    pose.armR.rotation.x = -1.6;
    pose.foreR.rotation.x = -0.12;
    pose.armL.rotation.x = -0.3;
    pose.foreL.rotation.x = -1;
    pose.legL.rotation.x = -0.14;
    pose.legR.rotation.x = 0.12;
    [pose.foreL, pose.foreR].forEach(hand => k.box(hand, 'white', 0.07, 0.07, 0.17, 0, -0.38, 0.05));
    const HAND = new THREE.Vector3(0, -0.35, 0.16);
    k.root.updateMatrixWorld(true);
    pose.foreR.localToWorld(HAND);
    const colleague = person(k, null, 3.75, 4.9, { top: '#eef0f2', legs: '#39445a', skin: 1, hair: 2 });
    colleague.rotation.y = Math.PI + 0.75;
    colleague.userData.armL.rotation.x = colleague.userData.armR.rotation.x = -0.5;
    colleague.userData.foreL.rotation.x = colleague.userData.foreR.rotation.x = -1.1;
    k.box(colleague, 'dark', 0.34, 0.02, 0.24, 0, 1.06, 0.36).rotation.x = -0.5;

    // Overlays: a selected wall, a dimension, an issue pin
    const signalLine = k.lineMaterial('signal', { transparent: true });
    const wall = b.storeys[0].walls[b.storeys[0].walls.length - 2];
    const WALL = wall.getWorldPosition(new THREE.Vector3());
    const pick = k.group(null, WALL.x, WALL.y, WALL.z + 0.06);
    const pickEdges = new THREE.LineSegments(k.GEO.edges, signalLine);
    pickEdges.scale.set(3, 2.7, 0.34);
    pickEdges.position.z = -0.17;
    const pickFace = new THREE.Mesh(k.GEO.box, k.basic('signal', { transparent: true, opacity: 0.22, depthWrite: false }));
    pickFace.scale.set(3, 2.7, 0.3);
    pickFace.position.z = -0.15;
    pick.add(pickEdges, pickFace);
    WALL.y += 1.35;

    const DIM_Y = b.top + 1.05, DIM_Z = -1.2 + b.D / 2;
    const DX0 = -0.9 - b.W / 2, DX1 = -0.9 + b.W / 2;
    const dimension = k.lines(null, signalLine, [
        DX0, DIM_Y, DIM_Z, DX1, DIM_Y, DIM_Z,
        DX0, DIM_Y - 0.3, DIM_Z, DX0, DIM_Y + 0.3, DIM_Z, DX1, DIM_Y - 0.3, DIM_Z, DX1, DIM_Y + 0.3, DIM_Z,
        DX0, b.top + 0.55, DIM_Z, DX0, DIM_Y - 0.3, DIM_Z, DX1, b.top + 0.55, DIM_Z, DX1, DIM_Y - 0.3, DIM_Z
    ]);

    const PIN = new THREE.Vector3(-0.9 + 2.6, b.top + 1.5, -1.2 - 1.2);
    const pin = k.group(null, PIN.x, PIN.y, PIN.z);
    const pinMaterial = k.basic('signal');
    k.mesh(pin, k.own(new THREE.ConeGeometry(0.2, 0.55, 14).rotateX(Math.PI).translate(0, 0.28, 0)), pinMaterial);
    k.sphere(pin, pinMaterial, 0.27, 0, 0.75, 0);
    k.glow(pin, 0, 0.7, 0, 1.6, 'signal', 0.7);

    const ray = polyline(k, null, signalLine, 2);
    const rayEnd = new THREE.Vector3();

    const modeTag = k.label('', '', 'mini').at(-3.4, 0.2, 5);
    const wallTag = k.label('IfcWall · W-204', 'Fire rating 2 h · U 0.24').at(WALL.x, WALL.y + 1.4, WALL.z);
    const dimTag = k.label('9.00 m', '', 'mini').at(-0.9, DIM_Y + 0.45, DIM_Z);
    const pinTag = k.label('Issue #12', 'Duct clashes with beam').at(PIN.x, PIN.y + 1.05, PIN.z).tone('signal');

    return t => {
        // 0 as built, 1 hologram
        const holo = track([[1.4, 0], [4.4, 1], [10, 1], [13, 0]], t, smooth);
        const x = lerp(X0, X1, holo);
        keepSolid.constant = -x;
        keepHolo.constant = x;
        sheet.position.x = x;
        const scanning = Math.max(pulse(t, 1.3, 4.5, 0.25), pulse(t, 9.9, 13.1, 0.25));
        sheet.visible = scanning > 0.01;
        sheetMaterial.opacity = 0.14 * scanning;
        sheetEdge.material.opacity = scanning;
        holoLines.visible = holoFaces.visible = holo > 0.001;

        const picking = pulse(t, 5, 7.3, 0.25);
        const measuring = pulse(t, 5.6, 9.6, 0.25);
        const flagging = pulse(t, 7.5, 9.7, 0.25);
        pick.visible = picking > 0.01;
        pickFace.material.opacity = 0.22 * picking;
        dimension.visible = measuring > 0.01;
        pin.visible = flagging > 0.01;
        pin.position.y = PIN.y + 0.12 * Math.sin(t * 3.2);
        pin.scale.setScalar(easeOut(flagging));
        signalLine.opacity = Math.max(picking, measuring, flagging);

        const pointing = pulse(t, 4.9, 9.7, 0.25);
        ray.visible = pointing > 0.01;
        rayEnd.copy(WALL).lerp(PIN, smooth(seg(t, 7.2, 7.6)));
        rayEnd.y += seg(t, 7.2, 7.6) * 0.5;
        const position = ray.geometry.attributes.position;
        position.setXYZ(0, HAND.x, HAND.y, HAND.z);
        position.setXYZ(1, rayEnd.x, rayEnd.y, rayEnd.z);
        position.needsUpdate = true;

        modeTag.set(holo < 0.5 ? 'Physical building' : 'Holographic model · 1:1').show(1);
        wallTag.show(picking);
        dimTag.show(measuring);
        pinTag.at(PIN.x, pin.position.y + 1.05, PIN.z).show(flagging);
    };
}

// ---- 4. Construction Robotics ---------------------------------------------------

function robotics(k) {
    const FLOOR = 0.12;
    k.box(null, 'paving', 11, FLOOR, 8.4, 0, 0, 0.3);
    const BLOCK = { w: 0.98, h: 0.48, d: 0.5 }, COURSE = 0.5, WALL_Z = 2.3;

    // The wall so far: two courses in running bond; the third is the task
    for (let i = 0; i < 5; i++) k.box(null, i % 2 ? 'wall' : 'coping', BLOCK.w, BLOCK.h, BLOCK.d, -1.5 + i, FLOOR, WALL_Z);
    for (let i = 0; i < 4; i++) k.box(null, i % 2 ? 'coping' : 'wall', BLOCK.w, BLOCK.h, BLOCK.d, -1 + i, FLOOR + COURSE, WALL_Z);
    const targets = [0, 1, 2].map(i => new THREE.Vector3(-0.5 + i, FLOOR + 2 * COURSE, WALL_Z));

    // Pallet of blocks: a fixed lower layer, and the three the robot takes
    const PALLET = { x: -3.6, z: 0.4 };
    k.box(null, 'timber', 1.3, 0.14, 2.3, PALLET.x, FLOOR, PALLET.z);
    const picks = [0, 1, 2].map(i => new THREE.Vector3(PALLET.x, FLOOR + 0.14 + COURSE, PALLET.z + (i - 1) * 0.72));
    picks.forEach(p => k.box(null, 'wall', BLOCK.w, BLOCK.h, BLOCK.d, p.x, p.y - COURSE, p.z));

    // Six-axis arm: turret, upper arm, forearm, a wrist that keeps the gripper level
    const BASE = new THREE.Vector3(0, FLOOR, -1.2);
    const SHOULDER = 1.3, L1 = 2.5, L2 = 2.3, TOOL = 0.6;
    const base = k.group(null, BASE.x, BASE.y, BASE.z);
    k.box(base, 'steel', 1.5, 0.3, 1.5);
    k.cyl(base, 'dark', 0.6, 0.35, 0, 0.3, 0);
    const turret = k.group(base, 0, 0.65, 0);
    k.cyl(turret, 'accent', 0.5, 0.3);
    k.box(turret, 'accent', 0.62, 0.8, 0.7, 0, 0.2, -0.05);
    const joint = (parent, r, w) => {
        const c = k.cyl(parent, 'dark', r, w, w / 2, 0, 0);
        c.rotation.z = Math.PI / 2;
    };
    const upper = k.group(turret, 0, SHOULDER - 0.65, 0);
    joint(upper, 0.36, 0.9);
    k.box(upper, 'accent', 0.4, 0.46, L1, 0, -0.23, L1 / 2);
    const fore = k.group(upper, 0, 0, L1);
    joint(fore, 0.3, 0.72);
    k.box(fore, 'accent', 0.3, 0.34, L2, 0, -0.17, L2 / 2);
    const wrist = k.group(fore, 0, 0, L2);
    joint(wrist, 0.22, 0.5);
    k.cyl(wrist, 'dark', 0.1, TOOL - 0.13, 0, -TOOL + 0.13, 0);
    const gripper = k.group(wrist, 0, -TOOL, 0);
    k.box(gripper, 'dark', 0.9, 0.08, 0.4, 0, 0.05, 0);
    [-0.3, 0.3].forEach(x => k.cyl(gripper, 'rubber', 0.1, 0.05, x, 0, 0));

    /** Pose the arm so that the gripper touches a point from above. */
    const reach = tip => {
        const wx = tip.x - BASE.x, wz = tip.z - BASE.z, wy = tip.y + TOOL - (FLOOR + SHOULDER);
        const yaw = Math.atan2(wx, wz), d = Math.hypot(wx, wz);
        const d2 = Math.min(d * d + wy * wy, (L1 + L2 - 0.02) ** 2);
        const elbow = Math.acos(Math.max(-1, Math.min(1, (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
        const shoulder = Math.atan2(wy, d) + Math.atan2(L2 * Math.sin(elbow), L1 + L2 * Math.cos(elbow));
        turret.rotation.y = yaw;
        upper.rotation.x = -shoulder;
        fore.rotation.x = elbow;
        wrist.rotation.x = shoulder - elbow;
        gripper.rotation.y = -yaw;
    };

    // The task: three pick-and-place cycles, then everything returns
    const HOME = new THREE.Vector3(0.2, 3.3, 1.3), CYCLE = 4, RESET = 13.3;
    const above = (v, h) => v.clone().setY(v.y + h);
    const keys = [[0, HOME]];
    const blocks = picks.map((pick, i) => {
        const t0 = 0.2 + i * CYCLE;
        const a = above(pick, BLOCK.h), b = above(targets[i], BLOCK.h);
        keys.push([t0 + 0.8, above(a, 1.1)], [t0 + 1.2, a], [t0 + 1.45, a], [t0 + 1.9, above(a, 1.1)],
            [t0 + 2.9, above(b, 1.1)], [t0 + 3.5, b], [t0 + 3.75, b], [t0 + 4, above(b, 0.8)]);
        return {
            mesh: k.box(null, 'wall', BLOCK.w, BLOCK.h, BLOCK.d), pick, target: targets[i],
            t0, grip: t0 + 1.3, release: t0 + 3.6
        };
    });
    keys.push([13.2, HOME]);

    // Where the next block goes: outlined until it is placed, then confirmed
    const guideMaterial = k.lineMaterial('signal', { transparent: true });
    const doneMaterial = k.lineMaterial('ok', { transparent: true });
    const guide = new THREE.LineSegments(k.GEO.edges, guideMaterial);
    guide.scale.set(1.04, 0.52, 0.56);
    k.root.add(guide);

    // Around the cell: controller, fence, a work light
    const cabinet = k.group(null, 3.9, FLOOR, -2.6);
    k.box(cabinet, 'wallAlt', 1, 1.5, 0.6);
    k.box(cabinet, 'dark', 0.6, 0.4, 0.04, 0, 0.9, 0.31);
    k.box(cabinet, 'glassLit', 0.5, 0.3, 0.05, 0, 0.95, 0.31);
    const operator = person(k, null, 3.2, -1.5, { vest: true, hat: 'white', top: '#3d5a80', skin: 1 });
    operator.position.y = FLOOR;
    operator.rotation.y = 2.5;
    operator.userData.armL.rotation.x = operator.userData.armR.rotation.x = -0.5;
    operator.userData.foreL.rotation.x = operator.userData.foreR.rotation.x = -1.1;
    k.box(operator, 'dark', 0.34, 0.02, 0.24, 0, 1.06, 0.36).rotation.x = -0.5;
    k.sphere(cabinet, k.basic('ok'), 0.09, 0.3, 1.6, 0.1);
    k.glow(cabinet, 0.3, 1.6, 0.1, 1.1, 'ok', 0.7);
    const fence = [];
    for (let x = -5.2; x <= 5.21; x += 1.3) fence.push([x, FLOOR, -3.7, x, FLOOR + 1.2, -3.7]);
    for (let z = -3.7; z <= 0.21; z += 1.3) fence.push([-5.2, FLOOR, z, -5.2, FLOOR + 1.2, z]);
    [0.55, 1.15].forEach(h => fence.push([-5.2, FLOOR + h, -3.7, 5.2, FLOOR + h, -3.7], [-5.2, FLOOR + h, -3.7, -5.2, FLOOR + h, 0.2]));
    k.bars(null, 'yellow', 0.07, fence);
    const light = k.group(null, -4.6, FLOOR, -3.1);
    k.box(light, 'dark', 0.5, 0.1, 0.5);
    k.box(light, 'dark', 0.09, 3.4, 0.09);
    k.box(light, 'metal', 0.6, 0.3, 0.2, 0.15, 3.3, 0.1).rotation.y = 0.7;
    k.glow(light, 0.2, 3.4, 0.15, 2.6, '#fff1c9');
    k.pool(null, 1.2, 2.2, 4.2, '#fff1c9', 0.35).position.y = FLOOR + 0.02;

    const placeTag = k.label();
    const taskTag = k.label('Robot controller').at(3.9, FLOOR + 1.75, -2.6);
    const tip = new THREE.Vector3();

    return t => {
        // Position of the gripper along the keyed path
        let n = 1;
        while (n < keys.length - 1 && keys[n][0] < t) n++;
        tip.lerpVectors(keys[n - 1][1], keys[n][1], easeInOut(seg(t, keys[n - 1][0], keys[n][0])));
        reach(tip);

        blocks.forEach((block, i) => {
            const { mesh } = block;
            if (t < block.grip) mesh.position.copy(block.pick);
            else if (t < block.release) mesh.position.set(tip.x, tip.y - BLOCK.h, tip.z);
            else {
                const q = easeInOut(seg(t, RESET + i * 0.2, RESET + 1 + i * 0.2));
                mesh.position.lerpVectors(block.target, block.pick, q);
                mesh.position.y += Math.sin(q * Math.PI) * 1.7;
            }
        });

        const i = Math.min(2, Math.max(0, Math.floor((t - 0.2) / CYCLE)));
        const block = blocks[i];
        const u = t - block.t0;
        const placed = t >= block.release;
        guide.visible = t < RESET && u > 0.2 && u < 4.6;
        guide.position.copy(block.target);
        guide.position.y -= 0.02;
        guide.material = placed ? doneMaterial : guideMaterial;
        guide.material.opacity = placed ? 1 - seg(u, 4.1, 4.6) : 0.55 + 0.45 * Math.sin(t * 7);

        const offset = lerp(42, 0.4, easeOut(seg(u, 2.9, 3.5)));
        placeTag.at(block.target.x, block.target.y + (placed ? 0.6 : 1.9), block.target.z)
            .set(placed ? `Block B-0${i + 1} placed` : `Placing block B-0${i + 1}`, placed ? 'Within ± 0.5 mm of model' : `Offset ${offset.toFixed(1)} mm`)
            .tone(placed ? 'ok' : 'signal')
            .show(t < RESET ? pulse(u, 2.7, 4.7, 0.2) : 0);
        const step = t >= 12.2 ? 'Course complete · homing' : u < 1.3 ? 'Picking from pallet' : u < 2.9 ? 'Transferring' : u < 3.6 ? 'Fine positioning' : 'Verifying placement';
        taskTag.set('Robot controller', `Task ${i + 1} of 3 · ${step}`).show(1);
    };
}

// ---- 5. Design for Manufacturing and Assembly ----------------------------------

/**
 * A mobile crane arrives by road, pulls onto the hardstanding and sets up
 * (outriggers out, jacks down, boom up); a truck delivers three factory-built
 * modules; the crane lifts them from the trailer onto the concrete pad; then
 * both drive away. Modelled at full size, shown at SCENES.dfma.scale.
 */
function dfma(k) {
    const SITE_X = -0.9, SITE_Z = -2.3;
    const site = k.group(null, SITE_X, 0, SITE_Z);
    const E = k.edge;                                    // what comes by road fades in at the edge of the stage
    const M = { l: 3.2, h: 2.7, d: 2.6 };                // a module: length (x), height, depth (z)
    const ROAD = 5.6, STRIP = 1, PAD = -3.6, PAD_TOP = 0.3, DECK = 1.25, RIG = 1.1;

    // ---- Ground: the road, the hardstanding beside it, the concrete pad
    k.box(site, E('asphalt'), 36, 0.06, 3.8, 0, 0, ROAD);
    [ROAD - 1.98, ROAD + 1.98].forEach(z => k.box(site, E('paving'), 36, 0.11, 0.16, 0, 0, z));
    for (let x = -16.8; x < 17; x += 2.4) k.box(site, E('white'), 1.2, 0.012, 0.12, x, 0.06, ROAD);
    k.box(site, E('gravel'), 22, 0.04, 5.2, 0, 0, STRIP - 0.05);
    k.box(site, 'wallAlt', 7.9, PAD_TOP, 3.9, 0, 0, PAD);
    k.box(site, 'concrete', 8.5, 0.12, 4.5, 0, 0, PAD);
    const fence = [];
    for (let x = -5; x <= 5.01; x += 2.5) fence.push([x, 0, PAD - 2.6, x, 1.9, PAD - 2.6]);
    [0.25, 1.05, 1.85].forEach(y => fence.push([-5, y, PAD - 2.6, 5, y, PAD - 2.6, 0.04]));
    for (let x = -4.5; x <= 4.51; x += 0.5) fence.push([x, 0.25, PAD - 2.6, x, 1.85, PAD - 2.6, 0.02]);
    k.bars(site, 'steel', 0.07, fence);
    k.box(site, 'white', 1.6, 0.9, 0.04, -3.4, 0.75, PAD - 2.56);
    k.box(site, 'accent', 1.6, 0.22, 0.05, -3.4, 1.43, PAD - 2.56);

    const wheel = (parent, x, z, r, w, alongX) => {
        const tyre = k.cyl(parent, E('rubber'), r, w, alongX ? x : x + w / 2, r, alongX ? z - w / 2 : z);
        const hub = k.cyl(parent, E('metal'), r * 0.48, w + 0.03, alongX ? x : x + w / 2 + 0.015, r, alongX ? z - w / 2 - 0.015 : z);
        tyre.rotation[alongX ? 'x' : 'z'] = hub.rotation[alongX ? 'x' : 'z'] = Math.PI / 2;
    };

    // ---- The modules: steel frame, clad walls, a framed window, and an end that differs
    const makeModule = type => {
        const g = k.group(site);
        const { l, h, d } = M, fz = d / 2 - 0.04, ex = l / 2 - 0.04;
        k.box(g, E('steel'), l, 0.2, d);
        k.box(g, E('wall'), l - 0.1, h - 0.4, d - 0.1, 0, 0.2, 0);
        k.box(g, E('roof'), l, 0.2, d, 0, h - 0.2, 0);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
            k.box(g, E('dark'), 0.16, h, 0.16, sx * (l / 2 - 0.08), 0, sz * (d / 2 - 0.08));
            k.box(g, E('yellow'), 0.2, 0.09, 0.2, sx * (l / 2 - 0.1), h, sz * (d / 2 - 0.1));
        });
        k.box(g, E('accent'), l - 0.34, 0.2, 0.05, 0, 0, d / 2 - 0.01);
        k.box(g, E('timber'), 0.8, h - 0.5, 0.05, l / 2 - 0.62, 0.25, fz);
        k.box(g, E('dark'), 1.5, 1.3, 0.08, -0.45, 0.95, fz);
        [-1, 1].forEach((side, n) => k.box(g, E((type + n) % 3 ? 'glassLit' : 'glass'), 0.66, 1.18, 0.1, -0.45 + side * 0.355, 1.01, fz));
        k.box(g, E('coping'), 1.7, 0.06, 0.16, -0.45, 0.89, fz + 0.03);
        if (type === 0) {
            // The entrance: a door with a light and a handle, a window, a canopy; a roof terrace above
            k.box(g, E('dark'), 0.08, 2.15, 1.02, ex, 0.2, 0.55);
            k.box(g, E('accent'), 0.1, 2.03, 0.9, ex, 0.24, 0.55);
            k.box(g, E('glassLit'), 0.12, 0.6, 0.5, ex, 1.45, 0.55);
            k.box(g, E('metal'), 0.14, 0.05, 0.16, ex, 1.15, 0.2);
            k.box(g, E('dark'), 0.08, 1.2, 0.9, ex, 1, -0.6);
            k.box(g, E('glass'), 0.1, 1.08, 0.78, ex, 1.06, -0.6);
            k.box(g, E('coping'), 0.75, 0.06, 1.3, l / 2 + 0.33, 2.42, 0.55);
            k.box(g, E('timber'), l - 0.3, 0.04, d - 0.3, 0, h, 0);
            const rail = [], x0 = -l / 2 + 0.1, x1 = l / 2 - 0.1, z0 = -d / 2 + 0.1, z1 = d / 2 - 0.1;
            [[x0, z1, x1, z1], [x1, z1, x1, z0], [x1, z0, x0, z0]].forEach(([ax, az, bx, bz]) => {
                rail.push([ax, h + 1, az, bx, h + 1, bz], [ax, h + 0.5, az, bx, h + 0.5, bz, 0.03]);
                for (let n = 0; n <= 4; n++) rail.push([lerp(ax, bx, n / 4), h, lerp(az, bz, n / 4), lerp(ax, bx, n / 4), h + 1, lerp(az, bz, n / 4), 0.04]);
            });
            k.bars(g, E('dark'), 0.05, rail);
        } else if (type === 2) {
            // The upper module: glazed doors onto the terrace, a roof that oversails
            k.box(g, E('dark'), 0.08, 2.15, 1.7, ex, 0.2, 0);
            [-0.42, 0.42].forEach(z => k.box(g, E('glassLit'), 0.1, 2.03, 0.76, ex, 0.26, z));
            k.box(g, E('coping'), l + 0.3, 0.1, d + 0.3, 0.05, h, 0.05);
        }
        return g;
    };

    // ---- The delivery truck: a tractor unit and a flatbed trailer, along x
    const truck = k.group(site, 0, 0, ROAD);
    k.box(truck, E('dark'), 11, 0.22, 2.5, -0.2, DECK - 0.22, 0);
    k.box(truck, E('steel'), 9.4, 0.3, 1.1, -0.6, DECK - 0.52, 0);
    [-4.9, -3.75, -2.6].forEach(x => [-1.02, 1.02].forEach(z => wheel(truck, x, z, 0.46, 0.36, true)));
    k.box(truck, E('dark'), 4.4, 0.34, 1.1, 6.3, 0.52, 0);
    k.box(truck, E('white'), 2, 2.3, 2.4, 7.5, 0.75, 0);
    k.box(truck, E('accent'), 2.02, 0.24, 2.42, 7.5, 1.3, 0);
    k.box(truck, E('white'), 1.3, 0.38, 2.2, 7.15, 3.05, 0);
    k.box(truck, E('glassLit'), 0.06, 0.85, 2.1, 8.5, 1.95, 0);
    k.box(truck, E('glass'), 0.9, 0.7, 0.06, 7.75, 1.95, 1.2);
    k.box(truck, E('dark'), 0.12, 0.7, 2.4, 8.52, 0.5, 0);
    k.cyl(truck, E('metal'), 0.08, 2.6, 6.35, 0.8, -1.05);
    [7.75, 5.55, 4.5].forEach(x => [-1.02, 1.02].forEach(z => wheel(truck, x, z, 0.46, 0.36, true)));
    const truckLamps = [-0.85, 0.85].map(z => k.glow(truck, 8.65, 0.95, z, 1.2, '#fff1c9'));

    const slots = [0, -3.4, 3.4];                        // along the trailer, in the order they are lifted
    const final = [[1.63, 0], [-1.63, 0], [-1.63, 1]].map(([x, level]) => new THREE.Vector3(x, PAD_TOP + level * M.h, PAD));

    // ---- The mobile crane, facing +z: carrier, outriggers, slewing superstructure, telescopic boom
    const crane = k.group(site);
    const Y = 'yellow';
    k.box(crane, E(Y), 2.5, 0.7, 8.6, 0, 0.75, 0.6);
    k.box(crane, E('dark'), 2.3, 0.08, 5.2, 0, 1.45, -0.7);
    k.box(crane, E(Y), 2.4, 1.2, 1.5, 0, 0.95, 4.25);
    k.box(crane, E('glassLit'), 2.2, 0.6, 0.06, 0, 1.45, 5);
    [-1.2, 1.2].forEach(x => k.box(crane, E('glass'), 0.06, 0.55, 1, x, 1.5, 4.3));
    k.box(crane, E('dark'), 2.5, 0.35, 0.2, 0, 0.5, 5);
    [3.6, 2.2, -1.4, -2.75].forEach(z => [-1.25, 0.8].forEach(x => wheel(crane, x, z, 0.55, 0.45, false)));
    const craneLamps = [-0.85, 0.85].map(x => k.glow(crane, x, 0.9, 5.2, 1.2, '#fff1c9'));
    const BEAM = 1.3, JACK_TOP = 0.68;
    const outriggers = [];
    [0.5, -3.55].forEach(z => {
        k.box(crane, E('dark'), 2.5, 0.4, 0.5, 0, 0.5, z);
        [-1, 1].forEach(side => outriggers.push({
            side, z,
            beam: k.box(crane, E(Y), 1, 0.24, 0.3, 0, JACK_TOP, z),
            jack: k.cyl(crane, E('metal'), 0.09, 1, 0, 0, z),
            foot: k.box(crane, E('dark'), 0.7, 0.08, 0.7, 0, 0, z),
            // Parked, the crane faces +x: its right is the site's -z
            mat: k.box(site, 'timber', 1.05, 0.07, 1.05, z, 0.04, STRIP - side * (1.25 + BEAM))
        }));
    });

    const upper = k.group(crane, 0, 1.53, 0);
    k.cyl(upper, E('dark'), 1, 0.2, 0, -0.06, 0);
    k.box(upper, E(Y), 2.3, 0.45, 4.3, 0, 0.14, -0.95);
    k.box(upper, E('dark'), 2.5, 1, 1, 0, 0.14, -2.9);
    k.box(upper, E(Y), 0.9, 0.8, 1.9, 0.8, 0.59, -1.3);
    k.box(upper, E('white'), 0.95, 1.3, 1.5, -0.8, 0.59, 0.7);
    k.box(upper, E('glassLit'), 0.85, 0.75, 0.06, -0.8, 1.05, 1.45);
    k.box(upper, E('glass'), 0.06, 0.75, 1.2, -1.28, 1.05, 0.7);
    k.box(upper, E('dark'), 0.9, 0.9, 0.5, 0, 0.59, -1);
    const PIVOT = { y: 1.3, back: 1, height: 1.53 + 1.3 }, BASE_LENGTH = 6;
    const boom = k.group(upper, 0, PIVOT.y, -PIVOT.back);
    k.box(boom, E(Y), 0.62, 0.62, BASE_LENGTH, 0, -0.31, BASE_LENGTH / 2);
    const boomMid = k.box(boom, E(Y), 0.48, 0.48, 5.6, 0, -0.24, 0);
    const boomTip = k.box(boom, E(Y), 0.36, 0.36, 5.2, 0, -0.18, 0);
    const boomHead = k.box(boom, E('dark'), 0.5, 0.56, 0.4, 0, -0.28, 0);
    const hoistPoint = new THREE.Object3D();
    boom.add(hoistPoint);
    const ram = k.box(upper, E('metal'), 0.2, 0.2, 1);

    const cable = k.box(site, E('rubber'), 0.05, 1, 0.05);
    const hook = k.group(site);
    k.box(hook, E(Y), 0.42, 0.5, 0.32, 0, 0, 0);
    const rig = k.group(hook);
    const rx = M.l / 2 - 0.1, rz = M.d / 2 - 0.1, slings = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], n, corners) => {
        const [nx2, nz2] = corners[(n + 1) % 4];
        slings.push([0, 0, 0, sx * rx, -0.7, sz * rz, 0.03], [sx * rx, -0.7, sz * rz, sx * rx, -RIG, sz * rz, 0.03]);
        slings.push([sx * rx, -0.7, sz * rz, nx2 * rx, -0.7, nz2 * rz, 0.1]);
    });
    k.bars(rig, E(Y), 0.1, slings);

    // ---- Site crew: a banksman who signals the lifts, and one who guides the module in
    const banksman = person(k, site, 5.1, -1, { vest: true, hat: 'yellow', top: '#3d5a80' });
    banksman.rotation.y = -1.9;
    const guide = person(k, site, 4.55, -3.3, { vest: true, hat: 'white', top: '#e8590c', skin: 2 });
    guide.rotation.y = -Math.PI / 2;
    const driver = person(k, site, -5.4, -1.1, { top: '#5a6b85', skin: 1, hair: 1 });
    driver.rotation.y = 1.2;

    // ---- The plan
    const IN = [0.2, 4], OUT = [21.6, 25.4], TRUCK_IN = [3.6, 7], TRUCK_OUT = [19, 22.4];
    const SETUP = 6, FIRST = 7.6, CYCLE = 3.6, STOW = 18.4, CLEAR = 26.4;
    const wayIn = route([[-17.5, ROAD], [-8.5, ROAD], [-4, STRIP], [0, STRIP]], 2.6);
    const wayOut = route([[0, STRIP], [4, STRIP], [8.5, ROAD], [19, ROAD]], 2.6);
    const CARRY = 3.5 + M.h + RIG, TIP = 9, REST = 0.36;
    // Where the boom points, as [time, slew, radius, height of its head]
    const polar = (x, z) => [Math.atan2(STRIP - z, x), Math.hypot(x, z - STRIP)];
    const travel = [0, 5.2, PIVOT.height + REST];
    const boomKeys = [[0, ...travel], [SETUP, ...travel]];
    const hookKeys = [[0, TIP]];
    const modules = slots.map((slot, i) => {
        const b = FIRST + i * CYCLE, to = final[i];
        const pick = polar(slot, ROAD), place = polar(to.x, to.z);
        boomKeys.push([b + (i ? 0.9 : 0), ...pick, TIP], [b + 1.7, ...pick, TIP], [b + 2.7, ...place, TIP], [b + CYCLE, ...place, TIP]);
        hookKeys.push([b + 0.8, CARRY], [b + 1.2, DECK + M.h + RIG], [b + 1.3, DECK + M.h + RIG], [b + 1.75, CARRY],
            [b + 2.7, CARRY], [b + 3.25, to.y + M.h + RIG], [b + 3.38, to.y + M.h + RIG], [b + CYCLE, CARRY]);
        const joints = k.group(site, to.x, to.y, to.z);
        const jointMaterial = k.basic('signal');
        [[-1, 1], [1, 1], [1, -1]].forEach(([sx, sz]) => k.box(joints, jointMaterial, 0.26, 0.26, 0.26, sx * M.l / 2, -0.13, sz * M.d / 2));
        return { group: makeModule(i), slot, to, b, latch: b + 1.22, release: b + 3.32, joints, radius: pick[1] };
    });
    boomKeys.push([STOW, ...boomKeys[boomKeys.length - 1].slice(1)], [STOW + 1.6, ...travel]);
    hookKeys.push([STOW, CARRY], [STOW + 0.8, TIP]);
    const keyed = (keys, t, n) => {
        let i = 1;
        while (i < keys.length - 1 && keys[i][0] < t) i++;
        return lerp(keys[i - 1][n], keys[i][n], easeInOut(seg(t, keys[i - 1][0], keys[i][0])));
    };

    const craneTag = k.label('Mobile crane');
    const liftTag = k.label();
    const doneTag = k.label('Assembly complete', '3 modules · 11 minutes of crane time').at(SITE_X, PAD_TOP + 2 * M.h + 1.3, PAD + SITE_Z).tone('ok');
    const roadTag = k.label('Delivered by road', '', 'mini');
    const padTag = k.label('Concrete pad', '', 'mini').at(SITE_X, PAD_TOP + 0.1, PAD + SITE_Z);
    const spot = new THREE.Vector3(), ahead = new THREE.Vector3(), tip = new THREE.Vector3();
    const steer = (path, s) => {
        path.at(s - 1.6, spot);
        path.at(s + 1.6, ahead);
        crane.rotation.y = Math.atan2(ahead.x - spot.x, ahead.z - spot.z);
        path.at(s, spot);
        crane.position.set(spot.x, 0, spot.z);
    };

    return t => {
        // The crane: in by road, parked on its outriggers, out by road
        if (t < IN[1]) steer(wayIn, wayIn.length * (1 - Math.pow(1 - seg(t, IN[0], IN[1]), 2)));
        else if (t < OUT[0]) {
            crane.position.set(0, 0, STRIP);
            crane.rotation.y = Math.PI / 2;
        } else steer(wayOut, wayOut.length * Math.pow(seg(t, OUT[0], OUT[1]), 2));

        const reach = smooth(seg(t, 4.2, 5.2)) * (1 - smooth(seg(t, 20.6, 21.4)));
        const jacked = smooth(seg(t, 5.2, 6)) * (1 - smooth(seg(t, 19.8, 20.6)));
        const lift = 0.12 * smooth(seg(jacked, 0.7, 1));
        crane.position.y = lift;
        outriggers.forEach(({ side, beam, jack, foot, mat }) => {
            const out = 0.05 + BEAM * reach, end = side * (1.2 + out);
            beam.scale.x = out;
            beam.position.x = side * (1.2 + out / 2);
            const length = lerp(0.14, JACK_TOP + lift - 0.15, jacked);
            jack.scale.y = length;
            jack.position.set(end, JACK_TOP - length, jack.position.z);
            foot.position.set(end, JACK_TOP - length - 0.08, foot.position.z);
            mat.visible = reach > 0.5;
        });

        // The boom follows its keys: slew, then luff and telescope to reach the radius
        const radius = keyed(boomKeys, t, 2), height = keyed(boomKeys, t, 3) - PIVOT.height;
        const luff = Math.atan2(height, radius + PIVOT.back);
        const length = Math.hypot(height, radius + PIVOT.back), extend = length - BASE_LENGTH;
        upper.rotation.y = keyed(boomKeys, t, 1);
        boom.rotation.x = -luff;
        boomMid.position.z = 3.2 + extend / 2;
        boomTip.position.z = 3.4 + extend;
        boomHead.position.z = length;
        hoistPoint.position.z = length;
        aim(ram, 0, 0.55, 0.9, 0, PIVOT.y + 2.7 * Math.sin(luff) - 0.3 * Math.cos(luff), -PIVOT.back + 2.7 * Math.cos(luff) + 0.3 * Math.sin(luff));

        crane.updateMatrixWorld(true);
        site.worldToLocal(hoistPoint.getWorldPosition(tip));
        const hookY = Math.min(tip.y - 0.75, keyed(hookKeys, t, 1));
        hook.position.set(tip.x, hookY, tip.z);
        cable.position.set(tip.x, hookY + 0.5, tip.z);
        cable.scale.y = Math.max(0.01, tip.y - hookY - 0.5);
        const rigged = smooth(seg(t, SETUP + 0.6, SETUP + 1.2)) * (1 - smooth(seg(t, STOW + 0.2, STOW + 0.8)));
        rig.visible = rigged > 0.01;
        rig.scale.setScalar(rigged);

        // The truck, and the modules it brings
        const truckX = t < TRUCK_OUT[0]
            ? lerp(-21, 0, 1 - Math.pow(1 - seg(t, TRUCK_IN[0], TRUCK_IN[1]), 2))
            : lerp(0, 22, Math.pow(seg(t, TRUCK_OUT[0], TRUCK_OUT[1]), 2));
        truck.position.x = truckX;
        truckLamps.forEach(lamp => { lamp.visible = Math.abs(truckX) < 2; });
        craneLamps.forEach(lamp => { lamp.visible = Math.hypot(crane.position.x, crane.position.z) < 4; });
        modules.forEach((m, i) => {
            const { group } = m;
            group.scale.setScalar(1);
            if (t < m.latch) group.position.set(truckX + m.slot, DECK, ROAD);
            else if (t < m.release) group.position.set(tip.x, hookY - RIG - M.h, tip.z);
            else {
                const q = smooth(seg(t, CLEAR + i * 0.12, CLEAR + 0.8 + i * 0.12));
                group.position.copy(m.to);
                group.position.y += q * 2.5;
                group.scale.setScalar(Math.max(0.001, 1 - q));
            }
            const fixing = pulse(t, m.release, m.release + 1, 0.2);
            m.joints.visible = fixing > 0.01;
            m.joints.scale.setScalar(0.6 + 0.6 * fixing);
        });

        // The crew
        const lifting = t > FIRST && t < STOW;
        banksman.userData.armR.rotation.x = lifting ? -2.5 + 0.3 * Math.sin(t * 5) : 0;
        banksman.userData.armL.rotation.x = lifting ? -1.2 : 0;
        guide.userData.armL.rotation.x = guide.userData.armR.rotation.x = lifting ? -1.1 + 0.15 * Math.sin(t * 3) : 0;

        const i = Math.min(2, Math.max(0, Math.floor((t - FIRST) / CYCLE)));
        const m = modules[i], p = m.group.position, fixed = t >= m.release;
        const state = t < IN[1] ? 'Arriving by road'
            : t < 5.2 ? 'Outriggers out'
            : t < SETUP ? 'Jacks down · levelled'
            : t < FIRST ? 'Boom up · rigging on'
            : t < STOW ? `Lift ${i + 1} of 3 · radius ${m.radius.toFixed(1)} m`
            : t < OUT[0] ? 'Boom stowed · outriggers in'
            : 'Leaving by road';
        craneTag.set('Mobile crane', state).at(crane.position.x + SITE_X, 4.3, crane.position.z + SITE_Z)
            .show(1 - smooth(seg(Math.hypot(crane.position.x, crane.position.z), 6.5, 9)));
        liftTag.at(p.x + 0.4 + SITE_X, p.y + M.h + 0.1, p.z + M.d / 2 + SITE_Z)
            .set(fixed ? `M-0${i + 1} connected` : `Module M-0${i + 1}`, fixed ? '4 bolted joints · ± 2 mm' : 'Factory-finished · 7.4 t')
            .tone(fixed ? 'ok' : '')
            .show(pulse(t, m.latch, m.release + 0.7, 0.2));
        roadTag.at(truckX - 1.6 + SITE_X, 0.2, ROAD + 2.6 + SITE_Z).show(pulse(t, TRUCK_IN[1] - 0.3, TRUCK_OUT[0] + 0.2, 0.3));
        padTag.show(1 - smooth(seg(t, FIRST + 1.6, FIRST + 2.4)) + smooth(seg(t, CLEAR + 0.9, CLEAR + 1.4)));
        doneTag.show(pulse(t, 23.6, CLEAR + 0.1, 0.25));
    };
}

// ---- 6. AI for Construction -------------------------------------------------------

function ai(k) {
    // The building's own materials, so its envelope can fade while it is queried
    const variants = {};
    const fading = name => variants[name] || (variants[name] = k.mat(name, { transparent: true }));
    const NX = 3, NZ = 2;
    const b = building(k, { nx: NX, nz: NZ, storeys: 2, plant: 'core', x: 1.9, z: -1, mat: name => (name === 'paving' ? name : fading(name)) });
    b.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const outline = k.lines(null, k.lineMaterial('ink', { transparent: true, opacity: 0 }), boxEdges(k, b.group));
    const hot = k.standard('signal', { transparent: true, roughness: 0.5 }, { e: 'signal', ei: [0.2, 0.9] });

    const meshesOf = objects => objects.map(o => [o, o.material]);
    const centre = (object, target) => {
        object.getWorldPosition(target);
        target.y += object.scale.y / 2;
        return target;
    };

    // The reasoning graph, beside the model
    const GZ = 4.6;
    const NODES = { query: [-4.6, 10.7], column: [-6.7, 7.4], window: [-2.5, 9.5], load: [-7.3, 4.4], storey: [-4.3, 4.8], facing: [-1.5, 7.45] };
    const NAMES = { column: 'IfcColumn', window: 'IfcWindow', load: 'LoadBearing', storey: 'Storey', facing: 'Orientation' };
    const EDGES = [['query', 'column'], ['query', 'window'], ['column', 'load'], ['column', 'storey'], ['window', 'storey'], ['window', 'facing']];
    const idle = new THREE.Color(), active = new THREE.Color(), mixed = new THREE.Color();
    k.onTheme(() => {
        k.color(['#a3aebd', '#51638a'], idle);
        k.color('signal', active);
    });
    const nodes = {};
    Object.keys(NODES).forEach(name => {
        const [x, y] = NODES[name];
        const material = k.own(new THREE.MeshBasicMaterial());
        nodes[name] = {
            material, position: new THREE.Vector3(x, y, GZ),
            mesh: k.sphere(null, material, name === 'query' ? 0.3 : 0.2, x, y, GZ),
            tag: NAMES[name] ? k.label(NAMES[name], '', 'mini').at(x, y - 0.62, GZ) : null
        };
    });
    const edgePoints = [];
    EDGES.forEach(([a, z]) => edgePoints.push(...nodes[a].position.toArray(), ...nodes[z].position.toArray()));
    const edgeLines = k.lines(null, k.own(new THREE.LineBasicMaterial({ vertexColors: true })), edgePoints);
    edgeLines.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(EDGES.length * 6), 3));
    const packet = k.sphere(null, k.basic('signal'), 0.11);

    // Two questions, each with the path the reasoning takes and what it finds
    const columns = b.storeys[0].columns;
    const panes = b.storeys.flatMap(st => st.windows.slice(NZ).flatMap(w => w.userData.panes));
    const beams = (from, objects) => {
        const points = [];
        objects.forEach(o => points.push(...nodes[from].position.toArray(), ...centre(o, v0).toArray()));
        const lines = k.lines(null, k.lineMaterial('signal', { transparent: true, opacity: 0 }), points);
        lines.frustumCulled = false;
        return lines;
    };
    const front = b.group.position.z + b.D / 2, midX = b.group.position.x;
    const QUERIES = [{
        ask: 'Which columns carry Level 2?',
        found: 'Found 12 load-bearing columns',
        path: ['column', 'load', 'storey'], edges: [0, 2, 3],
        set: meshesOf(columns), beams: beams('storey', columns.filter((c, n) => n % 3 === 2)),
        answer: k.label('12 × IfcColumn', 'Level 1 · LoadBearing = TRUE').at(midX + 1.5, b.base + 2.7, front).tone('signal')
    }, {
        ask: 'Show the south-facing windows',
        found: 'Found 6 windows · 20.5 m² of glazing',
        path: ['window', 'facing', 'storey'], edges: [1, 5, 4],
        set: meshesOf(panes), beams: beams('facing', panes.filter((p, n) => n % 2 === 0)),
        answer: k.label('6 × IfcWindow', 'Facade S · azimuth 180°').at(midX, b.base + 5.4, front).tone('signal')
    }];
    const queryTag = k.label('', '', 'query').at(0.4, 13.2, -0.4);
    let shown = -1;

    return t => {
        const which = t < 8 ? 0 : 1, u = t - which * 8;
        const query = QUERIES[which];

        // The envelope fades to an outline while the model is searched
        const ghost = pulse(u, 1.5, 7.3, 0.6);
        Object.values(variants).forEach(material => {
            material.opacity = lerp(1, 0.13, ghost);
            material.depthWrite = ghost < 0.02;
        });
        outline.material.opacity = 0.42 * ghost;
        outline.visible = ghost > 0.01;

        const found = pulse(u, 2.9, 6.9, 0.4);
        const lit = found > 0.01 ? which : -1;
        if (lit !== shown) {
            if (shown >= 0) QUERIES[shown].set.forEach(([mesh, material]) => { mesh.material = material; });
            if (lit >= 0) query.set.forEach(([mesh]) => { mesh.material = hot; });
            shown = lit;
        }
        hot.opacity = found;
        QUERIES.forEach((q, n) => {
            q.beams.visible = n === which && found > 0.01;
            q.beams.material.opacity = 0.4 * found;
            q.answer.show(n === which ? pulse(u, 3.1, 6.8, 0.3) : 0);
        });

        // Reasoning runs along the graph: query, class, then its properties
        const on = pulse(u, 0.3, 7.4, 0.3);
        const reached = name => {
            if (name === 'query') return on;
            const step = query.path.indexOf(name);
            return step < 0 ? 0 : Math.min(on, seg(u, 2.1 + Math.min(step, 1) * 0.5, 2.3 + Math.min(step, 1) * 0.5));
        };
        Object.keys(nodes).forEach(name => {
            const node = nodes[name], level = reached(name);
            node.material.color.copy(mixed.lerpColors(idle, active, level));
            node.mesh.scale.setScalar((name === 'query' ? 0.3 : 0.2) * (1 + 0.25 * level));
            if (node.tag) node.tag.show(0.45 + 0.55 * level);
        });
        const colors = edgeLines.geometry.attributes.color;
        EDGES.forEach((edge, n) => {
            const step = query.edges.indexOf(n);
            const level = step < 0 ? 0 : Math.min(on, seg(u, 1.8 + Math.min(step, 1) * 0.5, 2.2 + Math.min(step, 1) * 0.5));
            mixed.lerpColors(idle, active, level);
            colors.setXYZ(n * 2, mixed.r, mixed.g, mixed.b);
            colors.setXYZ(n * 2 + 1, mixed.r, mixed.g, mixed.b);
        });
        colors.needsUpdate = true;
        const hop = u < 2.25 ? 0 : 1, along = hop ? seg(u, 2.3, 2.7) : seg(u, 1.8, 2.2);
        const [from, to] = EDGES[query.edges[hop]];
        packet.visible = u > 1.8 && u < 2.7;
        packet.position.lerpVectors(nodes[from].position, nodes[to].position, smooth(along));

        const typed = Math.round(query.ask.length * seg(u, 0.4, 1.6));
        const status = u < 1.7 ? '' : u < 3 ? 'Reasoning over the IFC graph…' : u < 6.9 ? query.found : '';
        queryTag.set(`› ${query.ask.slice(0, typed)}${u < 1.7 ? '▌' : ''}`, status).show(pulse(u, 0.2, 7.6, 0.25));
    };
}

// ---- 7. Digital Twin ----------------------------------------------------------------

function twin(k) {
    // Two closed storeys, and a top floor cut open to show what the twin mirrors
    const b = building(k, { nx: 3, nz: 2, storeys: 2, roof: false, x: -0.3, z: -0.4 });
    const g = b.group, { W, D } = b, FLOOR = b.top, WH = 1.1;
    const GX = g.position.x, GZ = g.position.z;
    k.box(g, 'concrete', W, 0.3, D, 0, FLOOR - 0.3, 0);
    const cut = (w, d, x, z) => {
        k.box(g, 'wall', w, WH, d, x, FLOOR, z);
        k.box(g, 'dark', w, 0.04, d, x, FLOOR + WH, z);
    };
    cut(W, 0.2, 0, D / 2 - 0.1);
    cut(W, 0.2, 0, -D / 2 + 0.1);
    cut(0.2, D - 0.4, W / 2 - 0.1, 0);
    cut(0.2, D - 0.4, -W / 2 + 0.1, 0);
    [-1.5, 1.5].forEach(x => {
        cut(0.12, 3.7, x, -0.95);
        cut(0.12, 0.7, x, 2.45);
    });
    tree(k, null, -6.4, 3.4, 1.05);

    // Three zones, coloured by temperature: on the floor and in the twin above
    const LAYER = FLOOR + 3.4;
    const ringGeometry = k.own(new THREE.RingGeometry(0.85, 1, 36).rotateX(-Math.PI / 2));
    const cool = new THREE.Color('#62bfc9'), warm = new THREE.Color('#f29b55');
    const zones = [-3, 0, 3].map(x => {
        const floor = k.own(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
        const mirror = k.own(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }));
        k.box(g, floor, 2.76, 0.04, 5.56, x, FLOOR, 0);
        k.box(g, mirror, 2.76, 0.03, 5.56, x, LAYER, 0).renderOrder = 1;
        [-0.68, 0.68].forEach(dx => desk(k, g, x + dx, FLOOR + 0.04, -2.45));
        // A sensor on a post, pulsing as it reports
        k.box(g, 'dark', 0.06, 1.4, 0.06, x, FLOOR, -1.4);
        k.sphere(g, 'white', 0.13, x, FLOOR + 1.45, -1.4);
        const ringMaterial = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
        const ring = k.mesh(g, ringGeometry, ringMaterial);
        return { x, floor, mirror, ring, ringMaterial, tag: k.label('', '', 'mini').at(GX + x, LAYER + 0.1, GZ + 0.9), packet: k.sphere(g, k.basic('accent'), 0.1) };
    });
    k.onTheme(night => zones.forEach(zone => { zone.floor.emissiveIntensity = night ? 0.45 : 0; }));

    // The twin: an outline of the floor held above it, tied to it at the corners
    const outline = [];
    const hw = W / 2, hd = D / 2;
    [[-hw, -hd, hw, -hd], [hw, -hd, hw, hd], [hw, hd, -hw, hd], [-hw, hd, -hw, -hd], [-1.5, -hd, -1.5, hd], [1.5, -hd, 1.5, hd]]
        .forEach(([x0, z0, x1, z1]) => outline.push(x0, LAYER, z0, x1, LAYER, z1));
    const ties = [];
    [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-3, -1.4], [0, -1.4], [3, -1.4]].forEach(([x, z], n) => {
        for (let y = FLOOR + (n < 4 ? WH : 1.6) + 0.1; y < LAYER - 0.2; y += 0.44) ties.push(x, y, z, x, y + 0.22, z);
    });
    const twinLine = k.lineMaterial('accent', { transparent: true, opacity: 0.9 }, { glow: true });
    k.lines(g, twinLine, outline);
    k.lines(g, k.lineMaterial('accent', { transparent: true, opacity: 0.55 }), ties);

    // People on the floor, and their dots in the twin
    const walker = (points, period, phase, colour) => {
        const lengths = [0];
        for (let i = 1; i <= points.length; i++) {
            const a = points[i - 1], z = points[i % points.length];
            lengths.push(lengths[i - 1] + Math.hypot(z[0] - a[0], z[1] - a[1]));
        }
        const figure = person(k, g, 0, 0, colour);
        const stride = (lengths[points.length] / 0.72) * Math.PI;
        const dot = k.sphere(g, k.basic('accent'), 0.19);
        return {
            figure, dot, x: 0,
            move(t) {
                const s = (((t / period + phase) % 1) + 1) % 1 * lengths[points.length];
                let i = 1;
                while (lengths[i] < s) i++;
                const a = points[i - 1], z = points[i % points.length], u = (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
                this.x = lerp(a[0], z[0], u);
                const pz = lerp(a[1], z[1], u);
                figure.position.set(this.x, FLOOR + 0.04, pz);
                figure.rotation.y = Math.atan2(z[0] - a[0], z[1] - a[1]);
                figure.userData.walk(((t / period + phase) % 1) * stride * 2);
                dot.position.set(this.x, LAYER + 0.2, pz);
            }
        };
    };
    const lane = [[-3.8, 1.2], [3.8, 1.2], [3.8, 1.8], [-3.8, 1.8]];
    const people = [
        walker(lane, 16, 0.02, { top: '#3d5a80', hair: 0 }), walker(lane, 16, 0.37, { top: 'accent', skin: 1, hair: 2 }),
        walker(lane, 16, 0.71, { top: '#eef0f2', legs: '#4a5568', skin: 2, hair: 2 }),
        walker([[-3.8, -1.9], [-2.2, -1.9], [-2.2, -0.2], [-3.8, -0.2]], 8, 0.3, { top: '#8a4f6b', skin: 3, hair: 1 }),
        walker([[3.8, -0.3], [2.2, -0.3], [2.2, -1.9], [3.8, -1.9]], 8, 0.6, { top: '#2f6f5e', skin: 0, hair: 3 })
    ];

    // Plant: an air handling unit beside the building
    const unit = k.group(g, W / 2 + 1.9, 0, -1.3);
    k.box(unit, 'paving', 2.3, 0.12, 1.8);
    k.box(unit, 'metal', 1.8, 1.4, 1.3, 0, 0.12, 0);
    k.cyl(unit, 'dark', 0.55, 0.08, 0, 1.52, 0);
    const fan = k.group(unit, 0, 1.62, 0);
    k.box(fan, 'white', 0.95, 0.03, 0.16, 0, 0, 0);
    k.box(fan, 'white', 0.16, 0.03, 0.95, 0, 0, 0);
    k.bars(unit, 'steel', 0.16, [[-0.9, 1, 0.3, -1.45, 1, 0.3], [-0.9, 0.5, -0.3, -1.45, 0.5, -0.3]]);

    const panes = b.storeys.flatMap(st => st.windows.flatMap(w => w.userData.panes));
    const twinTag = k.label('Digital twin · live').at(GX + hw - 0.3, LAYER + 0.1, GZ - hd + 0.3);
    const plantTag = k.label('Air handling unit').at(GX + W / 2 + 1.9, 1.9, GZ - 1.3);
    let lighting = -1;
    const TAU = Math.PI * 2;

    return t => {
        people.forEach(p => p.move(t));
        const count = [0, 0, 0];
        people.forEach(p => count[p.x < -1.5 ? 0 : p.x < 1.5 ? 1 : 2]++);

        let heat = 0;
        zones.forEach((zone, i) => {
            const temperature = 22.6 + [1.5, -0.9, 1.1][i] * Math.sin((t / 16) * TAU + i * 2.1) + 0.3 * count[i];
            const level = clamp01((temperature - 21) / 4);
            heat += level / 3;
            zone.floor.color.lerpColors(cool, warm, level);
            zone.floor.emissive.copy(zone.floor.color);
            zone.mirror.color.copy(zone.floor.color);
            zone.tag.set(`${temperature.toFixed(1)} °C`).show(1);
            const beat = (t / 2 + i / 3) % 1;
            zone.ring.position.set(zone.x, FLOOR + 1.45, -1.4);
            zone.ring.scale.setScalar(0.25 + 1.1 * beat);
            zone.ringMaterial.opacity = 0.85 * (1 - beat);
            zone.packet.position.set(zone.x, lerp(FLOOR + 1.6, LAYER, beat), -1.4);
        });
        fan.rotation.y = (t / 16) * TAU * 20;

        // Lights in the storeys below come and go with the people
        const step = Math.floor(t / 4);
        if (step !== lighting) {
            lighting = step;
            panes.forEach((pane, n) => { pane.material = k.mat((n * 5 + step * 3) % 7 > 2 ? 'glassLit' : 'glass'); });
        }

        const co2 = 470 + 36 * people.length + 28 * Math.sin((t / 8) * TAU);
        twinTag.set('Digital twin · live', `Occupancy ${count.join(' · ')} · CO₂ ${co2.toFixed(0)} ppm`).show(1);
        plantTag.set('Air handling unit', `${(31 + 9 * heat + 1.2 * Math.sin((t / 4) * TAU)).toFixed(1)} kW · supply 16.5 °C`).show(1);
    };
}

// ---- 8. BIM Data Interoperability -------------------------------------------------

function interop(k) {
    const b = building(k, { nx: 2, nz: 2, storeys: 2, plant: 'solar', x: 0.2, z: -0.2 });
    k.root.updateMatrixWorld(true);
    const GX = b.group.position.x, GZ = b.group.position.z;

    // Three representations of every part: BIM materials, a game-engine mesh
    // (untextured, triangulated), a robot's semantic collision model
    const engineMesh = k.standard(['#b9bec6', '#8a95b0'], { roughness: 1 });
    const engineGlass = k.standard(['#7f9ab8', '#55698f'], { roughness: 0.4 });
    const CLASS = {
        wall: ['#5b8def', '#6f9cf5'], slab: ['#8d99ae', '#9aa7bf'], roof: ['#8d99ae', '#9aa7bf'], column: ['#f4a259', '#f7b170'],
        window: ['#f6cf52', '#ffd966'], door: ['#ef476f', '#f46a8a'], plant: ['#2ec4a0', '#45d6b2'], site: ['#cfd4da', '#77839e']
    };
    const classMaterial = {};
    const semantic = kind => classMaterial[kind] || (classMaterial[kind] = k.standard(CLASS[kind] || CLASS.site, { roughness: 0.9 }));
    const triangles = k.lineMaterial(['#263348', '#eef3ff'], { transparent: true, opacity: 0.8 });
    const hulls = k.lineMaterial(['#1c2533', '#f2f6ff'], { transparent: true, opacity: 0.75 });
    const glass = [k.mat('glass'), k.mat('glassLit')];

    const parts = [];
    b.group.traverse(o => {
        if (!o.isMesh) return;
        let kind = 'site';
        for (let p = o; p && p !== b.group; p = p.parent) {
            if (p.userData.kind) {
                kind = p.userData.kind;
                break;
            }
        }
        const isGlass = glass.includes(o.material);
        const isBox = o.geometry === k.GEO.box;
        const wire = isBox ? k.GEO.wire : k.own(new THREE.WireframeGeometry(o.geometry));
        const hull = isBox ? k.GEO.edges : k.own(new THREE.EdgesGeometry(o.geometry, 30));
        const lines = new THREE.LineSegments(wire, triangles);
        lines.visible = false;
        o.add(lines);
        o.getWorldPosition(v0);
        parts.push({
            mesh: o, lines, wire, hull, size: o.scale.clone(), stage: 0,
            looks: [o.material, isGlass ? engineGlass : engineMesh, semantic(isGlass && kind !== 'door' ? 'window' : kind)],
            order: clamp01((v0.y / b.top) * 0.75 + ((v0.x - v0.z) / 12 + 0.5) * 0.25)
        });
    });

    // The conversion sweeps up the model three times: to the engine, to the robot, back
    const WAVES = [{ at: 2.4, to: 1 }, { at: 7.2, to: 2 }, { at: 12, to: 0 }], SWEEP = 1.5;

    // One wall is followed through all three, with its properties
    const wall = b.storeys[0].walls[b.storeys[0].walls.length - 1];
    const WALL = wall.getWorldPosition(new THREE.Vector3());
    const pickMaterial = k.lineMaterial('signal', { transparent: true });
    const pick = new THREE.LineSegments(k.GEO.edges, pickMaterial);
    pick.scale.set(3.06, 2.76, 0.36);
    pick.position.set(WALL.x, WALL.y - 0.03, WALL.z - 0.1);
    k.root.add(pick);

    // Transform gizmo of the engine, the frame of the robot
    const gizmo = k.group(null, WALL.x + 1.5, WALL.y + 2.7, WALL.z + 0.3);
    [['#e5484d', [1.3, 0, 0]], ['#3fb950', [0, 1.3, 0]], ['#3b82f6', [0, 0, 1.3]]].forEach(([colour, [x, y, z]]) => {
        const material = k.basic(colour);
        k.bars(gizmo, material, 0.07, [[0, 0, 0, x, y, z]]);
        k.box(gizmo, material, 0.18, 0.18, 0.18, x, y - 0.09, z);
    });

    // Occupancy grid of the robot's map, on the ground around the model
    const CELLS = 28, PX = 8;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CELLS * PX;
    const c2d = canvas.getContext('2d');
    for (let i = 0; i < CELLS; i++) {
        for (let j = 0; j < CELLS; j++) {
            const x = (i + 0.5 - CELLS / 2) * 0.5, z = (j + 0.5 - CELLS / 2) * 0.5;
            const edge = Math.max(Math.abs(x), Math.abs(z));
            if (Math.hypot(x, z) > 6.1 + 0.5 * Math.sin(i * 1.7 + j * 2.3)) continue;       // not yet seen
            c2d.fillStyle = `rgba(255,255,255,${edge > 3.7 && edge < 4.2 ? 0.9 : 0.2})`;
            c2d.fillRect(i * PX + 0.5, j * PX + 0.5, PX - 1, PX - 1);
        }
    }
    const mapTexture = k.own(new THREE.CanvasTexture(canvas));
    mapTexture.magFilter = THREE.NearestFilter;
    const mapMaterial = k.basic('accent', { map: mapTexture, transparent: true, opacity: 0, depthWrite: false });
    const map = new THREE.Mesh(k.own(new THREE.PlaneGeometry(CELLS * 0.5, CELLS * 0.5).rotateX(-Math.PI / 2)), mapMaterial);
    map.position.set(GX, 0.035, GZ);
    k.root.add(map);

    const FORMATS = [
        ['IFC 4.3 · BIM model', 'Building elements with property sets'],
        ['Unity · game engine', 'GameObjects with meshes and colliders'],
        ['ROS 2 · robot world', 'Collision geometry with semantic classes']
    ];
    const NAMES = ['IfcWall · W-12', 'GameObject · Wall_W-12', 'Link · wall_W-12'];
    const formatTag = k.label('', '', 'query').at(0.3, 12.4, -0.3);
    const wallTag = k.label().at(WALL.x, WALL.y + 2.75, WALL.z).tone('signal');
    const checkTag = k.label('', '', 'mini').at(GX + 0.4, 0.1, GZ + 5.3);

    return t => {
        let converting = 0, global = 0;
        WAVES.forEach(wave => {
            if (t >= wave.at + SWEEP / 2) global = wave.to;
            converting = Math.max(converting, pulse(t, wave.at - 0.1, wave.at + SWEEP + 0.4, 0.2));
        });
        parts.forEach(part => {
            let stage = 0, pop = 0;
            WAVES.forEach(wave => {
                const at = wave.at + part.order * SWEEP;
                if (t >= at) stage = wave.to;
                pop = Math.max(pop, Math.sin(seg(t, at, at + 0.3) * Math.PI));
            });
            if (stage !== part.stage) {
                part.stage = stage;
                part.mesh.material = part.looks[stage];
                part.lines.visible = stage > 0;
                part.lines.geometry = stage === 1 ? part.wire : part.hull;
                part.lines.material = stage === 1 ? triangles : hulls;
            }
            part.mesh.scale.copy(part.size).multiplyScalar(1 + 0.06 * pop);
        });

        const inEngine = pulse(t, 3.4, 8, 0.4), inRobot = pulse(t, 8.2, 12.9, 0.5);
        gizmo.visible = inEngine + inRobot > 0.02;
        gizmo.scale.setScalar(easeOut(clamp01(inEngine + inRobot)));
        map.visible = inRobot > 0.01;
        mapMaterial.opacity = 0.75 * inRobot;
        pickMaterial.opacity = 0.7 + 0.3 * Math.sin(t * 4);

        formatTag.set(FORMATS[global][0], FORMATS[global][1]).show(1);
        wallTag.set(NAMES[global], 'FireRating 2 h · GUID 2O2Fr$t4X7').show(1);
        checkTag.set('Converting · geometry ✓ · semantics ✓').show(converting);
    };
}

// ---- 9. Robotic Navigation & Simulation ---------------------------------------------

/** A route through way-points [x, z], with rounded corners, measured along its length. */
function route(points, radius = 0.5) {
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

function navigation(k) {
    const FL = 0.3, WH = 0.9;
    k.box(null, 'concrete', 11.8, 0.26, 7.8);
    k.box(null, 'coping', 11.4, 0.04, 7.4, 0, 0.26, 0);
    // A floor plan cut at 0.9 m: envelope, a room at each end, a core in the middle
    const wall = (x0, z0, x1, z1) => {
        const w = Math.abs(x1 - x0) + 0.16, d = Math.abs(z1 - z0) + 0.16, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
        k.box(null, 'wall', w, WH, d, x, FL, z);
        k.box(null, 'dark', w, 0.035, d, x, FL + WH, z);
    };
    wall(-5.6, -3.6, 5.6, -3.6);
    wall(-5.6, 3.6, 5.6, 3.6);
    wall(-5.6, -3.6, -5.6, 3.6);
    wall(5.6, -3.6, 5.6, 3.6);
    [-3.4, 3.4].forEach(x => {
        wall(x, -3.6, x, -0.7);
        wall(x, 0.7, x, 3.6);
    });
    wall(-2, -1.3, 2, -1.3);
    wall(-2, -1.3, -2, 1.3);
    wall(2, -1.3, 2, 1.3);
    wall(-2, 1.3, 0.1, 1.3);
    wall(1.7, 1.3, 2, 1.3);
    // Furniture
    const boards = k.standard('#e3d2b4', { roughness: 0.9 });
    [-4.5, 4.5].forEach(x => k.box(null, boards, 2.04, 0.012, 7.04, x, FL, 0));
    k.box(null, k.standard('#d9dde2', { roughness: 0.9 }), 3.84, 0.012, 2.44, 0, FL, 0);
    [[-4.75, -2.5, Math.PI / 2], [-4.75, 2.3, Math.PI / 2], [4.75, -2.3, -Math.PI / 2], [4.75, 2.5, -Math.PI / 2]]
        .forEach(([x, z, turn]) => desk(k, null, x, FL, z, turn));
    [[-1.45, -0.6], [-1.45, 0.5]].forEach(([x, z]) => k.box(null, 'wallAlt', 0.5, 0.82, 0.95, x, FL, z));
    // Doors standing open into the rooms, and glazing in the outer walls
    [[-3.4, -1], [3.4, 1]].forEach(([x, side]) => {
        k.box(null, 'timber', 1.3, 0.86, 0.05, x + side * 0.65, FL, side * 0.7);
        [-0.7, 0.7].forEach(z => k.box(null, 'dark', 0.2, 0.92, 0.07, x, FL, z));
    });
    [-4.5, -1.5, 1.5, 4.5].forEach(x => k.box(null, 'glass', 1.7, 0.5, 0.19, x, FL + 0.42, 3.6));
    [-2, 2].forEach(z => k.box(null, 'glass', 0.19, 0.5, 1.7, 5.6, FL + 0.42, z));
    [[-0.4, -3.25], [1.4, -3.25]].forEach(([x, z]) => k.box(null, 'wallAlt', 1.5, 0.78, 0.42, x, FL, z));
    [[-3.0, -3.1], [3.0, 3.1]].forEach(([x, z]) => {
        k.cyl(null, 'timber', 0.2, 0.3, x, FL, z);
        k.mesh(null, k.GEO.blob, 'leaf', x, FL + 0.62, z).scale.setScalar(0.36);
    });
    [[-2.7, 2.4], [2.7, 2.4], [0, -2.4]].forEach(([x, z]) => { k.pool(null, x, z, 2.4, '#ffd9a0', 0.22).position.y = FL + 0.015; });

    // Routes: the plan (south corridor), the detour (north), and the way back
    const START = [-4.5, 0], GOAL = [4.5, 0], STOP_X = -0.9;
    const planned = route([START, [-2.7, 0], [-2.7, 2.4], [2.7, 2.4], [2.7, 0], GOAL]);
    const detour = route([[STOP_X, 2.4], [-2.7, 2.4], [-2.7, -2.4], [2.7, -2.4], [2.7, 0], GOAL]);
    const back = route([GOAL, [2.7, 0], [2.7, 2.4], [-2.7, 2.4], [-2.7, 0], START]);
    const spot = new THREE.Vector3(), ahead = new THREE.Vector3();
    let stopAt = 0;
    while (stopAt < planned.length && !(planned.at(stopAt, spot).x >= STOP_X && Math.abs(spot.z - 2.4) < 0.01)) stopAt += 0.02;

    const DASH = 0.3, PITCH = 0.52;
    const dashed = path => {
        const position = [], index = [];
        let n = 0;
        for (let s = 0; s + DASH <= path.length + 0.01; s += PITCH) {
            path.at(s, spot);
            path.at(s + DASH, ahead);
            const dx = ahead.x - spot.x, dz = ahead.z - spot.z, l = Math.hypot(dx, dz) || 1;
            const px = (-dz / l) * 0.065, pz = (dx / l) * 0.065;
            position.push(spot.x + px, 0, spot.z + pz, spot.x - px, 0, spot.z - pz, ahead.x + px, 0, ahead.z + pz, ahead.x - px, 0, ahead.z - pz);
            index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
            n += 4;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        geometry.setIndex(index);
        const mesh = new THREE.Mesh(geometry, routeMaterial);
        mesh.position.y = FL + 0.02;
        mesh.frustumCulled = false;
        k.root.add(mesh);
        const count = n / 4;
        /** Show the dashes between two distances along the route. */
        mesh.userData.show = (from, to) => {
            const a = Math.min(count, Math.max(0, Math.ceil(from / PITCH))), z = Math.min(count, Math.max(a, Math.floor(to / PITCH) + 1));
            geometry.setDrawRange(a * 6, (z - a) * 6);
            mesh.visible = z > a;
        };
        return mesh;
    };
    const routeMaterial = k.basic('accent', { side: THREE.DoubleSide });
    const staleMaterial = k.basic(['#9aa6b6', '#5b6d92'], { side: THREE.DoubleSide, transparent: true });
    const lineA = dashed(planned), lineB = dashed(detour), lineC = dashed(back);

    // The robot: a round base with a lidar, and the field it senses ahead
    const bot = k.group(null);
    k.cyl(bot, 'dark', 0.4, 0.1, 0, 0.05, 0);
    k.cyl(bot, 'white', 0.37, 0.24, 0, 0.15, 0);
    k.cyl(bot, 'accent', 0.3, 0.03, 0, 0.39, 0);
    k.cyl(bot, 'dark', 0.12, 0.13, 0, 0.42, 0.05);
    k.box(bot, 'dark', 0.34, 0.07, 0.06, 0, 0.24, 0.35);
    k.glow(bot, 0, 0.3, 0.55, 1, '#cfe3ff');
    const fieldProps = { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide };
    const fieldClear = k.basic('accent', fieldProps, { glow: true });
    const fieldAlert = k.basic('signal', { ...fieldProps }, { glow: true });
    const field = new THREE.Mesh(k.own(new THREE.CircleGeometry(1.7, 20, Math.PI / 2 - 0.62, 1.24).rotateX(Math.PI / 2)), fieldClear);
    field.position.y = 0.3;
    bot.add(field);

    // What blocks the corridor: a loaded cart rolled out of the core
    const cart = k.group(null, 0.9, FL, 0.2);
    k.box(cart, 'steel', 1.2, 0.1, 1.7, 0, 0.14, 0);
    k.box(cart, 'timber', 1, 0.45, 0.75, 0, 0.24, -0.4);
    k.box(cart, 'yellow', 0.9, 0.35, 0.6, 0, 0.24, 0.4);
    k.box(cart, 'timber', 0.8, 0.3, 0.6, 0, 0.69, -0.35);
    const alertMaterial = k.lineMaterial('signal', { transparent: true });
    const alert = new THREE.LineSegments(k.GEO.edges, alertMaterial);
    alert.scale.set(1.5, 1.15, 2);
    cart.add(alert);
    const porter = person(k, cart, 0, -1.25, { top: '#3d5a80', skin: 2, hair: 2 });
    porter.userData.foreL.rotation.x = porter.userData.foreR.rotation.x = -1.25;

    // Dock and goal
    const markerMaterial = k.basic('accent', { transparent: true, opacity: 0.35, depthWrite: false });
    [START, GOAL].forEach(([x, z]) => { k.mesh(null, k.GEO.disc, markerMaterial, x, FL + 0.012, z).scale.setScalar(0.55); });
    const pin = k.group(null);
    const pinMaterial = k.basic('signal');
    k.mesh(pin, k.own(new THREE.ConeGeometry(0.16, 0.45, 14).rotateX(Math.PI).translate(0, 0.23, 0)), pinMaterial);
    k.sphere(pin, pinMaterial, 0.22, 0, 0.62, 0);
    k.glow(pin, 0, 0.6, 0, 1.4, 'signal', 0.7);

    const statusTag = k.label();
    const EAST = Math.PI / 2;
    const drive = u => lerp(u, smooth(u), 0.65);
    const follow = (path, s) => {
        path.at(s, spot);
        path.at(s - 0.3, ahead);
        const ax = ahead.x, az = ahead.z;
        path.at(s + 0.3, ahead);
        bot.position.set(spot.x, FL, spot.z);
        bot.rotation.y = Math.atan2(ahead.x - ax, ahead.z - az);
    };

    return t => {
        let s = 0, status, detail, tone = '';
        lineA.material = routeMaterial;
        if (t < 3.8) {
            s = stopAt * drive(seg(t, 1, 3.8));
            follow(planned, s);
            lineA.userData.show(s + 0.3, planned.length * seg(t, 0.15, 0.9));
            [status, detail] = t < 1 ? ['Planning route', 'A* on the BIM navigation graph'] : ['Navigating', `Route A · ${planned.length.toFixed(1)} m`];
        } else if (t < 5.3) {
            // Blocked: stop, drop the rest of the plan, turn round
            follow(planned, stopAt);
            bot.rotation.y = lerp(EAST, 3 * EAST, smooth(seg(t, 4.6, 5.3)));
            lineA.material = staleMaterial;
            staleMaterial.opacity = 1 - seg(t, 4.3, 5.1);
            lineA.userData.show(stopAt + 0.3, planned.length);
            [status, detail] = t < 4.5 ? ['Obstacle detected', 'South corridor blocked'] : ['Replanning', 'Updating the cost map'];
            tone = 'signal';
        } else if (t < 12.4) {
            s = detour.length * drive(seg(t, 5.3, 12.4));
            follow(detour, s);
            lineA.visible = false;
            [status, detail] = ['Rerouted', `Route B · ${detour.length.toFixed(1)} m via north corridor`];
        } else if (t < 13.4) {
            follow(detour, detour.length);
            bot.rotation.y = lerp(EAST, 3 * EAST, smooth(seg(t, 12.7, 13.4)));
            lineA.visible = false;
            [status, detail] = ['Goal reached', 'Returning to dock'];
            tone = 'ok';
        } else if (t < 19.4) {
            s = back.length * drive(seg(t, 13.4, 19.4));
            follow(back, s);
            lineA.visible = false;
            [status, detail] = ['Returning', `Route A · ${back.length.toFixed(1)} m`];
        } else {
            follow(back, back.length);
            bot.rotation.y = lerp(-EAST, EAST, smooth(seg(t, 19.4, 20)));
            lineA.visible = false;
            [status, detail] = ['Docked', 'Ready for the next task'];
            tone = 'ok';
        }
        lineB.userData.show(t < 12.4 ? s + 0.3 : detour.length, t < 12.4 ? detour.length * seg(t, 4.6, 5.3) : 0);
        lineC.userData.show(t >= 13.4 ? s + 0.3 : 0, t >= 12.6 && t < 19.4 ? back.length * seg(t, 12.6, 13.3) : 0);

        cart.position.z = track([[2, 0.2], [3.2, 2.4], [9.5, 2.4], [10.7, 0.2]], t);
        const pushing = (t > 2 && t < 3.2) || (t > 9.5 && t < 10.7) ? 1 : 0;
        porter.userData.walk((cart.position.z / 0.72) * Math.PI, pushing);
        porter.userData.armL.rotation.x = porter.userData.armR.rotation.x = -0.35;
        const alarm = pulse(t, 3.7, 5.3, 0.15);
        alert.visible = alarm > 0.01;
        alertMaterial.opacity = alarm * (0.6 + 0.4 * Math.sin(t * 14));
        field.material = alarm > 0.01 ? fieldAlert : fieldClear;

        const outbound = t < 12.4;
        const [gx, gz] = outbound ? GOAL : START;
        pin.position.set(gx, FL + 0.25 + 0.08 * Math.sin(t * 3), gz);
        pin.scale.setScalar(outbound ? smooth(seg(t, 0.1, 0.6)) * (1 - smooth(seg(t, 12.1, 12.4))) : smooth(seg(t, 12.6, 13)) * (1 - smooth(seg(t, 19.2, 19.5))));
        pin.visible = pin.scale.x > 0.01;

        statusTag.set(status, detail).tone(tone).at(bot.position.x, FL + 1.25, bot.position.z).show(1);
    };
}

export const SCENES = {
    bim: {
        duration: 20,
        poster: 14.9,
        scale: 0.45,
        alt: 'A nine-storey building is built up as its discipline models: the structure rises floor by floor, ducts and pipes run through the frame, the facade closes over them, and single elements are then picked out with their IFC data.',
        build: bim
    },
    informatics: {
        duration: 16,
        poster: 5,
        scale: 0.9,
        alt: 'A construction site: a tower crane lifts a concrete skip to the deck, a truck unloads, and each machine sends live data to the site office.',
        build: informatics
    },
    xr: {
        duration: 14,
        poster: 6.4,
        alt: 'A scan plane sweeps across a building, turning it into a holographic model in which a reviewer selects a wall, measures the facade and flags an issue.',
        build: xr
    },
    robotics: {
        duration: 15,
        poster: 7.5,
        scale: 1.2,
        alt: 'A six-axis robot arm picks blocks from a pallet and places them on a wall, each one checked against its position in the model.',
        build: robotics
    },
    dfma: {
        duration: 28,
        poster: 13.6,
        scale: 0.8,
        alt: 'A mobile crane arrives by road and sets up on its outriggers; a truck delivers factory-built modules, which the crane lifts from the trailer onto a concrete pad and stacks into a building.',
        build: dfma
    },
    ai: {
        duration: 16,
        poster: 4.6,
        alt: 'A question is typed to the building model; reasoning runs along a graph of IFC classes and the matching columns or windows light up in the model.',
        build: ai
    },
    twin: {
        duration: 16,
        poster: 5,
        alt: 'A smart building with its top floor cut open: people move between zones, sensors report, and a live twin above mirrors occupancy, temperature and air quality.',
        build: twin
    },
    interop: {
        duration: 15,
        poster: 5.8,
        alt: 'A BIM model is converted part by part into a game-engine mesh and then a robot collision model, while one wall keeps its geometry, identifier and properties.',
        build: interop
    },
    navigation: {
        duration: 20,
        poster: 8,
        scale: 1.2,
        alt: 'A mobile robot follows a planned route through a floor plan, detects a cart blocking the corridor, replans through another corridor, reaches its goal and returns.',
        build: navigation
    }
};
