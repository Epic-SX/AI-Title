import React, { useState } from 'react';
import { Settings, Save, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';

interface AppSettings {
  backendUrl: string;
  characterLimit: number;
  maxExportCount: number;
  autoSelectCategory: boolean;
}

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000); // Hide message after 3 seconds
  };

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://162.43.19.70',
      characterLimit: 50,
      maxExportCount: 100,
      autoSelectCategory: true
    };
    setFormData(defaultSettings);
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus('idle');
    
    try {
      // Try multiple endpoints to test connection
      let response;
      try {
        // First try the health endpoint
        response = await fetch(`${formData.backendUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      } catch (error) {
        // If health endpoint fails, try the root endpoint
        response = await fetch(`${formData.backendUrl}/`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      }
      
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        console.log('Connection test response:', response.status, response.statusText);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          アプリケーション設定
        </CardTitle>
        <CardDescription>
          AIタイトル生成システムの動作設定を変更できます
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {saved && (
          <Alert>
            <AlertDescription>設定が保存されました</AlertDescription>
          </Alert>
        )}

        {/* Backend URL Setting */}
        <div className="space-y-2">
          <Label htmlFor="backendUrl">バックエンドURL</Label>
          <div className="flex items-center gap-2">
            <Input
              id="backendUrl"
              type="url"
              placeholder="http://162.43.19.70"
              value={formData.backendUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, backendUrl: e.target.value }))}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing || !formData.backendUrl}
              className="flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  テスト中
                </>
              ) : connectionStatus === 'success' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  接続OK
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  接続NG
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  接続テスト
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            AIタイトル生成APIのエンドポイントURLを指定してください
          </p>
          {connectionStatus === 'success' && (
            <p className="text-sm text-green-600">✓ バックエンドサーバーに正常に接続できました</p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-sm text-red-600">✗ バックエンドサーバーに接続できません。URLを確認してください</p>
          )}
        </div>

        {/* Character Limit Setting */}
        <div className="space-y-2">
          <Label htmlFor="characterLimit">文字数規定（ランクA/B判定基準）</Label>
          <Input
            id="characterLimit"
            type="number"
            min="1"
            max="200"
            value={formData.characterLimit}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              characterLimit: parseInt(e.target.value) || 50 
            }))}
          />
          <p className="text-sm text-muted-foreground">
            この文字数以上のタイトルがランクA、未満がランクBになります（デフォルト: 50文字）
          </p>
        </div>

        {/* Max Export Count Setting */}
        <div className="space-y-2">
          <Label htmlFor="maxExportCount">マクロ出力件数上限</Label>
          <Input
            id="maxExportCount"
            type="number"
            min="1"
            max="10000"
            value={formData.maxExportCount}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              maxExportCount: parseInt(e.target.value) || 100 
            }))}
          />
          <p className="text-sm text-muted-foreground">
            CSV出力時の最大件数を指定してください（デフォルト: 100件）
          </p>
        </div>

        {/* Auto Category Selection */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoSelectCategory"
              checked={formData.autoSelectCategory}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                autoSelectCategory: checked 
              }))}
            />
            <Label htmlFor="autoSelectCategory">カテゴリ自動選択</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            有効にすると、タイトル文字からカテゴリを自動で選択します
          </p>
        </div>

        {/* System Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">📱 システム情報</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">実行環境:</span>
              <span className="ml-2">
                {window.electronAPI ? 'デスクトップ版' : 'ブラウザ版'}
              </span>
            </div>
            {window.electronAPI && (
              <div>
                <span className="font-medium text-gray-700">プラットフォーム:</span>
                <span className="ml-2">{window.electronAPI.platform}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">バージョン:</span>
              <span className="ml-2">1.0.0</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            設定を保存
          </Button>
          <Button variant="outline" onClick={handleReset}>
            デフォルトに戻す
          </Button>
        </div>

        {/* Help Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 ヘルプ</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 設定はアプリケーション終了時に自動で保存されます</li>
            <li>• バックエンドURLが正しくない場合、タイトル生成に失敗します</li>
            <li>• 文字数規定は商品の特性に合わせて調整してください</li>
            <li>• デスクトップ版では設定ファイルが永続化されます</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel; 