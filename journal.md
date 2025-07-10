# ETOPS Flight Planner 開発ジャーナル

## 2025-07-10 作業内容

### 完成した機能
1. **バックエンドロジック**
   - ETOPSCalculator クラス (`etops-calculator.js`)
   - 球面三角法による距離計算（Haversine公式）
   - ETOPS計算ロジック、代替空港検索
   - ルーティング計算機能

2. **データベース**
   - 機材データ (`data/aircraft.json`) - 42機種の双発機
   - 空港データ (`data/airports.json`) - 25の主要空港と代替空港

3. **フロントエンド**
   - HTML/CSS - 航空業界風ダークテーマUI
   - Leaflet.js による地図表示
   - 機材選択、空港選択、ルート計算機能

### 未解決の重要問題
**太平洋横断ルート表示の異常**
- 成田→LAX路線で地図上に不自然なルートが表示される
- 大西洋経由の長距離ルートが描画されてしまう
- 距離計算は正しい（4,726nm vs 実際4,737nm）
- ウェイポイント座標も正しい（北太平洋大圏ルート）

### 問題の調査結果
1. **距離計算**: ✅ 正しい
   - NRT-LAX: 計算値4,726nm ≈ 実際値4,737nm
   - 日付変更線を考慮したHaversine公式で正確

2. **ウェイポイント生成**: ✅ 正しい
   - 球面線形補間（SLERP）で正しい大圏コースを計算
   - 日付変更線通過も適切に処理

3. **座標データ**: ✅ 正しい
   - NRT: 35.7647°N, 140.3864°E
   - LAX: 33.9425°N, 118.4081°W

### 試行した解決策
1. 日付変更線対応の座標正規化 → 過度な補正で逆効果
2. Leaflet設定変更（worldCopyJump等） → 効果なし
3. 球面補間の改良 → 計算は正しいが表示問題残存

## 明日への引き継ぎ事項

### 優先課題
**🔥 太平洋横断ルート表示問題の解決**

### 推定原因と対策
1. **Leafletでの日付変更線処理**
   - 現在の座標 [lat, lng] をそのまま渡している
   - Leafletが内部で日付変更線を誤認識している可能性

2. **解決アプローチ案**
   ```javascript
   // Option A: 座標の明示的な正規化
   const normalizedCoords = normalizeForLeaflet(routeCoords);
   
   // Option B: 複数のポリラインに分割
   const segments = splitAtAntimeridian(routeCoords);
   
   // Option C: 代替地図ライブラリの検討
   // Mapbox GL JS等でのテスト
   ```

3. **デバッグ方法**
   - ブラウザコンソールで座標確認
   - 手動で太平洋ルートの座標を設定してテスト
   - 段階的にウェイポイント数を減らして問題箇所特定

### 現在のファイル構成
```
etops-airline-game-v2/
├── index.html              # メインHTMLファイル
├── styles.css              # ダークテーマCSS
├── app.js                  # フロントエンドアプリ
├── etops-calculator.js     # ETOPSエンジン
├── test-etops.js           # テストスクリプト
├── debug-distance.js       # 距離計算デバッグ
├── debug-waypoints.js      # ウェイポイントデバッグ
├── data/
│   ├── aircraft.json       # 機材データ（42機種）
│   └── airports.json       # 空港データ（25空港）
└── specifications.md       # 仕様書
```

### テスト方法
```bash
# ローカルサーバー起動
python3 -m http.server 8000

# バックエンドテスト
node test-etops.js
node debug-waypoints.js

# ブラウザでアクセス
http://localhost:8000
```

### 備考
- 機能的には90%完成
- 主要な問題は地図表示のみ
- ビジネスロジックは全て正常動作
- UIデザインは航空マニア向けに最適化済み

---
**次回作業開始時**: まず debug-waypoints.js で座標確認、その後フロントエンドの表示ロジックを重点的に修正

## 文字化け問題について
**発生原因**: ファイル保存時の文字エンコーディングの問題
**対策**: UTF-8で明示的に保存し直すこと