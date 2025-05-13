'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import MultiImageUploader from './components/MultiImageUploader';
import ResultCard from './components/ResultCard';
import ResultsList from './components/ResultsList';
import MacroExportCard from './components/MacroExportCard';
import FormHydrationFixer from './components/FormHydrationFixer';
import LoadingSpinner from './components/LoadingSpinner';

// Add Debug Panel component
function DebugPanel({ data }: { data: any }) {
  return (
    <div className="mt-4 p-4 border rounded bg-muted/20">
      <details>
        <summary className="cursor-pointer font-medium">Debug Information</summary>
        <pre className="mt-2 text-xs overflow-auto max-h-60">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [hasScale, setHasScale] = useState(true);
  const [formData, setFormData] = useState({
    brand: '',
    model_number: '',
    size: '',
    additional_info: ''
  });
  
  const [result, setResult] = useState<null | {
    title: string;
    extracted_text: string;
    detected_color: string;
    measurements: Record<string, number>;
    detected_brand: string;
    detected_model: string;
    item_type: string;
    macro_data: any;
    title_alternatives?: Array<{
      title: string;
      brand?: string;
      model?: string;
      product_type?: string;
      keywords?: string[];
      product_features?: string[];
    }>;
  }>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // This effect ensures hydration stability
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImagesAdded = (imageDataArray: string[]) => {
    console.log(`Received ${imageDataArray.length} images`);
    setProductImages(prev => {
      const newImages = [...prev, ...imageDataArray];
      console.log(`Total images: ${newImages.length}`);
      return newImages;
    });
  };

  const handleImageDrop = (index: number, imageData: string) => {
    setProductImages(prev => {
      const updated = [...prev];
      updated[index] = imageData;
      return updated;
    });
  };

  const handleRemoveImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleScaleToggle = (checked: boolean) => {
    setHasScale(checked);
  };

  const handleSubmit = async () => {
    if (productImages.length === 0) {
      setError('少なくとも1つの画像をアップロードしてください');
      return;
    }

    // Filter out empty strings
    const validImages = productImages.filter(img => img);
    
    if (validImages.length === 0) {
      setError('少なくとも1つの有効な画像をアップロードしてください');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugData(null);
    
    // Switch to results tab immediately to show loading state
    setActiveTab('results');
    
    try {
      const requestData = {
        product_images: validImages,
        has_scale: hasScale,
        ...formData,
        product_type: "Unknown Type", // Adding default product type
        color: "Unknown Color", // Adding default color
        material: "Unknown Material" // Adding default material
      };
      
      console.log(`Sending request with ${validImages.length} images`);
      // Save debugging information
      setDebugData({
        requestInfo: {
          imageCount: validImages.length,
          firstImagePreview: validImages.length > 0 ? validImages[0].substring(0, 100) + '...' : 'No images',
          hasScale,
          ...formData
        }
      });
      
      const response = await fetch('http://localhost:5000/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      setDebugData((prev: any) => ({ ...prev, responseData: data }));
      
      if (data.status === 'success') {
        // Extract the raw_response which contains our structured data
        const rawResponse = data.raw_response;
        
        // Create an item for the main result
        const mainResult = {
          title: rawResponse.title || "タイトルなし",
          detected_brand: rawResponse.brand || "",
          detected_model: formData.model_number || "",
          extracted_text: "",
          detected_color: rawResponse.color || "",
          measurements: {},
          item_type: rawResponse.product_type || "",
          macro_data: {
            title: rawResponse.title || "タイトルなし",
            brand: rawResponse.brand || "",
            model_number: formData.model_number || "",
            color: rawResponse.color || "",
            product_type: rawResponse.product_type || "",
            material: rawResponse.material || "",
            size: formData.size || "",
            key_features: rawResponse.key_features || []
          },
        };
        
        // Generate title alternatives if key_features exists
        const titleAlternatives = [];
        if (rawResponse.key_features && Array.isArray(rawResponse.key_features)) {
          titleAlternatives.push({
            title: rawResponse.title || "タイトルなし",
            brand: rawResponse.brand || "",
            model: formData.model_number || "",
            product_type: rawResponse.product_type || "",
            keywords: [],
            product_features: rawResponse.key_features
          });
        }
        
        setResult({
          ...mainResult,
          title_alternatives: titleAlternatives
        });
      } else if (data.error) {
        setError(data.error || 'タイトル生成中にエラーが発生しました');
        // Switch back to input tab if there's an error
        setActiveTab('input');
      } else {
        setError('タイトル生成中にエラーが発生しました');
        // Switch back to input tab if there's an error
        setActiveTab('input');
      }
    } catch (err: any) {
      console.error("Error during API call:", err);
      setError(`サーバーに接続できませんでした: ${err.message || ''}`);
      // Switch back to input tab if there's an error
      setActiveTab('input');
    } finally {
      setLoading(false);
    }
  };

  // Only render content after client hydration to avoid mismatch
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="container py-10 mx-auto max-w-6xl">
      {loading && <LoadingSpinner fullScreen text="画像解析中..." />}
      
      <div className="space-y-6 text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">AI出品タイトル生成</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          商品画像とデータからAIが最適な出品タイトルを生成します
        </p>
      </div>

      <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="input">入力</TabsTrigger>
          <TabsTrigger value="results" disabled={!result && !loading}>結果</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Display any errors */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3>商品画像</h3>
                </div>
                
                {/* MultiImageUploader component */}
                <MultiImageUploader onImagesAdded={handleImagesAdded} maxImages={10} />
                
                {/* Display selected images */}
                {productImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {productImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={image} 
                          alt={`Product ${index + 1}`} 
                          className="w-full h-[200px] object-contain border rounded-md p-2"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center space-x-2 mt-4">
                  <FormHydrationFixer>
                    <Switch
                      id="scale-toggle"
                      checked={hasScale}
                      onCheckedChange={handleScaleToggle}
                    />
                  </FormHydrationFixer>
                  <Label htmlFor="scale-toggle">画像には測定スケールが含まれています</Label>
                </div>
              </div>
              
              {/* Debug Panel */}
              {debugData && <DebugPanel data={debugData} />}
            </CardContent>
            
            <CardFooter className="flex justify-center pt-0 pb-6">
              <FormHydrationFixer>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full max-w-[200px]"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      処理中...
                    </div>
                  ) : 'タイトルを生成'}
                </Button>
              </FormHydrationFixer>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          {result ? (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>生成結果</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultCard 
                    title={result.title}
                    extractedText={result.extracted_text}
                    detectedColor={result.detected_color}
                    detectedBrand={result.detected_brand}
                    detectedModel={result.detected_model}
                    itemType={result.item_type}
                    loading={loading}
                  />
                </CardContent>
              </Card>
              
              {result.title_alternatives && result.title_alternatives.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>その他のタイトル案</CardTitle>
                    <CardDescription>AIが生成した代替タイトル案</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResultsList results={result.title_alternatives} />
                  </CardContent>
                </Card>
              )}
              
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>マクロデータ出力</CardTitle>
                  <CardDescription>各マーケットプレイス向けデータ</CardDescription>
                </CardHeader>
                <CardContent>
                  <MacroExportCard macroData={result.macro_data} />
                </CardContent>
              </Card>
              
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={() => setActiveTab('input')}
                  variant="outline"
                  className="w-full max-w-[200px] mr-4"
                >
                  入力に戻る
                </Button>
                <Button
                  onClick={() => {
                    // Reset form for a new submission
                    setProductImages([]);
                    setFormData({
                      brand: '',
                      model_number: '',
                      size: '',
                      additional_info: ''
                    });
                    setResult(null);
                    setActiveTab('input');
                  }}
                  className="w-full max-w-[200px]"
                >
                  新規作成
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <LoadingSpinner size="md" text="画像を解析中..." />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
