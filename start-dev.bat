@echo off
echo "AI タイトル生成システム - 開発環境起動"
echo "==============================================="

echo "1. 依存関係をチェック中..."
if not exist "node_modules" (
    echo "依存関係をインストール中..."
    npm install --legacy-peer-deps
)

echo "2. Electron ビルド中..."
npm run build-electron

echo "3. バックエンドURL確認..."
echo "現在のバックエンドURL: http://162.43.19.70"
echo ".envファイルで変更可能です"

echo "4. React 開発サーバーを起動中..."
start npm start

echo "5. 5秒待機中..."
timeout /t 5 /nobreak >nul

echo "6. Electron アプリケーションを起動中..."
npm run electron-dev

pause 