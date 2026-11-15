import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, v0, building, tree } from './props.js';
import { captions, frame } from './overlays.js';

// The colour of each class of element, where a format knows what an element is
const CLASS = {
    wall: ['#5b8def', '#6f9cf5'], slab: ['#8d99ae', '#9aa7bf'], roof: ['#8d99ae', '#9aa7bf'], column: ['#f4a259', '#f7b170'],
    window: ['#f6cf52', '#ffd966'], door: ['#ef476f', '#f46a8a'], plant: ['#2ec4a0', '#45d6b2'], site: ['#cfd4da', '#77839e']
};
const IFC = { wall: 'IfcWall', window: 'IfcWindow', door: 'IfcDoor', slab: 'IfcSlab', roof: 'IfcRoof', column: 'IfcColumn' };
const MOVED = 0.2;                   // how far the wall is moved in the game engine, m
const GUID = '2O2Fr$t4X7Zf8NOew3FLOH';

/**
 * A building whose model makes a journey between formats and back. Four
 * beats: the model is shown as its three layers (geometry, a property card
 * on each element, threads for what contains what); a plain mesh export
 * keeps the geometry and drops the rest; a mapped export carries each class
 * across, turns the axes from Z-up to Y-up, converts the units and ties the
 * threads again; and a wall moved in the game engine comes back to the BIM,
 * matched by its GUID. The counts on screen are of the cards, threads and
 * elements that are there.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.8, END = 23.3;
    const b = building(k, { nx: 2, nz: 2, storeys: 3, plant: 'solar', x: 0.2, z: -1.4 });
    const g = b.group, { W, D } = b;
    const GX = g.position.x, GZ = g.position.z;
    tree(k, null, -6.2, -3.6, 1.2);
    k.root.updateMatrixWorld(true);

    // The wall that is followed all the way, with the window it hosts
    const WALL = b.storeys[1].walls[7], WINDOW = b.storeys[1].windows[3];
    WALL.attach(WINDOW);
    const wallHome = WALL.position.z;

    // ---- Two more looks for every part: an untextured mesh, and the colour of its class
    const meshLook = k.standard(['#b9bec6', '#8a95b0'], { roughness: 1 });
    const meshGlass = k.standard(['#8c9db3', '#5f7090'], { roughness: 0.5 });
    const triangles = k.lineMaterial(['#263348', '#eef3ff'], { transparent: true, opacity: 0.55 });
    const classLook = {};
    const classOf = kind => classLook[kind] || (classLook[kind] = k.standard(CLASS[kind] || CLASS.site, { roughness: 0.9 }, { e: CLASS[kind] || CLASS.site, ei: [0, 0.35] }));
    const glass = [k.mat('glass'), k.mat('glassLit')];
    const parts = [];
    g.traverse(o => {
        if (!o.isMesh) return;
        let kind = 'site';
        for (let p = o; p && p !== g; p = p.parent) {
            if (p.userData.kind) {
                kind = p.userData.kind;
                break;
            }
        }
        const isGlass = glass.includes(o.material), isBox = o.geometry === k.GEO.box;
        const lines = new THREE.LineSegments(isBox ? k.GEO.wire : k.own(new THREE.WireframeGeometry(o.geometry)), triangles);
        lines.visible = false;
        o.add(lines);
        o.getWorldPosition(v0);
        parts.push({
            mesh: o, lines, stage: 0, order: clamp01(v0.y / b.top),
            looks: [o.material, isGlass ? meshGlass : meshLook, classOf(isGlass && kind !== 'door' ? 'window' : kind)]
        });
    });
    const SWEEP = 1.5;
    const LOSSY = B2 + 0.7, MAPPED = B3 + 0.3, DRESSED = B3 + 1;      // when each sweep starts up the model

    // ---- Layer 2: a property card on a choice of elements, from all four faces
    const picked = [];
    b.storeys.forEach((st, s) => {
        const pick = (list, n) => picked.push(list[n]);
        if (s === 0) [7, 1].forEach(n => pick(st.walls, n)), [0, 3, 6].forEach(n => pick(st.windows, n));
        if (s === 1) [7, 2].forEach(n => pick(st.walls, n)), [0, 2, 4].forEach(n => pick(st.windows, n)), picked.push(st.slab);
        if (s === 2) [6, 5].forEach(n => pick(st.walls, n)), [1, 5].forEach(n => pick(st.windows, n)), picked.push(st.slab);
    });
    picked.push(b.roof[0]);

    const paper = k.standard(['#ffffff', '#e9eefb'], { roughness: 0.7 }, { e: '#dfe7ff', ei: [0, 0.3] });
    const inkLine = k.standard(['#4a5568', '#33415f'], { roughness: 0.8 });
    const leaderMaterial = k.lineMaterial('ink', { transparent: true, opacity: 0.5 });
    const cards = picked.map((element, n) => {
        const kind = element.userData.kind, storey = Math.min(2, element.userData.storey);
        const flat = kind === 'slab' || kind === 'roof';
        // Where the element is, and which way it faces: a slab's card stands off a corner
        const turn = flat ? Math.PI / 4 + (n % 2) * Math.PI : element.rotation.y;
        const nx = Math.sin(turn), nz = Math.cos(turn);
        const at = element.getWorldPosition(new THREE.Vector3());
        if (flat) at.set(GX + Math.sign(nx) * (W / 2 - 0.2), at.y + 0.15, GZ + Math.sign(nz) * (D / 2 - 0.2));
        else at.y += kind === 'door' ? 1.3 : 1.45;
        const reach = (flat ? 1.5 : 1.25) + (n % 3) * 0.28;
        const out = new THREE.Vector3(at.x + nx * reach, at.y + 0.35 + (n % 2) * 0.3, at.z + nz * reach);
        const card = k.group(null, out.x, out.y, out.z);
        card.rotation.y = turn;
        // Read from either side: a band in the colour of its class, and lines of properties
        const sheet = k.group(card);
        sheet.scale.setScalar(1.5);
        k.box(sheet, paper, 1.02, 0.66, 0.035, 0, -0.33, 0);
        [0.021, -0.021].forEach(z => {
            k.box(sheet, classOf(kind), 0.94, 0.13, 0.006, 0, 0.16, z);
            [[0.72, 0.03], [0.5, -0.1], [0.62, -0.23]].forEach(([w, y]) => k.box(sheet, inkLine, w, 0.045, 0.006, -0.47 + 0.04 + w / 2, y, z));
        });
        const leader = k.lines(card, leaderMaterial, [0, -0.3, 0, 0, at.y - out.y, -reach]);
        return { card, leader, at, out, kind, storey, order: clamp01(at.y / b.top), turn, n };
    });
    const ROUND = cards.find(c => c.card && picked[c.n] === WALL);

    // ---- Layer 3: threads for what contains what: element, storey, building
    const threadMaterial = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const nodeMaterial = k.basic('accent', { transparent: true });
    const HUB = new THREE.Vector3(GX, b.top + 3.1, GZ);
    const storeyNodes = [0, 1, 2].map(s => new THREE.Vector3(GX + (s - 1) * 1.7, b.top + 1.9, GZ));
    const threadPoints = [], nodes = [];
    storeyNodes.forEach(node => {
        threadPoints.push(HUB.x, HUB.y, HUB.z, node.x, node.y, node.z);
        nodes.push(k.sphere(null, nodeMaterial, 0.17, node.x, node.y, node.z));
    });
    nodes.push(k.sphere(null, nodeMaterial, 0.26, HUB.x, HUB.y, HUB.z));
    cards.forEach(({ at, storey, turn }) => {
        const node = storeyNodes[storey];
        // From the element, out over the eaves, to its storey
        const ex = at.x + Math.sin(turn) * 0.55, ez = at.z + Math.cos(turn) * 0.55, ey = b.top + 0.95;
        threadPoints.push(at.x, at.y, at.z, ex, ey, ez, ex, ey, ez, node.x, node.y, node.z);
        nodes.push(k.sphere(null, nodeMaterial, 0.09, at.x + Math.sin(turn) * 0.12, at.y, at.z + Math.cos(turn) * 0.12));
    });
    const threads = k.lines(null, threadMaterial, threadPoints);
    threads.renderOrder = 2;
    const RELATIONS = cards.length + storeyNodes.length;
    const hubTag = k.label('IfcBuilding', '', 'mini').at(HUB.x, HUB.y + 0.75, HUB.z);
    const storeyTag = k.label('IfcBuildingStorey', '', 'mini').at(storeyNodes[2].x + 1.6, storeyNodes[2].y + 0.1, storeyNodes[2].z);

    // ---- The mapping table: one row a class, counted from the model
    const count = {};
    b.elements.forEach(element => { count[element.userData.kind] = (count[element.userData.kind] || 0) + 1; });
    const ROWS = [['wall', 'Wall prefab'], ['window', 'Window prefab'], ['door', 'Door prefab'], ['slab', 'Floor mesh'], ['column', 'Column mesh']]
        .map(([kind, target], n) => k.label(`${IFC[kind]} × ${count[kind]}  →  ${target}`, '', 'mini').at(GX - 4.6, 8.9 - n * 1.05, GZ + 4.6));

    // ---- The axes of the model: Z is up in the BIM, Y in the game engine
    const AXES = new THREE.Vector3(GX + W / 2 + 2.1, 0.05, GZ + D / 2 + 1.5);
    const gizmo = k.group(null, AXES.x, AXES.y, AXES.z);
    const axisTags = [['X', '#e5484d', [1, 0, 0]], ['Y', '#3fb950', [0, 1, 0]], ['Z', '#3b82f6', [0, 0, 1]]].map(([name, colour, [x, y, z]]) => {
        const material = k.basic(colour);
        k.bars(gizmo, material, 0.08, [[0, 0, 0, x * 1.5, y * 1.5, z * 1.5]]);
        k.box(gizmo, material, 0.22, 0.22, 0.22, x * 1.5, y * 1.5 - 0.11, z * 1.5);
        return { tag: k.label(name, '', 'mini'), tip: new THREE.Vector3(x, y, z).multiplyScalar(1.95) };
    });
    const axesTag = k.label();

    // ---- The units: one dimension, read in each format
    const DIM = { x0: GX - W / 2, x1: GX + W / 2, y: 0.4, z: GZ + D / 2 + 2 };
    const dimLine = k.lineMaterial('ink', { transparent: true });
    const dimension = k.lines(null, dimLine, [
        DIM.x0, DIM.y, DIM.z, DIM.x1, DIM.y, DIM.z,
        DIM.x0, DIM.y, DIM.z - 0.3, DIM.x0, DIM.y, DIM.z + 0.3, DIM.x1, DIM.y, DIM.z - 0.3, DIM.x1, DIM.y, DIM.z + 0.3,
        DIM.x0 - 0.15, DIM.y, DIM.z + 0.15, DIM.x0 + 0.15, DIM.y, DIM.z - 0.15, DIM.x1 - 0.15, DIM.y, DIM.z + 0.15, DIM.x1 + 0.15, DIM.y, DIM.z - 0.15
    ]);
    dimension.renderOrder = 2;
    const dimTag = k.label();

    // ---- The round trip: the wall, where it was, and the handle that moves it
    const wallAt = WALL.getWorldPosition(new THREE.Vector3());
    const moveLine = k.lineMaterial('signal', { transparent: true });
    const ghost = frame(k, null, moveLine, 3.02, 2.72, 0.24, wallAt.x, wallAt.y - 0.01, wallAt.z - 0.1);
    const handle = k.group(null, wallAt.x, wallAt.y + 1.35, wallAt.z);
    [['#e5484d', [1, 0, 0]], ['#3fb950', [0, 1, 0]], ['#3b82f6', [0, 0, 1]]].forEach(([colour, [x, y, z]]) => {
        const material = k.basic(colour);
        k.bars(handle, material, 0.06, [[0, 0, 0, x * 1.1, y * 1.1, z * 1.1]]);
        k.mesh(handle, k.own(new THREE.ConeGeometry(0.11, 0.3, 12).translate(0, 0.15, 0)), material, x * 1.1, y * 1.1, z * 1.1)
            .rotation.set(z ? Math.PI / 2 : 0, 0, x ? -Math.PI / 2 : 0);
    });
    const moveTag = k.label().at(wallAt.x + 0.9, wallAt.y + 2.9, wallAt.z + 0.3);
    const offsetTag = k.label('', '', 'mini').at(wallAt.x + 1.9, wallAt.y + 0.5, wallAt.z + 0.6);
    const cardTag = k.label(`${IFC.wall} · W-12`, `FireRating 2 h · GUID ${GUID.slice(0, 10)}`);

    const formatTag = k.label('', '', 'query').at(GX, b.top + 5.4, GZ);
    const caption = captions(k, [
        [B1, B2, 'What a model is · geometry, properties, relationships'],
        [B2, B3, 'Lossy export · a mesh keeps only the geometry'],
        [B3, B4, 'Mapped export · classes, axes and units carried across'],
        [B4, END, 'Round trip · a change comes back, matched by GUID']
    ]);
    const homes = new Map(b.elements.map(element => [element, element.position.clone()]));

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;

        // ---- Every part: as the BIM has it, as a bare mesh, or in the colour of its class
        parts.forEach(part => {
            const stage = t >= DRESSED + part.order * SWEEP ? 0 : t >= MAPPED + part.order * SWEEP ? 2 : t >= LOSSY + part.order * SWEEP ? 1 : 0;
            if (stage === part.stage) return;
            part.stage = stage;
            part.mesh.material = part.looks[stage];
            part.lines.visible = stage === 1;
        });

        // ---- The cards: out of their elements, dropped by the mesh export, back with the mapped one
        let kept = 0;
        cards.forEach(c => {
            const out = easeOut(seg(u1, 0.3 + c.order * 1.4, 0.9 + c.order * 1.4));
            const dropAt = LOSSY + c.order * SWEEP, backAt = B3 + 4.2 + c.order * 0.7;
            const fall = t < backAt ? smooth(seg(t, dropAt, dropAt + 0.8)) : 1 - easeOut(seg(t, backAt, backAt + 0.6));
            if (out >= 1 && fall <= 0) kept++;
            const shown = out * (1 - seg(fall, 0.75, 1)) * (1 - smooth(seg(t, END, END + 0.6)));
            c.card.visible = shown > 0.01;
            c.card.scale.setScalar(Math.max(0.001, shown));
            c.card.position.lerpVectors(c.at, c.out, out);
            c.card.position.y = lerp(c.card.position.y, 0.4, fall * fall);
            c.card.position.x += Math.sin(c.turn) * 1.1 * fall;
            c.card.position.z += Math.cos(c.turn) * 1.1 * fall;
            c.card.rotation.x = fall * (1.2 + (c.n % 3) * 0.5);
            c.leader.visible = fall < 0.02;
        });
        const tied = Math.min(seg(u1, 2.5, 4.2), 1 - seg(t, LOSSY, LOSSY + 0.9)) + seg(u3, 4.5, 5.4) - smooth(seg(t, END, END + 0.6));
        threads.visible = tied > 0.005;
        threads.geometry.setDrawRange(0, Math.round((threadPoints.length / 6) * clamp01(tied)) * 2);
        threadMaterial.opacity = 0.85;
        nodeMaterial.opacity = clamp01(tied * 3);
        nodes.forEach(node => { node.visible = tied > 0.005; });
        hubTag.show(clamp01(tied * 2 - 1));
        storeyTag.show(clamp01(tied * 2 - 1));
        const relations = Math.round(RELATIONS * clamp01(tied));

        // ---- The mapping table, a row at a time
        ROWS.forEach((row, n) => row.show(pulse(u3, 0.3 + n * 0.28, 5.5, 0.25)));

        // ---- The axes: read unmapped, the model lies on its side; mapped, it stands
        const tip = smooth(seg(u3, 2.5, 3.1)), mapped = smooth(seg(u3, 3.5, 4.2));
        const lean = (Math.PI / 2) * tip * (1 - mapped);
        g.rotation.x = lean;
        g.position.y = (D / 2 + 0.8) * Math.sin(lean);
        const engine = t >= END ? 1 - smooth(seg(t, END, END + 0.6)) : tip;
        gizmo.rotation.x = (-Math.PI / 2) * (1 - engine);
        const axes = pulse(t, B3 + 1.9, END + 0.3, 0.4);
        gizmo.visible = axes > 0.01;
        gizmo.scale.setScalar(Math.max(0.001, easeOut(axes)));
        axisTags.forEach(({ tag, tip: point }) => {
            v0.copy(point).applyEuler(gizmo.rotation).add(AXES);
            tag.at(v0.x, v0.y, v0.z).show(axes > 0.9 ? 1 : 0);
        });
        const state = u3 < 2.5 ? ['IFC · Z is up', ''] : u3 < 3.5 ? ['Read as Y-up', 'The model lies on its side'] : ['Axes mapped', '(x, y, z)  →  (x, z, −y)'];
        axesTag.set(state[0], state[1]).tone(u3 < 2.5 ? '' : u3 < 3.5 ? 'signal' : 'ok')
            .at(AXES.x, AXES.y + 2.2, AXES.z).show(pulse(u3, 1.9, 5.5, 0.3) * Math.min(1, Math.abs(u3 - 2.5) / 0.12, Math.abs(u3 - 3.5) / 0.12));

        // ---- The units
        const measured = pulse(u3, 3.9, 5.5, 0.3);
        dimension.visible = measured > 0.01;
        dimLine.opacity = measured;
        const metres = u3 >= 4.6;
        dimTag.set(metres ? `${W.toFixed(2)} m` : `${Math.round(W * 1000)} mm`, metres ? 'Units converted · × 0.001' : 'IFC length unit: millimetre')
            .tone(metres ? 'ok' : '').at(DIM.x0 + 0.6, DIM.y, DIM.z).show(measured * Math.min(1, Math.abs(u3 - 4.6) / 0.12));

        // ---- The round trip: the wall is moved, and comes back as the same wall
        const move = t >= END ? 1 - smooth(seg(t, END + 0.3, END + 0.9)) : smooth(seg(u4, 1.1, 2.1));
        WALL.position.z = wallHome + MOVED * move;
        const editing = pulse(u4, 0.4, 2.9, 0.3), returned = u4 >= 3.1;
        handle.visible = editing > 0.01;
        handle.scale.setScalar(Math.max(0.001, easeOut(editing)));
        handle.position.z = wallAt.z + MOVED * move + 0.12;
        const compared = pulse(u4, 0.9, 5.3, 0.3);
        ghost.visible = compared > 0.01;
        moveLine.opacity = compared * (returned ? 0.5 : 0.7 + 0.3 * Math.sin(t * 6));
        const offset = Math.abs(WALL.position.z - wallHome) * 1000;
        offsetTag.set(`${offset.toFixed(0)} mm`).show(pulse(u4, 1.1, 5.3, 0.3));
        moveTag.set(returned ? `${IFC.wall} · W-12` : 'GameObject · Wall_W-12', returned ? `GUID ${GUID.slice(0, 10)} matched · placement updated` : 'Moved in the game engine')
            .tone(returned ? 'ok' : 'signal').show(pulse(u4, 0.5, 5.3, 0.3) * Math.min(1, Math.abs(u4 - 3.1) / 0.12));
        // What changed is counted from where the elements stand now
        let changed = 0;
        homes.forEach((home, element) => { if (element.position.distanceToSquared(home) > 1e-6) changed++; });

        if (ROUND) {
            cardTag.at(ROUND.card.position.x, ROUND.card.position.y + 0.35, ROUND.card.position.z)
                .show(Math.min(pulse(u1, 1.6, 5.2, 0.3), ROUND.card.visible ? 1 : 0));
        }

        const total = cards.length;
        const format = t < B2 + 0.4 ? ['IFC 4.3 · BIM model', `Geometry · ${kept} property sets · ${relations} relationships`]
            : t < B3 + 0.2 ? ['OBJ · plain mesh export', `Geometry only · ${kept} of ${total} property sets`]
            : t < B4 + 0.3 ? ['Unity · mapped export', `${kept} of ${total} property sets · ${relations} relationships`]
            : u4 < 3.1 ? ['Unity · game engine', 'One wall is edited']
            : ['Round trip · back in the BIM', `${changed} changed · ${total - kept} lost`];
        formatTag.set(format[0], format[1]).show(pulse(t, B1 + 0.2, END, 0.3)
            * Math.min(1, Math.abs(t - B2 - 0.4) / 0.15, Math.abs(t - B3 - 0.2) / 0.15, Math.abs(t - B4 - 0.3) / 0.15, Math.abs(u4 - 3.1) / 0.15));
        caption(t);
    };
}

export const interop = {
    duration: 24.3,
    poster: 4.8,
    scale: 0.8,
    alt: 'A building model on its journey between formats. First it is shown as three layers: its geometry, a property card on each element and threads for what contains what. A plain mesh export keeps the shell and lets the cards drop away. A mapped export links each class across, rights the model from Z-up to Y-up, converts millimetres to metres and reconnects the threads. Last, a wall moved 200 mm in the game engine returns to the BIM, matched by its GUID.',
    build
};
