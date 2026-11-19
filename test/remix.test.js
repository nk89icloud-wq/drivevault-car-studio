import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCaptions, plan, preflight, buildMeta, MAX_TOTAL, OUTRO} from '../remix.js';

test('captions: timed, untimed and mixed lines', () => {
  const t = parseCaptions('0:05 Hello\n12 World\n20 - Third', 30);
  assert.deepEqual(t.map(x => x.t), [5, 12, 20]); assert.equal(t[2].text, 'Third'); assert.equal(t[2].end, 30); assert.equal(t[0].end, 12);
  const u = parseCaptions('a\nb\nc\nd', 20); assert.deepEqual(u.map(x => x.t), [0, 5, 10, 15]);
  const m = parseCaptions('2 first\nplain', 20); assert.equal(m.length, 2); assert.ok(m.every(x => x.t >= 0 && x.t < 20));
  assert.equal(parseCaptions('', 10).length, 0);
});

test('plan keeps total under the Shorts limit', () => {
  for (const v of ['A', 'B']) for (const clip of [5, 25, 55]) for (const rl of [3, 8]) {
    const p = plan(v, {clip, replayLen: rl}); assert.ok(p.total <= MAX_TOTAL + 0.01, `${v} ${clip} ${rl} -> ${p.total}`); assert.ok(p.D >= 5);
  }
  assert.equal(plan('A', {clip: 20}).slow, 0); assert.equal(plan('A', {clip: 20}).total, 20 + OUTRO);
});

test('preflight requires rights, credit, hook and own commentary', () => {
  const base = {rights: 'cc', credit: 'Some Channel', hook: 'Cool hook', caps: 3, variant: 'A', dur: 20, srcDur: 120};
  assert.ok(preflight(base).ok);
  assert.ok(!preflight({...base, rights: ''}).ok);
  assert.ok(!preflight({...base, credit: ''}).ok);
  assert.ok(preflight({...base, rights: 'own', credit: ''}).ok);
  assert.ok(!preflight({...base, caps: 1}).ok);
  assert.ok(!preflight({...base, hook: ''}).ok);
});

test('metadata is honest: credit, license and edit disclosure, title <= 100 chars', () => {
  const m = buildMeta({variant: 'B', hook: 'X'.repeat(150), caps: [{text: 'fact one'}], credit: 'Chan', license: 'CC BY 4.0', rights: 'cc', url: 'https://youtu.be/x', tag: 'Cars'});
  const [title, , ...rest] = m.split('\n'); assert.ok(title.length <= 100);
  const d = rest.join('\n'); assert.match(d, /Source \/ Credit: Chan — https:\/\/youtu\.be\/x/); assert.match(d, /Creative Commons/); assert.match(d, /original commentary/); assert.match(d, /#Shorts/);
});
