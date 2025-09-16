import React, { useState } from 'react';
import { Download, FileText, AlertTriangle, FileSpreadsheet, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface ExcelExporterProps {
  stats: {
    total: number;
    success: number;
    errors: number;
    rankA: number;
    rankB: number;
    rankC: number;
  };
  onExportRank: (rank: 'A' | 'B' | 'C') => void;
  onExportErrorLog: () => void;
  onExportAllProducts: () => void;
  onCreateNewExcelFile: (filename: string) => void;
  onCreateExcelWithData: (filename: string) => void;
  backendUrl: string;
}

const ExcelExporter: React.FC<ExcelExporterProps> = ({ 
  stats, 
  onExportRank, 
  onExportErrorLog,
  onExportAllProducts,
  onCreateNewExcelFile,
  onCreateExcelWithData,
  backendUrl
}) => {
  const [newFileName, setNewFileName] = useState('PL出品マクロ_新規作成.xlsx');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingWithData, setIsCreatingWithData] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const handleCreateEmptyFile = async () => {
    setIsCreatingFile(true);
    setCreateMessage(null);
    
    console.log('Creating empty file with filename:', newFileName);
    console.log('Backend URL:', backendUrl);
    
    try {
      await onCreateNewExcelFile(newFileName);
      setCreateMessage(`✅ 空のExcelファイルを作成しました: ${newFileName}`);
    } catch (error) {
      console.error('Error creating file:', error);
      setCreateMessage(`❌ エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsCreatingFile(false);
    }
  };

  const handleCreateFileWithData = async () => {
    setIsCreatingWithData(true);
    setCreateMessage(null);
    
    try {
      await onCreateExcelWithData(newFileName);
      setCreateMessage(`✅ データ付きExcelファイルを作成しました: ${newFileName}`);
    } catch (error) {
      console.error('Error creating file with data:', error);
      setCreateMessage(`❌ エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsCreatingWithData(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Excelファイル作成・エクスポート
        </CardTitle>
        <CardDescription>
          新しいExcelファイルを作成するか、既存ファイルにデータを追加
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Create New Excel File Section */}
        <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新しいExcelファイルを作成
          </h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="filename">ファイル名</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="PL出品マクロ_新規作成.xlsx"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateEmptyFile}
                variant="outline"
                className="flex-1"
                disabled={isCreatingFile || isCreatingWithData}
              >
                {isCreatingFile ? '作成中...' : '空のファイルを作成'}
              </Button>
              
              <Button 
                onClick={handleCreateFileWithData}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isCreatingFile || isCreatingWithData || stats.success === 0}
              >
                {isCreatingWithData ? '作成中...' : 'データ付きで作成'}
              </Button>
            </div>
            
            <p className="text-xs text-green-700">
              • 空のファイル: 元のPL出品マクロ.xlsmと同じ構造の新しいXLSXファイル<br/>
              • データ付き: 現在の処理結果を含む新しいXLSXファイル
            </p>
          </div>
        </div>

        {/* Status Message */}
        {createMessage && (
          <Alert variant={createMessage.includes('✅') ? 'default' : 'destructive'}>
            <AlertDescription>{createMessage}</AlertDescription>
          </Alert>
        )}

        {/* Existing Excel Export Section */}
        <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">既存ファイルに追加</h4>
          <Button 
            onClick={onExportAllProducts}
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={stats.success === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            既存のPL出品マクロ.xlsmにデータを追加
          </Button>
          <p className="text-xs text-blue-700 mt-2">
            成功した{stats.success}商品を既存のPL出品マクロ.xlsmファイルに追加します
          </p>
        </div>

        {/* Rank-based Export */}
        <div>
          <h4 className="font-medium mb-3">ランク別エクスポート</h4>
          <div className="space-y-2">
            <Button 
              onClick={() => onExportRank('A')}
              variant="outline"
              className="w-full justify-between"
              disabled={stats.rankA === 0}
            >
              <span>ランクA（優秀）</span>
              <span className="text-green-600 font-bold">{stats.rankA}件</span>
            </Button>
            
            <Button 
              onClick={() => onExportRank('B')}
              variant="outline"
              className="w-full justify-between"
              disabled={stats.rankB === 0}
            >
              <span>ランクB（良好）</span>
              <span className="text-yellow-600 font-bold">{stats.rankB}件</span>
            </Button>
            
            <Button 
              onClick={() => onExportRank('C')}
              variant="outline"
              className="w-full justify-between"
              disabled={stats.rankC === 0}
            >
              <span>ランクC（要改善）</span>
              <span className="text-red-600 font-bold">{stats.rankC}件</span>
            </Button>
          </div>
        </div>

        {/* Error Log Export */}
        <div>
          <h4 className="font-medium mb-3">エラーログ</h4>
          <Button 
            onClick={onExportErrorLog}
            variant="outline"
            className="w-full"
            disabled={stats.errors === 0}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            エラーログをエクスポート ({stats.errors}件)
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            累積エラーログに追記保存されます
          </p>
        </div>

        {/* Statistics Summary */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">処理統計</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>総処理数:</span>
              <span className="font-bold">{stats.total}件</span>
            </div>
            <div className="flex justify-between">
              <span>成功:</span>
              <span className="font-bold text-green-600">{stats.success}件</span>
            </div>
            <div className="flex justify-between">
              <span>エラー:</span>
              <span className="font-bold text-red-600">{stats.errors}件</span>
            </div>
            <div className="flex justify-between">
              <span>成功率:</span>
              <span className="font-bold">
                {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExcelExporter;
