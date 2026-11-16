import test from 'node:test';
import assert from 'node:assert/strict';
import {vehiclePerformance, crashMetrics} from '../game.js';

const sport = {hp: 640, weight: 1640};

test('vehicle performance scales to plausible game physics', () => {
  const perf = vehiclePerformance(sport);
  assert.ok(perf.maxSpeed * 3.6 >= 250 && perf.maxSpeed * 3.6 <= 365);
  assert.ok(perf.acceleration > 3 && perf.acceleration <= 10.5);
  assert.ok(perf.braking >= 8.5 && perf.braking <= 11.5);
});

test('crash energy rises with speed and barrier changes deformation', () => {
  const low = crashMetrics(sport, 50, 'wall');
  const high = crashMetrics(sport, 100, 'wall');
  const pole = crashMetrics(sport, 100, 'pole');
  assert.ok(high.energy > low.energy * 3.9);
  assert.ok(pole.deformation > high.deformation);
  assert.ok(high.force > 0);
});
