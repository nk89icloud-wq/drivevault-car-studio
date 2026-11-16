import test from 'node:test';
import assert from 'node:assert/strict';
import {CARS, MAKES, fullName, findCar, estimateQuarterMile} from '../catalog.js';

test('catalog contains many unique cars from 80+ makes', () => {
  assert.equal(CARS.length >= 400, true);
  assert.equal(MAKES.length >= 80, true);
  assert.equal(new Set(CARS.map(c => `${c.make}/${c.model}`)).size, CARS.length);
});

test('every car has complete plausible specs', () => {
  CARS.forEach(car => {
    assert.ok(car.make && car.model && car.type);
    assert.ok(car.hp > 50 && car.hp < 2100);
    assert.ok(car.weight > 700 && car.weight < 4500);
    assert.ok(car.zero > 1.5 && car.zero <= 20);
    assert.ok(estimateQuarterMile(car) > 8 && estimateQuarterMile(car) < 25);
  });
});

test('lookup and display helpers return matching car', () => {
  const car = findCar(16);
  assert.equal(fullName(car), 'Porsche 911 Turbo S');
  assert.equal(findCar('16'), car);
  assert.equal(findCar(999), undefined);
});
