import React, { useState, useRef, useEffect } from 'react';
import { Folder, Play, AlertTriangle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface BatchProcessorProps {
  onProcess: (files: FileList) => void;
  disabled?: boolean;
}

// Function to extract product ID from filename (same logic as original frontend)
const extractProductIdFromFilename = (filename: string): string => {
  // Try to extract 13-digit management number first (priority)
  const thirteenDigitMatch = filename.match(/(\d{13})/);
  if (thirteenDigitMatch) {
    return thirteenDigitMatch[1];
  }
  
  // Fallback to any digit sequence
  const digitMatch = filename.match(/(\d+)/);
  if (digitMatch) {
    return digitMatch[1];
  }
  
  // Final fallback: use filename without extension
  return filename.replace(/\.[^/.]+$/, '');
};

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onProcess, disabled = false }) => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if Electron API is available
  useEffect(() => {
    const available = !!(window.electronAPI && typeof window.electronAPI.selectDirectory === 'function');
    setIsElectronAvailable(available);
  }, []);

  const handleDirectorySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDirectorySelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }
    
    console.log(`Selected ${files.length} files`);
    
    // Debug: Log details about the first few files
    for (let i = 0; i < Math.min(5, files.length); i++) {
      const file = files[i];
      console.log(`[DEBUG] File ${i}: name="${file.name}", size=${file.size}, type="${file.type}"`);
    }
    
    setSelectedFiles(files);
    setError(null);
    
    // Try to construct the directory path from the files if webkitRelativePath is available
    if (files.length > 0 && files[0].webkitRelativePath) {
      const relativePath = files[0].webkitRelativePath;
      const dirPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
      console.log(`Detected directory path from webkitRelativePath: ${dirPath}`);
      setDirectoryPath(dirPath);
    }

    // Group files by product ID to show preview
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const imageFiles = Array.from(files).filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension && imageExtensions.includes(extension);
    });

    const productGroups: Record<string, File[]> = {};
    imageFiles.forEach(file => {
      const productId = extractProductIdFromFilename(file.name);
      if (!productGroups[productId]) {
        productGroups[productId] = [];
      }
      productGroups[productId].push(file);
    });

    const productIds = Object.keys(productGroups);
    console.log(`[DEBUG] Grouped into ${productIds.length} products:`, productIds);
  };

  const handleProcess = () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError('ディレクトリを選択してください');
      return;
    }

    setError(null);
    onProcess(selectedFiles);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="w-5 h-5" />
          一括処理 (最大5000点)
        </CardTitle>
        <CardDescription>
          画像ディレクトリを指定して、管理番号ごとに自動でタイトルを生成します
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Workflow Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">📋 現場作業流れ</h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-4">
            <li>1. 撮影をする</li>
            <li>2. 保有撮影アプリで画像名を管理番号にリネーム</li>
            <li>3. 生成システムで生成</li>
            <li className="ml-4">A = 成功（文字数規定以上）</li>
            <li className="ml-4">B = 成功（文字数規定以下）</li>
            <li className="ml-4">C = 失敗</li>
            <li>4. ABはカテゴリをタイトル文字から自動選択</li>
            <li>5. タイトル、カテゴリ、採寸、コンディションが揃ったので指定マクロ書式で出力</li>
          </ol>
        </div>

        {/* Directory Selection */}
        <div className="space-y-2">
          <Label htmlFor="directory">画像ディレクトリパス</Label>
          <div className="flex items-center gap-2">
            <Input
              id="directory"
              placeholder="例: /path/to/images"
              value={directoryPath}
              onChange={(e) => setDirectoryPath(e.target.value)}
              className="flex-1"
              readOnly
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDirectorySelect}
              disabled={disabled}
            >
              ディレクトリを選択
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            処理したい商品画像を含むディレクトリを選択または入力してください
            <br />
            <span className="text-xs text-yellow-600">
              ※サーバー上のパスを入力するか、ブラウザからディレクトリを選択できます
            </span>
          </p>
          
          {/* Hidden file input for directory selection */}
          <input
            ref={fileInputRef}
            type="file"
            {...({ webkitdirectory: "" } as any)}
            multiple
            onChange={handleDirectorySelected}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        {/* File Selection Summary */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">✓ ディレクトリ選択完了</h4>
            <div className="text-sm text-green-800">
              <p>選択されたファイル数: {selectedFiles.length}個</p>
              <p>処理対象画像: {
                Array.from(selectedFiles).filter(file => {
                  const extension = file.name.split('.').pop()?.toLowerCase();
                  return extension && ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
                }).length
              }個</p>
            </div>
          </div>
        )}

        {/* Processing Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">処理について</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• 画像ファイル名から13桁の管理番号を自動抽出します</li>
                <li>• 同じ管理番号の画像は1つの商品として処理されます</li>
                <li>• 処理は12時間以内に自動で完了します</li>
                <li>• 失敗した商品のログは自動でCSVに蓄積されます</li>
                <li>• 対応画像形式: JPG, PNG, GIF, BMP, WebP</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ranking System */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">🏆 ランクシステム</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium text-green-700">ランクA</div>
                <div className="text-gray-600">文字数規定達成</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <div className="font-medium text-yellow-700">ランクB</div>
                <div className="text-gray-600">文字数規定未達成</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <div className="font-medium text-red-700">ランクC</div>
                <div className="text-gray-600">生成失敗</div>
              </div>
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleProcess}
            disabled={disabled || !selectedFiles || selectedFiles.length === 0}
            size="lg"
            className="w-full max-w-[300px] flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {disabled ? 'バッチ処理中...' : 'バッチ処理を開始'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchProcessor; 