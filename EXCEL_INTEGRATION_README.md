# Excel Integration Documentation

## 概要 (Overview)

Electronアプリにバックエンド API統合機能を追加しました。これにより、フロントエンドから直接 `PL出品マクロ.xlsm` ファイルに商品データを追加できるようになりました。

The Electron app now includes backend API integration that allows the frontend to directly add product data to the `PL出品マクロ.xlsm` file.

## 🚀 新機能 (New Features)

### 1. **Backend Server Integration**
- Electronアプリから Flask バックエンドサーバーを自動起動
- サーバーの健康状態チェック
- サーバーの手動開始/停止

### 2. **Excel API Integration**
- 商品データの自動分類 (自動シート選択)
- Excelファイルへのデータ追加
- 一括データ処理
- マッピングプレビュー機能

### 3. **Smart Product Classification**
商品タイトルに基づいて適切なシートを自動選択:

- **トップス**: フリース, ニット, シャツ, ブラウス, etc.
- **パンツ**: パンツ, ズボン, ジーンズ, デニム, etc.
- **スカート**: スカート, ミニスカート, etc.
- **ワンピース**: ワンピース, ドレス, etc.
- その他のカテゴリも対応

## 📁 ファイル構成 (File Structure)

```
├── electron/
│   ├── main.ts                          # ✨ UPDATED - Backend API integration
│   ├── preload.js                       # ✨ UPDATED - API functions exposed
│   └── demo-excel-integration.js        # ✨ NEW - Demo/example script
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   └── excel_data_service.py    # ✨ NEW - Excel data service
│   │   ├── routes/
│   │   │   └── excel_routes.py          # ✨ NEW - Excel API routes
│   │   ├── utils/
│   │   │   └── excel_utils.py           # ✨ NEW - Excel utilities
│   │   └── __init__.py                  # ✅ UPDATED - Added Excel routes
│   └── requirements.txt                 # ✅ UPDATED - Added pandas & openpyxl
├── frontend/
│   └── app/components/
│       └── ExcelIntegration.tsx         # ✨ NEW - React component example
└── EXCEL_INTEGRATION_README.md         # ✨ NEW - This documentation
```

## 🔧 API エンドポイント (API Endpoints)

### Backend API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | サーバー健康状態チェック |
| `POST` | `/excel/add-product` | 単一商品をExcelに追加 |
| `POST` | `/excel/add-products-bulk` | 複数商品を一括追加 |
| `POST` | `/excel/classify-product` | 商品分類プレビュー |
| `GET` | `/excel/sheet-info` | シート情報取得 |
| `POST` | `/excel/test-sample` | サンプルデータでテスト |
| `POST` | `/excel/mapping-preview` | データマッピングプレビュー |

### Electron API Functions

```typescript
// Backend server management
window.electronAPI.startBackendServer()      // サーバー開始
window.electronAPI.stopBackendServer()       // サーバー停止
window.electronAPI.checkBackendHealth()      // 健康状態チェック

// Excel API functions
window.electronAPI.excel.addProduct(data)           // 商品追加
window.electronAPI.excel.addProductsBulk(products)  // 一括追加
window.electronAPI.excel.classifyProduct(data)      // 分類
window.electronAPI.excel.getSheetInfo()             // シート情報
window.electronAPI.excel.testSample()               // サンプルテスト
window.electronAPI.excel.getMappingPreview(data)    // プレビュー
```

## 💻 使用方法 (Usage)

### 1. **JavaScript/TypeScript での使用**

```javascript
// デモクラスの使用例
const demo = new ExcelIntegrationDemo();

// 完全なデモを実行
await demo.runDemo();

// 個別の機能テスト
await demo.startBackend();
await demo.getSheetInfo();

// 商品データの追加
const productData = {
  タイトル: "デニムパンツ メンズ ブルー",
  ブランド: "UNIQLO",
  色: "ブルー",
  サイズ: "M",
  金額: 2500,
  ランク: "2",
  コメント: "ほぼ新品"
};

await demo.addProduct(productData);
```

### 2. **React Component での使用**

```tsx
import React, { useState, useEffect } from 'react';

const ExcelComponent = () => {
  const [backendStatus, setBackendStatus] = useState('stopped');

  // バックエンド開始
  const startBackend = async () => {
    if (window.electronAPI) {
      const success = await window.electronAPI.startBackendServer();
      setBackendStatus(success ? 'running' : 'stopped');
    }
  };

  // 商品追加
  const addProduct = async () => {
    if (window.electronAPI) {
      const productData = {
        タイトル: "サンプル商品",
        ブランド: "テストブランド",
        色: "レッド",
        金額: 1500
      };
      
      const result = await window.electronAPI.excel.addProduct(productData);
      console.log('Result:', result);
    }
  };

  return (
    <div>
      <h2>Excel Integration</h2>
      <p>Backend Status: {backendStatus}</p>
      <button onClick={startBackend}>Start Backend</button>
      <button onClick={addProduct}>Add Product</button>
    </div>
  );
};
```

### 3. **商品データの形式 (Product Data Format)**

```javascript
const productData = {
  // 必須フィールド (Required fields)
  "タイトル": "商品タイトル",                    // Product title
  
  // 推奨フィールド (Recommended fields)
  "カテゴリ": "2084005208",                   // Category code
  "管理番号": "1212260021698",               // Management number
  "ブランド": "ブランド名",                    // Brand name
  "色": "色",                               // Color
  "サイズ": "サイズ",                         // Size
  "金額": 2000,                            // Price
  "ランク": "3",                           // Condition rank
  "コメント": "商品の状態",                    // Comments
  
  // 測定値 (Measurements) - 商品タイプに応じて
  "着丈": 66,      // Length (for tops)
  "肩幅": 58,      // Shoulder width
  "身幅": 58,      // Chest width
  "袖丈": 58,      // Sleeve length
  
  // その他のフィールド (Other fields)
  "素材": "画像参照",
  "付属品": "無",
  "梱包サイズ": "通常",
  "梱包記号": "◇"
};
```

## 🎯 自動分類ルール (Auto-Classification Rules)

システムは商品タイトルのキーワードに基づいて自動的にシートを選択します:

### キーワード例:

- **トップス**: `フリース`, `ニット`, `シャツ`, `ブラウス`, `パーカー`, `カーディガン`
- **パンツ**: `パンツ`, `ズボン`, `ジーンズ`, `デニム`, `レギンス`, `スラックス`
- **スカート**: `スカート`, `ミニスカート`, `ロングスカート`, `プリーツスカート`
- **ワンピース**: `ワンピース`, `ドレス`, `マキシワンピース`
- **靴**: `パンプス`, `ヒール`, `サンダル`, `ローファー`
- **バッグ**: `バッグ`, `ハンドバッグ`, `ショルダーバッグ`, `トートバッグ`

### 例:
```
"◇ PIVOT DOOR ピボットドアー 胸ロゴ、裾袖絞りあり 長袖 フリース"
→ "フリース" キーワードで "トップス" シートに分類

"デニムパンツ メンズ ブルー"
→ "パンツ" キーワードで "パンツ" シートに分類
```

## 🧪 テスト方法 (Testing)

### 1. **サンプルデータでテスト**
```javascript
// Electronアプリ内で
await window.electronAPI.excel.testSample();
```

### 2. **デモスクリプトの実行**
```javascript
// ブラウザのコンソールで
const demo = new ExcelIntegrationDemo();
await demo.runDemo();
```

### 3. **個別機能のテスト**
```javascript
// 分類テスト
const result = await window.electronAPI.excel.classifyProduct({
  タイトル: "テスト商品 ブラウス"
});
console.log('Classification:', result.category); // "トップス"

// マッピングプレビュー
const preview = await window.electronAPI.excel.getMappingPreview({
  タイトル: "テストスカート",
  色: "ブラック",
  サイズ: "M"
});
console.log('Preview:', preview);
```

## 🔧 開発とデバッグ (Development & Debugging)

### 1. **ログの確認**
- Electronメインプロセス: `console.log` 出力
- レンダラープロセス: ブラウザの開発者ツール
- Backendサーバー: ターミナル出力

### 2. **エラー処理**
```javascript
try {
  const result = await window.electronAPI.excel.addProduct(data);
  if (result.success) {
    console.log('Success:', result.message);
  } else {
    console.error('Error:', result.message);
  }
} catch (error) {
  console.error('Exception:', error);
}
```

### 3. **Backend サーバーの手動起動**
```bash
cd backend
python wsgi.py
```

## 📋 メニュー機能 (Menu Features)

Electronアプリのメニューに以下の機能が追加されました:

### ファイルメニュー:
- **Excel出品データ追加** (`Ctrl+E`) - Excel データ追加ダイアログを表示

### ツールメニュー:
- **バックエンドサーバー開始** - サーバーを手動で開始
- **バックエンドサーバー停止** - サーバーを停止
- **バックエンドサーバー状況確認** - 現在の状況を確認

## 🚨 トラブルシューティング (Troubleshooting)

### よくある問題:

1. **Backend サーバーが起動しない**
   - Python環境を確認
   - 依存関係をインストール: `pip install -r requirements.txt`
   - ポート 5000 が使用中でないか確認

2. **Excel ファイルが見つからない**
   - `backend/PL出品マクロ.xlsm` が存在することを確認
   - ファイルのパーミッションを確認

3. **API呼び出しエラー**
   - Backend サーバーが起動していることを確認
   - ネットワーク接続を確認
   - CORS設定を確認

### デバッグ手順:

1. **Backend 健康状態をチェック**
   ```javascript
   const healthy = await window.electronAPI.checkBackendHealth();
   console.log('Backend healthy:', healthy);
   ```

2. **シート情報を確認**
   ```javascript
   const sheets = await window.electronAPI.excel.getSheetInfo();
   console.log('Available sheets:', sheets);
   ```

3. **ログを確認**
   - Electron開発者ツールのコンソール
   - Backendサーバーのターミナル出力

## 🎉 使用開始 (Getting Started)

1. **依存関係をインストール**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Electronアプリを起動**
   ```bash
   npm start  # または electron .
   ```

3. **Backend サーバーを開始**
   - メニュー: ツール → バックエンドサーバー開始
   - または自動起動を待つ (Production モード)

4. **テストを実行**
   ```javascript
   // ブラウザコンソールで
   const demo = new ExcelIntegrationDemo();
   await demo.runDemo();
   ```

5. **商品データを追加**
   - フォームから入力、または
   - APIを直接呼び出し

これで Excel integration 機能を使用開始できます! 🎉 