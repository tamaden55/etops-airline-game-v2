/**
 * Distance calculation debugging
 */

const ETOPSCalculator = require('./etops-calculator.js');

const calculator = new ETOPSCalculator();

// 成田とLAXの正確な座標
const NRT = { lat: 35.7647, lng: 140.3864 }; // 成田
const LAX = { lat: 33.9425, lng: -118.4081 }; // LAX

console.log('=== 座標確認 ===');
console.log('NRT:', NRT);
console.log('LAX:', LAX);
console.log('');

console.log('=== 経度差の計算 ===');
const rawLngDiff = LAX.lng - NRT.lng;
console.log('Raw longitude difference:', rawLngDiff);

// 日付変更線を考慮した経度差
let adjustedLngDiff = rawLngDiff;
if (Math.abs(rawLngDiff) > 180) {
    adjustedLngDiff = rawLngDiff > 0 ? rawLngDiff - 360 : rawLngDiff + 360;
}
console.log('Adjusted longitude difference:', adjustedLngDiff);
console.log('');

console.log('=== 距離計算の詳細 ===');
const distance = calculator.calculateDistance(NRT, LAX);
console.log('Calculated distance:', distance.toFixed(2), 'nm');
console.log('Expected distance: ~5480 nm (great circle)');
console.log('');

// 手動でHaversine計算を確認
function manualHaversine(p1, p2) {
    const R = 3440.065; // Earth radius in nautical miles
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const deltaLat = (p2.lat - p1.lat) * Math.PI / 180;
    
    // 日付変更線を考慮した経度差
    let deltaLng = p2.lng - p1.lng;
    if (Math.abs(deltaLng) > 180) {
        deltaLng = deltaLng > 0 ? deltaLng - 360 : deltaLng + 360;
    }
    deltaLng = deltaLng * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

console.log('=== 手動Haversine計算 ===');
const manualDistance = manualHaversine(NRT, LAX);
console.log('Manual Haversine:', manualDistance.toFixed(2), 'nm');
console.log('');

console.log('=== 実際の航空路線データと比較 ===');
console.log('NRT-LAX actual distance: ~5,480 nm');
console.log('NRT-LAX actual bearing: ~045° (northeast)');
console.log('Route type: Great Circle over North Pacific');
console.log('');

// ウェイポイント生成のテスト
console.log('=== ウェイポイント生成テスト ===');
const route = calculator.calculateOptimalRoute(NRT, LAX, 'B777-200ER');
console.log('Generated waypoints:');
route.waypoints.forEach((wp, i) => {
    console.log(`${i}: lat=${wp.lat.toFixed(4)}, lng=${wp.lng.toFixed(4)}`);
});