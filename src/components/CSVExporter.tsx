import React from 'react';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface CSVExporterProps {
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
}

const CSVExporter: React.FC<CSVExporterProps> = ({ 
  stats, 
  onExportRank, 
  onExportErrorLog,
  onExportAllProducts 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          CSVエクスポート
        </CardTitle>
        <CardDescription>
          処理結果をCSVファイルとしてエクスポート
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Comprehensive Export */}
        <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">一括エクスポート</h4>
          <Button 
            onClick={onExportAllProducts}
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={stats.success === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            全商品一括CSVエクスポート（出品フォーマット）
          </Button>
          <p className="text-xs text-blue-700 mt-2">
            成功した{stats.success}商品を39列の出品フォーマットで一括エクスポート
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

export default CSVExporter; 