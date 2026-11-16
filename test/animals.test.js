import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRace, ANIMALS, byId} from '../animals.js';

function run(ids, D) {
  const S = makeRace(ids, D); let n = 0;
  while (!S.done && n++ < 60 * 200) S.step(1 / 60);
  return S;
}
const time = (id, D) => { const S = run([id, 'pug'], D); return S.racers[0].fin; };

test('every animal has sane real-world data', () => {
  assert.ok(ANIMALS.length >= 25);
  for (const a of ANIMALS) { assert.ok(a.kmh >= 15 && a.kmh <= 110, a.id); assert.ok(a.tau > 0.5 && a.tau < 4, a.id); assert.ok(a.cruise <= a.kmh, a.id); assert.ok(a.look.L > 0 && a.look.h > 0, a.id); }
  assert.equal(new Set(ANIMALS.map(a => a.id)).size, ANIMALS.length, 'unique ids');
  assert.ok(byId('greyhound').kmh === 70 && byId('cheetah').kmh === 105 && byId('whippet').kmh === 56 && byId('gsd').kmh === 48);
});

test('sprint times are close to real records', () => {
  const ch = time('cheetah', 100); assert.ok(ch > 5.2 && ch < 6.6, 'cheetah 100 m ≈ 5.95 s, got ' + ch);
  const gh = time('greyhound', 200); assert.ok(gh > 11 && gh < 13.8, 'greyhound 200 m ≈ 12 s, got ' + gh);
  const wh = time('whippet', 200); assert.ok(wh > gh, 'whippet slower than greyhound');
  const horse = time('horse', 400); assert.ok(horse > 20 && horse < 29, 'racehorse 400 m, got ' + horse);
});

test('a race finishes, ranks correctly and never produces NaN', () => {
  const S = run(['cheetah', 'greyhound', 'pug', 'lion'], 200);
  assert.ok(S.done && S.result);
  const rows = S.result.rows; assert.equal(rows.length, 4);
  assert.equal(rows[0].a.id, 'cheetah');
  assert.ok(rows[0].fin < rows[1].fin);
  S.racers.forEach(r => { assert.ok(Number.isFinite(r.x) && Number.isFinite(r.v) && Number.isFinite(r.phi)); });
  assert.ok(Number.isFinite(S.camL) && Number.isFinite(S.camW));
});

test('endurance: a cheetah sprinter fades over a long distance while a pronghorn does not', () => {
  const S = run(['cheetah', 'pronghorn'], 800);
  const c = S.result.rows.find(r => r.a.id === 'cheetah'), p = S.result.rows.find(r => r.a.id === 'pronghorn');
  assert.equal(S.result.winner.a.id, 'pronghorn');
  assert.ok(c.fin == null || c.fin > p.fin);
});

test('events: countdown, go, finish and footsteps are emitted', () => {
  const S = makeRace(['greyhound', 'whippet'], 100), seen = new Set(); let n = 0;
  while (!S.done && n++ < 60 * 100) { S.step(1 / 60); S.events.forEach(e => seen.add(e.t)); S.events.length = 0; }
  ['count', 'go', 'fin', 'step', 'result'].forEach(t => assert.ok(seen.has(t), t));
});
