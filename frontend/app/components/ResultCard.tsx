'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ResultCardProps {
  title: string;
  extractedText?: string;
  detectedColor?: string;
  detectedBrand?: string;
  detectedModel?: string; 
  itemType?: string;
  index?: number;
  loading?: boolean;
  isProductVariant?: boolean;
  // For backward compatibility with the ResultsList component
  result?: {
    title: string;
    brand?: string;
    model?: string;
    product_type?: string;
    keywords?: string[];
    product_features?: string[];
    raw_text?: string;
    size?: string;
  };
}

export default function ResultCard({ 
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
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  // Support both direct props and result object
  const displayTitle = result?.title || title;
  const displayBrand = result?.brand || detectedBrand;
  const displayModel = result?.model || detectedModel;
  const displayType = result?.product_type || itemType;
  const displaySize = result?.size;

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
        <CardTitle className="text-lg font-semibold">
          {isProductVariant ? `画像 ${index + 1} の商品` : `タイトル案 ${index + 1}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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

          {result?.keywords && result.keywords.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">キーワード:</h3>
              <div className="flex flex-wrap gap-1">
                {result.keywords.map((keyword, idx) => (
                  <span key={idx} className="text-xs py-1 px-2 bg-primary/10 text-primary rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {extractedText && (
            <div>
              <h3 className="font-medium mb-2">抽出テキスト:</h3>
              <div className="text-sm border p-3 rounded-md bg-muted/50 whitespace-pre-line">
                {extractedText}
              </div>
            </div>
          )}

          {result?.raw_text && (
            <div>
              <h3 className="font-medium mb-2">解析テキスト:</h3>
              <div className="text-sm border p-3 rounded-md bg-muted/50 whitespace-pre-line">
                {result.raw_text}
              </div>
            </div>
          )}

          {result?.product_features && result.product_features.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">商品特徴:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.product_features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          size="sm"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              コピーしました
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              タイトルをコピー
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 