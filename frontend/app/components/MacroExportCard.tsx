'use client';

import { Button } from '@/components/ui/button';
import { DownloadIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from './ui/badge';

interface MarketplaceVariant {
  title: string;
  was_truncated: boolean;
  validation: {
    is_valid: boolean;
    current_length: number;
    max_length: number;
    over_limit_by: number;
    has_management_number: boolean;
    marketplace: string;
  };
  character_limit: number;
}

interface MacroExportCardProps {
  macroData: any;
  marketplaceVariants?: Record<string, MarketplaceVariant>;
  titleValidation?: {
    is_valid: boolean;
    current_length: number;
    max_length: number;
    over_limit_by: number;
    has_management_number: boolean;
    marketplace: string;
    validation_issues?: string[];
    character_analysis?: {
      has_prohibited_chars: boolean;
      has_consecutive_spaces: boolean;
      special_char_count: number;
    };
  };
  dataQuality?: {
    quality_score: number;
    max_score: number;
    grade: string;
    grade_description: string;
    completion_rate: string;
    issues: string[];
    recommendations: string[];
    field_completeness: Record<string, boolean>;
  };
}

export default function MacroExportCard({ 
  macroData, 
  marketplaceVariants = {}, 
  titleValidation,
  dataQuality 
}: MacroExportCardProps) {
  // If macroData is empty, provide default structure with the results data
  const exportData = macroData || {
    status: "未検出",
  };
  
  // Get Athena-specific data format
  const getAthenaFormat = () => {
    const athenaData: Record<string, any> = {
      管理番号: extractManagementNumber(exportData.title || ''),
      商品タイトル: exportData.title || '',
      ブランド: exportData.brand || '不明',
      商品種別: exportData.product_type || '不明',
      色: exportData.color || '不明',
      サイズ: exportData.size || '不明',
      素材: exportData.material || '不明',
      特徴: Array.isArray(exportData.key_features) ? exportData.key_features.join(', ') : '',
      生成日時: new Date().toLocaleString('ja-JP'),
      文字数: exportData.title ? exportData.title.length : 0,
      データステータス: exportData.status || '処理完了',
      検証結果: titleValidation?.is_valid ? 'OK' : 'NG'
    };
    
    // Add validation details
    if (titleValidation) {
      athenaData['管理番号有無'] = titleValidation.has_management_number ? 'あり' : 'なし';
      athenaData['文字数制限'] = `${titleValidation.current_length}/${titleValidation.max_length}`;
      athenaData['検証エラー'] = titleValidation.validation_issues ? 
        titleValidation.validation_issues.join('; ') : 'なし';
    }
    
    // Add marketplace variants if available
    if (Object.keys(marketplaceVariants).length > 0) {
      Object.entries(marketplaceVariants).forEach(([marketplace, variant]) => {
        const displayName = getMarketplaceName(marketplace);
        athenaData[`${displayName}_タイトル`] = variant.title;
        athenaData[`${displayName}_文字数`] = variant.title.length;
        athenaData[`${displayName}_制限内`] = variant.validation.is_valid ? 'OK' : 'NG';
        athenaData[`${displayName}_短縮`] = variant.was_truncated ? 'あり' : 'なし';
      });
    }
    
    return athenaData;
  };
  
  // Extract management number from title
  const extractManagementNumber = (title: string): string => {
    const match = title.match(/(\d{13})/);
    return match ? match[1] : '';
  };
  
  // Format data as JSON for export
  const getJsonData = () => {
    const athenaFormat = getAthenaFormat();
    return JSON.stringify(athenaFormat, null, 2);
  };
  
  // Convert data to CSV format optimized for Athena system
  const getCsvData = () => {
    const athenaFormat = getAthenaFormat();
    
    if (!athenaFormat || Object.keys(athenaFormat).length === 0) {
      return '管理番号,商品タイトル,ブランド,商品種別,色,サイズ,素材,文字数\n,,未検出,,,,,0';
    }
    
    // Build CSV with Athena-specific headers
    const headers = Object.keys(athenaFormat).join(',');
    const values = Object.values(athenaFormat).map(value => {
      if (value === null || value === undefined) {
        return '""';
      } else if (typeof value === 'object') {
        try {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } catch (_e) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
      } else {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
    }).join(',');
    
    return `${headers}\n${values}`;
  };

  // Convert data to comprehensive listing CSV format
  const getComprehensiveCsvData = () => {
    // Define comprehensive CSV headers matching the listing format
    const headers = 'カテゴリ,管理番号,タイトル,付属品,ラック,ランク,型番,コメント,仕立て・収納,素材,色,サイズ,トップス,パンツ,スカート,ワンピース,スカートスーツ,パンツスーツ,靴,ブーツ,スニーカー,ベルト,ネクタイ縦横,帽子,バッグ,ネックレス,サングラス,あまり,出品日,出品URL,原価,売値,梱包サイズ,仕入先,仕入日,ID,ブランド,シリーズ名,原産国';
    
    // Create comprehensive listing data
    const managementNumber = extractManagementNumber(exportData.title || '');
    const listingData = {
      'カテゴリ': '',
      '管理番号': managementNumber,
      'タイトル': exportData.title || '',
      '付属品': '',
      'ラック': '',
      'ランク': '',
      '型番': '',
      'コメント': '',
      '仕立て・収納': '',
      '素材': exportData.material || '',
      '色': exportData.color || '',
      'サイズ': exportData.size || '',
      'トップス': '',
      'パンツ': '',
      'スカート': '',
      'ワンピース': '',
      'スカートスーツ': '',
      'パンツスーツ': '',
      '靴': '',
      'ブーツ': '',
      'スニーカー': '',
      'ベルト': '',
      'ネクタイ縦横': '',
      '帽子': '',
      'バッグ': '',
      'ネックレス': '',
      'サングラス': '',
      'あまり': '',
      '出品日': '',
      '出品URL': '',
      '原価': '',
      '売値': '',
      '梱包サイズ': '',
      '仕入先': '',
      '仕入日': '',
      'ID': managementNumber,
      'ブランド': exportData.brand || '',
      'シリーズ名': '',
      '原産国': ''
    };
    
    // Auto-detect category based on product type
    const productType = (exportData.product_type || '').toLowerCase();
    const categoryMapping: Record<string, string> = {
      'tシャツ': 'トップス',
      'シャツ': 'トップス',
      'ブラウス': 'トップス',
      'セーター': 'トップス',
      'ニット': 'トップス',
      'ジャケット': 'トップス',
      'コート': 'トップス',
      'パンツ': 'パンツ',
      'ジーンズ': 'パンツ',
      'チノ': 'パンツ',
      'スラックス': 'パンツ',
      'スカート': 'スカート',
      'ミニスカート': 'スカート',
      'ロングスカート': 'スカート',
      'ワンピース': 'ワンピース',
      'ドレス': 'ワンピース',
      '靴': '靴',
      'シューズ': '靴',
      'パンプス': '靴',
      'ヒール': '靴',
      'ブーツ': 'ブーツ',
      'スニーカー': 'スニーカー',
      'ベルト': 'ベルト',
      'ネクタイ': 'ネクタイ縦横',
      '帽子': '帽子',
      'キャップ': '帽子',
      'ハット': '帽子',
      'バッグ': 'バッグ',
      'ハンドバッグ': 'バッグ',
      'トートバッグ': 'バッグ',
      'リュック': 'バッグ',
      'ネックレス': 'ネックレス',
      'サングラス': 'サングラス',
      'メガネ': 'サングラス'
    };
    
    // Find matching category
    for (const [keyword, category] of Object.entries(categoryMapping)) {
      if (productType.includes(keyword)) {
        listingData['カテゴリ'] = category;
        if (category in listingData) {
          (listingData as any)[category] = '1';
        }
        break;
      }
    }
    
    // Format the row according to the header order
    const values = [
      listingData['カテゴリ'],
      listingData['管理番号'],
      listingData['タイトル'],
      listingData['付属品'],
      listingData['ラック'],
      listingData['ランク'],
      listingData['型番'],
      listingData['コメント'],
      listingData['仕立て・収納'],
      listingData['素材'],
      listingData['色'],
      listingData['サイズ'],
      listingData['トップス'],
      listingData['パンツ'],
      listingData['スカート'],
      listingData['ワンピース'],
      listingData['スカートスーツ'],
      listingData['パンツスーツ'],
      listingData['靴'],
      listingData['ブーツ'],
      listingData['スニーカー'],
      listingData['ベルト'],
      listingData['ネクタイ縦横'],
      listingData['帽子'],
      listingData['バッグ'],
      listingData['ネックレス'],
      listingData['サングラス'],
      listingData['あまり'],
      listingData['出品日'],
      listingData['出品URL'],
      listingData['原価'],
      listingData['売値'],
      listingData['梱包サイズ'],
      listingData['仕入先'],
      listingData['仕入日'],
      listingData['ID'],
      listingData['ブランド'],
      listingData['シリーズ名'],
      listingData['原産国']
    ].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',');
    
    return `${headers}\n${values}`;
  };
  
  // Download JSON file
  const downloadJson = () => {
    const blob = new Blob([getJsonData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `athena_product_${extractManagementNumber(exportData.title || '')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Download CSV file
  const downloadCsv = () => {
    const csvData = getCsvData();
    // Add UTF-8 BOM to ensure proper Japanese character display
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvData;
    
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `athena_product_${extractManagementNumber(exportData.title || '')}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download comprehensive listing CSV file
  const downloadComprehensiveCsv = () => {
    const csvData = getComprehensiveCsvData();
    // Add UTF-8 BOM to ensure proper Japanese character display
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvData;

    const blob = new Blob([csvWithBOM], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `athena_comprehensive_listing_${extractManagementNumber(exportData.title || '')}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Get marketplace display name
  const getMarketplaceName = (key: string): string => {
    const names: Record<string, string> = {
      'yahoo': 'Yahoo Shopping',
      'rakuten': '楽天市場',
      'amazon': 'Amazon',
      'mercari': 'メルカリ',
      'athena_default': 'アテナ標準'
    };
    return names[key] || key;
  };
  
  return (
    <div className="space-y-6">
      {/* Title Validation Alert */}
      {titleValidation && (
        <div className="space-y-2">
          <Alert variant={titleValidation.is_valid ? "default" : "destructive"}>
            <div className="flex items-center space-x-2">
              {titleValidation.is_valid ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <AlertTriangleIcon className="h-4 w-4" />
              )}
              <AlertDescription>
                {titleValidation.is_valid ? (
                  `タイトル検証OK: ${titleValidation.current_length}/${titleValidation.max_length}文字`
                ) : (
                  `タイトル検証エラー: ${titleValidation.current_length}/${titleValidation.max_length}文字 ${titleValidation.over_limit_by > 0 ? `(${titleValidation.over_limit_by}文字超過)` : ''}`
                )}
              </AlertDescription>
            </div>
          </Alert>
          
          {/* Display validation issues if any */}
          {titleValidation.validation_issues && titleValidation.validation_issues.length > 0 && (
            <div className="space-y-1">
              {titleValidation.validation_issues.map((issue: string, index: number) => (
                <Alert key={index} variant="destructive" className="py-2">
                  <AlertTriangleIcon className="h-3 w-3" />
                  <AlertDescription className="text-xs">{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          {/* Character analysis summary */}
          {titleValidation.character_analysis && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center space-x-4">
                <span>管理番号: {titleValidation.has_management_number ? '✓' : '✗'}</span>
                <span>禁止文字: {titleValidation.character_analysis.has_prohibited_chars ? '✗' : '✓'}</span>
                <span>連続スペース: {titleValidation.character_analysis.has_consecutive_spaces ? '✗' : '✓'}</span>
                <span>特殊文字数: {titleValidation.character_analysis.special_char_count}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Marketplace Variants */}
      {Object.keys(marketplaceVariants).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">マーケットプレイス別タイトル</h4>
          <div className="space-y-2">
            {Object.entries(marketplaceVariants).map(([marketplace, variant]) => (
              <div key={marketplace} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{getMarketplaceName(marketplace)}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={variant.validation.is_valid ? "default" : "destructive"}>
                      {variant.validation.current_length}/{variant.character_limit}文字
                    </Badge>
                    {variant.was_truncated && (
                      <Badge variant="outline">短縮済み</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground break-words">
                  {variant.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Data Quality Assessment */}
      {dataQuality && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">データ品質評価 (SC規格)</h4>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold">{dataQuality.grade}</span>
                <span className="text-sm text-muted-foreground">({dataQuality.grade_description})</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">{dataQuality.quality_score}/{dataQuality.max_score}</span>
                <span className="text-muted-foreground ml-1">
                  ({((dataQuality.quality_score / dataQuality.max_score) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full ${
                  dataQuality.quality_score >= 90 ? 'bg-green-500' :
                  dataQuality.quality_score >= 75 ? 'bg-blue-500' :
                  dataQuality.quality_score >= 60 ? 'bg-yellow-500' :
                  dataQuality.quality_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${(dataQuality.quality_score / dataQuality.max_score) * 100}%` }}
              ></div>
            </div>
            
            {/* Field completeness */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              {Object.entries(dataQuality.field_completeness).map(([field, complete]) => (
                <div key={field} className="flex items-center space-x-1">
                  <span className={complete ? 'text-green-600' : 'text-red-600'}>
                    {complete ? '✓' : '✗'}
                  </span>
                  <span className="capitalize">
                    {field === 'management_number' ? '管理番号' :
                     field === 'brand' ? 'ブランド' :
                     field === 'product_type' ? '商品種別' :
                     field === 'color' ? '色' :
                     field === 'size' ? 'サイズ' :
                     field === 'material' ? '素材' :
                     field === 'title' ? 'タイトル' : field}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Issues and recommendations */}
            {dataQuality.issues.length > 0 && (
              <div className="space-y-2">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-orange-600">
                    課題 ({dataQuality.issues.length}件)
                  </summary>
                  <ul className="mt-1 ml-4 space-y-1 text-muted-foreground">
                    {dataQuality.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </details>
                
                {dataQuality.recommendations.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-blue-600">
                      改善提案 ({dataQuality.recommendations.length}件)
                    </summary>
                    <ul className="mt-1 ml-4 space-y-1 text-muted-foreground">
                      {dataQuality.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Export Status */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          {typeof exportData.status === 'string' ? exportData.status : "データ準備完了"}
        </p>
      </div>
      
      {/* Export Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            const text = getJsonData();
            navigator.clipboard.writeText(text);
          }}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          マクロテキストをコピー
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={downloadCsv}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          アテナCSVダウンロード
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={downloadComprehensiveCsv}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          アテナ総合出品CSVダウンロード
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={downloadJson}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          アテナJSONダウンロード
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        ※ このデータを使用して自社システム「アテナ」に出品することができます。<br/>
        ※ 各マーケットプレイスの文字数制限に適応したタイトルが自動生成されます。
      </p>
    </div>
  );
} 