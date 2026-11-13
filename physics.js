// DriveVault drag physics: deterministic, frame-rate independent, pure (no DOM).
// Каталогтағы а.к., салмақ және 0–100 мәндері бойынша шынайы бойлық динамика:
// қозғалтқыш қуат қисығы, беріліс қорапшасы, доңғалақ тартылуы, аэродинамика, дөңгелек кедергісі.

export const G = 9.81;
export const RHO = 1.2;
export const HP_W = 745.7;
export const KMH100 = 100 / 3.6;
export const QUARTER_MILE = 402.34;
const DRIVER = 80;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function vehiclePerformance(car) {
  const powerToWeight = car.hp / car.weight;
  return {
    maxSpeed: clamp(185 + car.hp * .17 - car.weight * .012, 185, 365) / 3.6,
    acceleration: clamp(2.5 + powerToWeight * 12, 3.1, 10.5),
    braking: clamp(12.5 - car.weight / 1000, 8.5, 11.5)
  };
}

const key = car => `${car.make} ${car.model}`;
const MID_ENGINE = new Set(['Chevrolet Corvette Z06', 'Lamborghini Huracan STO', 'Ferrari 296 GTB', 'McLaren 750S', 'McLaren Artura', 'McLaren GT', 'McLaren Senna', 'Porsche 718 Cayman GT4 RS']);
const AWD = new Set([
  'Toyota Land Cruiser 300', 'BMW M4 Competition', 'BMW M5 CS', 'BMW X5 M', 'Mercedes-Benz AMG GT 63', 'Mercedes-Benz C 63 S E Performance', 'Mercedes-Benz G 63 AMG',
  'Audi RS 6 Avant', 'Audi RS 7 Performance', 'Audi R8 V10 Performance', 'Porsche 911 Turbo S', 'Porsche Cayenne Turbo GT', 'Nissan GT-R Nismo', 'Nissan Patrol Nismo',
  'Ford F-150 Raptor R', 'Ford Bronco Raptor', 'Chevrolet Tahoe RST', 'Lamborghini Revuelto', 'Lamborghini Urus Performante', 'Lamborghini Temerario',
  'Ferrari SF90 Stradale', 'Ferrari Purosangue', 'Hyundai Santa Fe', 'Hyundai Palisade', 'Kia Stinger GT', 'Kia Telluride', 'Lexus LX 600', 'Honda NSX Type S',
  'Honda CR-V Hybrid', 'Subaru WRX STI', 'Subaru Outback XT', 'Mazda Mazda3 Turbo', 'Mazda CX-90 Turbo S'
]);
const FWD = new Set(['Toyota Camry', 'Hyundai Elantra N', 'Kia K5 GT', 'Honda Civic Type R', 'Honda Accord Hybrid']);
const MANUAL = new Set(['Toyota GR86', 'Subaru BRZ tS', 'Mazda MX-5 Miata', 'Mazda RX-7 Spirit R', 'Honda Civic Type R', 'Subaru WRX STI', 'Ford Mustang Dark Horse']);

export const isEV = car => car.type === 'Электр' || car.model === 'Cybertruck Beast' || car.model === 'Silverado EV RST';

export function drivetrainOf(car) {
  if (isEV(car)) return 'AWD';
  const k = key(car);
  if (AWD.has(k)) return 'AWD';
  if (FWD.has(k)) return 'FWD';
  if (MID_ENGINE.has(k)) return 'MR';
  return 'RWD';
}

const LENGTH = {'Спорткар': 4.5, 'Суперкар': 4.5, 'Гиперкар': 4.7, 'Купе': 4.7, 'Седан': 4.9, 'Универсал': 4.95, 'Лифтбек': 4.95, 'Хэтчбек': 4.4, 'Родстер': 3.95, 'Электр': 4.9, 'SUV': 5.0, 'Пикап': 5.7};
const CDA = {'Спорткар': .62, 'Суперкар': .6, 'Гиперкар': .58, 'Купе': .64, 'Седан': .66, 'Универсал': .7, 'Лифтбек': .68, 'Хэтчбек': .7, 'Родстер': .68, 'Электр': .62, 'SUV': .95, 'Пикап': 1.15};
const GRIP = {'Спорткар': 1.28, 'Суперкар': 1.34, 'Гиперкар': 1.38, 'Купе': 1.22, 'Седан': 1.12, 'Универсал': 1.12, 'Лифтбек': 1.14, 'Хэтчбек': 1.12, 'Родстер': 1.14, 'Электр': 1.22, 'SUV': 1.05, 'Пикап': 1.0};
// Қуаттың rpm бойынша нормаланған қисығы (r = rpm / redline)
function icePowerCurve(r) {
  if (r < .85) return clamp(1 - 1.6 * (.85 - r) ** 2, .35, 1);
  return 1 - 4 * (r - .85) ** 2;
}
function evPowerCurve(r) { return r < .72 ? 1 : 1 - .45 * ((r - .72) / .28) ** 2; }

/** Көліктің физикалық профилі (калибровка алдында) */
export function buildSpec(car) {
  const perf = vehiclePerformance(car);
  const ev = isEV(car), drive = drivetrainOf(car);
  const supercar = car.type === 'Суперкар' || car.type === 'Гиперкар';
  const manual = MANUAL.has(key(car));
  const gears = ev ? 1 : manual ? 6 : (car.hp > 380 || supercar ? 7 : 8);
  const redline = ev ? 16000 : supercar ? 8400 : (car.hp / 3 > 150 && car.type !== 'SUV' ? 7000 : 6400);
  const cyl = car.hp > 800 ? 12 : car.hp > 560 ? 8 : car.hp > 380 ? 6 : 4;
  return {
    car, ev, drive, gears, redline, idle: 1000, cyl,
    len: LENGTH[car.type] || 4.7,
    mass: car.weight + DRIVER,
    power: car.hp * HP_W,
    torque: car.torque,
    vTop: perf.maxSpeed,
    brake: perf.braking,
    cda: CDA[car.type] || .7,
    mu: GRIP[car.type] || 1,
    rw: car.type === 'SUV' || car.type === 'Пикап' ? .38 : .34,
    shiftTime: ev ? 0 : manual ? .32 : car.hp > 450 ? .08 : .2,
    eta: ev ? .9 : drive === 'FWD' ? .9 : drive === 'AWD' ? .85 : .88,
    muK: 1, powerK: 1
  };
}

// Гear ratios: gear i reaches redline at gearVmax[i]
function gearVmax(spec, i) { return spec.vTop * .97 * Math.pow((i + 1) / spec.gears, .8); }
function gearRatio(spec, i) { return (spec.redline * 2 * Math.PI / 60) * spec.rw / gearVmax(spec, i); }

function tractionLimit(spec, mu) {
  const w = spec.mass * G;
  switch (spec.drive) {
    case 'AWD': return mu * w * .97;
    case 'MR': return mu * w * .6 / (1 - mu * .18);
    case 'FWD': return mu * w * .6 / (1 + mu * .18);
    default: return mu * w * .5 / (1 - mu * .18);
  }
}

export function newState(spec) {
  return {x: 0, v: 0, t: 0, gear: 0, shiftT: 0, rpm: spec.idle, throttle: 0, slip: 0, accel: 0, power: 0, braking: false, shifting: false, launched: false};
}

/** Бір қадам физика (dt секунд). state-ті орнында өзгертеді. */
export function step(spec, s, dt, {launch = true, brake = false} = {}) {
  const m = spec.mass;
  const drag = .5 * RHO * spec.cda * s.v * s.v;
  const roll = .014 * m * G * (s.v > .05 ? 1 : 0);
  let force = 0, want = 0;
  s.slip = 0;
  s.braking = brake;
  if (brake) {
    force = s.v > .2 ? -spec.brake * m : 0;
    s.throttle = 0; s.shifting = false;
    s.rpm = Math.max(spec.idle, s.rpm - 6000 * dt);
  } else if (!launch) {
    // старт сызығында: двигатель rpm-ы көтеріліп тұрады
    s.throttle = 0; s.rpm = spec.idle + (s.rpmHold || 0);
  } else if (s.shiftT > 0) {
    s.shiftT -= dt; s.shifting = true; s.throttle = 0;
    s.rpm = Math.max(spec.idle, s.rpm - 9000 * dt);
    if (s.shiftT <= 0) s.shifting = false;
  } else {
    s.shifting = false; s.throttle = 1;
    let fEng, rpm;
    if (spec.ev) {
      const r = clamp(s.v / spec.vTop, 0, 1);
      rpm = r * spec.redline;
      const pw = spec.power * spec.eta * spec.powerK * evPowerCurve(r);
      fEng = pw / Math.max(s.v, 3);
    } else {
      const ratio = gearRatio(spec, s.gear);
      const launchRpm = s.gear === 0 ? spec.redline * .45 : spec.idle;
      rpm = Math.max(launchRpm, s.v / spec.rw * ratio * 60 / (2 * Math.PI));
      const r = clamp(rpm / spec.redline, 0, 1.02);
      const omega = rpm * 2 * Math.PI / 60;
      const t = Math.min(spec.torque * 1.02 * spec.powerK, spec.power * icePowerCurve(r) * spec.powerK / omega);
      fEng = t * ratio * spec.eta / spec.rw;
      if (rpm >= spec.redline * .985 && s.gear < spec.gears - 1) {
        s.gear++; s.shiftT = spec.shiftTime; s.shifting = true; fEng = 0; s.throttle = 0;
      }
    }
    s.rpm = rpm;
    want = fEng;
    const ftr = tractionLimit(spec, spec.mu * spec.muK);
    force = Math.min(fEng, ftr);
    s.slip = fEng > ftr ? clamp((fEng - ftr) / ftr, 0, 1) : 0;
    if (s.v > 38) s.slip = 0;
    if (s.v >= spec.vTop) force = Math.min(force, drag + roll);
  }
  const inertia = 1.04 + (spec.ev ? .03 : .09 / (s.gear + 1) * 3);
  const a = (force - drag - roll) / (m * inertia);
  s.accel = a;
  s.power = want;
  s.v = Math.max(0, s.v + a * dt);
  s.x += s.v * dt;
  s.t += dt;
  s.launched = launch;
  return s;
}

const calibCache = new Map();
function sim100(spec, hardLimit = 25) {
  const s = newState(spec); const dt = .004;
  while (s.v < KMH100 && s.t < hardLimit) step(spec, s, dt);
  return s.t;
}

/** 0–100 км/сағ каталог уақытына сәйкестендіру: тартылу (muK) немесе қуат (powerK) коэффициентін табады */
export function calibrate(car) {
  const cacheKey = `${car.id}:${car.hp}:${car.weight}:${car.zero}`;
  if (calibCache.has(cacheKey)) return {...calibCache.get(cacheKey)};
  const base = buildSpec(car), target = car.zero;
  const test = (muK, powerK) => sim100({...base, muK, powerK});
  const bisect = (lo, hi, fn) => { for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; fn(mid) > target ? lo = mid : hi = mid; } return (lo + hi) / 2; };
  let muK = 1, powerK = 1;
  if (test(1, 1) > target) {
    if (test(1.6, 1) <= target) muK = bisect(1, 1.6, k => test(k, 1));
    else { muK = 1.6; powerK = bisect(1, 1.35, k => test(1.6, k)); }
  } else if (test(1, 1) < target) {
    if (test(.6, 1) >= target) muK = bisect(.6, 1, k => test(k, 1));
    else { muK = .6; powerK = bisect(.45, 1, k => test(.6, k)); }
  }
  const out = {muK, powerK};
  calibCache.set(cacheKey, out);
  return {...out};
}

export function makeSpec(car) { return {...buildSpec(car), ...calibrate(car)}; }

/** Жалғыз көлік үшін толық жүгіру (тест және болжам үшін) */
export function runSolo(car, distance = QUARTER_MILE) {
  const spec = makeSpec(car), s = newState(spec), dt = .002;
  let t100 = null, tTrap0 = null, prevX = 0, prevT = 0;
  while (s.x < distance && s.t < 90) {
    prevX = s.x; prevT = s.t;
    step(spec, s, dt);
    if (t100 === null && s.v >= KMH100) t100 = s.t;
    if (tTrap0 === null && s.x >= distance - 20) tTrap0 = prevT + dt * ((distance - 20 - prevX) / (s.x - prevX));
  }
  const et = prevT + dt * ((distance - prevX) / (s.x - prevX));
  return {et, trap: 20 / (et - tTrap0) * 3.6, t100, vEnd: s.v * 3.6};
}
