/**
 * What the beats of the research simulations are drawn with, over the props
 * of props.js: the caption that names a beat, bands and dots, fades,
 * holograms, and a few poses.
 */
import * as THREE from '../../vendor/three.module.min.js';
import { pulse, boxEdges, boxShell } from './props.js';

/** A repeatable sequence of numbers in 0..1. */
export function random(seed = 1) {
    let s = seed;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** A whole number with thousands separators. */
export const whole = x => Math.round(x).toLocaleString('en-US');

/**
 * The caption that names the beat being played, at the foot of the stage.
 * beats: [[from, to, text], ...], in seconds of the loop. Returns t => void.
 */
export function captions(k, beats) {
    const tag = k.label('', '', 'caption');
    return t => {
        const beat = beats.find(([from, to]) => t >= from && t < to);
        if (beat) tag.set(beat[2]);
        tag.show(beat ? pulse(t, beat[0], beat[1], 0.25) : 0);
    };
}

/**
 * A flat band along [x, z] points, at height y. userData.show(from, to) draws
 * the part between two fractions of its length; userData.length is in metres.
 */
export function ribbon(k, parent, material, points, width, y = 0) {
    const n = points.length, position = new Float32Array(n * 6), index = [], lengths = [0];
    for (let i = 0; i < n; i++) {
        const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        const px = ((-dz / l) * width) / 2, pz = ((dx / l) * width) / 2;
        position.set([points[i][0] + px, y, points[i][1] + pz, points[i][0] - px, y, points[i][1] - pz], i * 6);
        if (i) {
            lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
            index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    (parent || k.root).add(mesh);
    const total = lengths[n - 1];
    mesh.userData.length = total;
    mesh.userData.show = (from, to) => {
        let a = 0, b = n - 1;
        while (a < n - 1 && lengths[a] < from * total - 1e-6) a++;
        while (b > a && lengths[b] > to * total + 1e-6) b--;
        geometry.setDrawRange(a * 6, (b - a) * 6);
        mesh.visible = b > a;
    };
    return mesh;
}

/** Points [x, z] every step metres along a route(), for a ribbon. */
export function sampled(path, step = 0.1) {
    const points = [], n = Math.max(1, Math.ceil(path.length / step)), spot = { x: 0, z: 0 };
    for (let i = 0; i <= n; i++) {
        path.at((i / n) * path.length, spot);
        points.push([spot.x, spot.z]);
    }
    return points;
}

/** Points drawn as dots of a size in pixels, to be written into their position attribute. */
export function dots(k, parent, spec, size, count) {
    const material = k.own(new THREE.PointsMaterial({
        size: size * Math.min(window.devicePixelRatio || 1, 2), sizeAttenuation: false, transparent: true
    }));
    k.onTheme(() => k.color(spec, material.color));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 3;
    (parent || k.root).add(points);
    return points;
}

/** A flat ring on the ground, of the scene's own. */
export function ring(k, parent, material, inner, outer, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(k.own(new THREE.RingGeometry(inner, outer, 64).rotateX(-Math.PI / 2)), material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 2;
    (parent || k.root).add(mesh);
    return mesh;
}

/** The edges of a box w x h x d standing on its parent's origin, as lines. */
export function frame(k, parent, material, w, h, d, x = 0, y = 0, z = 0) {
    const lines = new THREE.LineSegments(k.GEO.edges, material);
    lines.scale.set(w, h, d);
    lines.position.set(x, y, z);
    lines.renderOrder = 3;
    (parent || k.root).add(lines);
    return lines;
}

/**
 * Give a subtree materials of its own, so that it can fade as one. Returns
 * opacity => void; lights and glows in the subtree go out below 0.6.
 */
export function fader(k, object) {
    const twins = new Map(), extras = [];
    object.traverse(o => {
        if (o.isSprite) extras.push(o);
        if (!o.isMesh) return;
        const material = o.material;
        if (!material.isMeshStandardMaterial) {
            extras.push(o);
            return;
        }
        if (!twins.has(material)) {
            const theme = material.userData.theme;
            twins.set(material, k.standard(theme.c, { roughness: material.roughness, metalness: material.metalness, transparent: true }, theme));
        }
        o.material = twins.get(material);
    });
    const materials = [...twins.values()];
    let shown = 1;
    return opacity => {
        if (opacity === shown) return;
        shown = opacity;
        object.visible = opacity > 0.004;
        materials.forEach(material => {
            material.opacity = opacity;
            material.depthWrite = opacity > 0.5;
        });
        extras.forEach(o => { o.visible = opacity > 0.6; });
    };
}

/**
 * Every box of a subtree (or those that keep(mesh) accepts) as a hologram:
 * its edges, and faint faces. Made in k.root space, in a group of its own.
 * Returns { group, line, fill }: the materials are there to be faded.
 */
export function hologram(k, object, spec = 'accent', faces = 0.1, keep) {
    const group = k.group();
    const line = k.lineMaterial(spec, { transparent: true, opacity: 0.9 }, { glow: true });
    const fill = k.basic(spec, { transparent: true, opacity: faces, depthWrite: false }, { glow: true });
    k.lines(group, line, boxEdges(k, object, keep)).renderOrder = 2;
    const shell = new THREE.Mesh(boxShell(k, object, keep), fill);
    shell.renderOrder = 1;
    group.add(shell);
    return { group, line, fill };
}

/** Pose a person holding a tablet in both hands. */
export function tablet(k, figure) {
    const pose = figure.userData;
    pose.armL.rotation.x = pose.armR.rotation.x = -0.5;
    pose.foreL.rotation.x = pose.foreR.rotation.x = -1.1;
    k.box(figure, 'dark', 0.34, 0.02, 0.24, 0, 1.06, 0.36).rotation.x = -0.5;
    return figure;
}

const strideSpot = { x: 0, z: 0 }, strideAhead = { x: 0, z: 0 };

/** Stand a person at distance s along a route(), facing the way it goes, in mid-stride. */
export function stride(figure, path, s, y = 0, walking = 1) {
    path.at(s - 0.2, strideSpot);
    path.at(s + 0.2, strideAhead);
    figure.rotation.y = Math.atan2(strideAhead.x - strideSpot.x, strideAhead.z - strideSpot.z);
    path.at(s, strideSpot);
    figure.position.set(strideSpot.x, y, strideSpot.z);
    figure.userData.walk((s / 0.72) * Math.PI, walking);
}

const shaderTint = new THREE.Color();

/** A colour as a shader that writes straight to the canvas needs it: in sRGB. */
export function shaderColor(k, spec, target) {
    k.color(spec, shaderTint).convertLinearToSRGB();
    return target.set(shaderTint.r, shaderTint.g, shaderTint.b);
}
