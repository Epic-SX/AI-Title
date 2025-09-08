'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { useCategoryLookup } from '../hooks/useCategoryLookup';
import LoadingSpinner from './LoadingSpinner';

interface CategoryEnhancedResultCardProps {
  title: string;
  extractedText?: string;
  detectedColor?: string;
  detectedBrand?: string;
  detectedModel?: string; 
  itemType?: string;
  index?: number;
  loading?: boolean;
  isProductVariant?: boolean;
  result?: {
    title: string;
    brand?: string;
    model?: string;
    product_type?: string;
    keywords?: string[];
    product_features?: string[];
    raw_text?: string;
    size?: string;
    accessories?: string;
    tailoring_storage?: string;
    remaining_fabric?: string;
    category?: {
      number?: string;
      main_category?: string;
      sub_category?: string;
      item_type?: string;
      specific_type?: string;
      brand?: string;
      full_description?: string;
    };
  };
}

export default function CategoryEnhancedResultCard({ 
  title, 
  extractedText, 
  detectedColor, 
  detectedBrand, 
  detectedModel, 
  itemType,
  index = 0,
  loading = false,
  isProductVariant = false,
  result
}: CategoryEnhancedResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState(result);
  const { loading: categoryLoading, error: categoryError, enhanceResult, clearError } = useCategoryLookup();

  // Support both direct props and result object
  const displayTitle = enhancedResult?.title || title;
  const displayBrand = enhancedResult?.brand || detectedBrand;
  const displayModel = enhancedResult?.model || detectedModel;
  const displayType = enhancedResult?.product_type || itemType;
  const displaySize = enhancedResult?.size;
  const displayAccessories = enhancedResult?.accessories;
  const displayTailoringStorage = enhancedResult?.tailoring_storage;
  const displayRemainingFabric = enhancedResult?.remaining_fabric;
  const displayCategory = enhancedResult?.category;

  // Auto-enhance result with category when component mounts
  useEffect(() => {
    if (result && !result.category && !categoryLoading) {
      handleEnhanceWithCategory();
    }
  }, [result]);

  const handleEnhanceWithCategory = async () => {
    if (!result) return;
    
    clearError();
    const enhanced = await enhanceResult(result);
    setEnhancedResult(enhanced);
  };

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(displayTitle);
      } else {
        // Fallback method using textarea
        const textarea = document.createElement('textarea');
        textarea.value = displayTitle;
        textarea.style.position = 'fixed';  // Prevent scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy method failed:', err);
        }
        
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (loading) {
    return (
      <Card className="w-full mb-4">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center h-[200px]">
            <LoadingSpinner size="md" text="結果を処理中..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {isProductVariant ? `画像 ${index + 1} の商品` : `タイトル案 ${index + 1}`}
          </CardTitle>
          <div className="flex gap-2">
            {!displayCategory && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnhanceWithCategory}
                disabled={categoryLoading}
              >
                {categoryLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {categoryLoading ? 'カテゴリ検索中...' : 'カテゴリを検索'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={copied}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'コピー済み' : 'コピー'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categoryError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">カテゴリ検索エラー: {categoryError}</p>
              <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
                エラーをクリア
              </Button>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">タイトル:</h3>
            <p className="text-sm border p-3 rounded-md bg-muted/50">{displayTitle}</p>
          </div>

          {(displayBrand || displayModel || displaySize) && (
            <div className="grid grid-cols-2 gap-4">
              {displayBrand && displayBrand !== '不明' && (
                <div>
                  <h3 className="font-medium mb-1">ブランド:</h3>
                  <p className="text-sm">{displayBrand}</p>
                </div>
              )}
              {displayModel && (
                <div>
                  <h3 className="font-medium mb-1">モデル:</h3>
                  <p className="text-sm">{displayModel}</p>
                </div>
              )}
              {displaySize && displaySize !== '不明' && (
                <div>
                  <h3 className="font-medium mb-1">サイズ:</h3>
                  <p className="text-sm">{displaySize}</p>
                </div>
              )}
            </div>
          )}

          {displayType && displayType !== '不明' && (
            <div>
              <h3 className="font-medium mb-1">商品タイプ:</h3>
              <p className="text-sm">{displayType}</p>
            </div>
          )}

          {detectedColor && detectedColor !== '不明' && (
            <div>
              <h3 className="font-medium mb-1">検出カラー:</h3>
              <p className="text-sm">{detectedColor}</p>
            </div>
          )}

          {displayCategory && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2 text-blue-600">カテゴリ情報:</h3>
              <div className="bg-blue-50 p-3 rounded-md space-y-2">
                {displayCategory.number && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">カテゴリ番号:</span>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border">{displayCategory.number}</span>
                  </div>
                )}
                {displayCategory.full_description && (
                  <div>
                    <span className="text-sm font-medium">カテゴリ:</span>
                    <p className="text-sm mt-1 text-gray-700">{displayCategory.full_description}</p>
                  </div>
                )}
                {displayCategory.main_category && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">メイン:</span>
                      <p className="text-gray-600">{displayCategory.main_category}</p>
                    </div>
                    {displayCategory.sub_category && (
                      <div>
                        <span className="font-medium">サブ:</span>
                        <p className="text-gray-600">{displayCategory.sub_category}</p>
                      </div>
                    )}
                  </div>
                )}
                {displayCategory.item_type && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">アイテム:</span>
                      <p className="text-gray-600">{displayCategory.item_type}</p>
                    </div>
                    {displayCategory.specific_type && (
                      <div>
                        <span className="font-medium">詳細:</span>
                        <p className="text-gray-600">{displayCategory.specific_type}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {displayAccessories && displayAccessories !== '不明' && (
            <div>
              <h3 className="font-medium mb-1">付属品:</h3>
              <p className="text-sm">{displayAccessories}</p>
            </div>
          )}

          {displayTailoringStorage && displayTailoringStorage !== '不明' && (
            <div>
              <h3 className="font-medium mb-1">仕立て・収納:</h3>
              <p className="text-sm">{displayTailoringStorage}</p>
            </div>
          )}

          {displayRemainingFabric && displayRemainingFabric !== '不明' && (
            <div>
              <h3 className="font-medium mb-1">残布:</h3>
              <p className="text-sm">{displayRemainingFabric}</p>
            </div>
          )}

          {enhancedResult?.keywords && enhancedResult.keywords.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">キーワード:</h3>
              <div className="flex flex-wrap gap-1">
                {enhancedResult.keywords.map((keyword, idx) => (
                  <span key={idx} className="text-xs py-1 px-2 bg-primary/10 text-primary rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {enhancedResult?.product_features && enhancedResult.product_features.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">商品特徴:</h3>
              <div className="flex flex-wrap gap-1">
                {enhancedResult.product_features.map((feature, idx) => (
                  <span key={idx} className="text-xs py-1 px-2 bg-secondary/10 text-secondary-foreground rounded-full">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {extractedText && (
            <div>
              <h3 className="font-medium mb-1">抽出テキスト:</h3>
              <p className="text-sm text-muted-foreground">{extractedText}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

