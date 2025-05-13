# AI Title Generator for E-commerce Listings

AIを使用した商品出品タイトル自動生成アプリケーション

このアプリケーションは、商品画像や入力情報からAIを使用して最適な出品タイトルを自動生成し、採寸測定を行い、出品用マクロデータを生成します。

## システム構成

- **バックエンド**: Flask (Python)
- **フロントエンド**: Next.js + MUI (TypeScript)
- **AI API**: Perplexity AI
- **画像処理**: OpenCV, Tesseract OCR

## 主な機能

1. 複数商品画像のアップロード（任意の枚数）
2. 画像からのテキスト抽出（OCR）
3. ブランド名と型番の自動検出
4. 色検出
5. 採寸スケールからの自動採寸
6. AIによるタイトル生成（3種類の方法）
   - 型番検索方式（特定ブランド）
   - ブランド+アイテム+色+サイズ方式
   - テキスト全抽出方式
7. マクロデータ生成（CSV/JSON形式）
8. 自社システム「アテナ」への出品データ準備

## 作業フロー

1. 複数の商品画像を撮影（正面、背面、タグなど）
2. AIによるテキスト抽出と情報検出
3. AIによるタイトル生成（95%の成功率を目標）
4. 人間による最終確認と調整
5. マクロデータの出力
6. 自社システムへのアップロード

## セットアップ方法

### バックエンド

1. Pythonの環境を準備:
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   ```

2. Tesseract OCRをインストール:
   - Windows: https://github.com/UB-Mannheim/tesseract/wiki
   - 日本語言語パックを含めてインストールしてください

3. 環境変数の設定:
   - `.env`ファイルを作成し、以下を設定:
     ```
     FLASK_APP=app.py
     FLASK_ENV=development
     PERPLEXITY_API_KEY=your_perplexity_api_key_here
     ```
   - `your_perplexity_api_key_here`を実際のAPIキーに置き換えてください

4. バックエンドを起動:
   ```
   flask run
   ```

### フロントエンド

1. 依存関係をインストール:
   ```
   cd frontend
   npm install
   ```

2. フロントエンドを起動:
   ```
   npm run dev
   ```

## 使用方法

1. ブラウザで http://localhost:3000 にアクセス
2. 「画像を追加」ボタンをクリックして商品画像を複数追加
3. 採寸スケール有無を設定
4. 追加情報（ブランド名、型番など）を入力
5. 「タイトルを生成」ボタンをクリック
6. 生成されたタイトルとAIが検出した情報を確認
7. 採寸結果を確認
8. CSVまたはJSONフォーマットで出品データをエクスポート
9. マクロに出力データを取り込み、自社システムへ登録

## プロジェクト構造

```
.
├── backend/                  # Flaskバックエンド
│   ├── app.py                # メインアプリケーション
│   ├── requirements.txt      # 依存関係
│   └── .env                  # 環境変数（非公開）
│
└── frontend/                 # Next.jsフロントエンド
    ├── app/                  # Next.jsアプリケーションディレクトリ
    │   ├── page.tsx          # メインページ
    │   └── components/       # UIコンポーネント
    │       ├── ImageUploader.tsx   # 画像アップロードコンポーネント
    │       ├── ResultCard.tsx      # 結果表示コンポーネント
    │       ├── MeasurementsCard.tsx # 採寸結果コンポーネント
    │       └── MacroExportCard.tsx  # マクロデータ出力コンポーネント
    ├── public/               # 静的ファイル
    └── package.json          # 依存関係
```

## 最新の変更点

- **複数画像対応**: 商品画像を任意の枚数アップロード可能に変更
- **画像処理の改良**: 複数画像から最適な情報を抽出するアルゴリズムを実装
- **UIの改善**: 画像の追加・削除機能を強化し、より使いやすく 