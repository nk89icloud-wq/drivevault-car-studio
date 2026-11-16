import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate, profileOf} from '../crashsim.js';
import {CARS} from '../catalog.js';

const find = m => CARS.find(c => c.model.includes(m));
const camry = find('Camry'), suv = find('Land Cruiser 300'), hatch = CARS.find(c => c.type === 'Хэтчбек' && c.weight > 1100 && c.weight < 1300), chiron = find('Chiron');

test('crash: energy is conserved (absorbed + residual kinetic = initial)', () => {
  const r = simulate({A: camry, speedA: 56});
  assert.ok(Math.abs(r.ke1 + r.absorbed - r.ke0) / r.ke0 < .02, `${r.ke1 + r.absorbed} vs ${r.ke0}`);
});

test('crash: momentum is conserved in a head-on collision', () => {
  const r = simulate({A: hatch, B: suv, speedA: 56, speedB: 56, scenario: 'head'});
  assert.ok(Math.abs(r.momentum1 - r.momentum0) / Math.abs(r.momentum0) < .01);
});

test('crash: velocity change is inversely proportional to mass (heavier car feels less)', () => {
  const r = simulate({A: hatch, B: suv, speedA: 56, speedB: 56, scenario: 'head'});
  const ratio = r.sumA.dV / r.sumB.dV, mr = r.sumB.mass / r.sumA.mass;
  assert.ok(Math.abs(ratio - mr) / mr < .03, `${ratio} vs ${mr}`);
  assert.ok(r.sumA.score <= r.sumB.score, 'the lighter car must not fare better');
});

test('crash: identical car head-on at v equals wall at v (classic equivalence)', () => {
  const w = simulate({A: camry, speedA: 56}), h = simulate({A: camry, B: camry, speedA: 56, speedB: 56, scenario: 'head'});
  assert.ok(Math.abs(w.sumA.crush - h.sumA.crush) / w.sumA.crush < .02);
  assert.ok(Math.abs(w.sumA.peak - h.sumA.peak) / w.sumA.peak < .02);
});

test('crash: NCAP-like 56 km/h wall test gives realistic numbers', () => {
  const s = simulate({A: camry, speedA: 56});
  assert.ok(s.sumA.crush > .45 && s.sumA.crush < .85, 'crush depth ' + s.sumA.crush);
  assert.ok(s.sumA.peak > 15 && s.sumA.peak < 60, 'peak g ' + s.sumA.peak);
  assert.ok(s.contact > .06 && s.contact < .13, 'duration ' + s.contact);
  assert.ok(s.sumA.dV > 56 && s.sumA.dV < 75, 'delta V incl. rebound ' + s.sumA.dV);
  assert.ok(s.sumA.chest3 > 15 && s.sumA.chest3 < 50, 'chest g ' + s.sumA.chest3);
  assert.ok(s.sumA.score > 75 && s.sumA.fatality < .2, 'a belted driver in a modern car usually survives 56 km/h');
});

test('crash: severity rises monotonically with speed; very high speed is fatal-level', () => {
  const sp = [30, 50, 64, 90, 130], res = sp.map(v => simulate({A: camry, speedA: v}).sumA);
  for (let i = 1; i < res.length; i++) { assert.ok(res[i].crush >= res[i - 1].crush); assert.ok(res[i].score <= res[i - 1].score + 1); }
  assert.ok(res[0].score > 90); assert.ok(res[4].score <= 2 && res[4].fatality > .95); assert.ok(res[4].intrusion > .2);
});

test('crash: doubling speed quadruples the kinetic energy; narrow pole is worse than full wall', () => {
  const a = simulate({A: camry, speedA: 40}), b = simulate({A: camry, speedA: 80});
  assert.ok(Math.abs(b.ke0 / a.ke0 - 4) < .01);
  assert.ok(simulate({A: camry, speedA: 56, scenario: 'pole'}).sumA.crush > simulate({A: camry, speedA: 56}).sumA.crush);
});

test('crash: all catalog cars simulate without NaN', () => {
  for (const c of CARS.filter((_, i) => i % 7 === 0)) {
    const s = simulate({A: c, speedA: 64}).sumA; assert.ok(Number.isFinite(s.peak) && Number.isFinite(s.crush) && Number.isFinite(s.hic), c.model);
    assert.ok(profileOf(c).mass > 600);
  }
  assert.ok(simulate({A: chiron, speedA: 200}).sumA.score <= 2);
  const hon = simulate({A: find('X5 M') || suv, B: find('911 Turbo S') || camry, speedA: 70, speedB: 70, scenario: 'head'});
  assert.ok(hon.sumB.fatality > hon.sumA.fatality, 'the lighter car fares worse in a head-on crash');
  assert.ok(hon.sumB.fatality > .8, 'a 140 km/h closing speed is fatal for the lighter car');
});
