import * as THREE from '../../vendor/three.module.min.js';
import { lerp, seg, smooth, pulse, track, person, desk, route } from './props.js';
import { captions, ribbon, sampled, dots, frame, fader, random, shaderColor, whole } from './overlays.js';

// The map: square cells over the plan, with a wall's centre line on a line of cell centres
const CELL = 0.2, X0 = -5.7, Z0 = -3.7, NX = 57, NZ = 38, CELLS = NX * NZ;
const ROBOT = 0.37;                  // radius of the robot, m
const CLEARANCE = 0.45;              // how far the planner keeps the robot's centre from anything solid, m
const LEVEL = 3.4;                   // storey height, m
const LIDAR = { rays: 73, fov: (270 * Math.PI) / 180, range: 4.2 };
// Weight of A*'s estimate of what is left: below 1 the search spreads wider, and still finds the shortest route
const GREED = 0.55;
const NEIGHBOURS = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, -1], [-1, 1]];

const cellOf = (x, z) => Math.floor((z - Z0) / CELL) * NX + Math.floor((x - X0) / CELL);
const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

/** How far each cell's centre is from the nearest solid cell, in metres (up to 1.2). */
function distances(solid) {
    const dist = new Float32Array(CELLS).fill(1.2), reach = 6;
    for (let j = 0; j < NZ; j++) {
        for (let i = 0; i < NX; i++) {
            if (solid[j * NX + i]) {
                dist[j * NX + i] = 0;
                continue;
            }
            let best = 1.2;
            for (let dj = -reach; dj <= reach; dj++) {
                for (let di = -reach; di <= reach; di++) {
                    const a = i + di, b = j + dj;
                    if (a < 0 || b < 0 || a >= NX || b >= NZ || !solid[b * NX + a]) continue;
                    // To the nearest edge of that cell, not to its centre
                    const d = Math.hypot(Math.max(0, Math.abs(di) - 0.5), Math.max(0, Math.abs(dj) - 0.5)) * CELL;
                    if (d < best) best = d;
                }
            }
            dist[j * NX + i] = best;
        }
    }
    return dist;
}

/**
 * A* over the cells that are not blocked, from one point [x, z] to another.
 * Returns the order in which cells were searched (the wave), how many were,
 * and the route: the cells of the path pulled tight, with rounded corners.
 */
function plan(blocked, from, to) {
    const start = cellOf(from[0], from[1]), goal = cellOf(to[0], to[1]);
    const cost = new Float32Array(CELLS).fill(Infinity), parent = new Int32Array(CELLS).fill(-1);
    const order = new Uint16Array(CELLS), closed = new Uint8Array(CELLS);
    const gi = goal % NX, gj = Math.floor(goal / NX);
    const ahead = c => {
        const di = Math.abs((c % NX) - gi), dj = Math.abs(Math.floor(c / NX) - gj);
        return GREED * (Math.max(di, dj) + (Math.SQRT2 - 1) * Math.min(di, dj));
    };
    const open = [start];
    let count = 0;
    cost[start] = 0;
    while (open.length) {
        // The open cell that promises the shortest route (the grid is small: a scan will do)
        let best = 0;
        for (let n = 1; n < open.length; n++) {
            const d = cost[open[n]] + ahead(open[n]) - cost[open[best]] - ahead(open[best]);
            if (d < -1e-6 || (d < 1e-6 && ahead(open[n]) < ahead(open[best]))) best = n;
        }
        const c = open.splice(best, 1)[0];
        if (closed[c]) continue;
        closed[c] = 1;
        order[c] = ++count;
        if (c === goal) break;
        const ci = c % NX, cj = Math.floor(c / NX);
        NEIGHBOURS.forEach(([di, dj]) => {
            const i = ci + di, j = cj + dj;
            if (i < 0 || j < 0 || i >= NX || j >= NZ) return;
            const n = j * NX + i;
            if (blocked[n] || closed[n]) return;
            if (di && dj && (blocked[cj * NX + i] || blocked[j * NX + ci])) return;   // no cutting corners
            const g = cost[c] + (di && dj ? Math.SQRT2 : 1);
            if (g < cost[n]) {
                cost[n] = g;
                parent[n] = c;
                open.push(n);
            }
        });
    }

    if (!closed[goal]) throw new Error(`No route from ${from} to ${to}`);
    const points = [];
    for (let c = goal; c >= 0; c = parent[c]) points.unshift([X0 + ((c % NX) + 0.5) * CELL, Z0 + (Math.floor(c / NX) + 0.5) * CELL]);
    points[0] = from;
    points[points.length - 1] = to;
    const clear = (a, b) => {
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05);
        for (let s = 1; s < steps; s++) if (blocked[cellOf(lerp(a[0], b[0], s / steps), lerp(a[1], b[1], s / steps))]) return false;
        return true;
    };
    const pulled = [points[0]];
    for (let a = 0; a < points.length - 1;) {
        let b = points.length - 1;
        while (b > a + 1 && !clear(points[a], points[b])) b--;
        pulled.push(points[b]);
        a = b;
    }
    return { order, count, path: route(pulled, 0.35) };
}

/**
 * Two storeys of a building, cut at 0.9 m, and a robot that is sent to
 * photograph the upper one. Four beats: the walls of the BIM become an
 * occupancy grid with a clearance halo; A* searches the grid and the route
 * snaps out of the wave; the robot localises with its LiDAR and steers round
 * a cart that is not in the model; it takes the lift, found in the BIM, and
 * photographs way-points tagged to their rooms. The grid, the search, the
 * routes and the LiDAR hits are all computed from the walls as built here.
 */
function build(k) {
    const FL = 0.3, WH = 0.9, T = 0.16;
    const B1 = 1, B2 = 6, B3 = 11, B4 = 17.6, END = 27.4;
    const world = k.group();                       // rides down as the lift goes up

    const boards = k.standard('#e3d2b4', { roughness: 0.9 }), carpet = k.standard('#d9dde2', { roughness: 0.9 });
    const solids = [[], []];                       // footprints of what stands on each storey: the maps are made from them
    const ROOMS = [
        [-5.6, -3.6, -3.4, 3.8, ['1.01 Robot bay', '2.01 Office']],
        [3.4, -3.6, 5.6, 3.8, ['1.02 Office', '2.02 Meeting room']],
        [-2, -1.4, 0, 1.4, ['1.03 Store', '2.03 Store']],
        [-5.6, -3.6, 5.6, 3.8, ['1.C1 Corridor', '2.C1 Corridor']]
    ];
    const roomAt = (x, z, level) => ROOMS.find(r => x > r[0] && x < r[2] && z > r[1] && z < r[3])[4][level];

    const storey = n => {
        const g = k.group(world, 0, n * LEVEL, 0);
        const flat = k.group(g, 0, FL, 0);         // walls and furniture: what drops into the grid
        const mark = (x, z, w, d) => solids[n].push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
        const block = (material, w, h, d, x, z) => {
            mark(x, z, w, d);
            return k.box(flat, material, w, h, d, x, 0, z);
        };
        k.box(g, 'concrete', 11.8, 0.26, 8, 0, 0, 0.1);
        k.box(g, 'coping', 11.4, 0.04, 7.6, 0, 0.26, 0.1);
        [-4.5, 4.5].forEach(x => k.box(g, boards, 2.04, 0.012, 7.24, x, FL, 0.1));
        k.box(g, carpet, 1.84, 0.012, 2.64, -1, FL, 0);

        const wall = (x0, z0, x1, z1) => {
            const w = Math.abs(x1 - x0) + T, d = Math.abs(z1 - z0) + T, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
            block('wall', w, WH, d, x, z);
            k.box(flat, 'dark', w, 0.035, d, x, WH, z);
        };
        wall(-5.6, -3.6, 5.6, -3.6);
        wall(-5.6, 3.8, 5.6, 3.8);
        wall(-5.6, -3.6, -5.6, 3.8);
        wall(5.6, -3.6, 5.6, 3.8);
        // A room at each end
        wall(-3.4, -3.6, -3.4, 0);
        wall(-3.4, 1.4, -3.4, 3.8);
        wall(3.4, -3.6, 3.4, -0.7);
        wall(3.4, 0.7, 3.4, 3.8);
        // The core: a store, and the lift shaft
        wall(-2, -1.4, 1.6, -1.4);
        wall(-2, -1.4, -2, 1.4);
        wall(-2, 1.4, -1.5, 1.4);
        wall(-0.4, 1.4, 1.6, 1.4);
        wall(1.6, -1.4, 1.6, -0.6);
        wall(1.6, 0.6, 1.6, 1.4);
        wall(0, -1.4, 0, 1.4);

        // Glazing in all four outer walls
        [-4.5, -1.5, 1.5, 4.5].forEach(x => [-3.6, 3.8].forEach(z => k.box(flat, 'glass', 1.7, 0.5, 0.19, x, 0.42, z)));
        [-2, 2].forEach(z => [-5.6, 5.6].forEach(x => k.box(flat, 'glass', 0.19, 0.5, 1.7, x, 0.42, z)));
        // Doors, standing open against their walls, and their frames
        block('timber', 0.05, 0.86, 1.2, -3.52, 2);
        block('timber', 0.05, 0.86, 0.62, 3.52, 1.02);
        block('timber', 0.05, 0.86, 0.62, 3.52, -1.02);
        block('timber', 1.05, 0.86, 0.05, 0.15, 1.52);
        [[-3.4, 0], [-3.4, 1.4], [3.4, -0.7], [3.4, 0.7]].forEach(([x, z]) => k.box(flat, 'dark', 0.2, 0.92, 0.07, x, 0, z));
        [-1.5, -0.4].forEach(x => k.box(flat, 'dark', 0.07, 0.92, 0.2, x, 0, 1.4));
        // The lift's landing doors
        const leaves = [-0.3, 0.3].map(z => k.box(flat, 'metal', 0.07, WH, 0.6, 1.6, 0, z));
        mark(1.6, 0, T, 1.2);

        const furnish = (x, z, turn) => {
            desk(k, flat, x, 0, z, turn);
            mark(x + Math.sin(turn) * 0.27, z, 1.2, 1.3);
        };
        const plant = (x, z) => {
            mark(x, z, 0.4, 0.4);
            k.cyl(flat, 'timber', 0.2, 0.3, x, 0, z);
            k.mesh(flat, k.GEO.blob, 'leaf', x, 0.62, z).scale.setScalar(0.36);
        };
        block('wallAlt', 0.36, 0.82, 1.5, -1.72, -0.5);                       // shelves in the store
        [-0.4, 1.4].forEach(x => block('wallAlt', 1.5, 0.78, 0.42, x, -3.25));
        plant(-3, -3.1);
        plant(3, 3.35);
        if (n === 0) {
            // The robot's bay: its dock, a bench, shelving
            block('dark', 0.3, 0.42, 0.62, -5.33, 0.7);
            k.box(flat, 'accent', 0.04, 0.1, 0.5, -5.17, 0.2, 0.7);
            furnish(-4.75, -2.5, Math.PI / 2);
            block('wallAlt', 0.45, 0.85, 1.4, -5.25, 3);
            furnish(4.75, -2.3, -Math.PI / 2);
            furnish(4.75, 2.6, -Math.PI / 2);
        } else {
            furnish(-4.75, -2.5, Math.PI / 2);
            furnish(-4.75, 2.6, Math.PI / 2);
            furnish(-4.2, 0.4, -Math.PI / 2);
            // The meeting room: a table and its chairs
            k.box(flat, 'timber', 1, 0.05, 2.3, 4.7, 0.7, 1.9);
            k.box(flat, 'dark', 0.5, 0.7, 1.6, 4.7, 0, 1.9);
            mark(4.7, 1.9, 2, 2.6);
            [1.2, 1.9, 2.6].forEach(z => [-0.75, 0.75].forEach(dx => {
                k.box(flat, 'rubber', 0.42, 0.07, 0.42, 4.7 + dx, 0.42, z);
                k.box(flat, 'rubber', 0.06, 0.42, 0.42, 4.7 + dx * 1.3, 0.49, z);
            }));
            k.box(flat, 'dark', 0.06, 0.6, 1.3, 5.46, 0.25, -1.9);             // a screen on the end wall
            const host = person(k, g, 3.95, 2.9, { top: '#8a4f6b', skin: 1, hair: 2 });
            host.position.y = FL;
            host.rotation.y = 2.2;
        }
        [[-2.7, 2.6], [2.5, 2.6], [0, -2.5]].forEach(([x, z]) => { k.pool(g, x, z, 2.4, '#ffd9a0', 0.22).position.y = FL + 0.015; });
        return { g, flat, leaves };
    };
    const lower = storey(0), upper = storey(1);

    // What is not in the BIM: a cart, and the porter who rolls it out of the store
    const CART = { x: -0.95, w: 0.7, d: 0.9, from: 0.35, to: 1.95 };
    const cart = k.group(lower.g, CART.x, FL, CART.from);
    k.box(cart, 'steel', CART.w, 0.08, CART.d, 0, 0.14, 0);
    k.box(cart, 'timber', 0.6, 0.4, 0.38, 0, 0.22, -0.22);
    k.box(cart, 'yellow', 0.56, 0.3, 0.36, 0, 0.22, 0.22);
    k.box(cart, 'timber', 0.5, 0.26, 0.34, 0, 0.62, -0.2);
    k.bars(cart, 'steel', 0.04, [[-0.3, 0.2, -0.45, -0.3, 0.98, -0.52], [0.3, 0.2, -0.45, 0.3, 0.98, -0.52], [-0.3, 0.98, -0.52, 0.3, 0.98, -0.52]]);
    const porter = person(k, lower.g, CART.x, 0, { top: '#3d5a80', skin: 2, hair: 2 });
    porter.position.y = FL;
    porter.userData.foreL.rotation.x = porter.userData.foreR.rotation.x = -1.25;

    const fadeLower = fader(k, lower.g), fadeUpper = fader(k, upper.g);

    // The lift car, which carries the robot between the storeys
    const car = k.group(world, 0.8, FL, 0);
    k.box(car, 'metal', 1.36, 0.03, 2.3, 0, 0, 0);
    k.box(car, 'wallAlt', 0.05, WH - 0.1, 2.3, -0.66, 0, 0);
    [-1.13, 1.13].forEach(z => k.box(car, 'wallAlt', 1.36, WH - 0.1, 0.05, 0, 0, z));
    k.bars(car, 'steel', 0.035, [[-0.6, 0.62, -1.05, -0.6, 0.62, 1.05]]);
    const liftLine = k.lineMaterial('accent', { transparent: true });
    frame(k, car, liftLine, 1.5, WH + 0.25, 2.5, 0, 0, 0);

    // ---- The map: what is solid, how far everything else is from it, where the robot may go
    const occupancy = footprints => {
        const cells = new Uint8Array(CELLS);
        footprints.forEach(([x0, z0, x1, z1]) => {
            const i1 = Math.min(NX - 1, Math.floor((x1 - X0 - 1e-4) / CELL)), j1 = Math.min(NZ - 1, Math.floor((z1 - Z0 - 1e-4) / CELL));
            for (let j = Math.max(0, Math.floor((z0 - Z0 + 1e-4) / CELL)); j <= j1; j++) {
                for (let i = Math.max(0, Math.floor((x0 - X0 + 1e-4) / CELL)); i <= i1; i++) cells[j * NX + i] = 1;
            }
        });
        return cells;
    };
    const solid = occupancy(solids[0]);
    const withCart = solid.slice(), added = new Uint8Array(CELLS);
    for (let j = 0; j < NZ; j++) {
        for (let i = 0; i < NX; i++) {
            const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
            if (Math.abs(x - CART.x) < CART.w / 2 + CELL / 2 && Math.abs(z - CART.to) < CART.d / 2 + CELL / 2 && !solid[j * NX + i]) {
                withCart[j * NX + i] = added[j * NX + i] = 1;
            }
        }
    }
    const distA = distances(solid), distB = distances(withCart);
    const inflate = dist => dist.map(d => (d < CLEARANCE ? 1 : 0));
    const blockedA = inflate(distA), blockedB = inflate(distB), blockedUp = inflate(distances(occupancy(solids[1])));
    const solidCells = solid.reduce((sum, s) => sum + s, 0);
    const haloCells = blockedA.reduce((sum, b) => sum + b, 0) - solidCells;

    const DOCK = [-4.7, 0.7], LANDING = [2.5, 0], CAR = [0.8, 0], SHOT1 = [4.3, -1.5], SHOT2 = [0.3, 2.7];
    const planA = plan(blockedA, DOCK, LANDING), routeA = planA.path;
    // The robot meets the cart as it turns into the corridor
    const spot = { x: 0, z: 0 }, ahead = { x: 0, z: 0 };
    let meet = 0;
    while (meet < routeA.length && routeA.at(meet, spot).z < 1.7) meet += 0.02;
    const MEET = [spot.x, spot.z];
    const planB = plan(blockedB, MEET, LANDING), routeB = planB.path;
    const routeC = plan(blockedUp, LANDING, SHOT1).path, routeD = plan(blockedUp, SHOT1, SHOT2).path;
    const detour = routeB.length - (routeA.length - meet);

    const texture = (occupied, dist, order) => {
        const data = new Uint8Array(CELLS * 4);
        for (let c = 0; c < CELLS; c++) {
            data[c * 4] = added[c] && occupied[c] ? 128 : occupied[c] ? 255 : 0;
            data[c * 4 + 1] = Math.min(255, Math.round(dist[c] / 0.005));
            data[c * 4 + 2] = order[c] >> 8;
            data[c * 4 + 3] = order[c] & 255;
        }
        const map = k.own(new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat));
        map.magFilter = map.minFilter = THREE.NearestFilter;
        map.needsUpdate = true;
        return map;
    };
    const mapA = texture(solid, distA, planA.order), mapB = texture(withCart, distB, planB.order);

    const grid = k.own(new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
            uMap: { value: mapA }, uCells: { value: new THREE.Vector2(NX, NZ) },
            uGrid: { value: 0 }, uHalo: { value: 0 }, uHaloAlpha: { value: 0.5 }, uWave: { value: 0 }, uSearch: { value: 0 },
            uSolid: { value: new THREE.Vector3() }, uClear: { value: new THREE.Vector3() },
            uSeen: { value: new THREE.Vector3() }, uNew: { value: new THREE.Vector3() }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform sampler2D uMap;
            uniform vec2 uCells;
            uniform float uGrid, uHalo, uHaloAlpha, uWave, uSearch;
            uniform vec3 uSolid, uClear, uSeen, uNew;
            varying vec2 vUv;
            void main() {
                vec2 cell = vUv * uCells, f = fract(cell);
                vec4 s = texture2D(uMap, (floor(cell) + 0.5) / uCells);
                float inset = step(0.09, f.x) * step(0.09, f.y) * step(f.x, 0.91) * step(f.y, 0.91);
                float solid = step(0.9, s.r), fresh = step(0.4, s.r) * (1.0 - solid);
                float order = s.b * 65280.0 + s.a * 255.0;
                vec3 colour = uSolid;
                float alpha = 0.07;
                // The search: every cell it has reached, brightest at its front
                float seen = step(0.5, order) * step(order, uWave);
                float front = seen * smoothstep(uWave - 90.0, uWave, order);
                colour = mix(colour, uSeen, seen);
                alpha = max(alpha, seen * uSearch * (0.2 + 0.6 * front));
                // The clearance halo: cells nearer to something solid than the robot may go
                float halo = (1.0 - solid) * step(s.g * 1.275, uHalo) * step(0.001, uHalo);
                colour = mix(colour, uClear, halo);
                alpha = max(alpha, halo * uHaloAlpha);
                colour = mix(colour, uSolid, solid);
                alpha = max(alpha, solid * 0.85);
                colour = mix(colour, uNew, fresh);
                alpha = max(alpha, fresh * 0.95);
                gl_FragColor = vec4(colour, alpha * inset * uGrid);
            }`
    }));
    k.onTheme(() => {
        shaderColor(k, 'ink', grid.uniforms.uSolid.value);
        shaderColor(k, ['#e09a1a', '#f7c64f'], grid.uniforms.uClear.value);
        shaderColor(k, 'accent', grid.uniforms.uSeen.value);
        shaderColor(k, 'signal', grid.uniforms.uNew.value);
    });
    const gridGeometry = new THREE.BufferGeometry();
    const GW = NX * CELL, GD = NZ * CELL, GY = FL + 0.02;
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute([X0, GY, Z0, X0 + GW, GY, Z0, X0 + GW, GY, Z0 + GD, X0, GY, Z0 + GD], 3));
    gridGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    gridGeometry.setIndex([0, 2, 1, 0, 3, 2]);
    const gridMesh = new THREE.Mesh(gridGeometry, grid);
    gridMesh.renderOrder = 2;
    world.add(gridMesh);

    // ---- Routes, drawn on the floor
    const routeMaterial = k.basic('accent', { side: THREE.DoubleSide });
    const staleMaterial = k.basic(['#9aa6b6', '#5b6d92'], { side: THREE.DoubleSide, transparent: true });
    const band = (path, y) => ribbon(k, world, routeMaterial, sampled(path), 0.13, y);
    const bandA = band(routeA, FL + 0.04), bandB = band(routeB, FL + 0.045);
    const bandC = band(routeC, FL + LEVEL + 0.04), bandD = band(routeD, FL + LEVEL + 0.04);

    const markerMaterial = k.basic('accent', { transparent: true, opacity: 0.4, depthWrite: false });
    const dockMark = k.mesh(world, k.GEO.disc, markerMaterial, DOCK[0], FL + 0.03, DOCK[1]);
    dockMark.scale.setScalar(0.5);
    dockMark.renderOrder = 2;
    const pinMaterial = k.basic('signal');
    const pinGeometry = k.own(new THREE.ConeGeometry(0.16, 0.45, 14).rotateX(Math.PI).translate(0, 0.23, 0));
    const pin = (x, z, level) => {
        const g = k.group(world, x, FL + level * LEVEL + (level ? 1.5 : 0.2), z);
        k.mesh(g, pinGeometry, pinMaterial);
        k.sphere(g, pinMaterial, 0.22, 0, 0.62, 0);
        k.glow(g, 0, 0.6, 0, 1.4, 'signal', 0.7);
        return g;
    };
    const goalPin = pin(LANDING[0], LANDING[1], 0), shotPins = [pin(SHOT1[0], SHOT1[1], 1), pin(SHOT2[0], SHOT2[1], 1)];

    // ---- The robot: a round drive base with a LiDAR, and a camera on a mast
    const bot = k.group(world);
    k.cyl(bot, 'dark', ROBOT, 0.1, 0, 0.04, 0);
    k.cyl(bot, 'white', ROBOT - 0.03, 0.22, 0, 0.14, 0);
    k.cyl(bot, 'accent', ROBOT - 0.07, 0.03, 0, 0.36, 0);
    k.cyl(bot, 'dark', 0.11, 0.1, 0, 0.39, 0.16);
    k.box(bot, 'dark', 0.4, 0.07, 0.06, 0, 0.2, ROBOT - 0.04);
    [-1, 1].forEach(side => { k.cyl(bot, 'rubber', 0.1, 0.07, side * (ROBOT - 0.02) - 0.035, 0.1, 0).rotation.z = -Math.PI / 2; });
    k.box(bot, 'dark', 0.05, 0.78, 0.05, 0, 0.39, -0.12);
    const head = k.group(bot, 0, 1.17, -0.12);
    k.box(head, 'dark', 0.2, 0.12, 0.14, 0, 0, 0);
    k.cyl(head, 'metal', 0.045, 0.05, 0, 0.06, 0.07).rotation.x = Math.PI / 2;
    k.glow(bot, 0, 0.3, 0.55, 1, '#cfe3ff');
    const flashMaterial = k.basic('#ffffff', { transparent: true, depthWrite: false });
    const flash = k.sphere(head, flashMaterial, 0.3, 0, 0.06, 0.2);
    const flashGlow = k.glow(head, 0, 0.06, 0.2, 3.4, '#ffffff', 0.9);
    const shotLine = k.lineMaterial('accent', { transparent: true });
    const shotLines = k.lines(head, shotLine, [[-0.75, 0.5], [0.75, 0.5], [0.75, -0.6], [-0.75, -0.6]]
        .flatMap(([x, y], n, corners) => [0, 0.06, 0.1, x, y, 1.9, x, y, 1.9, corners[(n + 1) % 4][0], corners[(n + 1) % 4][1], 1.9]));
    shotLines.renderOrder = 3;

    // Its LiDAR: a fan of rays, the points they hit, and the guesses at where it is
    const fanGeometry = new THREE.BufferGeometry();
    fanGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((LIDAR.rays + 1) * 3), 3));
    const fanIndex = [];
    for (let r = 1; r < LIDAR.rays; r++) fanIndex.push(0, r, r + 1);
    fanGeometry.setIndex(fanIndex);
    const fanMaterial = k.basic('accent', { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.frustumCulled = false;
    fan.renderOrder = 3;
    world.add(fan);
    const beamMaterial = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const beam = k.lines(world, beamMaterial, [0, 0, 0, 0, 0, 0]);
    beam.frustumCulled = false;
    beam.renderOrder = 3;
    const hits = dots(k, world, 'ink', 2.6, LIDAR.rays), strange = dots(k, world, 'signal', 3.4, LIDAR.rays);
    const GUESSES = 44, rnd = random(7);
    const guessAt = [];
    for (let n = 0; n < GUESSES; n++) {
        const r = Math.sqrt(-2 * Math.log(rnd() || 0.5)), a = rnd() * Math.PI * 2;
        guessAt.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    const spread = Math.sqrt(guessAt.reduce((sum, [x, z]) => sum + x * x + z * z, 0) / (2 * GUESSES));
    const guesses = dots(k, world, 'accent', 3, GUESSES);
    const alertLine = k.lineMaterial('signal', { transparent: true });
    const alert = frame(k, cart, alertLine, CART.w + 0.25, 1.1, CART.d + 0.25);

    /** Cast the LiDAR's rays from a pose, against the walls as built and the cart where it stands. */
    const scan = (x, z, heading, t) => {
        const fanAt = fanGeometry.attributes.position, hitAt = hits.geometry.attributes.position, oddAt = strange.geometry.attributes.position;
        const y = FL + 0.44, cz = cart.position.z;
        let known = 0, odd = 0;
        fanAt.setXYZ(0, x, y, z);
        for (let r = 0; r < LIDAR.rays; r++) {
            const a = heading + lerp(-LIDAR.fov / 2, LIDAR.fov / 2, r / (LIDAR.rays - 1));
            const dx = Math.sin(a), dz = Math.cos(a);
            let d = ROBOT, hit = 0;
            for (; d < LIDAR.range; d += 0.04) {
                const px = x + dx * d, pz = z + dz * d;
                if (Math.abs(px - CART.x) < CART.w / 2 && Math.abs(pz - cz) < CART.d / 2) hit = 2;
                else if (solid[cellOf(px, pz)]) hit = 1;
                if (hit) break;
            }
            const px = x + dx * d, pz = z + dz * d;
            fanAt.setXYZ(r + 1, px, y, pz);
            if (hit === 1) hitAt.setXYZ(known++, px, y, pz);
            else if (hit === 2) oddAt.setXYZ(odd++, px, y, pz);
        }
        fanAt.needsUpdate = hitAt.needsUpdate = oddAt.needsUpdate = true;
        hits.geometry.setDrawRange(0, known);
        strange.geometry.setDrawRange(0, odd);
        // One ray, brighter, sweeps the fan
        const sweep = heading + (LIDAR.fov / 2) * Math.sin(t * 5), n = 1 + Math.round(((Math.sin(t * 5) + 1) / 2) * (LIDAR.rays - 1));
        const beamAt = beam.geometry.attributes.position;
        beamAt.setXYZ(0, x + Math.sin(sweep) * ROBOT, y, z + Math.cos(sweep) * ROBOT);
        beamAt.setXYZ(1, fanAt.getX(n), y, fanAt.getZ(n));
        beamAt.needsUpdate = true;
        return odd;
    };

    const mapTag = k.label();
    const statusTag = k.label();
    const liftTag = k.label('Lift L-01', 'IfcTransportElement · Level 1 to 2');
    const shotTags = [SHOT1, SHOT2].map(([x, z], n) => k.label(`Photo ${n + 1} of 2`, roomAt(x, z, 1)).tone('ok'));
    const caption = captions(k, [
        [B1, B2, 'Map · the BIM as an occupancy grid'],
        [B2, B3, 'Plan · A* search for the shortest route'],
        [B3, B4, 'Sense · LiDAR localisation and an unmapped obstacle'],
        [B4, END, 'Mission · by lift to Level 2, photos tagged to rooms']
    ]);

    const drive = u => lerp(u, smooth(u), 0.65);
    const DETECT = B3 + 2.3, REPLAN = B3 + 3.2, ARRIVE = B3 + 6;
    const SHOTS = [[B4 + 5.4, B4 + 6.1, SHOT1, Math.PI * 0.12], [B4 + 8.1, B4 + 8.8, SHOT2, -Math.PI * 0.6]];
    let heading = Math.PI / 2;
    const along = (path, s) => {
        path.at(s - 0.25, spot);
        path.at(s + 0.25, ahead);
        heading = Math.atan2(ahead.x - spot.x, ahead.z - spot.z);
        path.at(s, spot);
        bot.position.x = spot.x;
        bot.position.z = spot.z;
    };

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;
        const reset = smooth(seg(t, END, END + 0.8));

        // ---- The lift: the storeys change places as the car goes up
        const ride = smooth(seg(u4, 2, 3.4)) * (1 - reset);
        world.position.y = -LEVEL * ride;
        car.position.y = FL + LEVEL * ride;
        fadeLower(1 - ride);
        fadeUpper(ride);
        const openLower = pulse(u4, 0.4, 2, 0.5), openUpper = smooth(seg(u4, 3.4, 3.8)) * (1 - seg(t, END, END + 0.3));
        lower.leaves.forEach((leaf, n) => { leaf.position.z = (n ? 1 : -1) * (0.3 + 0.56 * openLower); });
        upper.leaves.forEach((leaf, n) => { leaf.position.z = (n ? 1 : -1) * (0.3 + 0.56 * openUpper); });
        const located = pulse(u4, 0.1, 3.3, 0.3);
        liftLine.opacity = located * (0.65 + 0.35 * Math.sin(t * 6));
        liftTag.at(CAR[0], car.position.y + world.position.y + WH + 0.4, CAR[1]).show(pulse(u4, 0.1, 2.2, 0.3));

        // ---- Beat 1: the walls drop into the grid, and the halo inflates round them
        lower.flat.scale.y = 1 - 0.94 * pulse(u1, 0.3, 4.9, 0.9);
        const mapped = pulse(t, B1 + 0.7, B4 + 2.2, 0.8);
        gridMesh.visible = mapped > 0.005;
        grid.uniforms.uGrid.value = mapped;
        grid.uniforms.uHalo.value = CLEARANCE * smooth(seg(u1, 2.3, 3.9));
        grid.uniforms.uHaloAlpha.value = lerp(0.5, 0.2, seg(u1, 4.6, 5.4));
        const halo = u1 >= 2.3;
        mapTag.set(halo ? 'Clearance halo' : 'Occupancy grid',
            halo ? `${CLEARANCE} m · ${whole(haloCells * seg(u1, 2.3, 3.9))} cells kept clear` : `${NX} × ${NZ} cells of ${CELL * 100} cm · ${whole(solidCells * seg(u1, 0.7, 1.6))} solid`)
            .at(0, FL + 0.9, -3.6).show(pulse(u1, 0.7, 4.8, 0.3) * Math.min(1, Math.abs(u1 - 2.3) / 0.15));

        // ---- Beat 2: the search spreads from the dock, and the route snaps out of it
        const replanned = t >= DETECT;
        grid.uniforms.uMap.value = replanned ? mapB : mapA;
        const searching = replanned ? seg(t, DETECT + 0.25, REPLAN - 0.2) : seg(u2, 0.6, 3.1);
        const searched = (replanned ? planB.count : planA.count) * searching;
        grid.uniforms.uWave.value = searched;
        grid.uniforms.uSearch.value = replanned ? pulse(t, DETECT + 0.2, REPLAN + 0.6, 0.3) : lerp(1, 0.35, seg(u2, 3.6, 4.6)) * pulse(t, B2 + 0.5, B3 + 0.6, 0.4);
        const found = seg(u2, 3.15, 3.55);
        goalPin.scale.setScalar(smooth(seg(u2, 0.2, 0.6)) * (1 - smooth(seg(u4, 0.6, 1))));
        goalPin.visible = goalPin.scale.x > 0.01;
        goalPin.position.y = FL + 0.2 + 0.07 * Math.sin(t * 3);
        dockMark.visible = t < B4 + 2;

        // ---- Where the robot is
        let s = 0, level = 0, status = '', detail = '', tone = '';
        bandA.material = routeMaterial;
        if (t < B3 + 0.8 || t >= END + 0.4) {
            bot.position.x = DOCK[0];
            bot.position.z = DOCK[1];
            heading = Math.PI / 2;
            if (u2 > 0.4 && u2 < 3.15) [status, detail] = ['Planning', `A* · ${whole(searched)} cells searched`];
            else if (u2 >= 3.15 && u3 < 0.2) [status, detail, tone] = ['Route found', `${routeA.length.toFixed(1)} m to the lift`, 'ok'];
            else if (u3 >= 0.2 && t < END) [status, detail] = ['Localising', 'Matching LiDAR to the map'];
            bandA.userData.show(t < END ? 1 - found : 1, 1);
        } else if (t < DETECT) {
            s = meet * drive(seg(t, B3 + 0.8, DETECT));
            along(routeA, s);
            bandA.userData.show(s / routeA.length, 1);
            [status, detail] = ['Navigating', `${(routeA.length - s).toFixed(1)} m to go`];
        } else if (t < REPLAN) {
            along(routeA, meet);
            bandA.material = staleMaterial;
            staleMaterial.opacity = 1 - seg(t, DETECT + 0.3, REPLAN);
            bandA.userData.show(meet / routeA.length, 1);
            [status, detail, tone] = t < DETECT + 0.45 ? ['Unmapped obstacle', 'A cart that is not in the BIM', 'signal'] : ['Replanning', `A* · ${whole(searched)} cells searched`, 'signal'];
        } else if (t < ARRIVE) {
            s = routeB.length * drive(seg(t, REPLAN, ARRIVE));
            along(routeB, s);
            bandA.visible = false;
            [status, detail] = ['Rerouted', `${detour.toFixed(1)} m further, round the cart`];
        } else if (u4 < 4.3) {
            // Into the lift, up, and out again
            const inside = smooth(seg(u4, 0.9, 1.7)) * (1 - smooth(seg(u4, 3.7, 4.3)));
            bot.position.x = lerp(LANDING[0], CAR[0], inside);
            bot.position.z = lerp(LANDING[1], CAR[1], inside);
            heading = turnTo(Math.PI, -Math.PI / 2, 1 - smooth(seg(u4, 0, 0.8)));
            heading = turnTo(heading, Math.PI / 2, smooth(seg(u4, 2.1, 3.3)));
            level = ride;
            bandA.visible = false;
            [status, detail] = u4 < 0 ? ['At the lift', 'Route complete'] : u4 < 2 ? ['Mission · Level 2', 'Lift located in the BIM'] : u4 < 3.4 ? ['Riding', 'Level 1 to Level 2'] : ['Level 2', 'Leaving the lift'];
            if (u4 < 0) tone = 'ok';
        } else {
            level = 1;
            bandA.visible = false;
            if (u4 < 6.1) along(routeC, routeC.length * drive(seg(u4, 4.3, 5.4)));
            else along(routeD, routeD.length * drive(seg(u4, 6.1, 8.1)));
            SHOTS.forEach(([from, , , face]) => { heading = turnTo(heading, face, smooth(seg(t, from - 0.25, from + 0.1)) * (1 - smooth(seg(t, from + 0.75, from + 1)))); });
            const taken = SHOTS.filter(shot => t >= shot[0] + 0.25).length;
            [status, detail] = u4 >= 8.8 ? ['Mission complete', `${taken} photos tagged to their rooms`] : [`Level 2 · photo ${Math.min(2, taken + 1)} of 2`, roomAt(bot.position.x, bot.position.z, 1)];
            if (u4 >= 8.8) tone = 'ok';
        }
        bot.position.y = FL + LEVEL * level;
        bot.rotation.y = heading;
        // It leaves Level 2 and is back at its dock for the next loop
        bot.scale.setScalar(t >= END ? Math.max(0.001, t < END + 0.4 ? 1 - seg(t, END, END + 0.3) : seg(t, END + 0.45, END + 0.8)) : 1);
        bandB.userData.show(t < ARRIVE ? s / routeB.length : 1, t >= REPLAN - 0.25 && t < ARRIVE ? seg(t, REPLAN - 0.25, REPLAN) : 0);
        bandC.userData.show(u4 >= 4.3 ? drive(seg(u4, 4.3, 5.4)) : 0, u4 > 3.8 && u4 < 5.4 ? seg(u4, 3.8, 4.2) : 0);
        bandD.userData.show(u4 >= 6.1 ? drive(seg(u4, 6.1, 8.1)) : 0, u4 > 5.6 && u4 < 8.1 ? seg(u4, 5.6, 6) : 0);

        // ---- Beat 3: the LiDAR, the guesses that tighten, and the cart
        const sensing = pulse(t, B3 + 0.1, B4 + 0.5, 0.3);
        fan.visible = beam.visible = hits.visible = strange.visible = sensing > 0.01;
        if (sensing > 0.01) scan(bot.position.x, bot.position.z, heading, t);
        fanMaterial.opacity = 0.16 * sensing;
        beamMaterial.opacity = hits.material.opacity = strange.material.opacity = sensing;
        const sigma = lerp(0.5, 0.04, smooth(seg(u3, 0.3, 1.9)));
        const guessing = pulse(t, B3 + 0.1, B4 + 0.3, 0.3);
        guesses.visible = guessing > 0.01;
        guesses.material.opacity = guessing;
        const at = guesses.geometry.attributes.position;
        guessAt.forEach(([x, z], n) => at.setXYZ(n, bot.position.x + x * sigma, FL + 0.07, bot.position.z + z * sigma));
        at.needsUpdate = true;
        if (status === 'Localising' || (status === 'Navigating' && u3 < 2)) detail = `LiDAR 270° · within ± ${(sigma * spread * 100).toFixed(0)} cm`;

        cart.position.z = t > B4 + 3.4 ? CART.from : track([[B3 + 0.7, CART.from], [B3 + 1.9, CART.to]], t);
        const pushing = t > B3 + 0.7 && t < B3 + 1.9;
        porter.position.z = t > B4 + 3.4 ? CART.from - 0.85 : track([[B3 + 0.7, CART.from - 0.85], [B3 + 1.9, CART.to - 0.85], [B3 + 2.4, CART.to - 0.85], [B3 + 3.6, -0.5]], t);
        porter.rotation.y = t > B3 + 2.4 && t < B4 + 3.4 ? Math.PI * smooth(seg(t, B3 + 2.4, B3 + 2.7)) : 0;
        porter.userData.walk((porter.position.z / 0.72) * Math.PI, pushing || (t > B3 + 2.4 && t < B3 + 3.6) ? 1 : 0);
        porter.userData.armL.rotation.x = porter.userData.armR.rotation.x = pushing || t < B3 + 0.7 || t > B4 + 3.4 ? -0.35 : 0;
        const alarm = pulse(t, DETECT, REPLAN + 0.5, 0.2);
        alert.visible = alarm > 0.01;
        alertLine.opacity = alarm * (0.6 + 0.4 * Math.sin(t * 14));

        // ---- Beat 4: a photograph at each way-point, tagged to the room it is in
        let firing = 0;
        SHOTS.forEach(([from, to, [x, z]], n) => {
            firing = Math.max(firing, pulse(t, from, to, 0.2));
            const shown = smooth(seg(t, B4 + 3.9 + n * 0.3, B4 + 4.3 + n * 0.3)) * (1 - reset);
            shotPins[n].scale.setScalar(shown);
            shotPins[n].visible = shown > 0.01;
            shotTags[n].at(x, FL + LEVEL + world.position.y + 2.2, z).show(t >= from + 0.25 ? 1 - reset : 0);
        });
        shotLines.visible = firing > 0.01;
        shotLine.opacity = firing;
        const burst = SHOTS.reduce((best, [from]) => Math.max(best, pulse(t, from + 0.2, from + 0.5, 0.12)), 0);
        flash.visible = flashGlow.visible = burst > 0.01;
        flash.scale.setScalar(0.1 + 0.25 * burst);
        flashMaterial.opacity = burst;

        // Clear of the lift's tag, and of a photograph's
        const busy = Math.max(pulse(u4, 0.1, 2.2, 0.3), SHOTS.reduce((most, [from]) => Math.max(most, pulse(t, from + 0.2, from + 0.9, 0.2)), 0));
        statusTag.set(status, detail).tone(tone).at(bot.position.x, bot.position.y + world.position.y + 1.3, bot.position.z)
            .show(status && t < END ? (1 - busy) * (1 - seg(t, END - 0.3, END)) : 0);
        caption(t);
    };
}

export const navigation = {
    duration: 28.4,
    poster: 8.6,
    scale: 1.15,
    alt: 'Two storeys of a building cut open to show their plan. The walls drop into an occupancy grid and a clearance halo grows around them; a search spreads across the grid from the robot to the lift and the shortest route snaps out of it; the robot sweeps the corridor with its LiDAR, tightens its estimate of where it is and steers round a cart that is not in the model; then it takes the lift to the next level and photographs way-points tagged to their rooms.',
    build
};
