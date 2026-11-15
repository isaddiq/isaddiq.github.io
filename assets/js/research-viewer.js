/**
 * Research scene viewer (Home, Research Interests).
 *
 * One WebGL renderer draws one small simulation at a time, beside the list of
 * research interests. The canvas is transparent, so the page shows through:
 * the only ground is a grid that fades out towards its edges, and a plane
 * that catches shadows. Every simulation shares the same isometric camera,
 * lights, grid and materials (the kit below); the simulations themselves are
 * in research-scenes.js.
 *
 * - A scene is built when its interest is selected and disposed of when the
 *   next one replaces it; the outgoing frame is cross-faded from a snapshot.
 * - Daylight in the light theme, moonlight and lit windows in the dark one.
 * - Dragging with the left mouse button (or sideways with a finger) turns the
 *   stage like a turntable and tilts the view; a double click puts it back.
 * - The loop stops when the stage is off screen or the tab is hidden, and
 *   under prefers-reduced-motion a single still frame is drawn instead.
 */
import * as THREE from '../vendor/three.module.min.js';
import { SCENES } from './research-scenes.js';

const ISO_AZIMUTH = Math.PI / 4;
const ISO_ELEVATION = Math.atan(Math.SQRT1_2);   // true isometric, 35.26 degrees
const VIEW = 9.4;                                // half the height in view, metres
const TARGET = new THREE.Vector3(0, 4.3, 0);
const CAMERA_DISTANCE = 60;
const FADE = 450;                                // cross-fade between scenes, ms
const HOVER_DELAY = 110;                         // dwell before a hovered interest loads, ms
const ORBIT_TURN = Math.PI;                      // a drag across the stage turns it this far
const ORBIT_TILT = 1.1;                          // and a drag down it tilts the view this far
const ELEVATION_MIN = 0.4, ELEVATION_MAX = 1.05; // limits of the tilt, radians
const SUN_AT = [-9, 20, 16], FILL_AT = [14, 6, 3];

const LIGHT = {
    day: { sky: '#ffffff', ground: '#d6d0c4', hemi: 1.25, sun: '#fff1dc', sunI: 2.3, fill: '#dbe6ff', fillI: 0.55, shadow: 0.2, grid: 0.9 },
    night: { sky: '#8aa2de', ground: '#18223c', hemi: 0.85, sun: '#a9c1ff', sunI: 0.9, fill: '#5f78b8', fillI: 0.3, shadow: 0.42, grid: 0.9 }
};

// The shared materials. c: colour, or [day, night]; e / ei: emissive colour
// and intensity, as [day, night]; r: roughness; m: metalness.
const LIBRARY = {
    wall: { c: '#f4f1ea', r: 0.9 },
    wallAlt: { c: '#e2e6eb', r: 0.85 },
    stone: { c: '#cbc2b3', r: 0.95 },
    brick: { c: '#b4735a', r: 0.95 },
    asphalt: { c: '#565b63', r: 1 },
    gravel: { c: '#c3b9a7', r: 1 },
    vest: { c: '#dbe64a', r: 0.8 },
    concrete: { c: '#c9c6bf', r: 0.95 },
    coping: { c: '#fcfbf8', r: 0.8 },
    roof: { c: '#a4a9b0', r: 0.9 },
    paving: { c: '#dcd8d0', r: 0.95 },
    metal: { c: '#cdd3d9', r: 0.5, m: 0.2 },
    steel: { c: '#8c96a3', r: 0.55, m: 0.25 },
    dark: { c: '#2f3946', r: 0.6 },
    rubber: { c: '#1f242c', r: 0.9 },
    glass: { c: ['#86b9db', '#1c2b4b'], r: 0.12, m: 0.1 },
    glassLit: { c: ['#86b9db', '#ffdf9c'], e: ['#000000', '#ffb74d'], ei: [0, 1], r: 0.12, m: 0.1 },
    timber: { c: '#c89f72', r: 0.8 },
    yellow: { c: '#f0b429', r: 0.6 },
    white: { c: '#ffffff', r: 0.6 },
    sand: { c: '#d9c79c', r: 1 },
    leaf: { c: '#6aa84f', r: 0.95 },
    leafDark: { c: '#3f7f3c', r: 0.95 },
    trunk: { c: '#7b5638', r: 0.95 },
    solar: { c: '#1d3a63', r: 0.3, m: 0.3 },
    accent: { c: 'accent', r: 0.6 },
    signal: { c: 'signal', r: 0.6 }
};

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Thin boxes between pairs of points, merged into one geometry. */
function barsGeometry(segments, thickness) {
    const base = new THREE.BoxGeometry(1, 1, 1);
    const bp = base.attributes.position, bn = base.attributes.normal, bi = base.index;
    const count = segments.length;
    const position = new Float32Array(count * 72), normal = new Float32Array(count * 72);
    const index = new (count * 24 > 65535 ? Uint32Array : Uint16Array)(count * 36);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), v = new THREE.Vector3();
    const q = new THREE.Quaternion(), m = new THREE.Matrix4(), scale = new THREE.Vector3();
    const Z = new THREE.Vector3(0, 0, 1);
    segments.forEach((s, i) => {
        a.set(s[0], s[1], s[2]);
        b.set(s[3], s[4], s[5]);
        dir.subVectors(b, a);
        const length = dir.length() || 1e-6;
        q.setFromUnitVectors(Z, dir.divideScalar(length));
        const t = s[6] || thickness;
        m.compose(a.add(b).multiplyScalar(0.5), q, scale.set(t, t, length));
        for (let j = 0; j < 24; j++) {
            v.fromBufferAttribute(bp, j).applyMatrix4(m).toArray(position, i * 72 + j * 3);
            v.fromBufferAttribute(bn, j).applyQuaternion(q).toArray(normal, i * 72 + j * 3);
        }
        for (let j = 0; j < 36; j++) index[i * 36 + j] = bi.getX(j) + i * 24;
    });
    base.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    return geometry;
}

/**
 * @param {HTMLElement} stage - element the viewer fills
 * @param {{key: string, link: HTMLElement}[]} topics - one per interest; key names a scene
 * @returns {{select: Function, seek: Function, orbit: Function, destroy: Function}|null} null without WebGL
 */
export function createResearchViewer(stage, topics) {
    const canvas = document.createElement('canvas');
    canvas.className = 'model-canvas';
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (err) {
        return null;
    }

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    // The outgoing scene's last frame, faded out over the incoming one
    const snapshot = document.createElement('canvas');
    snapshot.className = 'model-canvas model-snapshot';
    const snapshot2d = snapshot.getContext('2d');
    stage.append(canvas, snapshot);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-VIEW, VIEW, VIEW, -VIEW, 1, 160);

    const hemi = new THREE.HemisphereLight();
    const sun = new THREE.DirectionalLight();
    sun.position.fromArray(SUN_AT);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(coarse ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    const fill = new THREE.DirectionalLight();
    fill.position.fromArray(FILL_AT);
    scene.add(hemi, sun, fill);

    // ---- Shared geometry ---------------------------------------------------
    const shared = g => ((g.userData.shared = true), g);
    const GEO = {
        box: shared(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)),          // origin at the base
        cyl: shared(new THREE.CylinderGeometry(1, 1, 1, 24).translate(0, 0.5, 0)),
        sphere: shared(new THREE.SphereGeometry(1, 20, 14)),
        disc: shared(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)),
        blob: shared(new THREE.IcosahedronGeometry(1, 1)),
        dome: shared(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
        capsule: shared(new THREE.CapsuleGeometry(0.2, 0.75, 4, 12).translate(0, 0.575, 0))
    };
    GEO.edges = shared(new THREE.EdgesGeometry(GEO.box));
    GEO.wire = shared(new THREE.WireframeGeometry(GEO.box));

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const g2d = glowCanvas.getContext('2d');
    const gradient = g2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g2d.fillStyle = gradient;
    g2d.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;

    // ---- Ground: a grid that fades out, and a plane that only shows shadows -
    const gridMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uColor: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
            uOpacity: { value: 1 },
            uCell: { value: 1.5 },
            uWidth: { value: 1 }
        },
        vertexShader: `
            varying vec2 vGround;
            void main() {
                vec4 world = modelMatrix * vec4(position, 1.0);
                vGround = world.xz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }`,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uCell;
            uniform float uWidth;
            varying vec2 vGround;
            void main() {
                vec2 cell = vGround / uCell;
                vec2 nearest = abs(fract(cell - 0.5) - 0.5) / (fwidth(cell) * uWidth);
                float line = 1.0 - smoothstep(0.35, 1.15, min(nearest.x, nearest.y));
                float fade = 1.0 - smoothstep(4.5, 9.2, length(vGround));
                gl_FragColor = vec4(uColor, line * fade * fade * uOpacity);
            }`
    });
    const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2), gridMaterial);
    gridMesh.renderOrder = -2;

    const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    shadowMaterial.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = (modelMatrix * vec4(transformed, 1.0)).xz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
            .replace('#include <tonemapping_fragment>', 'gl_FragColor.a *= 1.0 - smoothstep(6.5, 9.5, length(vGround));\n#include <tonemapping_fragment>');
    };
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2), shadowMaterial);
    shadowMesh.position.y = 0.004;
    shadowMesh.receiveShadow = true;
    shadowMesh.renderOrder = -1;
    scene.add(gridMesh, shadowMesh);

    // ---- Theme ---------------------------------------------------------------
    let night = false;
    const vars = { accent: '#2148c0', signal: '#e8590c', ok: '#0b7a5f', ink: '#101b2b', grid: '#c5ccd5' };
    const tmpColor = new THREE.Color();

    function readTheme() {
        night = document.documentElement.getAttribute('data-theme') === 'dark';
        const css = getComputedStyle(stage);
        const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
        vars.signal = read('--signal', vars.signal);
        vars.ok = read('--success-color', vars.ok);
        vars.ink = read('--text-primary', vars.ink);
        vars.grid = read('--model-grid', vars.grid);
        const link = current && topics[current.index].link;
        if (link) vars.accent = getComputedStyle(link).getPropertyValue('--accent').trim() || vars.accent;
    }

    const resolve = spec => {
        const value = Array.isArray(spec) ? spec[night ? 1 : 0] : spec;
        return vars[value] || value;
    };

    function paint(material) {
        const theme = material.userData.theme;
        if (theme.c) material.color.set(resolve(theme.c));
        if (theme.e) material.emissive.set(resolve(theme.e));
        if (theme.ei) material.emissiveIntensity = theme.ei[night ? 1 : 0];
        if (theme.o) material.opacity = theme.o[night ? 1 : 0];
        if (theme.nightOnly) material.visible = night;
        if (theme.glow) material.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
    }

    const library = {};
    function libraryMaterial(name) {
        if (!library[name]) {
            const def = LIBRARY[name];
            if (!def) throw new Error(`Unknown material: ${name}`);
            library[name] = new THREE.MeshStandardMaterial({ roughness: def.r ?? 0.8, metalness: def.m ?? 0 });
            library[name].userData.theme = def;
            paint(library[name]);
        }
        return library[name];
    }

    function applyTheme() {
        readTheme();
        const light = night ? LIGHT.night : LIGHT.day;
        hemi.color.set(light.sky);
        hemi.groundColor.set(light.ground);
        hemi.intensity = light.hemi;
        sun.color.set(light.sun);
        sun.intensity = light.sunI;
        fill.color.set(light.fill);
        fill.intensity = light.fillI;
        shadowMaterial.opacity = light.shadow;
        // The grid is drawn in the token's own (sRGB) colour, unlit
        tmpColor.set(vars.grid).convertLinearToSRGB();
        gridMaterial.uniforms.uColor.value.set(tmpColor.r, tmpColor.g, tmpColor.b);
        gridMaterial.uniforms.uOpacity.value = light.grid;
        Object.values(library).forEach(paint);
        if (current) {
            current.themed.forEach(paint);
            current.themeListeners.forEach(fn => fn(night));
        }
    }

    /**
     * Make a material fade out towards the edge of the stage, as the grid
     * does: what drives in along a road appears from nothing, not from the
     * edge of the canvas.
     */
    function fadeAtEdge(material) {
        material.transparent = true;
        material.userData.edge = true;
        material.onBeforeCompile = shader => {
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec2 vStage;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStage = (modelMatrix * vec4(transformed, 1.0)).xz;');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nvarying vec2 vStage;')
                .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(7.8, 9.4, length(vStage));\nif (gl_FragColor.a < 0.004) discard;');
        };
        return material;
    }

    // ---- The kit a scene is built with -------------------------------------
    function createKit(state) {
        const { root } = state;
        const own = resource => (state.owned.push(resource), resource);
        const themed = (material, theme) => {
            material.userData.theme = theme;
            paint(material);
            state.themed.push(material);
            return own(material);
        };
        const mat = (name, extra) => {
            if (name.isMaterial) return name;
            if (!extra) return libraryMaterial(name);
            const def = LIBRARY[name];
            return themed(new THREE.MeshStandardMaterial({ roughness: def.r ?? 0.8, metalness: def.m ?? 0, ...extra }), def);
        };
        const place = (parent, object, x, y, z) => {
            object.position.set(x, y, z);
            (parent || root).add(object);
            return object;
        };
        const mesh = (parent, geometry, material, x, y, z) => {
            const m = new THREE.Mesh(geometry, mat(material));
            m.castShadow = m.receiveShadow = !!m.material.isMeshStandardMaterial && (!m.material.transparent || !!m.material.userData.edge);
            return place(parent, m, x, y, z);
        };
        const glowMaterials = {};
        const edgeMaterials = {};

        const kit = {
            THREE,
            root,
            GEO,
            mat,
            own,
            get night() { return night; },
            /** Colour of a spec ('accent', 'signal', '#hex' or [day, night]) in the current theme. */
            color: (spec, target = new THREE.Color()) => target.set(resolve(spec)),
            onTheme(fn) { state.themeListeners.push(fn); fn(night); },
            /** Where an object is, in the scene's own space (what label.at and lines expect). */
            local: (object, target = new THREE.Vector3()) => root.worldToLocal(object.getWorldPosition(target)),
            /** A shared material's twin that fades out at the edge of the stage. */
            edge: name => edgeMaterials[name] || (edgeMaterials[name] = fadeAtEdge(mat(name, {}))),
            /** The same fade, for a material of the scene's own. */
            fade: fadeAtEdge,
            /** A material of the scene's own: spec is its colour, theme extras as in LIBRARY. */
            standard: (spec, props = {}, theme = {}) => themed(new THREE.MeshStandardMaterial({ roughness: 0.8, ...props }), { c: spec, ...theme }),
            /** Unlit, for overlays: paths, pulses, holograms. glow: additive at night. */
            basic: (spec, props = {}, theme = {}) => themed(new THREE.MeshBasicMaterial(props), { c: spec, ...theme }),
            lineMaterial: (spec, props = {}, theme = {}) => themed(new THREE.LineBasicMaterial(props), { c: spec, ...theme }),
            group: (parent, x = 0, y = 0, z = 0) => place(parent, new THREE.Group(), x, y, z),
            /** Box standing on (x, y, z): y is its base. */
            box(parent, material, w, h, d, x = 0, y = 0, z = 0) {
                const m = mesh(parent, GEO.box, material, x, y, z);
                m.scale.set(w, h, d);
                return m;
            },
            /** Upright cylinder standing on (x, y, z). */
            cyl(parent, material, r, h, x = 0, y = 0, z = 0) {
                const m = mesh(parent, GEO.cyl, material, x, y, z);
                m.scale.set(r, h, r);
                return m;
            },
            sphere(parent, material, r, x = 0, y = 0, z = 0) {
                const m = mesh(parent, GEO.sphere, material, x, y, z);
                m.scale.setScalar(r);
                return m;
            },
            /** Mesh with a geometry of the scene's own. */
            mesh: (parent, geometry, material, x = 0, y = 0, z = 0) => mesh(parent, geometry, material, x, y, z),
            /** Struts between points, [ax, ay, az, bx, by, bz, thickness?], as one mesh. */
            bars: (parent, material, thickness, segments) => mesh(parent, barsGeometry(segments, thickness), material, 0, 0, 0),
            /** Line segments from a flat list of points, two per segment. */
            lines(parent, material, points) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
                const l = new THREE.LineSegments(geometry, material);
                (parent || root).add(l);
                return l;
            },
            /** Night only: a soft halo around a light. */
            glow(parent, x, y, z, size, spec = '#ffc56b', opacity = 0.9) {
                const key = `${spec}|${opacity}`;
                const material = glowMaterials[key] || (glowMaterials[key] = themed(new THREE.SpriteMaterial({
                    map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity
                }), { c: spec, nightOnly: true }));
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(size, size, 1);
                return place(parent, sprite, x, y, z);
            },
            /** Night only: a pool of light on the ground. */
            pool(parent, x, z, radius, spec = '#ffc56b', opacity = 0.5) {
                const key = `pool|${spec}|${opacity}`;
                const material = glowMaterials[key] || (glowMaterials[key] = themed(new THREE.MeshBasicMaterial({
                    map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity
                }), { c: spec, nightOnly: true }));
                const m = new THREE.Mesh(GEO.disc, material);
                m.scale.setScalar(radius);
                return place(parent, m, x, 0.03, z);
            },
            /**
             * A tag pinned to a point of the scene. kind: '' (chip with a
             * leader), 'mini' or 'query'.
             */
            label(title = '', text = '', kind = '') {
                const el = document.createElement('div');
                el.className = `scene-tag${kind ? ` scene-tag--${kind}` : ''}`;
                const head = document.createElement('b');
                const body = document.createElement('span');
                el.append(head, body);
                state.layer.appendChild(el);
                const label = {
                    el, position: new THREE.Vector3(), alpha: -1, title: null, text: null, x: NaN, y: NaN, half: 0, shift: 0,
                    set(newTitle, newText = '') {
                        if (newTitle !== label.title) {
                            // Width is measured again only when the text changes length
                            if (!label.title || newTitle.length !== label.title.length) label.half = 0;
                            head.textContent = label.title = newTitle;
                        }
                        if (newText !== label.text) {
                            if (label.text === null || newText.length !== label.text.length) label.half = 0;
                            body.textContent = label.text = newText;
                            body.hidden = !newText;
                        }
                        return label;
                    },
                    at(x, y, z) {
                        label.position.set(x, y, z);
                        return label;
                    },
                    show(alpha) {
                        const a = clamp01(alpha);
                        if (Math.abs(a - label.alpha) > 0.004) {
                            label.alpha = a;
                            el.style.opacity = a.toFixed(3);
                            el.style.visibility = a > 0.01 ? 'visible' : 'hidden';
                        }
                        return label;
                    },
                    tone(name) {
                        if (el.dataset.tone !== name) el.dataset.tone = name;
                        return label;
                    }
                };
                state.labels.push(label);
                return label.set(title, text).show(0);
            }
        };
        return kit;
    }

    // ---- Scenes --------------------------------------------------------------
    let current = null;      // { index, def, root, update, start, layer, labels, owned, themed, themeListeners }
    let clock = 0;           // seconds of animation played
    let frozen = null;       // scene time held by seek()
    let fadeStarted = -Infinity;
    let pending = 0;

    function disposeScene(state) {
        scene.remove(state.root);
        state.root.traverse(object => {
            if (object.geometry && !object.geometry.userData.shared) object.geometry.dispose();
        });
        state.owned.forEach(resource => resource.dispose && resource.dispose());
        const layer = state.layer;
        layer.classList.add('is-leaving');
        window.setTimeout(() => layer.remove(), FADE + 80);
    }

    function swap(index) {
        const topic = topics[index];
        const def = SCENES[topic.key] || SCENES[Object.keys(SCENES)[0]];
        const fade = reduced.matches ? 0 : FADE;

        if (current) {
            if (fade && width) {
                // Keep what is on screen: the current frame, plus what is
                // left of an earlier snapshot if a fade is still running
                const k = clamp01((performance.now() - fadeStarted) / FADE);
                draw();
                if (k < 1) {
                    snapshot2d.globalCompositeOperation = 'destination-in';
                    snapshot2d.fillStyle = `rgba(0,0,0,${1 - k})`;
                    snapshot2d.fillRect(0, 0, snapshot.width, snapshot.height);
                    snapshot2d.globalCompositeOperation = 'lighter';
                    snapshot2d.globalAlpha = k;
                } else {
                    snapshot.width = canvas.width;
                    snapshot.height = canvas.height;
                }
                snapshot2d.drawImage(canvas, 0, 0, snapshot.width, snapshot.height);
                snapshot2d.globalAlpha = 1;
                snapshot2d.globalCompositeOperation = 'source-over';
            }
            disposeScene(current);
            current = null;
        }

        const layer = document.createElement('div');
        layer.className = 'model-tags';
        layer.style.setProperty('--accent', topic.link.style.getPropertyValue('--accent'));
        stage.appendChild(layer);
        const state = {
            index, def, layer, root: new THREE.Group(), start: clock,
            labels: [], owned: [], themed: [], themeListeners: [], update: null
        };
        current = state;
        // Each simulation opens in the view it is composed for
        orbit.yaw = orbit.toYaw = orbit.pitch = orbit.toPitch = 0;
        if (orbit.drag) Object.assign(orbit.drag, { yaw: 0, pitch: 0, x: orbit.drag.lastX, y: orbit.drag.lastY });
        readTheme();
        Object.values(library).forEach(paint);
        state.update = def.build(createKit(state));
        scene.add(state.root);
        stage.setAttribute('aria-label', `3D simulation. ${def.alt}`);

        canvas.style.transition = snapshot.style.transition = 'none';
        canvas.style.opacity = fade ? '0' : '1';
        snapshot.style.opacity = fade ? '1' : '0';
        draw();
        if (fade) {
            fadeStarted = performance.now();
            void canvas.offsetWidth;
            canvas.style.transition = snapshot.style.transition = `opacity ${fade}ms linear`;
            canvas.style.opacity = '1';
            snapshot.style.opacity = '0';
        }
        wake();
    }

    /**
     * Show the simulation of one interest.
     * @param {number} index - position in topics
     * @param {boolean} [immediate] - skip the hover dwell
     */
    function select(index, immediate) {
        window.clearTimeout(pending);
        if (!topics[index] || (current && current.index === index)) return;
        if (immediate || !current) swap(index);
        else pending = window.setTimeout(() => swap(index), HOVER_DELAY);
    }

    // ---- Camera: isometric, with a little parallax from the pointer, and
    // turned about the middle of the stage by dragging ------------------------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const orbit = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0, drag: null };
    const turned = (from, cos, sin, target) => target.set(from[0] * cos + from[2] * sin, from[1], -from[0] * sin + from[2] * cos);

    function placeCamera() {
        const azimuth = ISO_AZIMUTH + orbit.yaw + pointer.x * 0.12;
        const elevation = Math.max(ELEVATION_MIN, Math.min(ELEVATION_MAX, ISO_ELEVATION + orbit.pitch)) - pointer.y * 0.05;
        camera.position.set(
            TARGET.x + CAMERA_DISTANCE * Math.sin(azimuth) * Math.cos(elevation),
            TARGET.y + CAMERA_DISTANCE * Math.sin(elevation),
            TARGET.z + CAMERA_DISTANCE * Math.cos(azimuth) * Math.cos(elevation)
        );
        camera.lookAt(TARGET);
        camera.updateMatrixWorld();
        // The lights turn with the view, as over a model on a turntable: the
        // faces in view are always the lit ones
        const cos = Math.cos(orbit.yaw), sin = Math.sin(orbit.yaw);
        turned(SUN_AT, cos, sin, sun.position);
        turned(FILL_AT, cos, sin, fill.position);
        // A scene that stands off the middle of the stage swings away from
        // the camera as it turns: def.reach widens the view to keep it in
        const reach = (current && current.def.reach) || 0;
        const zoom = 1 / (1 + (reach * (1 - cos)) / 2);
        if (Math.abs(zoom - camera.zoom) > 1e-5) {
            camera.zoom = zoom;
            camera.updateProjectionMatrix();
        }
    }

    function onDragStart(event) {
        if (orbit.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
        orbit.drag = {
            id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY,
            yaw: orbit.toYaw, pitch: orbit.toPitch, touch: event.pointerType === 'touch'
        };
        stage.style.cursor = 'grabbing';
        // A finger may still scroll the page (touch-action: pan-y); a mouse must not select text
        if (!orbit.drag.touch) {
            event.preventDefault();
            stage.setPointerCapture(event.pointerId);
        }
    }
    function onDragMove(event) {
        const drag = orbit.drag;
        if (!drag || event.pointerId !== drag.id) return;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        orbit.toYaw = drag.yaw - ((event.clientX - drag.x) / (width || 1)) * ORBIT_TURN;
        if (!drag.touch) {
            const tilt = drag.pitch + ((event.clientY - drag.y) / (height || 1)) * ORBIT_TILT;
            orbit.toPitch = Math.max(ELEVATION_MIN - ISO_ELEVATION, Math.min(ELEVATION_MAX - ISO_ELEVATION, tilt));
        }
        wake();
    }
    function onDragEnd(event) {
        if (!orbit.drag || event.pointerId !== orbit.drag.id) return;
        orbit.drag = null;
        stage.style.cursor = 'grab';
    }
    function onDragReset() {
        // Back the short way round
        orbit.yaw = Math.atan2(Math.sin(orbit.yaw), Math.cos(orbit.yaw));
        orbit.toYaw = orbit.toPitch = 0;
        wake();
    }
    stage.style.cursor = 'grab';
    stage.style.touchAction = 'pan-y';
    stage.addEventListener('pointerdown', onDragStart);
    stage.addEventListener('pointermove', onDragMove);
    stage.addEventListener('pointerup', onDragEnd);
    stage.addEventListener('pointercancel', onDragEnd);
    stage.addEventListener('dblclick', onDragReset);

    const host = stage.closest('.interests-layout') || stage;
    function onPointerMove(event) {
        if (event.pointerType !== 'mouse' || reduced.matches || orbit.drag) return;
        const box = stage.getBoundingClientRect();
        pointer.tx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / box.width));
        pointer.ty = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / box.height));
        wake();
    }
    function onPointerLeave() {
        pointer.tx = pointer.ty = 0;
    }
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    // ---- Drawing ---------------------------------------------------------------
    let width = 0, height = 0;
    const projected = new THREE.Vector3();

    function draw() {
        if (!width) return;
        placeCamera();
        if (current) {
            const still = reduced.matches;
            const age = clock - current.start;
            const t = frozen !== null ? frozen : still ? current.def.poster : age % current.def.duration;
            // The incoming scene settles onto the grid
            const settle = still || frozen !== null ? 1 : 1 - Math.pow(1 - clamp01(age / 0.7), 3);
            current.root.position.y = (settle - 1) * 0.6;
            current.root.scale.setScalar((current.def.scale || 1) * (0.96 + 0.04 * settle));
            current.root.updateMatrixWorld(true);
            current.update(t % current.def.duration);

            current.labels.forEach(label => {
                if (label.alpha <= 0.01) return;
                projected.copy(label.position).applyMatrix4(current.root.matrixWorld).project(camera);
                const x = Math.round((projected.x * 0.5 + 0.5) * width * 2) / 2;
                const y = Math.round((-projected.y * 0.5 + 0.5) * height * 2) / 2;
                // Keep the tag inside the stage; its leader stays on the point
                if (!label.half) label.half = label.el.offsetWidth / 2;
                const shift = Math.round(Math.max(label.half + 2 - x, Math.min(0, width - label.half - 2 - x)));
                if (shift !== label.shift) {
                    label.shift = shift;
                    label.el.style.setProperty('--shift', `${shift}px`);
                }
                if (x !== label.x || y !== label.y) {
                    label.x = x;
                    label.y = y;
                    label.el.style.transform = `translate(${x}px, ${y}px)`;
                }
            });
        }
        renderer.render(scene, camera);
    }

    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        width = w;
        height = h;
        const ratio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
        renderer.setPixelRatio(ratio);
        renderer.setSize(w, h, false);
        gridMaterial.uniforms.uWidth.value = Math.max(1, ratio * 0.75);
        const aspect = w / h;
        const half = aspect >= 1 ? VIEW : VIEW / aspect;
        camera.left = -half * aspect;
        camera.right = half * aspect;
        camera.top = half;
        camera.bottom = -half;
        camera.updateProjectionMatrix();
        if (!raf) draw();
    }

    // ---- The loop: runs only while the stage can be seen --------------------
    let raf = 0, last = 0, onScreen = false, destroyed = false;
    const canRun = () => onScreen && !document.hidden && !destroyed;

    function frame(now) {
        raf = 0;
        if (!canRun()) return;
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        const still = reduced.matches || frozen !== null;
        if (!still) clock += dt;
        const ease = 1 - Math.exp(-dt * 5);
        pointer.x += (pointer.tx - pointer.x) * ease;
        pointer.y += (pointer.ty - pointer.y) * ease;
        const follow = 1 - Math.exp(-dt * 16);
        orbit.yaw += (orbit.toYaw - orbit.yaw) * follow;
        orbit.pitch += (orbit.toPitch - orbit.pitch) * follow;
        draw();
        const settling = !!orbit.drag || Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.002
            || Math.abs(orbit.toYaw - orbit.yaw) + Math.abs(orbit.toPitch - orbit.pitch) > 0.0005;
        // A still frame needs no loop once the camera has come to rest
        if (!still || settling) raf = requestAnimationFrame(frame);
    }

    function wake() {
        if (raf || !canRun()) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const visibilityObserver = new IntersectionObserver(entries => {
        onScreen = entries[entries.length - 1].isIntersecting;
        wake();
    }, { rootMargin: '80px' });
    visibilityObserver.observe(stage);
    const themeObserver = new MutationObserver(() => {
        applyTheme();
        if (!raf) draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const onVisibility = () => wake();
    const onMotionChange = () => {
        pointer.tx = pointer.ty = 0;
        if (!raf) draw();
        wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotionChange);

    // A lost context comes back empty: build the scene again
    canvas.addEventListener('webglcontextlost', event => event.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => {
        if (!current) return;
        const index = current.index;
        disposeScene(current);
        current = null;
        swap(index);
    });

    applyTheme();
    resize();

    return {
        select,
        /** Hold the current scene at one moment of its loop (null resumes). */
        seek(t) {
            frozen = t;
            draw();
            wake();
        },
        /** Turn the stage and tilt the view, in degrees from the view a scene opens in. */
        orbit(yaw = 0, pitch = 0) {
            orbit.yaw = orbit.toYaw = (yaw * Math.PI) / 180;
            orbit.pitch = orbit.toPitch = Math.max(ELEVATION_MIN - ISO_ELEVATION, Math.min(ELEVATION_MAX - ISO_ELEVATION, (pitch * Math.PI) / 180));
            draw();
            wake();
        },
        destroy() {
            destroyed = true;
            cancelAnimationFrame(raf);
            window.clearTimeout(pending);
            resizeObserver.disconnect();
            visibilityObserver.disconnect();
            themeObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            reduced.removeEventListener('change', onMotionChange);
            host.removeEventListener('pointermove', onPointerMove);
            host.removeEventListener('pointerleave', onPointerLeave);
            stage.removeEventListener('pointerdown', onDragStart);
            stage.removeEventListener('pointermove', onDragMove);
            stage.removeEventListener('pointerup', onDragEnd);
            stage.removeEventListener('pointercancel', onDragEnd);
            stage.removeEventListener('dblclick', onDragReset);
            stage.style.cursor = stage.style.touchAction = '';
            if (current) disposeScene(current);
            Object.values(GEO).forEach(g => g.dispose());
            Object.values(library).forEach(m => m.dispose());
            [gridMesh, shadowMesh].forEach(m => {
                m.geometry.dispose();
                m.material.dispose();
            });
            glowTexture.dispose();
            renderer.dispose();
            canvas.remove();
            snapshot.remove();
        }
    };
}
