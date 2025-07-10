/**
 * ETOPS Routing Calculator
 * 双発機のETOPS基準に基づいたルーティング計算システム
 */

class ETOPSCalculator {
    constructor() {
        this.aircraft = {};
        this.airports = {};
        this.waypoints = {};
    }

    /**
     * データを初期化
     */
    async initialize() {
        // データファイルの読み込み（後で実装）
        console.log('ETOPSCalculator initialized');
    }

    /**
     * 距離計算（球面三角法・日付変更線対応）
     * @param {Object} point1 - 地点1 {lat, lng}
     * @param {Object} point2 - 地点2 {lat, lng}
     * @returns {number} 距離（海里）
     */
    calculateDistance(point1, point2) {
        const R = 3440.065; // 地球半径（海里）- 1海里 = 1.852km, 地球半径6371km
        const lat1Rad = this.toRadians(point1.lat);
        const lat2Rad = this.toRadians(point2.lat);
        
        // 日付変更線を考慮した経度差計算
        let deltaLng = point2.lng - point1.lng;
        if (Math.abs(deltaLng) > 180) {
            deltaLng = deltaLng > 0 ? deltaLng - 360 : deltaLng + 360;
        }
        const deltaLngRad = this.toRadians(deltaLng);

        // Haversine公式
        const a = Math.sin(this.toRadians(point2.lat - point1.lat) / 2) * 
                  Math.sin(this.toRadians(point2.lat - point1.lat) / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * 度をラジアンに変換
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * ラジアンを度に変換
     */
    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * ETOPS基準チェック
     * @param {string} aircraftType - 機材タイプ
     * @param {Object} route - ルート情報
     * @returns {Object} ETOPS適合性結果
     */
    checkETOPSCompliance(aircraftType, route) {
        const aircraft = this.aircraft[aircraftType];
        if (!aircraft) {
            throw new Error(`Aircraft type ${aircraftType} not found`);
        }

        const etopsTimeMinutes = aircraft.etops;
        const cruiseSpeed = aircraft.cruiseSpeed; // ノット
        const etopsDistanceNM = (etopsTimeMinutes / 60) * cruiseSpeed;

        const result = {
            aircraftType,
            etopsTimeMinutes,
            etopsDistanceNM,
            compliant: true,
            violations: [],
            alternateAirports: []
        };

        // ルート上の各地点で代替空港までの距離をチェック
        for (let i = 0; i < route.waypoints.length; i++) {
            const waypoint = route.waypoints[i];
            const alternates = this.findAlternateAirports(waypoint, etopsDistanceNM);
            
            if (alternates.length === 0) {
                result.compliant = false;
                result.violations.push({
                    waypoint: waypoint,
                    issue: 'No alternate airports within ETOPS distance'
                });
            }
            
            result.alternateAirports.push({
                waypoint: waypoint,
                alternates: alternates
            });
        }

        return result;
    }

    /**
     * 代替空港検索
     * @param {Object} position - 現在位置 {lat, lng}
     * @param {number} maxDistance - 最大距離（海里）
     * @returns {Array} 代替空港リスト
     */
    findAlternateAirports(position, maxDistance) {
        const alternates = [];
        
        for (const [code, airport] of Object.entries(this.airports)) {
            const distance = this.calculateDistance(position, airport);
            if (distance <= maxDistance) {
                alternates.push({
                    code,
                    name: airport.name,
                    distance,
                    position: { lat: airport.lat, lng: airport.lng }
                });
            }
        }

        // 距離順でソート
        return alternates.sort((a, b) => a.distance - b.distance);
    }

    /**
     * 最適ルート計算
     * @param {Object} departure - 出発空港
     * @param {Object} arrival - 到着空港
     * @param {string} aircraftType - 機材タイプ
     * @returns {Object} 計算されたルート
     */
    calculateOptimalRoute(departure, arrival, aircraftType) {
        const aircraft = this.aircraft[aircraftType];
        if (!aircraft) {
            throw new Error(`Aircraft type ${aircraftType} not found`);
        }

        // 大圏コース上にウェイポイントを生成
        const waypoints = this.generateWaypoints(departure, arrival);
        
        const route = {
            departure,
            arrival,
            aircraftType,
            waypoints,
            totalDistance: this.calculateDistance(departure, arrival),
            estimatedFlightTime: 0,
            fuelConsumption: 0
        };

        // 飛行時間計算
        route.estimatedFlightTime = route.totalDistance / aircraft.cruiseSpeed;
        
        // 燃料消費量計算（簡易版）
        route.fuelConsumption = route.estimatedFlightTime * aircraft.fuelConsumptionPerHour;

        return route;
    }

    /**
     * ウェイポイント生成
     * @param {Object} start - 開始地点
     * @param {Object} end - 終了地点
     * @returns {Array} ウェイポイント配列
     */
    generateWaypoints(start, end) {
        const waypoints = [start];
        
        // 距離に応じてウェイポイントを生成
        const totalDistance = this.calculateDistance(start, end);
        const waypointInterval = 500; // 500海里間隔
        const numWaypoints = Math.floor(totalDistance / waypointInterval);

        for (let i = 1; i < numWaypoints; i++) {
            const fraction = i / numWaypoints;
            const waypoint = this.interpolatePosition(start, end, fraction);
            waypoints.push(waypoint);
        }

        waypoints.push(end);
        return waypoints;
    }

    /**
     * 位置補間（球面線形補間 - 正しい大圏コース）
     * @param {Object} start - 開始地点
     * @param {Object} end - 終了地点
     * @param {number} fraction - 補間係数 (0-1)
     * @returns {Object} 補間された位置
     */
    interpolatePosition(start, end, fraction) {
        if (fraction === 0) return { lat: start.lat, lng: start.lng };
        if (fraction === 1) return { lat: end.lat, lng: end.lng };

        // Convert to radians
        const lat1 = this.toRadians(start.lat);
        const lng1 = this.toRadians(start.lng);
        const lat2 = this.toRadians(end.lat);
        const lng2 = this.toRadians(end.lng);

        // 最短経路の経度差を計算
        let deltaLng = end.lng - start.lng;
        if (Math.abs(deltaLng) > 180) {
            deltaLng = deltaLng > 0 ? deltaLng - 360 : deltaLng + 360;
        }
        const lng2Adjusted = lng1 + this.toRadians(deltaLng);

        // 球面上の角距離を計算
        const d = Math.acos(
            Math.max(-1, Math.min(1, 
                Math.sin(lat1) * Math.sin(lat2) + 
                Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2Adjusted - lng1)
            ))
        );

        // 距離が0に近い場合は線形補間
        if (d < 1e-10) {
            return {
                lat: start.lat + (end.lat - start.lat) * fraction,
                lng: start.lng + deltaLng * fraction
            };
        }

        // 球面線形補間 (SLERP)
        const A = Math.sin((1 - fraction) * d) / Math.sin(d);
        const B = Math.sin(fraction * d) / Math.sin(d);

        // 3D直交座標で計算
        const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2Adjusted);
        const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2Adjusted);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);

        // 球面座標に戻す
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
        let lng = Math.atan2(y, x);

        // 経度を-180〜180度に正規化
        lng = this.toDegrees(lng);
        while (lng > 180) lng -= 360;
        while (lng < -180) lng += 360;

        return {
            lat: this.toDegrees(lat),
            lng: lng
        };
    }

    /**
     * 機材データを設定
     */
    setAircraftData(aircraftData) {
        this.aircraft = aircraftData;
    }

    /**
     * 空港データを設定
     */
    setAirportData(airportData) {
        this.airports = airportData;
    }
}

// Node.js環境とブラウザ環境の両方で動作するように
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETOPSCalculator;
} else {
    window.ETOPSCalculator = ETOPSCalculator;
}