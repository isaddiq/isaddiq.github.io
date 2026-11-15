import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, easeInOut, pulse, person, polyline, route } from './props.js';
import { captions, ring, frame, tablet, stride } from './overlays.js';

const REACH = { upper: 2.5, fore: 2.3 };      // the two links of the arm, m
const ZONE = { warn: 3.9, stop: 2.6 };         // a person nearer than these slows, then stops, the arm, m
const SLOW = 0.35;                             // share of full speed inside the warning zone
const TOLERANCE = 1;                           // a block may sit this far from its place in the model, mm
const PLACED = [0.3, -0.8, 0.5];               // how far off each block is put down, mm (what the laser then measures)

/**
 * A robot arm lays the next course of a block wall from the model. Four
 * beats: the wall in the model splits into courses, the build sequence the
 * robot is given; the arm's reach is shown and its path from pallet to wall
 * is planned, bent round a scaffold the straight line would hit; each block
 * is laid, swept by a laser and coloured by how far it sits from the model;
 * and a worker walks into the cell, which slows the arm and then stops it
 * until they have left. Distances, offsets and speeds are measured here.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 18.6, END = 25.6;
    const FLOOR = 0.12;
    k.box(null, 'paving', 12, FLOOR, 9, 0, 0, 0.2);
    const BLOCK = { w: 0.98, h: 0.48, d: 0.5 }, COURSE = 0.5, WALL_Z = 2.4;

    // ---- The wall: two courses built; the model has five
    const placeOf = (course, i) => new THREE.Vector3((course % 2 ? -2 : -2.5) + i, FLOOR + course * COURSE, WALL_Z);
    for (let course = 0; course < 2; course++) {
        for (let i = 0; i < (course % 2 ? 5 : 6); i++) {
            const p = placeOf(course, i);
            k.box(null, (i + course) % 2 ? 'wall' : 'coping', BLOCK.w, BLOCK.h, BLOCK.d, p.x, p.y, p.z);
        }
    }
    const holoFill = k.basic('accent', { transparent: true, depthWrite: false }, { glow: true });
    const holoNext = k.basic('accent', { transparent: true, depthWrite: false }, { glow: true });
    const holoLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const planned = [];
    for (let course = 2; course < 5; course++) {
        for (let i = 0; i < (course % 2 ? 5 : 6); i++) {
            const home = placeOf(course, i);
            const mesh = k.box(null, holoFill, BLOCK.w, BLOCK.h, BLOCK.d, home.x, home.y, home.z);
            mesh.renderOrder = 2;
            const edges = new THREE.LineSegments(k.GEO.edges, holoLine);
            mesh.add(edges);
            planned.push({ mesh, home, course, i });
        }
    }
    const COURSES = [2, 3, 4].map(course => ({
        course, count: planned.filter(p => p.course === course).length,
        tag: k.label('', '', 'mini')
    }));

    // ---- Pallet of blocks: a lower layer, and the three the robot takes
    const PALLET = { x: -3.7, z: -0.4 };
    k.box(null, 'timber', 1.3, 0.14, 2.3, PALLET.x, FLOOR, PALLET.z);
    const picks = [0, 1, 2].map(i => new THREE.Vector3(PALLET.x, FLOOR + 0.14 + COURSE, PALLET.z + (i - 1) * 0.72));
    picks.forEach(p => k.box(null, 'wall', BLOCK.w, BLOCK.h, BLOCK.d, p.x, p.y - COURSE, p.z));
    const targets = [0, 1, 2].map(i => placeOf(2, i));

    // ---- A scaffold tower between the pallet and the wall
    const SCAFFOLD = { x0: -4, x1: -2.8, z0: 0.75, z1: 1.75, top: 3 };
    const tower = [];
    [[SCAFFOLD.x0, SCAFFOLD.z0], [SCAFFOLD.x1, SCAFFOLD.z0], [SCAFFOLD.x1, SCAFFOLD.z1], [SCAFFOLD.x0, SCAFFOLD.z1]].forEach(([x, z], n, corners) => {
        const [nx, nz] = corners[(n + 1) % 4];
        tower.push([x, FLOOR, z, x, SCAFFOLD.top, z]);
        [1, 2, SCAFFOLD.top - FLOOR].forEach(y => tower.push([x, FLOOR + y, z, nx, FLOOR + y, nz, 0.045]));
        tower.push(n % 2 ? [x, FLOOR, z, nx, FLOOR + 1, nz, 0.035] : [x, FLOOR + 1, z, nx, FLOOR + 2, nz, 0.035]);
    });
    k.bars(null, 'steel', 0.06, tower);
    k.box(null, 'timber', SCAFFOLD.x1 - SCAFFOLD.x0, 0.05, SCAFFOLD.z1 - SCAFFOLD.z0, (SCAFFOLD.x0 + SCAFFOLD.x1) / 2, FLOOR + 2, (SCAFFOLD.z0 + SCAFFOLD.z1) / 2);
    const clashLine = k.lineMaterial('signal', { transparent: true });
    const clashFrame = frame(k, null, clashLine, SCAFFOLD.x1 - SCAFFOLD.x0 + 0.2, SCAFFOLD.top - FLOOR + 0.2, SCAFFOLD.z1 - SCAFFOLD.z0 + 0.2,
        (SCAFFOLD.x0 + SCAFFOLD.x1) / 2, FLOOR, (SCAFFOLD.z0 + SCAFFOLD.z1) / 2);
    /** How far a point is from the scaffold (0 inside it). */
    const clearOf = p => Math.hypot(
        Math.max(SCAFFOLD.x0 - p.x, 0, p.x - SCAFFOLD.x1), Math.max(FLOOR - p.y, 0, p.y - SCAFFOLD.top), Math.max(SCAFFOLD.z0 - p.z, 0, p.z - SCAFFOLD.z1));

    // ---- Six-axis arm: turret, upper arm, forearm, a wrist that keeps the gripper level
    const BASE = new THREE.Vector3(0, FLOOR, -1.2);
    const SHOULDER = 1.3, L1 = REACH.upper, L2 = REACH.fore, TOOL = 0.6;
    const base = k.group(null, BASE.x, BASE.y, BASE.z);
    k.box(base, 'steel', 1.5, 0.3, 1.5);
    k.cyl(base, 'dark', 0.6, 0.35, 0, 0.3, 0);
    const turret = k.group(base, 0, 0.65, 0);
    k.cyl(turret, 'accent', 0.5, 0.3);
    k.box(turret, 'accent', 0.62, 0.8, 0.7, 0, 0.2, -0.05);
    const joint = (parent, r, w) => { k.cyl(parent, 'dark', r, w, w / 2, 0, 0).rotation.z = Math.PI / 2; };
    const upper = k.group(turret, 0, SHOULDER - 0.65, 0);
    joint(upper, 0.36, 0.9);
    k.box(upper, 'accent', 0.4, 0.46, L1, 0, -0.23, L1 / 2);
    const fore = k.group(upper, 0, 0, L1);
    joint(fore, 0.3, 0.72);
    k.box(fore, 'accent', 0.3, 0.34, L2, 0, -0.17, L2 / 2);
    k.bars(fore, 'rubber', 0.05, [[0.18, 0.1, 0.2, 0.18, 0.1, L2 - 0.2]]);
    const wrist = k.group(fore, 0, 0, L2);
    joint(wrist, 0.22, 0.5);
    k.cyl(wrist, 'dark', 0.1, TOOL - 0.13, 0, -TOOL + 0.13, 0);
    const gripper = k.group(wrist, 0, -TOOL, 0);
    k.box(gripper, 'dark', 0.9, 0.08, 0.4, 0, 0.05, 0);
    [-0.3, 0.3].forEach(x => k.cyl(gripper, 'rubber', 0.1, 0.05, x, 0, 0));
    k.box(gripper, 'metal', 0.2, 0.12, 0.12, 0, 0.13, 0.24);                   // the laser profiler
    const beacon = k.sphere(turret, k.basic('ok'), 0.09, 0, 1.08, -0.05);
    const beaconGlow = k.glow(turret, 0, 1.08, -0.05, 1.3, 'ok', 0.8);

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

    // Its working envelope: everything within the two links of the shoulder
    const RADIUS = L1 + L2;
    const dome = k.group(null, BASE.x, FLOOR + SHOULDER, BASE.z);
    const domeFill = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const domeLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const domeMesh = k.mesh(dome, k.GEO.dome, domeFill);
    domeMesh.scale.setScalar(RADIUS);
    domeMesh.renderOrder = 2;
    const domeRibs = new THREE.LineSegments(k.own(new THREE.EdgesGeometry(new THREE.SphereGeometry(RADIUS, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2), 1)), domeLine);
    domeRibs.renderOrder = 2;
    dome.add(domeRibs);
    const floorReach = Math.sqrt(RADIUS * RADIUS - SHOULDER * SHOULDER);

    // ---- The path from pallet to wall: the straight line, and the one that is taken
    const above = (v, h) => v.clone().setY(v.y + h);
    const HOME = new THREE.Vector3(0.2, 3.3, 1.2);
    const LIFT = 1.25;
    const VIA = [new THREE.Vector3(-1.9, 3.1, -0.3), new THREE.Vector3(-1.5, 3.1, 1.5)];
    const FROM = above(picks[0], BLOCK.h + LIFT), TO = above(targets[0], BLOCK.h + LIFT);
    const sample = (points, n) => {
        const out = [], lengths = [0];
        for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
        for (let s = 0; s <= n; s++) {
            const d = (s / n) * lengths[lengths.length - 1];
            let i = 1;
            while (i < points.length - 1 && lengths[i] < d) i++;
            out.push(points[i - 1].clone().lerp(points[i], (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1])));
        }
        return out;
    };
    const direct = sample([FROM, TO], 40), taken = sample([FROM, ...VIA, TO], 60);
    // Where the straight line meets the scaffold, and how near the planned path passes it
    const hitAt = direct.findIndex(p => clearOf(p) < BLOCK.w / 2);
    const CLASH = direct[Math.max(0, hitAt)];
    const clearance = Math.min(...taken.map(clearOf));
    const draw = (points, material) => {
        const line = polyline(k, null, material, points.length);
        points.forEach((p, n) => line.geometry.attributes.position.setXYZ(n, p.x, p.y, p.z));
        line.renderOrder = 3;
        return line;
    };
    const directLine = draw(direct, clashLine);
    const pathMaterial = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const pathLine = draw(taken, pathMaterial);
    const pointMaterial = k.basic('accent', { transparent: true }, { glow: true });
    const waypoints = [FROM, ...VIA, TO].map(p => {
        const s = k.sphere(null, pointMaterial, 0.11, p.x, p.y, p.z);
        s.renderOrder = 3;
        return s;
    });

    // ---- The task: three blocks from the pallet to the third course
    const keys = [[0, HOME]];
    let clockAt = B2 + 3.9;
    const add = (point, dt) => keys.push([(clockAt += dt), point]);
    const blocks = picks.map((pick, i) => {
        const a = above(pick, BLOCK.h), b = above(targets[i], BLOCK.h);
        const target = targets[i].clone();
        target.x += PLACED[i] / 1000;
        if (i === 0) keys.push([clockAt, HOME]);
        add(above(a, LIFT), i ? 0.45 : 0.8);
        add(a, 0.4);
        const grip = clockAt + 0.05;
        add(a, 0.15);
        add(above(a, LIFT), 0.4);
        add(VIA[0], 0.45);
        add(VIA[1], 0.4);
        add(above(b, LIFT), 0.45);
        add(above(target, BLOCK.h), 0.4);
        const release = clockAt + 0.05;
        add(above(target, BLOCK.h), 0.15);
        add(above(b, 0.8), 0.35);
        // The laser sweeps the block from here, before the arm goes back
        add(above(b, 0.8), 0.75);
        add(VIA[1], 0.4);
        add(VIA[0], 0.4);
        const tint = k.basic('ok', { transparent: true, depthWrite: false });
        const mesh = k.box(null, 'wall', BLOCK.w, BLOCK.h, BLOCK.d);
        const check = k.box(mesh, tint, 1.02, 1.03, 1.04, 0, -0.01, 0);
        check.renderOrder = 2;
        return { mesh, check, tint, pick, target, grip, release, tag: k.label() };
    });
    add(HOME, 0.7);
    const DONE = clockAt;

    // ---- The shared space: zones on the floor round the robot, and a worker who walks in
    const zoneWarn = k.basic('#f0b429', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const zoneStop = k.basic('signal', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    ring(k, null, zoneWarn, ZONE.stop, ZONE.warn, BASE.x, FLOOR + 0.012, BASE.z);
    ring(k, null, zoneStop, 0.9, ZONE.stop, BASE.x, FLOOR + 0.014, BASE.z);
    const edgeMaterial = k.lineMaterial('ink', { transparent: true });
    const circle = r => {
        const points = [];
        for (let n = 0; n < 72; n++) {
            const a = (n / 72) * Math.PI * 2, z = ((n + 1) / 72) * Math.PI * 2;
            points.push(BASE.x + r * Math.sin(a), FLOOR + 0.02, BASE.z + r * Math.cos(a), BASE.x + r * Math.sin(z), FLOOR + 0.02, BASE.z + r * Math.cos(z));
        }
        return k.lines(null, edgeMaterial, points);
    };
    const zoneEdges = [circle(ZONE.warn), circle(ZONE.stop)];
    const reachEdge = circle(floorReach);
    reachEdge.material = domeLine;

    const walkIn = route([[5.8, 1.9], [3.6, 1.2], [1.9, 0.5]], 0.6);
    const worker = person(k, null, 5.8, 1.9, { vest: true, hat: 'yellow', top: '#e8590c', skin: 2 });
    worker.position.y = FLOOR;
    const toolbox = k.box(null, 'signal', 0.5, 0.26, 0.24, 1.5, FLOOR, 0.2);
    const hand = new THREE.Vector3();
    /** How far along the way in the worker is, 0..1, at a second of the beat: in, a pause to pick up the toolbox, and out. */
    const walked = u => smooth(seg(u, 0.2, 2.3)) * (1 - smooth(seg(u, 3, 5.1)));
    const spot = { x: 0, z: 0 };
    const distanceAt = u => {
        walkIn.at(walkIn.length * walked(u), spot);
        return Math.hypot(spot.x - BASE.x, spot.z - BASE.z);
    };
    const speedAt = u => (u < 0 || u > END - B4 ? 1 : distanceAt(u) < ZONE.stop ? 0 : distanceAt(u) < ZONE.warn ? SLOW : 1);
    // The arm's own clock: it runs at the speed the zones allow
    const STEP = 1 / 60, warp = [0];
    for (let u = STEP; u <= END - B4 + 1.2; u += STEP) warp.push(warp[warp.length - 1] + speedAt(u) * STEP);
    const taskTime = t => {
        if (t <= B4) return t;
        const n = Math.min(warp.length - 1, (t - B4) / STEP), i = Math.floor(n);
        return B4 + lerp(warp[i], warp[Math.min(warp.length - 1, i + 1)], n - i);
    };

    // ---- Round the cell: controller and operator, fence, a work light
    const cabinet = k.group(null, 4.3, FLOOR, -2.9);
    k.box(cabinet, 'wallAlt', 1, 1.5, 0.6);
    k.box(cabinet, 'dark', 0.6, 0.4, 0.04, 0, 0.9, 0.31);
    k.box(cabinet, 'glassLit', 0.5, 0.3, 0.05, 0, 0.95, 0.31);
    k.bars(null, 'rubber', 0.06, [[3.8, FLOOR + 0.03, -2.9, 0.8, FLOOR + 0.03, -1.6]]);
    const operator = tablet(k, person(k, null, 3.9, -1.9, { vest: true, hat: 'white', top: '#3d5a80', skin: 1 }));
    operator.position.y = FLOOR;
    operator.rotation.y = -1.9;
    const fence = [];
    for (let x = -5.6; x <= 5.61; x += 1.4) fence.push([x, FLOOR, -4, x, FLOOR + 1.2, -4]);
    for (let z = -4; z <= 0.21; z += 1.4) fence.push([-5.6, FLOOR, z, -5.6, FLOOR + 1.2, z]);
    [0.55, 1.15].forEach(h => fence.push([-5.6, FLOOR + h, -4, 5.6, FLOOR + h, -4], [-5.6, FLOOR + h, -4, -5.6, FLOOR + h, 0.2]));
    k.bars(null, 'yellow', 0.07, fence);
    const light = k.group(null, -5, FLOOR, -3.4);
    k.box(light, 'dark', 0.5, 0.1, 0.5);
    k.box(light, 'dark', 0.09, 3.4, 0.09);
    k.box(light, 'metal', 0.6, 0.3, 0.2, 0.15, 3.3, 0.1).rotation.y = 0.7;
    k.glow(light, 0.2, 3.4, 0.15, 2.6, '#fff1c9');
    k.pool(null, 0.6, 1.6, 4.4, '#fff1c9', 0.35).position.y = FLOOR + 0.02;

    // ---- The laser line that measures a block once it is down
    const laserMaterial = k.basic(['#e5383b', '#ff5a5c'], { transparent: true, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const laser = k.box(null, laserMaterial, 0.02, 1, BLOCK.d + 0.1);
    laser.renderOrder = 3;

    const taskTag = k.label('', '', 'query').at(0.4, 7.6, -1.6);
    const pathTag = k.label();
    const armTag = k.label();
    const workerTag = k.label('', '', 'mini');
    const caption = captions(k, [
        [B1, B2, 'Task · the model becomes a build sequence'],
        [B2, B3, 'Path · planned inside the arm\'s reach, round the scaffold'],
        [B3, B4, 'Place and verify · each block checked against the model'],
        [B4, END, 'Shared space · the arm slows, then stops, for a person']
    ]);
    const tip = new THREE.Vector3(), OKAY = new THREE.Color(), AMBER = new THREE.Color(), tone = new THREE.Color();
    k.onTheme(() => {
        k.color('ok', OKAY);
        k.color('#f0b429', AMBER);
    });

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;
        const tau = taskTime(t);
        const back = smooth(seg(t, END + 0.1, END + 1));

        // ---- The arm follows its keys, on its own clock
        let n = 1;
        while (n < keys.length - 1 && keys[n][0] < tau) n++;
        tip.lerpVectors(keys[n - 1][1], keys[n][1], easeInOut(seg(tau, keys[n - 1][0], keys[n][0])));
        reach(tip);

        // ---- Beat 1: the model's wall splits into courses, and the sequence runs along them
        const split = pulse(u1, 0.3, 4.9, 0.9);
        const next = Math.floor(seg(u1, 1.6, 4.4) * planned.length);
        const placedCount = blocks.filter(block => tau >= block.release).length;
        planned.forEach((p, i) => {
            p.mesh.position.set(p.home.x * (1 + 0.14 * split), p.home.y + (p.course - 1.4) * 0.6 * split, p.home.z);
            p.mesh.visible = i >= placedCount || t >= END + 0.1;
            p.mesh.material = split > 0.5 && i === next && u1 < 4.4 ? holoNext : holoFill;
        });
        const modelled = pulse(t, B1 + 0.2, END + 1, 0.5);
        holoFill.opacity = lerp(0.07, 0.22, split) * modelled;
        holoNext.opacity = 0.75;
        holoLine.opacity = lerp(0.3, 0.95, split) * modelled;
        COURSES.forEach(({ course, count, tag }, c) => {
            const first = planned.findIndex(p => p.course === course);
            tag.set(`Course ${course + 1} · blocks ${first + 1} to ${first + count}`)
                .at(3.4 * (1 + 0.14 * split), FLOOR + course * COURSE + (course - 1.4) * 0.6 * split + 0.25, WALL_Z).show(pulse(u1, 0.9 + c * 0.25, 4.8, 0.3));
        });

        // ---- Beat 2: the reach, the straight line that clashes, and the path that clears
        const reaching = pulse(u2, 0.3, 5.3, 0.6);
        dome.visible = reachEdge.visible = reaching > 0.01;
        domeFill.opacity = 0.07 * reaching;
        domeLine.opacity = 0.4 * reaching;
        const clashing = pulse(u2, 0.9, 3, 0.3);
        directLine.visible = clashFrame.visible = clashing > 0.01;
        directLine.geometry.setDrawRange(0, Math.round(direct.length * seg(u2, 0.9, 1.6)));
        clashLine.opacity = clashing * (u2 > 1.6 ? 0.6 + 0.4 * Math.sin(t * 11) : 1);
        clashFrame.visible = clashing > 0.01 && u2 > 1.5;
        const routed = pulse(t, B2 + 2.7, END, 0.4);
        pathLine.visible = routed > 0.01;
        pathLine.geometry.setDrawRange(0, Math.round(taken.length * seg(u2, 2.7, 3.6)));
        pathMaterial.opacity = routed;
        pointMaterial.opacity = routed;
        waypoints.forEach((point, i) => {
            const shown = easeOut(seg(u2, 2.7 + i * 0.28, 3 + i * 0.28)) * routed;
            point.visible = shown > 0.01;
            point.scale.setScalar(0.11 * shown);
        });
        const cleared = u2 >= 2.7;
        pathTag.set(cleared ? 'Path replanned' : 'Straight path clashes', cleared ? `4 way-points · clears the scaffold by ${clearance.toFixed(2)} m` : 'with the scaffold tower')
            .tone(cleared ? 'ok' : 'signal').at(CLASH.x, SCAFFOLD.top + 0.5, CLASH.z)
            .show(pulse(u2, 1.6, 5.3, 0.3) * Math.min(1, Math.abs(u2 - 2.7) / 0.12));

        // ---- Beat 3: each block is laid, swept by the laser and coloured by its offset
        let sweeping = 0;
        blocks.forEach((block, i) => {
            const { mesh } = block;
            if (tau < block.grip) mesh.position.copy(block.pick);
            else if (tau < block.release) mesh.position.set(tip.x, tip.y - BLOCK.h, tip.z);
            else {
                const q = easeInOut(seg(t, END + 0.1 + i * 0.15, END + 0.9 + i * 0.15));
                mesh.position.lerpVectors(block.target, block.pick, q);
                mesh.position.y += Math.sin(q * Math.PI) * 1.7;
            }
            // Measured: where the block lies, against its place in the model
            const offset = (mesh.position.x - targets[i].x) * 1000;
            const sweep = seg(tau, block.release + 0.45, block.release + 1.1);
            const verified = tau >= block.release + 1.1;
            if (sweep > 0 && sweep < 1) {
                sweeping = 1;
                laser.position.set(lerp(targets[i].x - 0.6, targets[i].x + 0.6, sweep), targets[i].y + BLOCK.h - 0.02, WALL_Z);
                laser.scale.y = tip.y - targets[i].y - BLOCK.h + 0.12;
            }
            tone.lerpColors(OKAY, AMBER, clamp01(Math.abs(offset) / TOLERANCE));
            block.tint.color.copy(tone);
            const marked = verified ? pulse(tau, block.release + 1.1, block.release + 3.2, 0.3) * (1 - back) : 0;
            block.tint.opacity = 0.6 * marked;
            block.check.visible = marked > 0.01;
            block.tag.set(verified ? `Block ${i + 1} placed` : `Block ${i + 1} · laser scan`,
                verified ? `${offset >= 0 ? '+' : '−'}${Math.abs(offset).toFixed(1)} mm · within ± ${TOLERANCE.toFixed(1)} mm` : 'against its place in the model')
                .tone(verified ? 'ok' : '').at(targets[i].x, targets[i].y + BLOCK.h + 0.15, WALL_Z)
                .show(pulse(tau, block.release + 0.3, block.release + 2.9, 0.25) * Math.min(1, Math.abs(tau - block.release - 1.1) / 0.1) * (1 - back));
        });
        laser.visible = sweeping > 0;
        laserMaterial.opacity = 0.75;

        // ---- Beat 4: a worker walks in for the toolbox; the zones answer
        const inCell = t >= B4 && t < END;
        const far = inCell ? walked(u4) : 0;
        stride(worker, walkIn, walkIn.length * far, FLOOR, far > 0.001 && far < 0.999 ? 1 : 0);
        if (u4 > 2.6) worker.rotation.y += Math.PI;
        worker.visible = t > B4 - 0.4 && t < END + 0.3;
        const carrying = u4 > 2.7 && t < END + 0.3;
        worker.userData.armR.rotation.x = u4 > 2.3 && u4 < 3 ? -0.9 : worker.userData.armR.rotation.x;
        if (carrying) {
            k.local(worker.userData.foreR, hand);
            toolbox.position.set(hand.x, hand.y - 0.62, hand.z);
            toolbox.rotation.y = worker.rotation.y + Math.PI / 2;
        } else {
            toolbox.position.set(1.5, FLOOR, 0.2);
            toolbox.rotation.y = 0.5;
        }
        const d = Math.hypot(worker.position.x - BASE.x, worker.position.z - BASE.z);
        const state = !inCell ? 0 : d < ZONE.stop ? 2 : d < ZONE.warn ? 1 : 0;
        const guarded = pulse(t, B4 - 0.3, END + 0.3, 0.5);
        zoneWarn.opacity = guarded * (state === 1 ? 0.42 : 0.07);
        zoneStop.opacity = guarded * (state === 2 ? 0.42 + 0.1 * Math.sin(t * 10) : 0.05);
        zoneEdges.forEach(edge => { edge.visible = guarded > 0.01; });
        edgeMaterial.opacity = 0.35 * guarded;
        beacon.material.color.copy(k.color(state === 2 ? 'signal' : state === 1 ? '#f0b429' : 'ok', tone));
        beaconGlow.material.color.copy(beacon.material.color);
        workerTag.set(`Worker ${d.toFixed(1)} m from the robot`).at(worker.position.x, FLOOR + 2.1, worker.position.z).show(inCell ? pulse(u4, 0.3, 5.2, 0.3) : 0);

        // ---- What the arm is doing
        const speed = speedAt(u4);
        const working = tau >= blocks[0].grip - 1.3 && tau < DONE;
        const which = Math.min(2, blocks.filter(block => tau >= block.release + 1.5).length);
        const [doing, detail, mood] = !inCell ? ['Robot arm', `Block ${which + 1} of 3 · full speed`, '']
            : state === 2 ? ['Protective stop', `A person is inside ${ZONE.stop} m`, 'signal']
            : state === 1 ? ['Slowed', `${Math.round(SLOW * 100)} % speed · a person inside ${ZONE.warn} m`, 'signal']
            : ['Robot arm', `Block ${which + 1} of 3 · ${Math.round(speed * 100)} % speed`, 'ok'];
        armTag.set(doing, detail).tone(mood).at(BASE.x, FLOOR + 4.9, BASE.z).show(working && t > B3 - 0.4 ? 1 - seg(t, END - 0.3, END) : 0);

        const total = planned.length;
        taskTag.set('Build sequence · from the model', `${COURSES.length} courses · ${total} blocks · ${u1 < 4.4 && u1 > 1.6 ? `block ${Math.min(total, next + 1)}` : `${placedCount} placed`}`)
            .show(pulse(t, B1 + 0.4, B2 + 0.4, 0.3));
        caption(t);
    };
}

export const robotics = {
    duration: 26.8,
    poster: 9.9,
    scale: 1.05,
    alt: 'A six-axis robot arm builds a block wall from its model. The wall in the model splits into numbered courses, the sequence the robot is given; the arm\'s reach appears as a dome and its path from the pallet is drawn, bent round a scaffold tower the straight line would have hit; each block is laid, swept by a laser line and coloured by its offset from the model; then a worker walks into the cell and the floor zone turns amber as the arm slows and red as it stops, until they leave.',
    build
};
