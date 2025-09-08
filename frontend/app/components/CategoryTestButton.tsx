'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategoryLookup } from '../hooks/useCategoryLookup';

export default function CategoryTestButton() {
  const { lookupCategory, loading, error } = useCategoryLookup();
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestCategoryLookup = async () => {
    const testProductData = {
      title: "earth music&ecology × GREMLINS コラボTシャツ ブラック 系 Mサイズ",
      brand: "earth music&ecology",
      product_type: "Tシャツ",
      color: "ブラック",
      size: "M"
    };

    console.log('[CATEGORY TEST] Testing category lookup with:', testProductData);
    
    const result = await lookupCategory(testProductData);
    setTestResult(result);
    
    if (result) {
      console.log('[CATEGORY TEST] Category lookup successful:', result);
    } else {
      console.log('[CATEGORY TEST] Category lookup failed');
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle>カテゴリ検索テスト</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTestCategoryLookup} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'カテゴリ検索中...' : 'カテゴリ検索をテスト'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">エラー: {error}</p>
          </div>
        )}

        {testResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800 mb-2">カテゴリ検索結果:</h4>
            <div className="space-y-2 text-sm">
              {testResult.number && (
                <div className="flex justify-between">
                  <span className="font-medium">カテゴリ番号:</span>
                  <span className="font-mono">{testResult.number}</span>
                </div>
              )}
              {testResult.full_description && (
                <div>
                  <span className="font-medium">カテゴリ:</span>
                  <p className="text-gray-700">{testResult.full_description}</p>
                </div>
              )}
              {testResult.main_category && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">メイン:</span>
                    <p className="text-gray-600">{testResult.main_category}</p>
                  </div>
                  {testResult.sub_category && (
                    <div>
                      <span className="font-medium">サブ:</span>
                      <p className="text-gray-600">{testResult.sub_category}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>このボタンでカテゴリ検索機能をテストできます。</p>
          <p>Electron環境でバックエンドサーバーが起動している必要があります。</p>
        </div>
      </CardContent>
    </Card>
  );
}

