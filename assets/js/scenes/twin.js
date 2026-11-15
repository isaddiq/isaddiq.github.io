import * as THREE from '../../vendor/three.module.min.js';
import { clamp01, lerp, seg, smooth, easeOut, pulse, building, tree, person, route } from './props.js';
import { captions, ribbon, sampled, frame, hologram, stride } from './overlays.js';

// The twin's thermal model, per zone: what the sun adds by the afternoon, and what it costs to remove
const SETPOINT = 21.6;               // air temperature the plant holds without the sun, °C
const SOLAR = { front: 3.4, rear: 0.8, upper: 1.3, west: 0.35 };   // gain at its peak, °C, and how storey and bay scale it
const LIMIT = 26.5;                  // a zone above this is overheating, °C
const BLINDS = 0.45;                 // share of the solar gain that lowered blinds let through
const BOOST = 0.6;                   // what the faster fan takes off every zone, °C
const COOLING = 0.55;                // cooling load per zone, kW for each °C above the setpoint
const NOW = 12, LATER = 15;          // the hour in the building, and the hour the twin runs to
// The fan bearing: vibration now, its alarm limit, and how fast it has been rising
const BEARING = { now: 7.1, limit: 11.2, perDay: 0.195 };
const clock = hour => `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60) % 60).padStart(2, '0')}`;

/**
 * A building and, above it, its twin: the same model, fed by the building's
 * sensors. Four beats: readings rise from the rooms and colour the twin as
 * a heat map; the twin alone runs on to the afternoon and shows a zone that
 * will overheat; a command comes back down, the blinds lower, the fan speeds
 * up and the forecast cools; and a fault found in the twin's plant sends a
 * technician to the unit. Temperatures and loads come from the model above.
 */
function build(k) {
    const B1 = 1, B2 = 6.5, B3 = 12, B4 = 17.5, END = 23;
    const site = k.group();
    const b = building(k, { nx: 3, nz: 2, storeys: 2, plant: 'solar', x: -0.4, z: -1.6, parent: site });
    const g = b.group, { W, D } = b;
    const GX = g.position.x, GZ = g.position.z;
    tree(k, null, -7, 0.6, 1.25);

    // ---- Plant: an air handling unit in front of the building
    const UNIT = { x: GX - 2.6, z: GZ + D / 2 + 2.6 };
    const unit = k.group(site, UNIT.x, 0, UNIT.z);
    k.box(unit, 'paving', 2.9, 0.12, 2);
    k.box(unit, 'metal', 2.3, 1.4, 1.4, 0, 0.12, 0);
    k.box(unit, 'dark', 2.34, 0.1, 1.44, 0, 0.5, 0);
    [-0.7, 0.7].forEach(x => k.box(unit, 'dark', 0.6, 0.5, 0.03, x, 0.75, 0.71));
    k.cyl(unit, 'dark', 0.56, 0.08, 0, 1.52, 0);
    const fan = k.group(unit, 0, 1.62, 0);
    k.box(fan, 'white', 1, 0.03, 0.16);
    k.box(fan, 'white', 0.16, 0.03, 1);
    k.bars(unit, 'steel', 0.18, [[0.6, 1.05, -0.7, 0.6, 1.05, -2.2], [-0.6, 0.55, -0.7, -0.6, 0.55, -2.2]]);

    // ---- The twin: the same model as a hologram, held above the building
    const LIFT = b.top + 2.9;
    // (its larger parts only: a hologram of every glazing bar would hide the zones inside)
    const twin = hologram(k, site, 'accent', 0.04, mesh => mesh.scale.x * mesh.scale.y * mesh.scale.z > 0.3);
    twin.group.position.y = LIFT;

    // Twelve zones: a bay wide, half the depth, a storey high
    const cool = new THREE.Color('#4aa8d8'), mild = new THREE.Color('#e9e2c8'), warm = new THREE.Color('#f0642c'), shade = new THREE.Color();
    const zones = [];
    for (let s = 0; s < 2; s++) {
        for (let i = 0; i < 3; i++) {
            [1, -1].forEach(side => {
                const x = GX + (i - 1) * 3, y = b.base + s * 3, z = GZ + side * 1.5;
                const material = k.own(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
                const box = k.box(twin.group, material, 2.7, 2.4, 2.7, x, y + 0.12, z);
                box.renderOrder = 1;
                zones.push({
                    name: `${s + 1}.${i + 1}${side > 0 ? '' : 'N'}`, material, s, i, side,
                    gain: (side > 0 ? SOLAR.front : SOLAR.rear) * (1 + SOLAR.west * (i - 1)) * (s ? SOLAR.upper : 1),
                    // Where its sensor reports from: the face of the building it looks out of
                    port: new THREE.Vector3(x + 0.9, y + 2.55, GZ + side * (D / 2 + 0.22)),
                    packets: [0, 1].map(() => k.sphere(null, packetMaterial(), 0.13))
                });
            });
        }
    }
    function packetMaterial() {
        return packetMaterial.shared || (packetMaterial.shared = k.basic('accent', { transparent: true }, { glow: true }));
    }
    /** Temperature of a zone at an hour of the day; acted: 0..1, how far the blinds and the fan have answered. */
    const temperature = (zone, hour, acted = 0) => {
        const sun = clamp01((hour - 9) / 6);
        return SETPOINT + zone.gain * sun * (zone === HOT ? lerp(1, BLINDS, acted) : 1) - BOOST * acted;
    };
    const HOT = zones.reduce((hottest, zone) => (zone.gain > hottest.gain ? zone : hottest));
    const load = (hour, acted) => zones.reduce((sum, zone) => sum + Math.max(0, temperature(zone, hour, acted) - SETPOINT) * COOLING, 0);
    zones.forEach(zone => k.box(null, 'white', 0.16, 0.1, 0.06, zone.port.x, zone.port.y - 0.05, zone.port.z - zone.side * 0.19));

    const hotLine = k.lineMaterial('signal', { transparent: true });
    const hotFrame = frame(k, twin.group, hotLine, 2.9, 2.6, 2.9, GX + (HOT.i - 1) * 3, b.base + HOT.s * 3 + 0.02, GZ + HOT.side * 1.5);

    // ---- What the building does about it: blinds over the windows of that zone
    const opening = b.storeys[HOT.s].windows[2 + HOT.i];
    const blind = k.box(opening, 'coping', 1.74, 1, 0.05, -0.3, 2.42, 0.1);
    const DROP = 1.5;
    const command = k.sphere(null, k.basic('signal', {}, { glow: true }), 0.16);
    const order = k.sphere(null, k.basic('signal', {}, { glow: true }), 0.16);

    // ---- Maintenance: the fault in the twin's unit, and the technician sent to the real one
    const faultLine = k.lineMaterial('signal', { transparent: true });
    const faultFrame = frame(k, twin.group, faultLine, 2.7, 2, 1.8, UNIT.x, 0.05, UNIT.z);
    const ENTRANCE = [GX + W / 2 + 1.5, GZ + 1.5];
    const way = route([ENTRANCE, [GX + W / 2 + 1.5, UNIT.z + 0.2], [UNIT.x + 2.3, UNIT.z + 0.2]], 0.8);
    const wayBand = ribbon(k, null, k.basic('accent', { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), sampled(way), 0.14, 0.05);
    const technician = person(k, null, ENTRANCE[0], ENTRANCE[1], { vest: true, hat: 'white', top: '#3d5a80', skin: 1 });
    k.box(technician.userData.foreR, 'accent', 0.1, 0.24, 0.3, 0, -0.5, 0);          // a tool case
    const REMAINING = Math.round((BEARING.limit - BEARING.now) / BEARING.perDay);

    const nowTag = k.label('Building', `${clock(NOW)} · now`).at(GX - W / 2, b.top + 0.4, GZ + D / 2);
    const twinTag = k.label('', '', 'query').at(GX, LIFT + b.top + 2.3, GZ);
    const hotTag = k.label().at(GX + (HOT.i - 1) * 3 + 1.4, LIFT + b.base + HOT.s * 3 + 2.7, GZ + HOT.side * 1.5 + 1.4);
    const actTag = k.label('Blinds down · fan up', 'on the twin\'s command').at(HOT.port.x + 0.4, HOT.port.y + 0.2, HOT.port.z + 0.2);
    const unitTag = k.label();
    const faultTag = k.label('Fan bearing', '').tone('signal').at(UNIT.x, LIFT + 2.3, UNIT.z);
    const orderTag = k.label();
    const caption = captions(k, [
        [B1, B2, 'Mirror · sensor readings colour the twin'],
        [B2, B3, 'Predict · the twin runs ahead of the building'],
        [B3, B4, 'Act · the twin\'s command comes back down'],
        [B4, END, 'Maintain · a fault found in the twin, fixed on site']
    ]);
    const TAU = Math.PI * 2;

    return t => {
        const u1 = t - B1, u2 = t - B2, u3 = t - B3, u4 = t - B4;
        const rest = 1 - smooth(seg(t, END, END + 0.7));

        // ---- The hour in the twin, and how far the building has answered its command
        const hour = NOW + (LATER - NOW) * smooth(seg(u2, 0.8, 4.3)) * (1 - smooth(seg(u4, 0.2, 1.2)));
        const acted = smooth(seg(u3, 1.9, 3.3)) * rest;
        const mirrored = smooth(seg(u1, 0.9, 2.9)) * rest;

        // ---- Beat 1: readings rise from every zone, and the twin takes their colour
        let hottest = 0;
        zones.forEach((zone, n) => {
            const degrees = temperature(zone, hour, acted) + 0.12 * Math.sin(t * 1.7 + n * 2.1);
            hottest = Math.max(hottest, degrees);
            const level = clamp01((degrees - 21) / 7);
            if (level < 0.5) shade.lerpColors(cool, mild, level * 2);
            else shade.lerpColors(mild, warm, level * 2 - 1);
            zone.material.color.copy(shade);
            zone.material.opacity = 0.62 * mirrored;
            const sending = pulse(t, B1 + 0.3, END, 0.6);
            zone.packets.forEach((packet, m) => {
                const beat = (t / 1.5 + m / 2 + n * 0.137) % 1;
                packet.visible = sending > 0.01;
                packet.position.set(zone.port.x, zone.port.y + LIFT * beat, zone.port.z);
                packet.scale.setScalar(0.13 * Math.sin(beat * Math.PI) * sending + 0.001);
            });
        });
        const mean = zones.reduce((sum, zone) => sum + temperature(zone, hour, acted), 0) / zones.length;

        // ---- Beat 2: only the twin runs on; one zone goes over the limit
        const degrees = temperature(HOT, hour, acted);
        const over = degrees > LIMIT;
        const flagged = pulse(t, B2 + 2.6, B4 + 0.4, 0.3);
        hotFrame.visible = flagged > 0.01;
        hotLine.color.copy(k.color(over ? 'signal' : 'ok', shade));
        hotLine.opacity = flagged * (over ? 0.6 + 0.4 * Math.sin(t * 9) : 1);
        hotTag.set(over ? `Zone ${HOT.name} overheats` : `Zone ${HOT.name} holds`, `${degrees.toFixed(1)} °C at ${clock(hour)} · limit ${LIMIT} °C`)
            .tone(over ? 'signal' : 'ok').show(flagged);

        // ---- Beat 3: the command comes down; the blinds lower and the fan speeds up
        const sent = seg(u3, 0.5, 1.8);
        command.visible = order.visible = sent > 0 && sent < 1;
        command.position.set(HOT.port.x, HOT.port.y + LIFT * (1 - easeOut(sent)), HOT.port.z);
        order.position.set(lerp(HOT.port.x, UNIT.x, sent), lerp(LIFT + HOT.port.y, 1.9, easeOut(sent)), lerp(HOT.port.z, UNIT.z, sent));
        const drop = DROP * acted;
        blind.scale.y = Math.max(0.001, drop);
        blind.position.y = 2.42 - drop;
        blind.visible = drop > 0.01;
        actTag.show(pulse(u3, 1.9, 5.3, 0.3));

        // ---- Beat 4: the bearing shakes until the technician has seen to it
        const repaired = smooth(seg(u4, 3.7, 4.2)) * rest;
        const shaking = pulse(t, B4 + 0.5, END + 0.7, 0.4) * (1 - repaired);
        fan.rotation.y = t * 6 + 10 * Math.max(0, Math.min(t, B4) - (B3 + 1.9));
        fan.rotation.x = 0.045 * shaking * Math.sin(t * 31);
        fan.rotation.z = 0.045 * shaking * Math.cos(t * 27);
        const fault = pulse(t, B4 + 0.5, END, 0.3);
        faultFrame.visible = fault > 0.01;
        faultLine.color.copy(k.color(repaired > 0.5 ? 'ok' : 'signal', shade));
        faultLine.opacity = fault * (repaired > 0.5 ? 1 : 0.6 + 0.4 * Math.sin(t * 9));
        faultTag.set('Fan bearing', repaired > 0.5 ? 'Replaced · vibration back to normal' : `Vibration ${BEARING.now} mm/s · about ${REMAINING} days left`)
            .tone(repaired > 0.5 ? 'ok' : 'signal').show(fault * Math.min(1, Math.abs(u4 - 3.95) / 0.12));
        const walked = seg(u4, 1.4, 3.5);
        const guided = pulse(u4, 1, 4.6, 0.3);
        wayBand.userData.show(guided > 0 ? walked : 0, guided > 0 ? seg(u4, 1, 1.5) : 0);
        const out = pulse(u4, 1.1, 5.1, 0.25) * rest;
        technician.visible = out > 0.01;
        technician.scale.setScalar(Math.max(0.001, out));
        stride(technician, way, way.length * walked, 0, walked > 0 && walked < 1 ? 1 : 0);
        if (walked >= 1) {
            technician.rotation.y = -Math.PI / 2;
            technician.userData.armL.rotation.x = -1.1 + 0.2 * Math.sin(t * 9) * (1 - repaired);
        }
        orderTag.set(repaired > 0.5 ? 'Work order closed' : 'Work order opened', repaired > 0.5 ? 'Recorded in the twin' : 'Route to the unit, from the twin')
            .tone(repaired > 0.5 ? 'ok' : '').at(technician.position.x, 2.05, technician.position.z)
            .show(pulse(u4, 1.3, 5.2, 0.25) * Math.min(1, Math.abs(u4 - 3.95) / 0.12));

        // ---- What the twin reports
        const forecast = hour > NOW + 0.02;
        twinTag.set(u4 > 0.5 && t < END ? 'Digital twin · asset health' : forecast ? `Digital twin · forecast for ${clock(hour)}` : 'Digital twin · live',
            u4 > 0.5 && t < END ? `${zones.length} zones · 1 unit · ${repaired > 0.5 ? 0 : 1} fault`
                : `${zones.length} zones · mean ${mean.toFixed(1)} °C · warmest ${hottest.toFixed(1)} °C`)
            .show(pulse(t, B1 + 0.4, END, 0.4));
        nowTag.show(pulse(t, B2 + 0.5, B4 + 0.3, 0.4));
        unitTag.set('Air handling unit', `Cooling at ${clock(hour)} · ${load(hour, acted).toFixed(1)} kW`)
            .at(UNIT.x, 2.1, UNIT.z).show(pulse(t, B2 + 2.6, B4 + 0.3, 0.4));
        twin.line.opacity = (k.night ? 0.45 : 0.8) + 0.1 * Math.sin((t / 4) * TAU);
        caption(t);
    };
}

export const twin = {
    duration: 24,
    poster: 10.6,
    scale: 0.68,
    alt: 'A building with its digital twin held above it as a hologram. Sensor readings rise from the rooms and colour the twin as a heat map; the twin alone runs forward from noon to three o\'clock and shows one zone overheating; a command travels back down, blinds lower on the facade, the fan speeds up and the forecast cools; then a vibration fault is highlighted in the twin and a technician follows a guided path to the unit and closes the work order.',
    build
};
