export const CARS = [
  ['Toyota','Supra GR',382,500,4.1,1540,'Спорткар'],['Toyota','Camry',301,480,5.8,1625,'Седан'],['Toyota','Land Cruiser 300',409,1100,6.7,2585,'SUV'],['Toyota','GR86',228,250,6.3,1275,'Купе'],
  ['BMW','M4 Competition',503,650,3.9,1725,'Купе'],['BMW','M5 CS',627,750,3.0,1825,'Седан'],['BMW','X5 M',617,750,3.8,2385,'SUV'],['BMW','i7 M70',650,1100,3.7,2770,'Электр'],
  ['Mercedes-Benz','AMG GT 63',577,800,3.2,1970,'Купе'],['Mercedes-Benz','C 63 S E Performance',671,1020,3.4,2111,'Седан'],['Mercedes-Benz','G 63 AMG',577,850,4.5,2640,'SUV'],['Mercedes-Benz','EQS 53 AMG',649,950,3.8,2655,'Электр'],
  ['Audi','RS 6 Avant',621,850,3.4,2075,'Универсал'],['Audi','RS 7 Performance',621,850,3.4,2065,'Лифтбек'],['Audi','R8 V10 Performance',602,560,3.1,1595,'Суперкар'],['Audi','e-tron GT RS',637,830,3.3,2347,'Электр'],
  ['Porsche','911 Turbo S',640,800,2.7,1640,'Спорткар'],['Porsche','Taycan Turbo S',750,1050,2.8,2295,'Электр'],['Porsche','Cayenne Turbo GT',650,850,3.3,2220,'SUV'],['Porsche','718 Cayman GT4 RS',493,450,3.4,1415,'Купе'],
  ['Nissan','GT-R Nismo',600,652,2.9,1725,'Спорткар'],['Nissan','Z Nismo',420,520,4.3,1680,'Купе'],['Nissan','Patrol Nismo',428,560,6.2,2790,'SUV'],['Nissan','Ariya e-4ORCE',389,600,5.1,2320,'Электр'],
  ['Tesla','Model S Plaid',1020,1420,2.1,2162,'Электр'],['Tesla','Model 3 Performance',510,660,3.1,1851,'Электр'],['Tesla','Model X Plaid',1020,1420,2.6,2455,'Электр'],['Tesla','Cybertruck Beast',845,13960,2.7,3107,'Пикап'],
  ['Ford','Mustang Dark Horse',500,567,4.2,1770,'Купе'],['Ford','F-150 Raptor R',720,868,3.6,2700,'Пикап'],['Ford','Bronco Raptor',418,598,5.6,2600,'SUV'],['Ford','Mustang Mach-E GT',480,860,3.7,2260,'Электр'],
  ['Chevrolet','Corvette Z06',670,624,2.6,1561,'Суперкар'],['Chevrolet','Camaro ZL1',650,881,3.5,1761,'Купе'],['Chevrolet','Tahoe RST',420,624,5.8,2550,'SUV'],['Chevrolet','Silverado EV RST',754,1063,4.5,3856,'Пикап'],
  ['Lamborghini','Revuelto',1001,1062,2.5,1772,'Суперкар'],['Lamborghini','Huracan STO',631,565,3.0,1339,'Суперкар'],['Lamborghini','Urus Performante',657,850,3.3,2150,'SUV'],['Lamborghini','Temerario',907,730,2.7,1690,'Суперкар'],
  ['Ferrari','SF90 Stradale',986,800,2.5,1600,'Суперкар'],['Ferrari','296 GTB',819,740,2.9,1470,'Суперкар'],['Ferrari','Purosangue',715,716,3.3,2033,'SUV'],['Ferrari','Roma',612,760,3.4,1570,'Купе'],
  ['McLaren','750S',740,800,2.8,1389,'Суперкар'],['McLaren','Artura',671,720,3.0,1498,'Суперкар'],['McLaren','GT',612,630,3.2,1530,'Купе'],['McLaren','Senna',789,800,2.8,1374,'Гиперкар'],
  ['Hyundai','Elantra N',276,392,5.3,1515,'Седан'],['Hyundai','Ioniq 5 N',641,770,3.4,2230,'Электр'],['Hyundai','Santa Fe',277,422,7.8,1995,'SUV'],['Hyundai','Palisade',291,355,7.3,1990,'SUV'],
  ['Kia','EV6 GT',576,740,3.5,2185,'Электр'],['Kia','Stinger GT',368,510,4.7,1855,'Лифтбек'],['Kia','Telluride',291,355,7.0,2065,'SUV'],['Kia','K5 GT',290,422,5.8,1615,'Седан'],
  ['Lexus','LFA',552,480,3.7,1480,'Суперкар'],['Lexus','LC 500',471,540,4.4,1931,'Купе'],['Lexus','LX 600',409,650,6.9,2670,'SUV'],['Lexus','RZ 450e',308,435,5.0,2135,'Электр'],
  ['Honda','Civic Type R',315,420,5.4,1430,'Хэтчбек'],['Honda','NSX Type S',600,667,2.9,1750,'Суперкар'],['Honda','Accord Hybrid',204,335,6.7,1585,'Седан'],['Honda','CR-V Hybrid',204,335,7.6,1740,'SUV'],
  ['Subaru','WRX STI',310,393,5.0,1540,'Седан'],['Subaru','BRZ tS',228,250,6.1,1290,'Купе'],['Subaru','Outback XT',260,375,6.1,1765,'Универсал'],['Subaru','Solterra',215,337,6.5,2040,'Электр'],
  ['Mazda','MX-5 Miata',181,205,5.7,1065,'Родстер'],['Mazda','Mazda3 Turbo',250,434,5.6,1535,'Хэтчбек'],['Mazda','CX-90 Turbo S',340,500,6.3,2220,'SUV'],['Mazda','RX-7 Spirit R',276,314,5.1,1270,'Купе']
].map((c, id) => ({id, make:c[0], model:c[1], hp:c[2], torque:c[3], zero:c[4], weight:c[5], type:c[6]}));

export const MAKES = [...new Set(CARS.map(c => c.make))];
export const fullName = car => `${car.make} ${car.model}`;
export function estimateQuarterMile(car) {
  const ratio = car.weight / car.hp;
  return +(8.15 + Math.sqrt(ratio) * 2.45).toFixed(2);
}
export function findCar(id) { return CARS.find(c => c.id === Number(id)); }
