import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, v0, building, tree, person, desk, boxEdges, route } from './props.js';
import { captions, ribbon, sampled, frame, tablet } from './overlays.js';

const RULE = 900;                    // least clear width of a door on an escape route, mm
const WIDER = 1.0;                   // the width the failing door is given, m
const QUESTION = 'Are the escape-route doors at least 900 mm wide?';

/**
 * A building is asked a question and answers it from its model. Four beats:
 * the question is typed and splits into what it names (an entity, a filter,
 * a property); rooms and doors rise out of the building into a graph of what
 * bounds and connects what, and one path through it lights up; the rule is
 * run along the escape routes on the floor, each door measured in turn, and
 * one fails; a wider door is proposed, a person approves it and the model
 * is changed. Door widths and travel distances are measured from the scene.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23;
    // The building's own materials, so that its envelope can fade while it is queried
    const variants = {};
    const fading = name => variants[name] || (variants[name] = k.mat(name, { transparent: true }));
    const b = building(k, { nx: 3, nz: 2, storeys: 2, plant: 'solar', x: 1, z: -1.2, mat: name => (name === 'paving' ? name : fading(name)) });
    const g = b.group, Y0 = b.base;
    const GX = g.position.x, GZ = g.position.z;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const outline = k.lines(null, k.lineMaterial('ink', { transparent: true, opacity: 0 }), boxEdges(k, g));
    tree(k, null, -6.3, -2.6, 1.15);

    // ---- The ground floor: three rooms off a corridor, a lobby, and the doors between them
    const H = 2.7, T = 0.12;
    const partition = k.mat('wall', { transparent: true });
    const inside = k.group(g, 0, Y0, 0);
    /** A wall from a to b along x or z, with gaps [centre, width] left in it; returns its lengths. */
    const wall = (axis, at, from, to, gaps = []) => {
        const stops = [from, ...gaps.flatMap(([c, w]) => [c - w / 2, c + w / 2]), to];
        const lengths = [];
        for (let n = 0; n < stops.length; n += 2) {
            const length = k.box(inside, partition, 1, H, 1);
            length.castShadow = true;
            lengths.push(length);
        }
        const lay = widths => {
            const s = [from, ...gaps.flatMap(([c], n) => [c - widths[n] / 2, c + widths[n] / 2]), to];
            lengths.forEach((length, n) => {
                const a = s[n * 2], z = s[n * 2 + 1];
                if (axis === 'x') {
                    length.scale.set(z - a, H, T);
                    length.position.set((a + z) / 2, 0, at);
                } else {
                    length.scale.set(T, H, z - a);
                    length.position.set(at, 0, (a + z) / 2);
                }
            });
        };
        lay(gaps.map(([, w]) => w));
        return lay;
    };
    const SPLIT = 0.2;                                       // the rooms are behind this line, the corridor in front
    const DOORS = [
        { id: 'D-01', axis: 'x', x: -2.9, z: SPLIT, w: 0.9 },
        { id: 'D-02', axis: 'x', x: 0, z: SPLIT, w: 0.9 },
        { id: 'D-05', axis: 'x', x: 2.9, z: SPLIT, w: 0.95 },
        { id: 'D-03', axis: 'z', x: 1.5, z: 1.5, w: 0.8 },   // across the corridor: too narrow
        { id: 'D-04', axis: 'z', x: b.W / 2, z: 1.5, w: 0 }  // the entrance, in the envelope
    ];
    wall('x', SPLIT, -b.W / 2 + 0.2, b.W / 2 - 0.2, DOORS.slice(0, 3).map(d => [d.x, d.w]));
    const layCross = wall('z', 1.5, SPLIT + T / 2, b.D / 2 - 0.2, [[DOORS[3].z, DOORS[3].w]]);
    [-1.5, 1.5].forEach(x => wall('z', x, -b.D / 2 + 0.2, SPLIT - T / 2));
    [[-2.9, -2.1, 0], [0, -2.1, 0], [2.9, -2.1, 0]].forEach(([x, z, turn]) => desk(k, inside, x, 0, z, turn));

    const TIMBER = new THREE.Color(), OK = new THREE.Color(), SIGNAL = new THREE.Color(), ACCENT = new THREE.Color(), tint = new THREE.Color();
    let glow = 0.15;
    k.onTheme(night => {
        k.color('#b98a5e', TIMBER);
        k.color('ok', OK);
        k.color('signal', SIGNAL);
        k.color('accent', ACCENT);
        glow = night ? 0.9 : 0.2;
    });
    const entrance = b.storeys[0].windows.find(w => w.userData.kind === 'door');
    DOORS.forEach(door => {
        door.material = k.standard('#b98a5e', { roughness: 0.7, transparent: true });
        if (door.w) {
            door.leaf = k.box(inside, door.material, door.axis === 'x' ? door.w : 0.05, 2.1, door.axis === 'x' ? 0.05 : door.w, door.x, 0, door.z);
            door.leaf.castShadow = true;
            k.box(inside, 'dark', door.axis === 'x' ? door.w + 0.12 : 0.09, 0.08, door.axis === 'x' ? 0.09 : door.w + 0.12, door.x, 2.1, door.z);
        } else {
            // The entrance is two glazed leaves: a sheet over them takes the colour of the result
            door.w = entrance.userData.panes[0].scale.x + entrance.userData.panes[1].scale.x;
            door.leaf = k.box(inside, door.material, 0.04, 2.1, door.w, door.x + 0.14, 0, door.z);
            door.sheet = true;
        }
        /** Clear width in millimetres, as modelled now. */
        door.width = () => Math.round((door.sheet || door.axis === 'z' ? door.leaf.scale.z : door.leaf.scale.x) * 1000);
        door.tag = k.label('', '', 'mini');
        door.at = new THREE.Vector3(GX + door.x, Y0 + 2.75, GZ + door.z);
    });
    const NARROW = DOORS[3];

    // ---- The escape routes, on the floor: from each room to the way out
    const EXIT = [b.W / 2 + 1.5, 1.5];
    const routeMaterial = k.basic('accent', { side: THREE.DoubleSide, transparent: true });
    const paths = [
        route([[-2.9, -1.5], [-2.9, 1.5], [EXIT[0], 1.5]], 0.4),
        route([[0, -1.5], [0, 1.5], [0.6, 1.5]], 0.4),
        route([[2.9, -1.5], [2.9, 1.5], [3.5, 1.5]], 0.4)
    ];
    const bands = paths.map(path => ribbon(k, inside, routeMaterial, sampled(path), 0.16, 0.035));
    const TRAVEL = paths[0].length;
    const exitMark = k.mesh(inside, k.GEO.disc, k.basic('ok', { transparent: true, opacity: 0.45, depthWrite: false }), EXIT[0], -Y0 + 0.04, EXIT[1]);
    exitMark.scale.setScalar(0.6);
    exitMark.renderOrder = 2;

    // ---- The graph: spaces and doors as nodes, what contains and bounds what as edges
    const LAYER = b.top + 2.2, SPREAD = 1.45;
    const NODES = {
        storey: { x: 0, z: 0, from: Y0 + 3, y: LAYER + 1.9, r: 0.24 },
        r1: { x: -2.9, z: -1.4, r: 0.2, name: 'Room 1' }, r2: { x: 0, z: -1.4, r: 0.2 }, r3: { x: 2.9, z: -1.4, r: 0.2 },
        corridor: { x: -1.2, z: 1.5, r: 0.2, name: 'Corridor' }, lobby: { x: 3, z: 1.5, r: 0.2, name: 'Lobby' },
        d1: { door: 0, name: 'D-01' }, d2: { door: 1 }, d5: { door: 2 }, d3: { door: 3, name: 'D-03' }, d4: { door: 4, name: 'D-04' },
        exit: { x: EXIT[0], z: EXIT[1], r: 0.2, name: 'Exit' }
    };
    const EDGES = [
        ['storey', 'r1'], ['storey', 'r2'], ['storey', 'r3'], ['storey', 'corridor'], ['storey', 'lobby'],
        ['r1', 'd1'], ['d1', 'corridor'], ['r2', 'd2'], ['d2', 'corridor'], ['r3', 'd5'], ['d5', 'lobby'],
        ['corridor', 'd3'], ['d3', 'lobby'], ['lobby', 'd4'], ['d4', 'exit']
    ];
    const PATH = ['r1', 'd1', 'corridor', 'd3', 'lobby', 'd4', 'exit'];
    const idle = new THREE.Color(), mixed = new THREE.Color();
    k.onTheme(() => k.color(['#8794a8', '#6f82ad'], idle));
    Object.keys(NODES).forEach((name, n) => {
        const node = NODES[name];
        if (node.door !== undefined) Object.assign(node, { x: DOORS[node.door].x, z: DOORS[node.door].z, r: 0.13 });
        node.material = k.own(new THREE.MeshBasicMaterial({ transparent: true }));
        node.home = new THREE.Vector3(GX + node.x, node.from || Y0 + (node.door !== undefined ? 1.05 : 0.4), GZ + node.z);
        node.up = new THREE.Vector3(GX + node.x * SPREAD, node.y || LAYER, GZ + node.z * SPREAD);
        node.mesh = k.sphere(null, node.material, node.r);
        node.mesh.renderOrder = 3;
        node.order = n / Object.keys(NODES).length;
        node.step = PATH.indexOf(name);
        if (node.name) node.tag = k.label(node.name, '', 'mini');
    });
    const edgeLines = k.lines(null, k.own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true })), new Array(EDGES.length * 6).fill(0));
    edgeLines.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(EDGES.length * 6), 3));
    edgeLines.frustumCulled = false;
    edgeLines.renderOrder = 3;
    const tetherMaterial = k.lineMaterial(['#8794a8', '#6f82ad'], { transparent: true });
    const tethers = k.lines(null, tetherMaterial, new Array(Object.keys(NODES).length * 6).fill(0));
    tethers.frustumCulled = false;
    const relationTags = [['contains', 'storey', 'corridor'], ['bounds', 'r2', 'd2'], ['connects', 'd5', 'lobby']]
        .map(([text, a, z]) => ({ tag: k.label(text, '', 'mini'), a: NODES[a], z: NODES[z] }));

    // ---- The proposal, and the person who approves it
    const ghostMaterial = k.basic('accent', { transparent: true, depthWrite: false }, { glow: true });
    const ghostLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const ghost = k.box(inside, ghostMaterial, 0.07, 2.1, WIDER, NARROW.x, 0, NARROW.z);
    ghost.renderOrder = 3;
    const ghostFrame = frame(k, inside, ghostLine, 0.09, 2.12, WIDER + 0.02, NARROW.x, 0, NARROW.z);
    const reviewer = tablet(k, person(k, null, -3.9, 4.4, { top: '#eef0f2', legs: '#39445a', skin: 1, hair: 2 }));
    reviewer.rotation.y = 2.35;
    const approveTag = k.label('Approved', 'by the reviewer').tone('ok').at(-3.9, 2.05, 4.4);

    const queryTag = k.label('', '', 'query').at(GX, b.top + 6.6, GZ);
    const ASK = new THREE.Vector3(GX, b.top + 6.2, GZ);
    const CHIPS = [['Entity', 'IfcDoor'], ['Filter', 'on an escape route'], ['Property', `OverallWidth ≥ ${RULE} mm`]].map(([role, text], n) => ({
        tag: k.label(role, text), to: new THREE.Vector3(GX + (n - 1) * 3.3, b.top + 3.6 - n * 0.2, GZ - (n - 1) * 3.3)
    }));
    const failTag = k.label();
    const caption = captions(k, [
        [B1, B2, 'Ask · a question in plain language'],
        [B2, B3, 'Reason · over the graph of spaces and doors'],
        [B3, B4, 'Check · the rule, door by door'],
        [B4, END, 'Propose · a fix, approved by a person']
    ]);
    // When the check reaches each door, in seconds of its beat; the entrance is last
    const CHECKED = [0.9, 1.5, 2.1, 2.8, 3.6];

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;

        // ---- The envelope fades to an outline while the model is queried
        const ghosted = pulse(t, B1 + 3.2, END, 0.7);
        Object.values(variants).forEach(material => {
            material.opacity = lerp(1, 0.08, ghosted);
            material.depthWrite = ghosted < 0.02;
        });
        outline.material.opacity = 0.16 * ghosted;
        outline.visible = ghosted > 0.01;
        partition.opacity = lerp(1, 0.42, ghosted);

        // ---- Beat 1: the question, and the three things it names
        const typed = Math.round(QUESTION.length * seg(u1, 0.4, 2.3));
        const split = u1 >= 2.6;
        const found = Math.round(DOORS.length * seg(u1, 3.5, 4.3));
        queryTag.set(`› ${QUESTION.slice(0, typed)}${u1 < 2.5 ? '▌' : ''}`, split && u1 > 3.5 ? `${found} of ${DOORS.length} doors found in the model` : '').show(pulse(u1, 0.2, 5.4, 0.3));
        CHIPS.forEach(({ tag, to }, n) => {
            const out = easeOut(seg(u1, 2.6 + n * 0.3, 3.3 + n * 0.3));
            v0.lerpVectors(ASK, to, out);
            tag.at(v0.x, v0.y, v0.z).show(Math.min(out * 3, pulse(t, B1 + 2.6, B2 + 0.6, 0.4)));
        });

        // ---- Beat 2: the elements rise into a graph, and a path through it lights
        const graph = pulse(t, B2 + 0.2, B3 + 0.5, 0.4);
        const linked = seg(u2, 1.9, 2.7);
        const position = edgeLines.geometry.attributes.position, colour = edgeLines.geometry.attributes.color, tether = tethers.geometry.attributes.position;
        const lit = node => (node.step < 0 ? 0 : seg(u2, 2.9 + node.step * 0.3, 3.1 + node.step * 0.3));
        Object.values(NODES).forEach((node, n) => {
            const rise = easeOut(seg(u2, 0.3 + node.order * 0.9, 1.3 + node.order * 0.9)), level = lit(node);
            node.mesh.position.lerpVectors(node.home, node.up, rise);
            node.mesh.visible = graph > 0.01;
            node.mesh.scale.setScalar(node.r * (0.5 + 0.5 * rise) * (1 + 0.35 * level));
            node.material.color.copy(mixed.lerpColors(idle, SIGNAL, level));
            node.material.opacity = graph;
            tether.setXYZ(n * 2, node.home.x, node.home.y, node.home.z);
            tether.setXYZ(n * 2 + 1, node.mesh.position.x, node.mesh.position.y - node.r, node.mesh.position.z);
            if (node.tag) node.tag.at(node.up.x, node.up.y + 0.55, node.up.z).show(Math.min(graph, node.step < 0 ? linked : level));
        });
        tether.needsUpdate = true;
        tethers.visible = graph > 0.01;
        tetherMaterial.opacity = 0.4 * graph;
        EDGES.forEach(([a, z], n) => {
            const from = NODES[a].mesh.position, to = NODES[z].mesh.position;
            position.setXYZ(n * 2, from.x, from.y, from.z);
            position.setXYZ(n * 2 + 1, to.x, to.y, to.z);
            mixed.lerpColors(idle, SIGNAL, Math.min(lit(NODES[a]), lit(NODES[z])));
            colour.setXYZ(n * 2, mixed.r, mixed.g, mixed.b);
            colour.setXYZ(n * 2 + 1, mixed.r, mixed.g, mixed.b);
        });
        position.needsUpdate = colour.needsUpdate = true;
        edgeLines.visible = linked > 0.01 && graph > 0.01;
        edgeLines.material.opacity = linked * graph;
        relationTags.forEach(({ tag, a, z }) => {
            v0.lerpVectors(a.up, z.up, 0.5);
            tag.at(v0.x, v0.y, v0.z).show(Math.min(linked, graph) * (1 - seg(u2, 2.7, 3)));
        });

        // ---- Beat 3: the rule is run along the escape routes, a door at a time
        const tracing = pulse(t, B3 + 0.4, END, 0.4);
        routeMaterial.opacity = 0.9 * tracing;
        bands[0].userData.show(0, tracing > 0 ? seg(u3, 0.5, 3.7) : 0);
        bands[1].userData.show(0, tracing > 0 ? seg(u3, 1.1, 2) : 0);
        bands[2].userData.show(0, tracing > 0 ? seg(u3, 1.7, 2.6) : 0);
        exitMark.visible = tracing > 0.01 && u3 > 3.6;

        // ---- Beat 4: a wider door is proposed, approved, and made
        const widened = t >= END + 0.5 ? 0 : smooth(seg(u4, 2.8, 3.6));
        const width = lerp(0.8, WIDER, widened);
        NARROW.leaf.scale.z = width;
        layCross([width]);
        const proposed = pulse(u4, 0.4, 3.4, 0.3);
        ghost.visible = ghostFrame.visible = proposed > 0.01;
        ghostMaterial.opacity = proposed * (0.3 + 0.12 * Math.sin(t * 6));
        ghostLine.opacity = proposed;
        const approving = pulse(u4, 1.7, 2.9, 0.25);
        reviewer.userData.armR.rotation.x = lerp(-0.5, -0.85, approving);
        reviewer.userData.foreR.rotation.x = lerp(-1.1, -1.5 + 0.2 * Math.sin(t * 16), approving);
        approveTag.show(pulse(u4, 2, 4.4, 0.25));

        let passed = 0, failed = 0;
        DOORS.forEach((door, n) => {
            const checked = seg(u3, CHECKED[n], CHECKED[n] + 0.3) * (t < END ? 1 : 1 - seg(t, END, END + 0.4));
            const ok = door.width() >= RULE;
            if (checked >= 1) ok ? passed++ : failed++;
            // Doors show through the faded envelope as the entity that was asked for
            const named = ghosted * 0.35 * (1 - checked);
            tint.copy(ok ? OK : SIGNAL);
            door.material.color.copy(TIMBER).lerp(ACCENT, named).lerp(tint, checked);
            door.material.emissive.copy(checked > 0 ? tint : ACCENT);
            door.material.emissiveIntensity = glow * Math.max(checked, named);
            door.material.opacity = door.sheet ? Math.max(checked, named) * 0.75 : 1;
            door.leaf.visible = !door.sheet || door.material.opacity > 0.01;
            const narrow = door === NARROW;
            door.tag.set(`${door.width()} mm ${ok ? '✓' : '✗'}`).at(door.at.x, door.at.y, door.at.z)
                .show(narrow && !ok && u4 < 3.7 ? 0 : checked * (t < END ? 1 - seg(t, END - 0.4, END) : 0));
        });
        const fixed = NARROW.width() >= RULE;
        failTag.set(u4 < 0.4 ? `${NARROW.id} fails` : `Proposal · widen ${NARROW.id}`,
            u4 < 0.4 ? `IfcDoor.OverallWidth ${NARROW.width()} mm < ${RULE} mm` : `from ${NARROW.width()} mm to ${WIDER * 1000} mm`)
            .tone(u4 < 0.4 ? 'signal' : '').at(NARROW.at.x, NARROW.at.y, NARROW.at.z)
            .show(pulse(t, B3 + CHECKED[3] + 0.2, B4 + 3.6, 0.25) * Math.min(1, Math.abs(u4 - 0.4) / 0.12) * (fixed ? 0 : 1));

        // ---- What the model answers, above the building
        const checking = u3 > 0.3 && t < END;
        if (checking) {
            const done = passed + failed;
            const result = done < DOORS.length ? `Checking door ${Math.min(DOORS.length, done + 1)} of ${DOORS.length} · route ${(TRAVEL * seg(u3, 0.5, 3.7)).toFixed(1)} m`
                : failed ? `${passed} pass · ${failed} fails · travel distance ${TRAVEL.toFixed(1)} m`
                : `${passed} of ${DOORS.length} pass · model updated`;
            queryTag.set(`Rule · escape-route doors ≥ ${RULE} mm`, result).show(pulse(t, B3 + 0.3, END, 0.3));
        }
        caption(t);
    };
}

export const ai = {
    duration: 24,
    poster: 15.4,
    scale: 0.92,
    alt: 'A building is asked whether its escape-route doors are at least 900 mm wide. The question splits into an entity, a filter and a property; rooms and doors rise out of the building into a graph and the path from a room to the exit lights up; the escape routes are traced on the floor and each door turns green in turn, except one that is 800 mm wide; a wider door is proposed as a ghost, a reviewer approves it and the model is updated.',
    build
};
