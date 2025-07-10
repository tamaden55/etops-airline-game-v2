/**
 * Waypoint generation debugging
 */

const fs = require('fs');
const ETOPSCalculator = require('./etops-calculator.js');

const calculator = new ETOPSCalculator();

// Load data
const aircraftData = JSON.parse(fs.readFileSync('./data/aircraft.json', 'utf8'));
const airportsData = JSON.parse(fs.readFileSync('./data/airports.json', 'utf8'));

calculator.setAircraftData(aircraftData);
calculator.setAirportData(airportsData);

const NRT = airportsData.NRT;
const LAX = airportsData.LAX;

console.log('=== 実際の座標 ===');
console.log('NRT:', NRT.lat, NRT.lng);
console.log('LAX:', LAX.lat, LAX.lng);
console.log('');

console.log('=== 距離確認 ===');
const distance = calculator.calculateDistance(NRT, LAX);
console.log('Calculated distance:', distance.toFixed(2), 'nm');
console.log('Expected distance: 4,736.9 nm (from search)');
console.log('');

console.log('=== ウェイポイント生成のテスト ===');
const waypoints = calculator.generateWaypoints(NRT, LAX);
console.log('Number of waypoints:', waypoints.length);
console.log('');

console.log('=== 各ウェイポイントの座標 ===');
waypoints.forEach((wp, i) => {
    console.log(`WP${i}: lat=${wp.lat.toFixed(4)}, lng=${wp.lng.toFixed(4)}`);
});
console.log('');

console.log('=== 期待される北太平洋ルート ===');
console.log('NRT -> アリューシャン列島方向 -> アラスカ上空 -> カナダ西部 -> LAX');
console.log('緯度は北上して、経度は徐々に東に向かうはず');

// 手動で中間点を1つ計算してテスト
console.log('');
console.log('=== 中間点テスト ===');
const midpoint = calculator.interpolatePosition(NRT, LAX, 0.5);
console.log('中間点 (50%):', midpoint.lat.toFixed(4), midpoint.lng.toFixed(4));
console.log('期待値: 北太平洋上（緯度50-60度、経度170度E〜150度W付近）');