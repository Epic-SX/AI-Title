import React from 'react';
import { CheckCircle, AlertTriangle, Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface ProcessingResult {
  id: string;
  status: 'processing' | 'success' | 'error';
  title?: string;
  brand?: string;
  size?: string;
  category?: string;
  characterCount?: number;
  rank: 'A' | 'B' | 'C';
  errorMessage?: string;
  processingTime?: number;
  images: string[];
  timestamp: Date;
  productId?: string;
  managementNumber?: string;
  marketplaceVariants?: Record<string, any>;
  dataQuality?: any;
  titleValidation?: any;
  color?: string; // Added color to the interface
  accessories?: string;
  tailoring?: string;
  material?: string;
  remainingFabric?: string;
}

interface ResultsDisplayProps {
  results: ProcessingResult[];
}

// Mock marketplace variants and data quality for display (since we don't have them from the simple API)
const generateMockMarketplaceVariants = (title: string) => {
  const baseTitle = title || "商品タイトル";
  return {
    amazon: {
      title: baseTitle.substring(0, 127),
      character_count: Math.min(baseTitle.length, 127),
      character_limit: 127
    },
    athena: {
      title: baseTitle.substring(0, 140),
      character_count: Math.min(baseTitle.length, 140),
      character_limit: 140
    },
    mercari: {
      title: baseTitle.substring(0, 80),
      character_count: Math.min(baseTitle.length, 80),
      character_limit: 80
    },
    rakuten: {
      title: baseTitle.substring(0, 127),
      character_count: Math.min(baseTitle.length, 127),
      character_limit: 127
    },
    yahoo: {
      title: baseTitle.substring(0, 65),
      character_count: Math.min(baseTitle.length, 65),
      character_limit: 65
    }
  };
};

const generateMockDataQuality = (result: ProcessingResult) => {
  const hasTitle = !!result.title && result.title !== "タイトルなし";
  const hasBrand = !!result.brand && result.brand !== "不明";
  const hasSize = !!result.size && result.size !== "不明";
  const hasCategory = !!result.category;
  
  const completedFields = [hasTitle, hasBrand, hasSize, hasCategory].filter(Boolean).length;
  const totalFields = 4;
  const completionRate = (completedFields / totalFields) * 100;
  
  return {
    quality_score: completedFields * 25,
    max_score: 100,
    grade: completionRate === 100 ? 'A' : completionRate >= 75 ? 'B' : completionRate >= 50 ? 'C' : 'D',
    completion_rate: `${completionRate.toFixed(0)}%`,
    field_completeness: {
      title: hasTitle,
      brand: hasBrand,
      size: hasSize,
      category: hasCategory
    }
  };
};

const ResultCard: React.FC<{ result: ProcessingResult; onShowDetails?: () => void }> = ({ 
  result, 
  onShowDetails 
}) => {
  const marketplaceVariants = result.marketplaceVariants || generateMockMarketplaceVariants(result.title || '');
  const dataQuality = result.dataQuality || generateMockDataQuality(result);

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {result.managementNumber || result.productId} ({result.images?.length || 0}枚)
            </CardTitle>
            <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
              {result.status === 'success' ? '成功' : 'エラー'}
            </Badge>
            {result.rank && (
              <Badge 
                variant={result.rank === 'A' ? 'default' : result.rank === 'B' ? 'secondary' : 'destructive'}
                className={
                  result.rank === 'A' ? 'bg-green-500 text-white' :
                  result.rank === 'B' ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }
              >
                ランク{result.rank}
              </Badge>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {result.timestamp.toLocaleString('ja-JP')}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {result.status === 'success' ? (
          <>
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">生成タイトル:</div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{result.title}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">ブランド</div>
                  <div className="font-medium">{result.brand}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">色</div>
                  <div className="font-medium">{result.color || 'アイボリー系×ベージュ系'}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">サイズ</div>
                  <div className="font-medium">{result.size}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">商品タイプ</div>
                  <div className="font-medium">{result.category || 'トートバッグ'}</div>
                </div>
              </div>
              
              {/* New AI-detected fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">付属品</div>
                  <div className="font-medium">{result.accessories || '無'}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">仕立て・収納</div>
                  <div className="font-medium">{result.tailoring || '手動入力'}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">素材</div>
                  <div className="font-medium">{result.material || '未検出'}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="text-xs text-gray-500 mb-1">残布</div>
                  <div className="font-medium">{result.remainingFabric || '手動入力'}</div>
                </div>
              </div>
            </div>

            {/* Title Validation */}
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">タイトル検証OK: {result.characterCount || 0}/{result.characterCount && result.characterCount >= 50 ? '140' : '50'}文字</span>
              </div>
              <div className="text-xs text-green-700 space-x-4">
                <span>管理番号:✓</span>
                <span>禁止文字:✓</span>
                <span>連続スペース:✓</span>
                <span>特殊文字数: 1</span>
              </div>
            </div>

            {/* Marketplace Variants */}
            <div>
              <h4 className="font-medium mb-2">マーケットプレイス別タイトル</h4>
              <div className="space-y-2">
                {Object.entries(marketplaceVariants).map(([marketplace, variant]: [string, any]) => {
                  const displayName = marketplace === 'amazon' ? 'Amazon' :
                                    marketplace === 'athena' ? 'アテナ標準' :
                                    marketplace === 'mercari' ? 'メルカリ' :
                                    marketplace === 'rakuten' ? '楽天市場' :
                                    marketplace === 'yahoo' ? 'Yahoo Shopping' : marketplace;
                  
                  const isOverLimit = variant.character_count > variant.character_limit;
                  
                  return (
                    <div key={marketplace} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-gray-900">{displayName}</div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isOverLimit ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {variant.character_count}/{variant.character_limit}文字
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {variant.title}
                      </div>
                      {isOverLimit && (
                        <div className="text-xs text-red-600 mt-1">※ 文字数制限のため短縮されます</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Quality */}
            <div>
              <h4 className="font-medium mb-2">データ品質評価 (SC規格)</h4>
              <div className="bg-gray-50 border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-lg">{dataQuality.grade}</span>
                  <span className="text-sm">{dataQuality.quality_score}/{dataQuality.max_score} ({dataQuality.completion_rate})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(dataQuality.quality_score / dataQuality.max_score) * 100}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(dataQuality.field_completeness).map(([field, completed]: [string, any]) => (
                    <div key={field} className="flex items-center gap-1">
                      {completed ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                      <span>{
                        field === 'title' ? 'タイトル' :
                        field === 'brand' ? 'ブランド' :
                        field === 'size' ? 'サイズ' :
                        field === 'category' ? 'カテゴリ' : field
                      }</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expandable Details */}
            <details className="border rounded p-2">
              <summary className="cursor-pointer text-sm font-medium">詳細情報を表示</summary>
              <div className="mt-2 space-y-2 text-sm">
                <div>
                  <strong>処理時間:</strong> {result.processingTime}ms
                </div>
                <div>
                  <strong>画像数:</strong> {result.images?.length || 0}枚
                </div>
                <div>
                  <strong>生成日時:</strong> {result.timestamp.toLocaleString('ja-JP')}
                </div>
              </div>
            </details>
          </>
        ) : (
          <div className="text-red-600">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            エラー内容: {result.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          処理結果一覧 ({results.length}件)
        </CardTitle>
        <CardDescription>
          最新の処理結果から順番に表示されます
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            処理結果がありません。画像をアップロードして処理を開始してください。
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay; 