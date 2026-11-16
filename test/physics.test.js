import test from 'node:test';
import assert from 'node:assert/strict';
import {CARS} from '../catalog.js';
import {runSolo, makeSpec, drivetrainOf} from '../physics.js';

const find = name => CARS.find(c => `${c.make} ${c.model}` === name);

test('simulated 0–100 matches catalog for every car', () => {
  for (const car of CARS) {
    const r = runSolo(car);
    assert.ok(Math.abs(r.t100 - car.zero) < .35, `${car.make} ${car.model}: ${r.t100.toFixed(2)} vs ${car.zero}`);
  }
});

test('quarter-mile ET and trap speed are realistic', () => {
  const plaid = runSolo(find('Tesla Model S Plaid')), camry = runSolo(find('Toyota Camry'));
  assert.ok(plaid.et > 9.0 && plaid.et < 10.0, `plaid ${plaid.et}`);
  assert.ok(camry.et > 13.3 && camry.et < 14.6, `camry ${camry.et}`);
  assert.ok(plaid.trap > camry.trap + 40);
});

test('more power at similar weight gives faster ET and higher trap speed', () => {
  const base = find('Chevrolet Camaro ZL1');
  const weak = runSolo({...base, id: 9001, hp: 400, zero: 4.6}), strong = runSolo(base);
  assert.ok(strong.et < weak.et && strong.trap > weak.trap);
});

test('drivetrain inference and determinism', () => {
  assert.equal(drivetrainOf(find('Honda Civic Type R')), 'FWD');
  assert.equal(drivetrainOf(find('Nissan GT-R Nismo')), 'AWD');
  assert.equal(drivetrainOf(find('McLaren 750S')), 'MR');
  assert.equal(runSolo(find('BMW M4 Competition')).et, runSolo(find('BMW M4 Competition')).et);
  assert.ok(makeSpec(find('Tesla Model 3 Performance')).ev);
});
