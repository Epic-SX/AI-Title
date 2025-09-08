'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategoryLookup } from '../hooks/useCategoryLookup';
import { Badge } from '@/components/ui/badge';

interface CategoryInfo {
  number?: string;
  main_category?: string;
  sub_category?: string;
  item_type?: string;
  specific_type?: string;
  brand?: string;
  full_description?: string;
}

export default function CategoryLookupDemo() {
  const { loading, error, lookupCategory, getCategory, searchCategories, clearError } = useCategoryLookup();
  const [productData, setProductData] = useState({
    title: 'earth music&ecology × GREMLINS コラボTシャツ ブラック 系 Mサイズ',
    brand: 'earth music&ecology',
    product_type: 'Tシャツ',
    color: 'ブラック',
    size: 'M'
  });
  const [categoryNumber, setCategoryNumber] = useState('2084037554');
  const [searchKeywords, setSearchKeywords] = useState('Tシャツ ブラック');
  const [lookupResult, setLookupResult] = useState<CategoryInfo | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [searchResult, setSearchResult] = useState<CategoryInfo | null>(null);

  const handleLookupCategory = async () => {
    clearError();
    const result = await lookupCategory(productData);
    setLookupResult(result);
  };

  const handleGetCategoryInfo = async () => {
    clearError();
    const result = await getCategory(categoryNumber);
    setCategoryInfo(result);
  };

  const handleSearchCategories = async () => {
    clearError();
    const keywords = searchKeywords.split(' ').filter(k => k.trim());
    const result = await searchCategories(keywords);
    setSearchResult(result);
  };

  const renderCategoryInfo = (category: CategoryInfo | null, title: string) => {
    if (!category) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {category.number && (
              <div className="flex justify-between items-center">
                <Label className="font-medium">カテゴリ番号:</Label>
                <Badge variant="outline" className="font-mono">{category.number}</Badge>
              </div>
            )}
            {category.full_description && (
              <div>
                <Label className="font-medium">カテゴリ:</Label>
                <p className="text-sm mt-1 text-gray-700">{category.full_description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {category.main_category && (
                <div>
                  <Label className="font-medium">メインカテゴリ:</Label>
                  <p className="text-gray-600">{category.main_category}</p>
                </div>
              )}
              {category.sub_category && (
                <div>
                  <Label className="font-medium">サブカテゴリ:</Label>
                  <p className="text-gray-600">{category.sub_category}</p>
                </div>
              )}
              {category.item_type && (
                <div>
                  <Label className="font-medium">アイテムタイプ:</Label>
                  <p className="text-gray-600">{category.item_type}</p>
                </div>
              )}
              {category.specific_type && (
                <div>
                  <Label className="font-medium">詳細タイプ:</Label>
                  <p className="text-gray-600">{category.specific_type}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ検索デモ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">エラー: {error}</p>
              <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
                エラーをクリア
              </Button>
            </div>
          )}

          {/* Product Category Lookup */}
          <div className="space-y-3">
            <h3 className="font-medium">商品からカテゴリを検索</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={productData.title}
                  onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="商品タイトル"
                />
              </div>
              <div>
                <Label htmlFor="brand">ブランド</Label>
                <Input
                  id="brand"
                  value={productData.brand}
                  onChange={(e) => setProductData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="ブランド名"
                />
              </div>
              <div>
                <Label htmlFor="product_type">商品タイプ</Label>
                <Input
                  id="product_type"
                  value={productData.product_type}
                  onChange={(e) => setProductData(prev => ({ ...prev, product_type: e.target.value }))}
                  placeholder="商品タイプ"
                />
              </div>
              <div>
                <Label htmlFor="color">色</Label>
                <Input
                  id="color"
                  value={productData.color}
                  onChange={(e) => setProductData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="色"
                />
              </div>
            </div>
            <Button onClick={handleLookupCategory} disabled={loading}>
              {loading ? '検索中...' : 'カテゴリを検索'}
            </Button>
          </div>

          {/* Category Number Lookup */}
          <div className="space-y-3">
            <h3 className="font-medium">カテゴリ番号から情報を取得</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="category_number">カテゴリ番号</Label>
                <Input
                  id="category_number"
                  value={categoryNumber}
                  onChange={(e) => setCategoryNumber(e.target.value)}
                  placeholder="カテゴリ番号"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGetCategoryInfo} disabled={loading}>
                  {loading ? '取得中...' : '情報を取得'}
                </Button>
              </div>
            </div>
          </div>

          {/* Keyword Search */}
          <div className="space-y-3">
            <h3 className="font-medium">キーワードでカテゴリを検索</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="keywords">キーワード (スペース区切り)</Label>
                <Input
                  id="keywords"
                  value={searchKeywords}
                  onChange={(e) => setSearchKeywords(e.target.value)}
                  placeholder="Tシャツ ブラック"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearchCategories} disabled={loading}>
                  {loading ? '検索中...' : '検索'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {renderCategoryInfo(lookupResult, '商品カテゴリ検索結果')}
      {renderCategoryInfo(categoryInfo, 'カテゴリ情報')}
      {renderCategoryInfo(searchResult, 'キーワード検索結果')}
    </div>
  );
}

