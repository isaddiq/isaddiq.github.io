import * as THREE from '../../vendor/three.module.min.js';
import { lerp, seg, smooth, easeOut, pulse, track, building, tree, person, polyline, route } from './props.js';
import { captions, frame, stride } from './overlays.js';

const VIEW = 0.3;                    // half the angle of what the headset shows, radians
const OFFSET = 0.08;                 // how far the door was built from where the design has it, m
const TOLERANCE = 20;                // what a door may be out by, mm
const TABLETOP = 1 / 20;             // the scale of the model on the table
const ZOOM = 3;                      // how far the view closes in on the table

/**
 * One model, met at three scales. Four beats: a worker in a headset looks
 * at a finished wall, and inside their cone of view only it turns
 * see-through, to the ducts and pipes behind it; the door as designed is
 * laid over the opening as built, and the distance between them is
 * dimensioned and flagged; a colleague joins from elsewhere as a hologram,
 * points, and drops an issue pin that both can see; then the whole building
 * shrinks to a model on a table with people round it, and grows back.
 * The offset, the scale and the view cone are measured from the scene.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23.5;
    const world = k.group();                         // everything: the view closes in on the table by scaling it

    // ---- The view cone: whatever of the building lies inside it is not drawn
    const cone = {
        uEye: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3(0, 0, -1) }, uCos: { value: Math.cos(VIEW) },
        uNear: { value: 0 }, uFar: { value: 0 }, uOn: { value: 0 }, uRim: { value: new THREE.Color() }
    };
    k.onTheme(() => k.color('accent', cone.uRim.value));
    const seeThrough = shader => {
        Object.assign(shader.uniforms, cone);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSeen;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeen = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSeen;\nuniform vec3 uEye, uAxis, uRim;\nuniform float uCos, uNear, uFar, uOn;')
            .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
                vec3 seen = vSeen - uEye;
                float along = dot(seen, uAxis), within = along / max(length(seen), 0.0001) - uCos;
                bool inRange = uOn > 0.5 && along > uNear && along < uFar;
                if (inRange && within > 0.0) discard;`)
            .replace('#include <opaque_fragment>', `#include <opaque_fragment>
                if (inRange && within > -0.0035) gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, 0.85);`);
    };
    const cut = {};
    const cutting = name => {
        if (name === 'paving') return name;
        if (!cut[name]) {
            cut[name] = k.mat(name, {});
            cut[name].onBeforeCompile = seeThrough;
        }
        return cut[name];
    };

    // ---- The building: its entrance front faces the worker
    const BX = -0.9, BZ = -2.8;
    const b = building(k, { nx: 2, nz: 3, storeys: 2, plant: 'solar', x: BX, z: BZ, mat: cutting, parent: world });
    b.group.rotation.y = -Math.PI / 2;
    const FRONT = b.W / 2;                           // the entrance front, from the middle of the building
    tree(k, world, -7.2, 0.6, 1.2);
    // What is fixed to the front: in a frame that lies square to the stage, x along the front and z out of it
    const fixed = k.group(b.group);
    fixed.rotation.y = Math.PI / 2;

    // Behind the wall: studs, a duct with a drop, chilled water, the sprinkler main, a cable tray and a board
    const service = spec => k.standard(spec, {}, { e: spec, ei: [0, 0.55] });
    const air = service(['#2f9e8f', '#49bfae']), tray = service(['#e0a030', '#f0b84c']);
    const chilled = service(['#3f7fd9', '#6aa0ee']), sprinkler = service(['#d9534a', '#ee7168']);
    const Y0 = b.base, INSIDE = FRONT - 0.2;
    for (let x = -4.2; x <= 4.21; x += 0.6) k.box(fixed, 'timber', 0.05, 2.7, 0.1, x, Y0, INSIDE - 0.06);
    k.box(fixed, 'wallAlt', 8.6, 2.7, 0.03, 0, Y0, INSIDE - 0.85);
    k.box(fixed, air, 7.6, 0.36, 0.5, 0.2, Y0 + 2.2, INSIDE - 0.42);
    [[3.2, 1.25], [-2.6, 1.6]].forEach(([x, h]) => {
        k.box(fixed, air, 0.5, h, 0.34, x, Y0 + 2.2 - h, INSIDE - 0.36);
        k.box(fixed, 'dark', 0.56, 0.3, 0.06, x, Y0 + 2.2 - h, INSIDE - 0.16);
    });
    k.bars(fixed, chilled, 0.14, [[-4.1, Y0 + 1.85, INSIDE - 0.2, 4.1, Y0 + 1.85, INSIDE - 0.2], [1.5, Y0 + 1.85, INSIDE - 0.2, 1.5, Y0 + 0.2, INSIDE - 0.2], [-3.4, Y0 + 1.85, INSIDE - 0.2, -3.4, Y0 + 0.2, INSIDE - 0.2]]);
    k.bars(fixed, sprinkler, 0.1, [[-4.1, Y0 + 2.08, INSIDE - 0.16, 4.1, Y0 + 2.08, INSIDE - 0.16], [2.4, Y0 + 2.08, INSIDE - 0.16, 2.4, Y0 + 2.5, INSIDE - 0.16], [-1.9, Y0 + 2.08, INSIDE - 0.16, -1.9, Y0 + 2.5, INSIDE - 0.16]]);
    k.box(fixed, tray, 7.9, 0.05, 0.3, 0, Y0 + 1.5, INSIDE - 0.3);
    k.bars(fixed, tray, 0.06, [[2.1, Y0 + 1.5, INSIDE - 0.2, 2.1, Y0 + 1.05, INSIDE - 0.2], [-2.9, Y0 + 1.5, INSIDE - 0.2, -2.9, Y0 + 0.6, INSIDE - 0.2]]);
    k.box(fixed, 'dark', 0.55, 0.75, 0.12, 2.1, Y0 + 0.35, INSIDE - 0.22);
    k.box(fixed, 'metal', 0.4, 0.5, 0.04, 2.1, Y0 + 0.47, INSIDE - 0.1);

    // ---- The door as designed, laid over the door as built
    const holoLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const holoFill = k.basic('accent', { transparent: true, depthWrite: false }, { glow: true });
    const design = k.group(fixed, OFFSET, Y0, FRONT + 0.1);
    frame(k, design, holoLine, 2, 2.52, 0.14);
    [-0.45, 0.45].forEach(x => frame(k, design, holoLine, 0.84, 2, 0.1, x, 0.06, 0));
    frame(k, design, holoLine, 1.78, 0.32, 0.1, 0, 2.13, 0);
    const designFill = k.box(design, holoFill, 2, 2.52, 0.04);
    designFill.renderOrder = 2;
    const gapMaterial = k.basic('signal', { transparent: true, depthWrite: false });
    const gaps = [1 + OFFSET / 2, -1 + OFFSET / 2].map(x => {
        const strip = k.box(fixed, gapMaterial, OFFSET, 2.52, 0.03, x, Y0, FRONT + 0.2);
        strip.renderOrder = 3;
        return strip;
    });
    const dimLine = k.lineMaterial('signal', { transparent: true });
    const DIM_Y = Y0 + 3.2;
    const dimension = k.lines(fixed, dimLine, [
        1, Y0 + 2.56, FRONT + 0.2, 1, DIM_Y + 0.15, FRONT + 0.2, 1 + OFFSET, Y0 + 2.56, FRONT + 0.2, 1 + OFFSET, DIM_Y + 0.15, FRONT + 0.2,
        0.45, DIM_Y, FRONT + 0.2, 1, DIM_Y, FRONT + 0.2, 1 + OFFSET, DIM_Y, FRONT + 0.2, 1.65, DIM_Y, FRONT + 0.2,
        0.85, DIM_Y + 0.1, FRONT + 0.2, 1, DIM_Y, FRONT + 0.2, 0.85, DIM_Y - 0.1, FRONT + 0.2, 1, DIM_Y, FRONT + 0.2,
        1.23, DIM_Y + 0.1, FRONT + 0.2, 1 + OFFSET, DIM_Y, FRONT + 0.2, 1.23, DIM_Y - 0.1, FRONT + 0.2, 1 + OFFSET, DIM_Y, FRONT + 0.2
    ]);
    dimension.renderOrder = 3;
    const pin = k.group(fixed);
    const pinMaterial = k.basic('signal');
    k.mesh(pin, k.own(new THREE.ConeGeometry(0.16, 0.45, 14).rotateX(Math.PI).translate(0, 0.23, 0)), pinMaterial);
    k.sphere(pin, pinMaterial, 0.22, 0, 0.62, 0);
    k.glow(pin, 0, 0.6, 0, 1.4, 'signal', 0.7);
    const PIN = new THREE.Vector3(1 + OFFSET / 2, Y0 + 2.62, FRONT + 0.55);

    // Where the building stood, while it is on the table
    const siteLine = k.lineMaterial('accent', { transparent: true }, { glow: true });
    const site = frame(k, world, siteLine, b.D + 1.6, 0.02, b.W + 1.6, BX, 0.02, BZ);

    // ---- People: the worker on site, a colleague who joins as a hologram, two more at the table
    /** A point of the front, in the stage's own frame. */
    const onFront = (x, y, out = 0) => new THREE.Vector3(BX + x, y, BZ + FRONT + out);
    const worker = person(k, world, 2.4, 4.6, { vest: true, hat: 'white', headset: true, top: '#3d5a80', skin: 1 });
    const TABLE = { x: 5, z: 5.2, top: 0.78 };
    const walkOver = route([[2.4, 4.6], [0.3, 4.9]], 0.3), walkBack = route([[0.3, 4.9], [2.2, 5.4], [3.7, 5.3]], 0.5);
    const coneFill = k.basic('accent', { transparent: true, depthWrite: false, side: THREE.DoubleSide }, { glow: true });
    const coneMesh = new THREE.Mesh(k.own(new THREE.ConeGeometry(1, 1, 40, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5)), coneFill);
    coneMesh.renderOrder = 4;
    world.add(coneMesh);

    const ghostly = k.standard('accent', { transparent: true, roughness: 0.6, depthWrite: false }, { e: 'accent', ei: [0.35, 1] });
    const remote = person(k, world, 1.6, 5.6, { hair: 2, headset: true });
    remote.traverse(o => {
        if (!o.isMesh) return;
        o.material = ghostly;
        o.castShadow = false;
        o.renderOrder = 3;
    });
    remote.rotation.y = Math.PI + 0.25;
    const ray = polyline(k, world, k.lineMaterial('accent', { transparent: true }, { glow: true }), 2);
    ray.renderOrder = 4;

    const table = k.group(world, TABLE.x, 0, TABLE.z);
    k.box(table, 'timber', 2.2, 0.06, 1.3, 0, TABLE.top - 0.06, 0);
    k.bars(table, 'dark', 0.07, [[-1, 0, -0.55, -1, 0.72, -0.55], [1, 0, -0.55, 1, 0.72, -0.55], [-1, 0, 0.55, -1, 0.72, 0.55], [1, 0, 0.55, 1, 0.72, 0.55], [-1, 0.2, 0, 1, 0.2, 0, 0.05]]);
    k.box(table, 'white', 0.6, 0.012, 0.42, -0.55, TABLE.top, 0.2).rotation.y = 0.2;
    const reviewers = [
        person(k, world, TABLE.x + 0.5, TABLE.z + 1.25, { top: '#8a4f6b', legs: '#39445a', skin: 3, hair: 1, headset: true, sleeves: 'short' }),
        person(k, world, TABLE.x + 1.75, TABLE.z - 0.2, { top: '#eef0f2', legs: '#2c3340', skin: 2, hair: 0, headset: true })
    ];
    reviewers[0].rotation.y = Math.PI - 0.2;
    reviewers[1].rotation.y = -Math.PI / 2;
    k.pool(world, TABLE.x, TABLE.z, 3, '#ffd9a0', 0.3);

    const wallTag = k.label('Behind the finished wall', 'Supply duct · chilled water · sprinkler main · cable tray');
    const coneTag = k.label('', '', 'mini');
    const doorTag = k.label();
    const offsetTag = k.label('', '', 'mini');
    const remoteTag = k.label('Remote reviewer', 'joined from the design office');
    const pinTag = k.label('Issue 12 · door out of position', 'Pinned to the model · seen by both').tone('signal');
    const scaleTag = k.label('', '', 'query');
    const siteTag = k.label('Site · 1:1', '', 'mini');
    const caption = captions(k, [
        [B1, B2, 'AR on site · see through the finished wall'],
        [B2, B3, 'Deviation · the design laid over what was built'],
        [B3, B4, 'Remote review · a colleague joins as a hologram'],
        [B4, END, 'Tabletop · the whole building, at a scale to walk round']
    ]);
    const eye = new THREE.Vector3(), aim = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3(), hand = new THREE.Vector3();
    const HOME = new THREE.Vector3(BX, 0, BZ), ONTABLE = new THREE.Vector3(TABLE.x, TABLE.top, TABLE.z);
    const DOOR = b.storeys[0].windows.find(w => w.userData.kind === 'door');
    const builtAt = DOOR.getWorldPosition(new THREE.Vector3());

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;

        // ---- Beat 4: the building comes down to the table, and the view closes in on it
        const small = smooth(seg(u4, 0.7, 2.2)) * (1 - smooth(seg(u4, 4.4, 5.6)));
        const scale = Math.pow(TABLETOP, small);
        b.group.scale.setScalar(scale);
        b.group.position.lerpVectors(HOME, ONTABLE, smooth(small));
        b.group.rotation.y = -Math.PI / 2 + 1.1 * small * Math.sin((u4 - 2.2) * 0.55) * (small > 0.999 ? 1 : small);
        const zoom = lerp(1, ZOOM, small);
        c.set(lerp(TABLE.x, 1.1, small), 0, lerp(TABLE.z, 1.1, small));
        world.scale.setScalar(zoom);
        world.position.set(c.x - TABLE.x * zoom, 0, c.z - TABLE.z * zoom);
        world.updateMatrixWorld(true);
        /** Pin a tag to a point of the stage's own frame, through the zoom. */
        const put = (tag, p, lift = 0) => tag.at(world.position.x + p.x * zoom, (p.y + lift) * zoom, world.position.z + p.z * zoom);
        site.visible = small > 0.02;
        siteLine.opacity = small;
        put(siteTag, HOME, 0.3).show(small > 0.5 ? pulse(u4, 1.4, 4.6, 0.3) : 0);
        put(scaleTag, ONTABLE, 0.9 + 6.6 * scale).set(`Tabletop model · 1:${Math.round(1 / scale)}`, 'The same model the worker saw at 1:1').show(pulse(u4, 1, 5.2, 0.3));

        // ---- Where the worker stands, and what they look at
        if (t < B2) {
            worker.position.set(2.4, 0, 4.6);
            worker.userData.walk(0, 0);
        }
        else if (t < B4 + 0.2 || t >= END + 0.5) stride(worker, walkOver, walkOver.length * smooth(seg(u2, 0.1, 1)) * (1 - smooth(seg(t, END + 0.5, END + 1))), 0, (u2 > 0.1 && u2 < 1) || t > END + 0.5 ? 1 : 0);
        else stride(worker, walkBack, walkBack.length * smooth(seg(u4, 0.2, 1.4)), 0, u4 < 1.4 ? 1 : 0);
        const sweep = track([[0.4, 3.9], [1.6, 2.6], [2.6, 3.6], [3.6, 2.2], [4.6, 3.2]], u1), rise = track([[0.4, 1.3], [1.6, 2], [2.6, 1.4], [3.6, 1.7], [4.6, 1.5]], u1);
        aim.copy(onFront(sweep, rise));
        aim.lerp(onFront(0.2, 1.5), smooth(seg(u2, 0, 1)));
        aim.lerp(onFront(PIN.x, PIN.y + 0.3), smooth(seg(u3, 2.6, 3.4)));
        aim.lerp(c.set(TABLE.x, TABLE.top + 0.2, TABLE.z), smooth(seg(u4, 0.2, 1.2)));
        eye.set(worker.position.x, 1.63, worker.position.z);
        if (t < B4 + 0.2 || t >= END + 0.5 || u4 > 1.4) worker.rotation.y = Math.atan2(aim.x - eye.x, aim.z - eye.z);
        const reach = eye.distanceTo(aim);
        const looking = pulse(t, B1 + 0.3, B4 + 0.4, 0.4);
        coneMesh.visible = looking > 0.01;
        coneMesh.position.copy(eye);
        coneMesh.lookAt(world.localToWorld(a.copy(aim)));
        coneMesh.scale.set(Math.tan(VIEW) * reach, Math.tan(VIEW) * reach, reach);
        coneFill.opacity = 0.13 * looking;

        // ---- Beat 1: inside the cone only, the front is not drawn
        const through = pulse(u1, 0.5, 5.2, 0.01);
        cone.uOn.value = through > 0.5 ? 1 : 0;
        const from = world.localToWorld(a.copy(eye)), to = world.localToWorld(c.copy(aim));
        const depth = from.distanceTo(to), unit = depth / reach;
        cone.uEye.value.copy(from);
        cone.uAxis.value.subVectors(to, from).normalize();
        cone.uNear.value = depth - 1.3 * unit;
        cone.uFar.value = depth + 0.75 * unit;
        put(wallTag, aim, 1.15).show(pulse(u1, 1, 5.1, 0.3));
        put(coneTag, eye, 0.55).set(`Headset view · ${Math.round((VIEW * 360) / Math.PI)}° cone`).show(pulse(u1, 0.6, 5.1, 0.3));

        // ---- Beat 2: the design over the built door, and the distance between them
        const laid = pulse(t, B2 + 0.9, B4 + 0.3, 0.5);
        design.visible = laid > 0.01;
        holoLine.opacity = laid;
        holoFill.opacity = 0.12 * laid;
        const flagged = pulse(t, B2 + 2, B4 + 0.3, 0.4);
        gaps.forEach(strip => { strip.visible = flagged > 0.01; });
        gapMaterial.opacity = flagged * (0.65 + 0.3 * Math.sin(t * 7));
        dimension.visible = flagged > 0.01;
        dimLine.opacity = flagged;
        // Measured: the designed door against the door that is there
        const out = Math.abs(world.worldToLocal(design.getWorldPosition(a)).x - builtAt.x) * 1000;
        put(offsetTag, onFront(1 + OFFSET / 2, DIM_Y + 0.35, 0.2)).set(`${out.toFixed(0)} mm`).show(pulse(u2, 2.2, 5.4, 0.3));
        put(doorTag, onFront(-1.5, Y0 + 2.6, 0.2)).set('Door D-01 · as built against design', `${out.toFixed(0)} mm out · tolerance ± ${TOLERANCE} mm · flagged`)
            .tone('signal').show(pulse(u2, 2.6, 5.4, 0.3));

        // ---- Beat 3: the colleague appears, points, and drops a pin
        const joined = pulse(t, B3 + 0.3, B4 + 0.5, 0.6) + pulse(t, B4 + 2, B4 + 4.6, 0.5);
        const atTable = t > B4 + 1;
        remote.visible = joined > 0.01;
        ghostly.opacity = 0.6 * joined;
        remote.position.set(atTable ? TABLE.x - 0.6 : 1.6, 0, atTable ? TABLE.z - 1.25 : 5.6);
        remote.rotation.y = atTable ? 0.2 : Math.PI + 0.25;
        const pointing = atTable ? 0.5 + 0.5 * Math.sin(t * 2) : smooth(seg(u3, 1.4, 2.2));
        remote.userData.armR.rotation.x = -1.75 * pointing * (atTable ? 0.5 : 1);
        remote.userData.foreR.rotation.x = -0.2;
        const dropped = easeOut(seg(u3, 2.6, 3.3));
        const pinned = pulse(t, B3 + 2.6, B4 + 0.3, 0.3);
        pin.visible = pinned > 0.01;
        pin.position.set(PIN.x, PIN.y + 2.2 * (1 - dropped) + 0.06 * Math.sin(t * 3), PIN.z);
        pin.scale.setScalar(Math.max(0.001, pinned));
        const shown = pulse(u3, 1.6, 5.3, 0.3);
        ray.visible = shown > 0.01 && !atTable;
        ray.material.opacity = shown;
        world.worldToLocal(remote.userData.foreR.getWorldPosition(hand));
        const tipAt = onFront(PIN.x, PIN.y + 0.5 + 2.2 * (1 - dropped), 0.55);
        ray.geometry.attributes.position.setXYZ(0, hand.x, hand.y - 0.1, hand.z);
        ray.geometry.attributes.position.setXYZ(1, tipAt.x, tipAt.y, tipAt.z);
        ray.geometry.attributes.position.needsUpdate = true;
        put(remoteTag, remote.position, 2.05).show(pulse(u3, 0.6, 2.6, 0.3));
        put(pinTag, onFront(PIN.x, PIN.y + 0.95, 0.55)).show(pulse(u3, 3.2, 5.4, 0.3));

        // ---- Round the table
        reviewers.forEach((reviewer, n) => {
            const busy = small * (0.5 + 0.5 * Math.sin(t * 2.2 + n * 2));
            reviewer.userData.armR.rotation.x = -0.35 - 0.9 * busy;
            reviewer.userData.foreR.rotation.x = -0.9;
            reviewer.userData.armL.rotation.x = -0.35;
            reviewer.userData.foreL.rotation.x = -0.9;
        });
        caption(t);
    };
}

export const xr = {
    duration: 24.5,
    poster: 3.4,
    alt: 'A worker in a headset stands before a finished building. Inside the cone of the headset\'s view only, the wall turns see-through and shows the duct, pipes and cable tray behind it; a holographic door is laid over the real opening and the 80 mm between them is dimensioned and flagged; a translucent colleague appears beside the worker, points, and drops an issue pin that both can see; then the whole building shrinks to a 1:20 model on a table with people round it, and grows back to full size.',
    build
};
