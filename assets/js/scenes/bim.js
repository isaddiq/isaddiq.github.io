import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, track, tree, v0 } from './props.js';
import { captions } from './overlays.js';

/**
 * What the 5D beat prices the model at, in US dollars per unit measured.
 * The rates are illustrative; the quantities are measured from the scene.
 */
const BIM_RATES = { slab: 190, column: 1250, curtain: 950, member: 3100 };
const BIM_MONTHS = 66;                                   // length of the programme in the 4D beat
const FACES = [[0, 1], [1, 0], [0, -1], [-1, 0]];        // outward normal (x, z) of a facade, by quarter turn

// ---- The tower, after Seoul's Lotte World Tower: a rounded square in plan
// that tapers in a gentle curve from the podium to an open lattice lantern,
// with a seam down the middle of each face that opens at the crown.
// Model metres; REAL scales them to the 554.5 m building it stands for, and
// each modelled floor stands for STACK of its 123.
const Y0 = 0.45, FH = 1.25, FLOORS = 26;
const YL = Y0 + FLOORS * FH;                             // top of the occupied floors, foot of the lantern
const YTOP = 38.6;                                       // tips of the crown
const W0 = 2.6;                                          // half the width of the plan at the foot
const REAL = 554.5 / YTOP, STACK = 123 / FLOORS;
const SIG0 = 0.007, SIG_TOP = 0.1;                       // half the seam, as a share of the perimeter, below and at the top of the crown
const SKIN_T = 0.07, SEAM_D = 0.1;                       // the curtain wall in plan, and the depth of the seam
const ZONES = [
    { name: 'Podium · L1–12', to: 3, core: 1 },
    { name: 'Offices · L14–38', to: 9, core: 0.95 },
    { name: 'Residences · L42–71', to: 16, core: 0.85 },
    { name: 'Hotel · L76–101', to: 22, core: 0.75 },
    { name: 'Sky floors · L105–123', to: 26, core: 0.62 }
];
const OUTRIGGERS = [9, 16, 22];                          // floors of belt and outrigger trusses (no ducts on them)
const COL_S = [-0.04, 0.04, 0.21, 0.29, 0.46, 0.54, 0.71, 0.79], COL_IN = 0.26, COL_T = 0.16;
const FACE_OF = [1, 0, 3, 2];                            // the facade a quarter of the plan faces (east, south, west, north)
const zoneOf = j => ZONES.findIndex(zone => j < zone.to);

/** The unit plan (a superellipse of exponent n), resampled by arc length. */
function outlineTable(n) {
    const N = 2048, xs = new Float64Array(N + 1), zs = new Float64Array(N + 1), len = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        xs[i] = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
        zs[i] = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
        if (i) len[i] = len[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    }
    const R = 1024, out = new Float64Array((R + 1) * 2);
    for (let i = 0, j = 1; i <= R; i++) {
        const d = (i / R) * len[N];
        while (j < N && len[j] < d) j++;
        const f = (d - len[j - 1]) / (len[j] - len[j - 1] || 1);
        out[i * 2] = lerp(xs[j - 1], xs[j], f);
        out[i * 2 + 1] = lerp(zs[j - 1], zs[j], f);
    }
    return out;
}
const SQUARE = outlineTable(5), ROUND = outlineTable(3.2);

/** Half the width of the plan at height y: it narrows faster as it rises. */
const width = y => {
    const u = clamp01(y / YTOP);
    return W0 * (1 - 0.16 * u - 0.46 * u * u);
};
/** Half the seam at height y: a slot up the shaft, a widening V through the crown. */
const sigma = y => (y <= YL ? SIG0 : SIG0 + (SIG_TOP - SIG0) * Math.pow(seg(y, YL, YTOP), 1.15));
const xz = [0, 0];
/**
 * A point of the plan at height y, from the tower's axis, written to xz.
 * s runs round the perimeter from the middle of the east (+x) face (0)
 * through the south (+z, 0.25); inset is measured inwards. The plan rounds
 * a little as it rises.
 */
function plan(s, y, inset = 0) {
    const f = (((s % 1) + 1) % 1) * 1024, i = Math.min(1023, Math.floor(f)), k = f - i;
    const m = 0.75 * clamp01(y / YTOP), a = width(y) - inset;
    xz[0] = a * lerp(lerp(SQUARE[i * 2], SQUARE[i * 2 + 2], k), lerp(ROUND[i * 2], ROUND[i * 2 + 2], k), m);
    xz[1] = a * lerp(lerp(SQUARE[i * 2 + 1], SQUARE[i * 2 + 3], k), lerp(ROUND[i * 2 + 1], ROUND[i * 2 + 3], k), m);
    return xz;
}
/**
 * How far the plan reaches from the axis in direction dir (0 +x, 1 +z,
 * 2 -x, 3 -z), along the line at c across it (in the frame turned so that
 * dir is +x: c is z, -x, -z or x).
 */
function reach(y, dir, c, inset = 0) {
    let lo = dir / 4 - 0.25, hi = dir / 4 + 0.25;
    const turned = () => {
        const [x, z] = xz;
        return dir === 0 ? [x, z] : dir === 1 ? [z, -x] : dir === 2 ? [-x, -z] : [-z, x];
    };
    for (let n = 0; n < 32; n++) {
        const mid = (lo + hi) / 2;
        plan(mid, y, inset);
        if (turned()[1] < c) lo = mid;
        else hi = mid;
    }
    plan((lo + hi) / 2, y, inset);
    return turned()[0];
}

// The skin's own materials, silver glass and bands; c, e, ei, r, m as in the viewer's library
const SKIN = {
    skin: { c: ['#d5e0e8', '#1b2740'], r: 0.22 },
    skinLit: { c: ['#d5e0e8', '#ffe3ac'], e: ['#000000', '#ffb74d'], ei: [0, 0.85], r: 0.22 },
    band: { c: ['#eef2f5', '#7d899b'], r: 0.55 },
    seam: { c: ['#7f8fa0', '#111a2b'], r: 0.5 }
};
const GLAZED = new Set(['glass', 'glassLit', 'skin', 'skinLit']);

/**
 * A supertall after the Lotte World Tower, on a retail podium, that stands
 * complete for the whole loop, while four beats show what the one model
 * yields: a clash found and resolved between a duct and a beam on an office
 * floor (3D), a floor plan cut from that floor (documentation), quantities
 * and cost by class of element (5D), and the programme, zone by zone, and
 * the solar exposure of the glazing (4D, 6D). Every element has a material
 * of its class, posed from t on every frame, so nothing keeps a tint after
 * its beat. Shown at bim.scale.
 */
function build(k) {
    const GX = 5.6, GZ = 5.2;
    const g = k.group(null, GX, 0, GZ);
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23;   // the four beats; the building rests before and after
    const levels = [];
    // Everything above this plane is cut away in the documentation beat
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
    const TCX = -2, TCZ = -1.3;                            // the tower's axis, towards the back of the podium

    const lit = n => ((n * 7 + 3) % 5 > 1 ? 'glassLit' : 'glass');
    const part = (x, y, z, turn = 0) => {
        const group = k.group(g, x, y, z);
        group.rotation.y = turn;
        return group;
    };
    /** A level (the podium, a zone of the tower, the lantern) and its bounds. */
    const level = (name, y, h, x0, x1, z0, z1) => {
        const l = { name, y, h, x0, x1, z0, z1, parts: [], meshes: [], tinted: false };
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
    const custom = {};
    const skinMaterial = (name, extra = {}) => {
        const def = SKIN[name];
        return k.standard(def.c, { roughness: def.r, metalness: def.m || 0, side: THREE.DoubleSide, ...extra }, { e: def.e, ei: def.ei });
    };
    const source = name => custom[name] || (custom[name] = skinMaterial(name));

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

    // ---- Podium: a colonnade with shopfronts set back behind it, and a
    // planted roof terrace level with the tower's fourth floor
    const PX = 6.5, PZ = 4.75;
    const PODIUM = Y0 + 3 * FH;
    {
        const y = 0.45, h = PODIUM - 0.3 - y;
        const l = level(ZONES[0].name, 0.3, PODIUM + 0.25, -PX, PX, -PZ, PZ);
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
            k.box(bay, lit(n), width - 0.16, 2.7, 0.1);
            k.box(bay, 'dark', width, 0.75, 0.16, 0, 2.7, 0);
            [-1, 1].forEach(side => k.box(bay, 'dark', 0.1, 2.7, 0.16, side * (width / 2 - 0.05), 0, 0));
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

        // The roof: a terrace with a parapet and planting, round the foot of the tower
        put(l, 'slab', plate(k.box(g, 'concrete', 13.5, 0.3, 10, 0, PODIUM - 0.3, 0)));
        const terrace = part(0, PODIUM, 0);
        k.box(terrace, 'paving', 13.1, 0.05, 9.6);
        k.box(terrace, 'coping', 13.5, 0.55, 0.22, 0, 0, PZ + 0.14);
        k.box(terrace, 'coping', 0.22, 0.55, 9.8, PX + 0.14, 0, 0);
        k.box(terrace, 'coping', 13.5, 0.55, 0.22, 0, 0, -PZ - 0.14);
        k.box(terrace, 'coping', 0.22, 0.55, 9.8, -PX - 0.14, 0, 0);
        put(l, 'trim', terrace);
        [[4.2, 2.9, 1.05], [4.4, -2.4, 0.9], [-3.6, 3.3, 0.95], [1.9, 3.4, 0.8]].forEach(([x, z, size]) => {
            const planter = part(x, PODIUM + 0.05, z);
            k.box(planter, 'timber', 1.5, 0.5, 1.5);
            tree(k, planter, 0, 0, size).position.y = 0.4;
            put(l, 'planting', planter);
        });
    }

    // ---- The tower's zones, and the lantern
    ZONES.forEach((zone, n) => {
        if (!n) return;
        const y = Y0 + ZONES[n - 1].to * FH, w = width(y);
        level(zone.name, y, (zone.to - ZONES[n - 1].to) * FH, TCX - w, TCX + w, TCZ - w, TCZ + w);
    });
    const lantern = level('Lantern', YL, YTOP - YL, TCX - width(YL), TCX + width(YL), TCZ - width(YL), TCZ + width(YL));
    const towerQty = { plates: 0, glass: 0, column: 0, members: 0, member: 0 };

    // Surfaces of the skin, as triangles with normals, in buckets by material
    const bucket = () => ({ p: [], n: [], area: 0 });
    const PA = [0, 0, 0], PB = [0, 0, 0], PC = [0, 0, 0], E = 1e-3;
    const vertex = (F, y, f, b) => {
        F(y + E, f, PB);
        F(y - E, f, PC);
        const ax = PB[0] - PC[0], ay = PB[1] - PC[1], az = PB[2] - PC[2];
        F(y, f + E, PB);
        F(y, f - E, PC);
        const bx = PB[0] - PC[0], by = PB[1] - PC[1], bz = PB[2] - PC[2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const length = Math.hypot(nx, ny, nz) || 1;
        F(y, f, PA);
        b.p.push(PA[0], PA[1], PA[2]);
        b.n.push(nx / length, ny / length, nz / length);
    };
    /** One panel of a surface F(y, f), between two heights and two fractions across it. */
    const quad = (b, F, y0, y1, f0, f1) => {
        vertex(F, y0, f0, b); vertex(F, y1, f1, b); vertex(F, y0, f1, b);
        vertex(F, y0, f0, b); vertex(F, y1, f0, b); vertex(F, y1, f1, b);
        const p = b.p, o = p.length - 18;
        const cx = p[o + 3] - p[o], cy = p[o + 4] - p[o + 1], cz = p[o + 5] - p[o + 2];        // A to C
        const dx = p[o + 12] - p[o + 6], dy = p[o + 13] - p[o + 7], dz = p[o + 14] - p[o + 8];  // B to D
        b.area += 0.5 * Math.hypot(cy * dz - cz * dy, cz * dx - cx * dz, cx * dy - cy * dx);
    };
    const surfaceMesh = (b, material) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        return k.mesh(g, geometry, material);
    };
    /** A surface on the plan: s and inset as functions of height and of the fraction across. */
    const surf = (sOf, insetOf) => (y, f, out) => {
        plan(sOf(y, f), y, insetOf(f));
        out[0] = TCX + xz[0];
        out[1] = y;
        out[2] = TCZ + xz[1];
    };
    /** One of the eight half faces, from a seam to the corner or from the corner to the next seam. */
    const half = (h, inset) => {
        const q = h >> 1, side = h & 1;
        return surf((y, f) => (side ? lerp(q / 4 + 1 / 8, (q + 1) / 4 - sigma(y), f) : lerp(q / 4 + sigma(y), q / 4 + 1 / 8, f)), () => inset);
    };

    // The skin in rows: a band at each floor, glass between; through the crown
    // the rows go on, between the widening seams
    const rows = [];
    for (let j = 0; j < FLOORS; j++) {
        const y = Y0 + j * FH, l = levels[zoneOf(j)];
        rows.push({ y0: y - 0.04, y1: y + 0.1, l, j }, { y0: y + 0.1, y1: y + FH - 0.04, glass: true, l, j });
    }
    const CROWN = 6, CH = (YTOP - YL) / CROWN;
    for (let r = 0; r < CROWN; r++) {
        const y = YL + r * CH, j = FLOORS + r;
        rows.push({ y0: y - 0.04, y1: y + 0.08, l: lantern, j }, { y0: y + 0.08, y1: r === CROWN - 1 ? YTOP - 0.08 : y + CH - 0.04, glass: true, l: lantern, j });
    }
    rows.push({ y0: YTOP - 0.08, y1: YTOP, l: lantern, j: FLOORS + CROWN });
    const skins = new Map();
    rows.forEach(row => {
        if (!skins.has(row.l)) skins.set(row.l, Array.from({ length: 8 }, () => ({ skin: bucket(), skinLit: bucket(), band: bucket() })));
        const set = skins.get(row.l), crown = row.j >= FLOORS, cols = crown ? 4 : 10;
        for (let h = 0; h < 8; h++) {
            const F = half(h, row.glass ? 0 : -0.012);
            for (let c = 0; c < cols; c++) {
                let hash = Math.imul(row.j + 1, 0x9e3779b1) ^ Math.imul(h * 16 + c + 7, 0x85ebca6b);
                hash = Math.imul(hash ^ (hash >>> 15), 0xc2b2ae35);
                const on = ((hash ^ (hash >>> 13)) >>> 0) % 100 < (crown ? 75 : 42);
                quad(set[h][!row.glass ? 'band' : on ? 'skinLit' : 'skin'], F, row.y0, row.y1, c / cols, (c + 1) / cols);
            }
        }
    });
    skins.forEach((set, l) => set.forEach((b, h) => {
        const face = FACE_OF[((h >> 1) + (h & 1)) % 4];
        ['skin', 'skinLit', 'band'].forEach(name => {
            if (!b[name].p.length) return;
            const mesh = surfaceMesh(b[name], source(name));
            mesh.userData.face = face;
            put(l, 'curtain', mesh);
            if (name !== 'band') towerQty.glass += b[name].area;
        });
    }));
    // The seams: a recess down the middle of each face, as far as the crown
    ZONES.forEach((zone, n) => {
        const b = bucket();
        for (let j = n ? ZONES[n - 1].to : 0; j < zone.to; j++) {
            const y0 = j ? Y0 + j * FH - 0.04 : Y0 - 0.04, y1 = Y0 + (j + 1) * FH - 0.04;
            for (let q = 0; q < 4; q++) {
                quad(b, surf((y, f) => q / 4 + lerp(-SIG0, SIG0, f), () => SEAM_D), y0, y1, 0, 1);
                [-SIG0, SIG0].forEach(side => quad(b, surf(() => q / 4 + side, f => f * SEAM_D), y0, y1, 0, 1));
            }
        }
        put(levels[n], 'curtain', surfaceMesh(b, source('seam')));
    });

    // Floor plates, cast to the plan just inside the skin
    for (let j = 1; j <= FLOORS; j++) {
        if (j === 3) continue;                             // the podium roof is this floor
        const y = Y0 + j * FH, shape = new THREE.Shape();
        let area = 0, px = 0, pz = 0;
        for (let i = 0; i <= 120; i++) {
            plan(i / 120, y, 0.1);
            if (i === 0) shape.moveTo(xz[0], -xz[1]);
            else {
                if (i < 120) shape.lineTo(xz[0], -xz[1]);
                area += px * xz[1] - xz[0] * pz;
            }
            [px, pz] = xz;
        }
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2);
        put(j === FLOORS ? lantern : levels[zoneOf(j)], 'slab', k.mesh(g, geometry, 'concrete', TCX, y - 0.12, TCZ));
        towerQty.plates += Math.abs(area) / 2;
    }

    // The structure: a concrete core that steps in zone by zone, eight mega
    // columns that lean in with the taper, and belt and outrigger trusses
    const colAt = (s, y) => {
        plan(s, y, COL_IN);
        return [TCX + xz[0], y, TCZ + xz[1]];
    };
    ZONES.forEach((zone, n) => {
        const from = n ? ZONES[n - 1].to : 0, segments = [];
        put(levels[n], 'core', k.box(g, 'concrete', zone.core * 2, (zone.to - from) * FH, zone.core * 2, TCX, Y0 + from * FH, TCZ));
        for (let j = from; j < zone.to; j++) {
            COL_S.forEach(s => {
                const a = colAt(s, Y0 + j * FH), b = colAt(s, Y0 + (j + 1) * FH);
                segments.push([...a, ...b]);
                towerQty.column += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * COL_T * COL_T;
            });
        }
        put(levels[n], 'column', k.bars(g, 'concrete', COL_T, segments));
    });
    const steel = (l, segments, thickness) => {
        segments.forEach(s => {
            towerQty.members++;
            towerQty.member += Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]);
        });
        put(l, 'member', k.bars(g, 'steel', thickness, segments));
    };
    OUTRIGGERS.forEach(j => {
        const y0 = Y0 + j * FH + 0.05, y1 = Y0 + (j + 1) * FH - 0.17, C = ZONES[zoneOf(j)].core;
        const segments = [];
        COL_S.forEach(s => {
            const b = colAt(s, y0), t = colAt(s, y1), q = Math.round(s * 4) & 3;
            const u = b[0] - TCX, w = b[2] - TCZ;
            const [cu, cw] = q === 0 ? [C, w] : q === 1 ? [u, C] : q === 2 ? [-C, w] : [u, -C];
            segments.push([TCX + cu, y0, TCZ + cw, ...b], [TCX + cu, y1, TCZ + cw, ...t], [TCX + cu, y0, TCZ + cw, ...t]);
        });
        for (let i = 0; i < 8; i++) {
            const s0 = COL_S[i], s1 = i === 7 ? COL_S[0] + 1 : COL_S[i + 1];
            for (let m = 0; m < 2; m++) {
                const a = lerp(s0, s1, m / 2), b = lerp(s0, s1, (m + 1) / 2);
                const ab = colAt(a, y0), bb = colAt(b, y0), at = colAt(a, y1), bt = colAt(b, y1);
                segments.push([...ab, ...bb], [...at, ...bt], m ? [...at, ...bb] : [...ab, ...bt]);
            }
        }
        steel(levels[zoneOf(j)], segments, 0.05);
    });

    // ---- The lantern: a diagrid inside the four tips of the crown, round a
    // plant core, with a mast and an aviation light at the top
    put(lantern, 'core', k.box(g, 'concrete', 1, 2.2, 1, TCX, YL, TCZ));
    {
        const LR = 6, LM = 16;
        const node = (r, i) => {
            const y = lerp(YL + 0.1, YTOP - 0.25, r / LR);
            plan((i + (r % 2) * 0.5) / LM, y, 0.24);
            return [TCX + xz[0], y, TCZ + xz[1]];
        };
        const lattice = [];
        for (let r = 0; r <= LR; r++) {
            for (let i = 0; i < LM; i++) {
                if (r < LR) lattice.push([...node(r, i), ...node(r + 1, i)], [...node(r, i), ...node(r + 1, r % 2 ? i + 1 : i - 1)]);
                lattice.push([...node(r, i), ...node(r, i + 1)]);
            }
        }
        lattice.push([TCX, YL + 2.2, TCZ, TCX, YTOP + 0.9, TCZ, 0.07]);
        steel(lantern, lattice, 0.045);
    }
    const beacon = k.group(g, TCX, YTOP + 0.95, TCZ);
    k.sphere(beacon, k.basic(['#e5383b', '#ff5a5c']), 0.13);
    k.glow(beacon, 0, 0, 0, 2, '#ff5a5c', 0.8);
    const BEACON_Y = YTOP + 0.95;
    // At night the lantern glows from within
    const lanternGlows = [[YL + 1.2, 3], [YL + 3, 2.6], [YL + 4.6, 2]].map(([y, size]) => ({ y, sprite: k.glow(g, TCX, y, TCZ, size, '#e6efff', 0.55) }));

    // ---- An office floor, where the coordination and documentation beats work
    const STOREY = 5;
    const SY = Y0 + STOREY * FH;
    const C5 = ZONES[zoneOf(STOREY)].core;
    const office = levels[zoneOf(STOREY)];
    const PT = 0.05, PH = 0.8;
    // Partitions [x0, z0, x1, z1] from the axis: a room off the core, with a door, and a wall with a door behind it
    const PARTITIONS = [
        [-0.45 - PT / 2, C5, -0.45 + PT / 2, C5 + 0.35],
        [-0.45 - PT / 2, C5 + 0.7, -0.45 + PT / 2, reach(SY + 0.5, 1, 0.45) - 0.12],
        [C5, -0.4 - PT / 2, 1.55, -0.4 + PT / 2],
        [1.88, -0.4 - PT / 2, reach(SY + 0.5, 0, -0.4) - 0.12, -0.4 + PT / 2]
    ];
    PARTITIONS.forEach(([x0, z0, x1, z1]) => put(office, 'wall', k.box(g, 'wall', x1 - x0, PH, z1 - z0, TCX + (x0 + x1) / 2, SY, TCZ + (z0 + z1) / 2)));
    put(office, 'opening', k.box(g, 'dark', 0.02, 0.62, 0.3, TCX + C5 + 0.01, SY, TCZ)).userData.leaf = true;
    // [hinge x, z, open towards x, z, closed towards x, z, width]
    const DOORS = [[-0.45, C5 + 0.35, -1, 0, 0, 1, 0.35], [1.55, -0.4, 0, -1, 1, 0, 0.33], [C5, -0.15, 1, 0, 0, 1, 0.3]];
    // A downstand beam under the slab above, which the duct to the east runs into
    const BEAM = { x: TCX + 1.4, w: 0.16, depth: 0.28 };
    {
        const z0 = -(reach(SY + 1, 3, 1.4) - 0.3), z1 = reach(SY + 1, 1, -1.4) - 0.3;
        put(office, 'beam', k.box(g, 'concrete', BEAM.w, BEAM.depth, z1 - z0, BEAM.x, SY + FH - 0.12 - BEAM.depth, TCZ + (z0 + z1) / 2));
    }

    // ---- Building services: risers beside the core through every floor, ducts and pipes branching off
    const RX = TCX + 0.35, RZ = TCZ + 1.12;
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
    [[air, 0.26, 0], [chilled, 0.07, -0.22], [sprinkler, 0.07, -0.34], [tray, 0.14, -0.52]]
        .forEach(([material, w, dx]) => run(material, 'y', w, 1, RX + dx, Y0, RZ, 0, YL - 0.3 - Y0, 1));
    // The duct that meets the beam is in five lengths: the middle one can
    // drop below the beam, on an offset at each end
    const DUCT = {
        y: SY + FH - 0.38, h: 0.2, w: 0.3,
        x: [RX + 0.13, BEAM.x - 0.4, BEAM.x - 0.22, BEAM.x + 0.22, BEAM.x + 0.4, TCX + reach(SY + 1, 0, RZ - TCZ) - 0.4]
    };
    const CLEARANCE = 0.0105;                              // 150 mm, at the building's scale
    const DROP = DUCT.y + DUCT.h - (SY + FH - 0.12 - BEAM.depth) + CLEARANCE;
    let ductMid, offsets;
    /** Lay a length of duct between two points of its run, keeping its section upright. */
    const lay = (mesh, x0, y0, x1, y1) => {
        const turn = Math.atan2(y1 - y0, x1 - x0);
        mesh.rotation.z = turn;
        mesh.scale.x = Math.hypot(x1 - x0, y1 - y0);
        mesh.position.set((x0 + x1) / 2 + (Math.sin(turn) * DUCT.h) / 2, (y0 + y1) / 2 - (Math.cos(turn) * DUCT.h) / 2, RZ);
    };
    for (let j = 0; j < FLOORS; j++) {
        if (OUTRIGGERS.includes(j)) continue;              // the trusses take these floors
        const y = Y0 + j * FH, mid = y + 0.6, ru = RZ - TCZ;
        if (j === STOREY) {
            const [a, b, c, d, e, f] = DUCT.x;
            k.box(services, air, b - a, DUCT.h, DUCT.w, (a + b) / 2, DUCT.y, RZ);
            k.box(services, air, f - e, DUCT.h, DUCT.w, (e + f) / 2, DUCT.y, RZ);
            ductMid = k.box(services, air, d - c, DUCT.h, DUCT.w, (c + d) / 2, DUCT.y, RZ);
            offsets = [k.box(services, air, 1, DUCT.h, DUCT.w), k.box(services, air, 1, DUCT.h, DUCT.w)];
        } else {
            const length = reach(mid, 0, ru) - 0.4 - (RX + 0.13 - TCX);
            if (length > 0.25) run(air, 'x', 0.3, 0.2, 0, y + FH - 0.38, RZ, RX + 0.13, length, 1);
        }
        const trayFrom = RX - 0.59 - TCX, trayLength = trayFrom + reach(mid, 2, -ru) - 0.4;
        if (trayLength > 0.25) run(tray, 'x', 0.14, 0.045, 0, y + FH - 0.175, RZ, TCX + trayFrom, trayLength, -1);
        const chilledFrom = RX - 0.22 - TCX, chilledLength = chilledFrom + reach(mid, 2, -(ru + 0.2)) - 0.4;
        run(chilled, 'z', 0.07, 0.07, RX - 0.22, y + FH - 0.3, 0, RZ, 0.2, 1);
        if (chilledLength > 0.25) run(chilled, 'x', 0.07, 0.07, 0, y + FH - 0.3, RZ + 0.2, TCX + chilledFrom, chilledLength, -1);
        const sprinklerLength = reach(mid, 1, -(RX - 0.34 - TCX)) - 0.4 - (ru + 0.035);
        if (sprinklerLength > 0.25) run(sprinkler, 'z', 0.07, 0.07, RX - 0.34, y + FH - 0.52, 0, RZ + 0.035, sprinklerLength, 1);
    }

    // ---- One material per class of element (and, for glazing, per facade),
    // in place of the shared ones: a class can then fade, take a tint or be
    // cut by the section plane without touching the rest. The quantities of
    // the 5D beat are measured from the same elements.
    const named = new Map(['concrete', 'coping', 'wall', 'roof', 'paving', 'dark', 'glass', 'glassLit', 'timber', 'metal', 'steel', 'leaf', 'leafDark', 'trunk']
        .map(name => [k.mat(name), name]));
    Object.keys(custom).forEach(name => named.set(custom[name], name));
    const variants = [], byKey = {};
    const boxQty = { slab: 0, column: 0, columns: 0, curtain: 0 };
    const variant = (kind, face, name) => {
        const glazed = GLAZED.has(name) && (kind === 'curtain' || kind === 'opening');
        const key = `${kind}|${glazed ? face : ''}|${name}`;
        if (!byKey[key]) {
            const extra = { transparent: true, clippingPlanes: [cut], clipShadows: true };
            byKey[key] = {
                material: SKIN[name] ? skinMaterial(name, extra) : k.mat(name, extra),
                kind, face: glazed ? face : -1, base: new THREE.Color(), glow: new THREE.Color(), ei: 0
            };
            variants.push(byKey[key]);
        }
        return byKey[key].material;
    };
    levels.forEach(l => l.parts.forEach(([object, filed]) => {
        const face = object.userData.face ?? ((Math.round(object.rotation.y / (Math.PI / 2)) % 4) + 4) % 4;
        const visit = (o, inherited) => {
            const kind = o.userData.kind || inherited;
            const name = o.isMesh && named.get(o.material);
            if (name) {
                o.material = variant(kind, face, name);
                o.castShadow = true;
                o.userData.kind = kind;
                if (kind !== 'planting') l.meshes.push([o, o.material]);
                if (o.geometry === k.GEO.box) {
                    if (o.userData.plate) boxQty.slab += o.scale.x * o.scale.z;
                    else if (kind === 'column') {
                        boxQty.columns++;
                        boxQty.column += o.scale.x * o.scale.y * o.scale.z;
                    } else if (kind === 'curtain' && name !== 'dark') boxQty.curtain += o.scale.x * o.scale.y;
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
    /** Flat rectangles [x0, z0, x1, z1] and triangles [[x, z] × 3] at height 0, as one geometry. */
    const flats = (rects, tris = []) => {
        const position = [];
        rects.forEach(([x0, z0, x1, z1]) => position.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0));
        tris.forEach(([x, z]) => position.push(x, 0, z));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        return geometry;
    };
    const CX = GX + TCX, CZ = GZ + TCZ;                    // the tower's axis, in the scene's space

    // ---- Beat 1, coordination: the duct through the beam
    const DUCT_AXIS = DUCT.y + DUCT.h / 2;
    const CLASH = new THREE.Vector3(GX + BEAM.x, DUCT.y + DUCT.h / 2, GZ + RZ);
    const clashLine = k.lineMaterial('signal', { transparent: true });
    const clashFill = k.basic('signal', { transparent: true, opacity: 0.2, depthWrite: false });
    const CLASH_SIZE = [BEAM.w + 0.42, DUCT.h + 0.38, DUCT.w + 0.38];
    const clashBox = k.group(null, CLASH.x, CLASH.y, CLASH.z);
    over(edgesOf(clashLine), clashBox);
    over(new THREE.Mesh(k.GEO.box, clashFill), clashBox);
    // Its tag stands clear of the tower, on a leader
    const CLASH_TAG = new THREE.Vector3(CLASH.x + 5.6, CLASH.y + 2, CLASH.z - 5.6);
    const clashLeader = over(k.lines(null, clashLine, [CLASH.x + 0.15, CLASH.y, CLASH.z - 0.15, CLASH_TAG.x, CLASH_TAG.y, CLASH_TAG.z]));
    const clashTag = k.label().at(CLASH_TAG.x, CLASH_TAG.y, CLASH_TAG.z);

    // ---- Beat 2, documentation: a section plane, and the plan it yields.
    // The plan is drawn from the model's own geometry where the plane cuts
    // it: the curtain wall and its seams, partitions, mega columns, the core,
    // then the doors and a dimension.
    const CUT = SY + 0.5, SKY = YTOP + 2.5;
    const PS = 2;                                          // the plan is laid out larger than the model
    const PLAN = { x: 2, y: 0.06, z: -15.5 };            // where it lies, from the tower's axis
    const wc = width(CUT), sc = sigma(CUT);
    const P = (s, inset) => {
        plan(s, CUT, inset);
        return [xz[0], xz[1]];
    };
    const segments = [];                                   // the plan, [x0, z0, x1, z1] in the order it is drawn
    const join = (a, b) => segments.push([a[0], a[1], b[0], b[1]]);
    const outline = ([x0, z0, x1, z1]) => segments.push([x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]);
    const caps = [], capTris = [], fills = [];
    for (let q = 0; q < 4; q++) {
        const from = q / 4 + sc, to = (q + 1) / 4 - sc;
        let o = P(from, 0), i = P(from, SKIN_T);
        for (let n = 1; n <= 24; n++) {
            const s = lerp(from, to, n / 24), o2 = P(s, 0), i2 = P(s, SKIN_T);
            join(o, o2);
            join(i, i2);
            capTris.push(o, o2, i2, o, i2, i);
            o = o2;
            i = i2;
        }
        const s = (q + 1) / 4, a = P(s - sc, 0), b = P(s - sc, SEAM_D), c = P(s + sc, SEAM_D), d = P(s + sc, 0);
        join(a, b);
        join(b, c);
        join(c, d);
    }
    PARTITIONS.forEach(rect => {
        outline(rect);
        caps.push(rect);
    });
    const fillFrom = segments.length;
    COL_S.forEach(s => {
        const [x, z] = P(s, COL_IN), rect = [x - COL_T / 2, z - COL_T / 2, x + COL_T / 2, z + COL_T / 2];
        outline(rect);
        caps.push(rect);
        fills.push(rect);
    });
    const fillTo = segments.length;
    {
        // The core is hollow: its walls, a bank of lifts and a stair
        const w = 0.12, x0 = -C5, z0 = -C5, x1 = C5, z1 = C5, mx = 0, mz = 0;
        outline([x0, z0, x1, z1]);
        caps.push([x0, z0, x1, z0 + w], [x0, z1 - w, x1, z1], [x0, z0 + w, x0 + w, z1 - w], [x1 - w, z0 + w, x1, z1 - w]);
        outline([x0 + w, z0 + w, x1 - w, z1 - w]);
        segments.push([mx, z0 + w, mx, z1 - w], [x0 + w, mz, mx, mz]);
        [[z0 + w, mz], [mz, z1 - w]].forEach(([a, b]) => segments.push([x0 + w, a, mx, b], [x0 + w, b, mx, a]));
        for (let n = 1; n < 8; n++) segments.push([mx, z0 + w + (n * (z1 - z0 - 2 * w)) / 8, x1 - w, z0 + w + (n * (z1 - z0 - 2 * w)) / 8]);
    }
    // Doors, each as its leaf and its swing
    DOORS.forEach(([x, z, ax, az, bx, bz, r]) => {
        segments.push([x, z, x + ax * r, z + az * r]);
        for (let n = 0; n < 6; n++) {
            const a0 = (n / 6) * Math.PI / 2, a1 = ((n + 1) / 6) * Math.PI / 2;
            segments.push([
                x + r * (Math.cos(a0) * ax + Math.sin(a0) * bx), z + r * (Math.cos(a0) * az + Math.sin(a0) * bz),
                x + r * (Math.cos(a1) * ax + Math.sin(a1) * bx), z + r * (Math.cos(a1) * az + Math.sin(a1) * bz)
            ]);
        }
    });
    // The width of the floor plate
    const DIM = -(wc + 0.45);
    segments.push(
        [-wc, -wc * 0.5, -wc, DIM - 0.15], [wc, -wc * 0.5, wc, DIM - 0.15], [-wc, DIM, wc, DIM],
        [-wc - 0.1, DIM + 0.1, -wc + 0.1, DIM - 0.1], [wc - 0.1, DIM + 0.1, wc + 0.1, DIM - 0.1]);

    const sheet = k.group(null, CX + PLAN.x, PLAN.y, CZ + PLAN.z);
    sheet.scale.setScalar(PS);
    const planLine = k.lineMaterial('ink', { transparent: true });
    const planLines = over(k.lines(sheet, planLine, segments.flatMap(([x0, z0, x1, z1]) => [x0, 0, z0, x1, 0, z1])), sheet);
    const planFill = k.basic('ink', { transparent: true, side: THREE.DoubleSide, depthWrite: false });
    over(new THREE.Mesh(flats(fills), planFill), sheet);
    const capFill = k.basic('ink', { transparent: true, side: THREE.DoubleSide });
    const capMesh = over(new THREE.Mesh(flats(caps, capTris), capFill));
    capMesh.position.set(CX, CUT + 0.012, CZ);

    // The plane itself, and the outline of what it cuts
    const section = k.group(null, GX, 0, GZ);
    const sectionFill = k.basic('signal', { transparent: true, opacity: 0.1, depthWrite: false });
    const sectionLine = k.lineMaterial('signal', { transparent: true });
    const sectionSheet = over(new THREE.Mesh(k.GEO.box, sectionFill), section);
    sectionSheet.scale.set(W0 * 2 + 2, 0.001, W0 * 2 + 2);
    sectionSheet.position.set(TCX, 0, TCZ);
    const RING = 120;
    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING * 3), 3));
    const sectionRing = over(new THREE.LineLoop(ringGeometry, sectionLine), section);
    sectionRing.frustumCulled = false;

    // Projection lines from the corners of the cut down to the plan, in dashes
    const DASHES = 26;
    const projection = [];
    const corners = [0, 1, 2, 3].map(q => P(1 / 8 + q / 4, 0));
    for (let n = 0; n < DASHES; n++) {
        corners.forEach(([x, z]) => {
            const a = n / DASHES, b = (n + 0.55) / DASHES;
            const to = [CX + PLAN.x + PS * x, CZ + PLAN.z + PS * z];
            projection.push(
                lerp(CX + x, to[0], a), lerp(CUT, PLAN.y, a), lerp(CZ + z, to[1], a),
                lerp(CX + x, to[0], b), lerp(CUT, PLAN.y, b), lerp(CZ + z, to[1], b));
        });
    }
    const projectionLine = k.lineMaterial('ink', { transparent: true });
    const projectionLines = over(k.lines(null, projectionLine, projection));

    const realLevel = 14 + Math.round(((STOREY - 3) * 25) / 6);
    const planTag = k.label(`Level ${realLevel} plan · 1:500`, 'generated from the model').at(CX + PLAN.x - wc * PS, PLAN.y, CZ + PLAN.z - wc * PS);
    const dimTag = k.label(`${(2 * wc * REAL).toFixed(1)} m`, '', 'mini').at(CX + PLAN.x, PLAN.y, CZ + PLAN.z + PS * (DIM - 0.4));

    // ---- Beat 3, quantities and cost: one class of element at a time,
    // measured from the model and taken to the building's scale
    const whole = x => Math.round(x).toLocaleString('en-US');
    const Q = {
        slab: (boxQty.slab + towerQty.plates * STACK) * REAL * REAL,
        column: (boxQty.column + towerQty.column) * REAL ** 3, columns: boxQty.columns + COL_S.length,
        curtain: (boxQty.curtain + towerQty.glass) * REAL * REAL,
        member: towerQty.member * REAL, members: towerQty.members
    };
    const CLASSES = [
        { kind: 'slab', rate: BIM_RATES.slab, unit: 'm²', amount: Q.slab, name: c => `IfcSlab · ${whole(Q.slab * c)} m²` },
        { kind: 'column', rate: BIM_RATES.column, unit: 'm³', amount: Q.column, name: c => `IfcColumn · ${Math.round(Q.columns * c)} no. · ${whole(Q.column * c)} m³` },
        { kind: 'curtain', rate: BIM_RATES.curtain, unit: 'm²', amount: Q.curtain, name: c => `IfcCurtainWall · ${whole(Q.curtain * c)} m²` },
        { kind: 'member', rate: BIM_RATES.member, unit: 'm', amount: Q.member, name: c => `IfcMember · ${Math.round(Q.members * c)} no. · ${whole(Q.member * c)} m` }
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
    const beside = (y, m, x = TCX - W0, z = TCZ + W0) => v0.set(GX + x - m * Math.SQRT1_2, y, GZ + z + m * Math.SQRT1_2);
    const scheduleTag = k.label('', '', 'query');
    scheduleTag.position.copy(beside(17, 6.5));

    // ---- Beat 4, programme and energy: an outline round the zone in progress
    const progress = k.standard('accent', { roughness: 0.5 }, { e: 'accent', ei: [0, 0.5] });
    const bandLine = k.lineMaterial('accent', { transparent: true });
    levels.forEach((l, n) => {
        const points = [];
        if (n === 0) {
            const x0 = l.x0 - 0.35, x1 = l.x1 + 0.35, z0 = l.z0 - 0.35, z1 = l.z1 + 0.35;
            [l.y, l.y + l.h].forEach(y => points.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0));
            [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z]) => points.push(x, l.y, z, x, l.y + l.h, z));
        } else {
            const ring = (y, s) => {
                plan(s, y, -0.3);
                return [TCX + xz[0], y, TCZ + xz[1]];
            };
            [l.y, l.y + l.h].forEach(y => {
                for (let i = 0; i < 72; i++) points.push(...ring(y, i / 72), ...ring(y, (i + 1) / 72));
            });
            for (let q = 0; q < 4; q++) points.push(...ring(l.y, 1 / 8 + q / 4), ...ring(l.y + l.h, 1 / 8 + q / 4));
        }
        l.ring = k.lines(g, bandLine, points);
        l.ring.renderOrder = 2;
        l.ring.visible = false;
    });
    const weekTag = k.label('', '', 'mini');

    // The sun crosses the sky from the east to the south-west, over the tower
    const SUN = { x: CX, y: 17, z: CZ, r: 24, from: 0.66, to: Math.PI - 0.66 };
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
    energyTag.position.copy(beside(17, 6.5));

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
            clashTag.set(resolved ? 'Resolved' : 'Clash 1', resolved ? `Clearance ${Math.round(CLEARANCE * REAL * 100) * 10} mm` : 'IfcDuctSegment × IfcBeam')
                .tone(resolved ? 'ok' : 'signal');
        }
        clashTag.show(clash * Math.min(1, Math.abs(u1 - 3.35) / 0.15));

        // ---- Beat 2: the section plane comes down, and the plan is drawn from the cut
        const cutY = track([[0.25, SKY], [1.45, CUT], [4.5, CUT], [5.3, SKY]], u2);
        cut.constant = k.root.position.y + k.root.scale.y * cutY;
        const cutting = pulse(u2, 0.15, 5.4, 0.25);
        section.visible = cutting > 0.01;
        section.position.y = cutY;
        sectionFill.opacity = 0.1 * cutting;
        sectionRing.visible = cutting > 0.01 && cutY < YTOP;
        if (sectionRing.visible) {
            const ring = ringGeometry.attributes.position;
            for (let i = 0; i < RING; i++) {
                plan(i / RING, cutY, -0.05);
                ring.setXYZ(i, TCX + xz[0], 0, TCZ + xz[1]);
            }
            ring.needsUpdate = true;
        }
        sectionLine.opacity = cutting;
        beacon.visible = cutY > BEACON_Y + 0.2;
        lanternGlows.forEach(({ y, sprite }) => { sprite.visible = cutY > y; });

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
        if (scheduled > 0) scheduleTag.set(item.name(counted), `× $${whole(item.rate)}/${item.unit} · Total $${total.toFixed(1)} M`);
        scheduleTag.show(scheduled);

        // ---- Beat 4: a zone at a time in progress, then the sun on the glazing
        const building = u4 > 0.35 && u4 < 2.65;
        const programme = seg(u4, 0.35, 2.65);
        const active = building ? Math.min(levels.length - 1, Math.floor(programme * levels.length)) : -1;
        levels.forEach((l, n) => {
            const on = n === active;
            l.ring.visible = on;
            if (on === l.tinted) return;
            l.tinted = on;
            l.meshes.forEach(([mesh, material]) => { mesh.material = on ? progress : material; });
        });
        const weeks = pulse(u4, 0.3, 2.75, 0.2);
        if (weeks > 0) {
            const l = levels[Math.min(levels.length - 1, Math.floor(programme * levels.length))];
            weekTag.set(`Month ${Math.min(BIM_MONTHS, 1 + Math.floor(programme * BIM_MONTHS))} of ${BIM_MONTHS}`, `${l.name} in progress`);
            weekTag.position.copy(beside(l.y + l.h / 2, 4.5, l.x0, l.z1));
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
            let opacity = v.kind === 'column' || v.kind === 'core' || v.kind === 'beam' || v.kind === 'member' ? 1 : lerp(1, 0.2, xray);
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
    scale: 0.38,
    reach: 0.16,
    alt: 'One model of a supertall after Seoul\'s Lotte World Tower, a tapering, seamed tower of silver glass rising from a podium to an open lattice lantern, yields four outputs in turn: a clash between a duct and a beam on an office floor is found and resolved, the floor plan is cut from the tower and drawn beside it, slabs, mega columns, curtain wall and steel members are measured and priced, and the programme, zone by zone, and the solar exposure of the glazing are played over the facade.',
    build
};
