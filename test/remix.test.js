import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCaptions, plan, preflight, buildMeta, classifyLink, cleanTitle, detectLang, autoCaps, autoPlan, autoHook, MAX_TOTAL, OUTRO} from '../remix.js';

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

test('metadata is honest: credit, license, edit disclosure; Shorts vs full', () => {
  const m = buildMeta({kind: 'short', hook: 'X'.repeat(150), credit: 'Chan', license: 'CC BY 4.0', rights: 'cc', url: 'https://youtu.be/x'});
  const [title, , ...rest] = m.split('\n'); assert.ok(title.length <= 100);
  const d = rest.join('\n'); assert.match(d, /Source \/ Credit: Chan — https:\/\/youtu\.be\/x \(CC BY 4\.0\)/); assert.match(d, /original captions and commentary/); assert.match(d, /#Shorts/);
  const f = buildMeta({kind: 'full', hook: 'Hello world', rights: 'own'}); assert.ok(!/#Shorts/.test(f)); assert.ok(!/Source/.test(f));
});

test('links are classified without downloading from YouTube', () => {
  assert.deepEqual(classifyLink('https://youtu.be/abc123XYZ_-'), {kind: 'yt', id: 'abc123XYZ_-'});
  assert.equal(classifyLink('https://www.youtube.com/watch?v=abc123&t=5').id, 'abc123');
  assert.equal(classifyLink('https://www.youtube.com/shorts/abcdef12345').kind, 'yt');
  assert.equal(classifyLink('https://commons.wikimedia.org/wiki/File:Cheetah%20run.webm').title, 'File:Cheetah run.webm');
  assert.equal(classifyLink('https://example.com/a/b.mp4?x=1').kind, 'file');
  assert.equal(classifyLink('https://example.com/page').kind, 'unknown'); assert.equal(classifyLink('nope').kind, 'bad');
});

test('title cleaning and language', () => {
  assert.equal(cleanTitle('Bugatti vs Koenigsegg Official Video #shorts'), 'Bugatti vs Koenigsegg');
  assert.equal(cleanTitle('WhatsApp Video 2026-11-16 at 10.58.24.mp4'), ''); assert.equal(cleanTitle('IMG_2034.mp4'), '');
  assert.ok(cleanTitle('word '.repeat(40)).length <= 60);
  assert.equal(detectLang('Тест'), 'ru'); assert.equal(detectLang('Қазақша'), 'kk'); assert.equal(detectLang('Cars'), 'en');
  assert.equal(autoHook('', 'ru'), 'Смотри до конца 👀'); assert.equal(autoHook('Cool Drift', 'en'), 'Cool Drift');
});

test('auto plan finds the active window, peak, and decides on slow-mo', () => {
  const act = Array.from({length: 120}, (_, i) => i >= 70 && i <= 75 ? 1 : .1), p = autoPlan({activity: act, step: 1, duration: 120});
  assert.ok(p.start <= 72 && p.start + p.len >= 72, JSON.stringify(p)); assert.equal(p.len, 30); assert.equal(p.variant, 'B');
  assert.ok(p.replayAt >= p.start && p.replayAt + p.replayLen <= p.start + p.len + .6);
  const flat = autoPlan({activity: new Array(20).fill(.5), step: 1, duration: 20}); assert.equal(flat.variant, 'A'); assert.equal(flat.start, 0);
  assert.equal(autoPlan({activity: [0, 0, 0], step: 1, duration: 3}).len, 3);
});

test('auto captions are sorted, spaced, in range and have >= 3 lines in every language', () => {
  for (const lang of ['en', 'ru', 'kk']) for (const [D, pk] of [[30, 12], [12, 6], [30, 29], [10, 0]]) {
    const rows = autoCaps(lang, D, pk).split('\n'), ts = rows.map(r => +r.split(' ')[0]); assert.ok(rows.length >= 3, `${lang} ${D} ${pk}`);
    assert.deepEqual([...ts].sort((a, b) => a - b), ts); assert.ok(ts.every(x => x >= 0 && x < D)); assert.ok(parseCaptions(rows.join('\n'), D).length >= 3);
  }
});
