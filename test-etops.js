/**
 * ETOPS Calculator Test Script
 * バックエンドロジックのテスト用スクリプト
 */

// データファイルの読み込み（Node.js環境）
const fs = require('fs');
const path = require('path');
const ETOPSCalculator = require('./etops-calculator.js');

// データファイルを読み込み
const aircraftData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/aircraft.json'), 'utf8'));
const airportData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/airports.json'), 'utf8'));

// ETOPSCalculatorを初期化
const calculator = new ETOPSCalculator();
calculator.setAircraftData(aircraftData);
calculator.setAirportData(airportData);

// テスト1: 距離計算
console.log('=== テスト1: 距離計算 ===');
const nrt = { lat: 35.7647, lng: 140.3864 }; // 成田
const lax = { lat: 33.9425, lng: -118.4081 }; // ロサンゼルス

const distance = calculator.calculateDistance(nrt, lax);
console.log(`NRT-LAX 距離: ${distance.toFixed(2)} 海里`);
console.log(`参考: 実際の距離は約5,480海里`);
console.log('');

// テスト2: 代替空港検索
console.log('=== テスト2: 代替空港検索 ===');
const midPacific = { lat: 40.0, lng: -150.0 }; // 太平洋中部
const alternates = calculator.findAlternateAirports(midPacific, 1000);
console.log(`太平洋中部 (40N, 150W) から1000海里以内の代替空港:`);
alternates.forEach(airport => {
    console.log(`  ${airport.code}: ${airport.name} - ${airport.distance.toFixed(2)}海里`);
});
console.log('');

// テスト3: ルート計算
console.log('=== テスト3: ルート計算 ===');
const route = calculator.calculateOptimalRoute(nrt, lax, 'B777-200ER');
console.log(`機材: ${route.aircraftType}`);
console.log(`総距離: ${route.totalDistance.toFixed(2)} 海里`);
console.log(`予想飛行時間: ${route.estimatedFlightTime.toFixed(2)} 時間`);
console.log(`燃料消費量: ${route.fuelConsumption.toFixed(2)} kg`);
console.log(`ウェイポイント数: ${route.waypoints.length}`);
console.log('');

// テスト4: ETOPS適合性チェック
console.log('=== テスト4: ETOPS適合性チェック ===');
const etopsCheck = calculator.checkETOPSCompliance('B777-200ER', route);
console.log(`機材: ${etopsCheck.aircraftType}`);
console.log(`ETOPS認証: ${etopsCheck.etopsTimeMinutes}分`);
console.log(`ETOPS距離: ${etopsCheck.etopsDistanceNM.toFixed(2)} 海里`);
console.log(`適合性: ${etopsCheck.compliant ? '適合' : '不適合'}`);
if (!etopsCheck.compliant) {
    console.log('違反事項:');
    etopsCheck.violations.forEach(violation => {
        console.log(`  ${violation.issue}`);
    });
}
console.log('');

// テスト5: 様々な機材での比較
console.log('=== テスト5: 機材比較 ===');
const testAircraft = ['B737-800', 'B777-200ER', 'A350-900'];
testAircraft.forEach(aircraftType => {
    const aircraft = aircraftData[aircraftType];
    const etopsDistance = (aircraft.etops / 60) * aircraft.cruiseSpeed;
    console.log(`${aircraftType}:`);
    console.log(`  ETOPS: ${aircraft.etops}分 (${etopsDistance.toFixed(0)}海里)`);
    console.log(`  航続距離: ${aircraft.range} 海里`);
    console.log(`  巡航速度: ${aircraft.cruiseSpeed} ノット`);
    console.log('');
});

console.log('テスト完了');