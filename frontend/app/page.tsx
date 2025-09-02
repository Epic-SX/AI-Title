'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

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

// Function to extract product ID from filename (same logic as backend)
const extractProductIdFromFilename = (filename: string): string => {
  // Try to extract 13-digit management number first (priority)
  const thirteenDigitMatch = filename.match(/(\d{13})/);
  if (thirteenDigitMatch) {
    return thirteenDigitMatch[1];
  }
  
  // Fallback to any digit sequence
  const digitMatch = filename.match(/(\d+)/);
  if (digitMatch) {
    return digitMatch[1];
  }
  
  // Final fallback: use filename without extension
  return filename.replace(/\.[^/.]+$/, '');
};

// Add new BatchProcessing component
function BatchProcessing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directory, setDirectory] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    total: number;
    completed: number;
    results: Record<string, any>;
    totalTimeSeconds?: number;
    productImageUrls?: Record<string, string[]>; // Add this to store image URLs
  }>({
    isProcessing: false,
    total: 0,
    completed: 0,
    results: {},
    productImageUrls: {} // Initialize this
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectory(e.target.value);
    setSelectedFiles(null); // Clear any selected files when manually typing
  };
  
  const handleDirectorySelect = () => {
    // This is a workaround to trigger the directory selection dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleDirectorySelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }
    
    console.log(`Selected ${files.length} files`);
    
    // Debug: Log details about the first few files
    for (let i = 0; i < Math.min(5, files.length); i++) {
      const file = files[i];
      console.log(`[DEBUG] File ${i}: name="${file.name}", size=${file.size}, type="${file.type}", lastModified=${file.lastModified}`);
    }
    
    console.log(`Files array length: ${files.length}`);
    console.log(`FileList type:`, files.constructor.name);
    
    setSelectedFiles(files);
    setError(null);
    
    // Try to construct the directory path from the files if webkitRelativePath is available
    if (files.length > 0 && files[0].webkitRelativePath) {
      const relativePath = files[0].webkitRelativePath;
      const dirPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
      console.log(`Detected directory path from webkitRelativePath: ${dirPath}`);
      setDirectory(dirPath);
    }
  };

  // Function to check if a product needs manual review (unknown brand or size)
  const needsManualReview = (result: any): boolean => {
    const brand = result.detected_brand || '';
    const size = result.detected_size || '';
    return brand === '不明' || size === '不明' || brand === '' || size === '';
  };

  // Function to get reasons why manual review is needed
  const getReviewReasons = (result: any): string[] => {
    const reasons: string[] = [];
    const brand = result.detected_brand || '';
    const size = result.detected_size || '';
    
    if (brand === '不明' || brand === '') {
      reasons.push('ブランド不明');
    }
    if (size === '不明' || size === '') {
      reasons.push('サイズ不明');
    }
    
    return reasons;
  };

  const handleBatchProcess = async () => {
    if (!directory && !selectedFiles) {
      setError('画像ディレクトリを選択してください');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProcessingStatus({
      isProcessing: true,
      total: 0,
      completed: 0,
      results: {},
      productImageUrls: {} // Initialize this
    });
    
    try {
      // If files were selected via directory picker, group them by management number
      if (selectedFiles && selectedFiles.length > 0) {
        console.log(`Processing ${selectedFiles.length} files`);
        
        // Limit the number of files to prevent server overload
        const MAX_FILES = 5000;
        let filesToProcess: File[] = Array.from(selectedFiles);
        
        // Filter to only include image files
        const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        filesToProcess = filesToProcess.filter(file => {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const isImage = extension && imageExtensions.includes(extension);
          if (!isImage) {
            console.log(`[DEBUG] Skipping non-image file: ${file.name}`);
          }
          return isImage;
        });
        
        console.log(`[DEBUG] After filtering: ${filesToProcess.length} image files out of ${selectedFiles.length} total files`);
        
        if (filesToProcess.length === 0) {
          setError('選択されたディレクトリに画像ファイルが見つかりません。');
          setLoading(false);
          return;
        }
        
        if (filesToProcess.length > MAX_FILES) {
          console.warn(`Too many files selected (${filesToProcess.length}). Limiting to ${MAX_FILES} files.`);
          setError(`ファイル数が多すぎます（${filesToProcess.length}）。最初の${MAX_FILES}ファイルのみを処理します。`);
          
          // Slice to limit files
          filesToProcess = filesToProcess.slice(0, MAX_FILES);
        }
        
        // Group files by management number (product ID)
        const productGroups: Record<string, File[]> = {};
        
        filesToProcess.forEach(file => {
          const productId = extractProductIdFromFilename(file.name);
          console.log(`Extracted product ID: ${productId} from filename: ${file.name}`);
          
          if (!productGroups[productId]) {
            productGroups[productId] = [];
          }
          productGroups[productId].push(file);
        });
        
        const productIds = Object.keys(productGroups);
        console.log(`[DEBUG] Grouped into ${productIds.length} products:`, productIds);
        
        // Initialize processing status with product count instead of file count
        setProcessingStatus({
          isProcessing: true,
          total: productIds.length,
          completed: 0,
          results: {},
          productImageUrls: {} // Initialize this
        });
        
        // Function to convert File to base64 with compression
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        };

        // Function to compress image to reduce file size
        const compressImageToBase64 = (imageDataUrl: string, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
          return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = document.createElement('img') as HTMLImageElement;
            
            img.onload = () => {
              if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
              }
              
              // Calculate new dimensions while maintaining aspect ratio
              let { width, height } = img;
              
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Draw and compress the image
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to compressed data URL
              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(compressedDataUrl);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageDataUrl;
          });
        };

        // Process products one by one (grouped by management number)
        const allResults: Record<string, any> = {};
        const allProductImageUrls: Record<string, string[]> = {}; // Collect image URLs here
        let totalProcessed = 0;
        
        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i];
          const productFiles = productGroups[productId];
          
          try {
            console.log(`Processing product ${i + 1}/${productIds.length}: ${productId} with ${productFiles.length} images`);
            
            // Convert all files for this product to base64
            const productImages: string[] = [];
            const productImageUrls: string[] = []; // Store URLs for preview
            
            for (const file of productFiles) {
              try {
                // Check file size to prevent 413 errors
                const maxFileSize = 10 * 1024 * 1024; // 10MB limit
                if (file.size > maxFileSize) {
                  console.warn(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB), skipping`);
                  continue;
                }
                
                // Convert file to base64
                const base64Image = await fileToBase64(file);
                
                // Apply compression to reduce payload size
                let finalBase64Image = base64Image;
                try {
                  // Check if image is likely large (base64 string length as rough estimate)
                  if (base64Image.length > 1.5 * 1024 * 1024) { // Roughly 1.5MB in base64
                    console.log(`Compressing large image: ${file.name}...`);
                    const compressed = await compressImageToBase64(base64Image, 1200, 0.7);
                    finalBase64Image = compressed;
                    console.log(`Compressed ${file.name} from ${(base64Image.length / 1024 / 1024).toFixed(2)}MB to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
                  }
                } catch (compressionError) {
                  console.warn(`Compression failed for ${file.name}, using original:`, compressionError);
                }
                
                productImages.push(finalBase64Image);
                productImageUrls.push(URL.createObjectURL(file)); // Store URL for preview
              } catch (fileError) {
                console.error(`Error processing file ${file.name}:`, fileError);
              }
            }
            
            if (productImages.length === 0) {
              throw new Error(`No valid images found for product ${productId}`);
            }
            
            // Prepare request data with all images for this product
            const requestData = {
              product_images: productImages,
              has_scale: true,
              brand: '',
              model_number: '',
              size: '',
              additional_info: '',
              product_type: "Unknown Type",
              color: "Unknown Color",
              material: "Unknown Material",
              product_id: productId // Pass the product ID
            };
            
            // Log the final payload size for debugging
            const payloadSize = JSON.stringify(requestData).length;
            console.log(`Final payload size for product ${productId}: ${(payloadSize / 1024 / 1024).toFixed(2)}MB (${productImages.length} images)`);
            
            // Send request to generate title for this product
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-title`, {
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
            
            if (data.status === 'success') {
              // Process the response (same logic as individual processing)
              let rawResponse;
              
              try {
                if (typeof data.raw_response === 'string') {
                  const jsonRegex = /(\{[\s\S]*?\})/g;
                  const matches = data.raw_response.match(jsonRegex);
                  
                  if (matches && matches.length > 0) {
                    let longestMatch = '';
                    for (const match of matches) {
                      if (match.length > longestMatch.length) {
                        longestMatch = match;
                      }
                    }
                    rawResponse = JSON.parse(longestMatch);
                  } else {
                    rawResponse = {
                      title: data.raw_response.substring(0, 100) || "タイトルなし",
                      brand: "",
                      color: "",
                      product_type: "",
                      material: "",
                      size: "",
                      key_features: []
                    };
                  }
                } else {
                  rawResponse = data.raw_response;
                }
              } catch (parseError) {
                console.error("Error processing raw_response:", parseError);
                rawResponse = {
                  title: "タイトル解析エラー",
                  brand: "",
                  color: "",
                  product_type: "",
                  material: "",
                  size: "",
                  key_features: []
                };
              }
              
              // Store result for this product
              allResults[productId] = {
                status: 'success',
                product_id: productId,
                image_count: productFiles.length,
                title: rawResponse?.title || "タイトルなし",
                detected_brand: rawResponse?.brand || "",
                detected_color: rawResponse?.color || "",
                detected_size: rawResponse?.size || "",
                item_type: rawResponse?.product_type || "",
                extracted_text: typeof data.raw_response === 'string' ? data.raw_response : "",
                macro_data: {
                  title: rawResponse?.title || "タイトルなし",
                  brand: rawResponse?.brand || "",
                  model_number: "",
                  color: rawResponse?.color || "",
                  product_type: rawResponse?.product_type || "",
                  material: rawResponse?.material || "",
                  size: rawResponse?.size || "",
                  key_features: Array.isArray(rawResponse?.key_features) ? rawResponse.key_features : []
                },
                marketplace_variants: data.marketplace_variants || {},
                title_validation: data.title_validation || null,
                data_quality: data.data_quality || null,
                processing_time: Date.now() // Simple timestamp
              };
              
              // Store image URLs for preview
              allProductImageUrls[productId] = productImageUrls;
              
              console.log(`Successfully processed product: ${productId} with ${productFiles.length} images`);
              console.log(`Stored ${productImageUrls.length} image URLs for product ${productId}`);
              console.log(`Total products with image URLs: ${Object.keys(allProductImageUrls).length}`);
              
            } else {
              // Store error result
              allResults[productId] = {
                status: 'error',
                product_id: productId,
                image_count: productFiles.length,
                error: data.error || 'タイトル生成中にエラーが発生しました',
                processing_time: Date.now()
              };
              
              console.error(`Error processing product ${productId}:`, data.error);
            }
            
          } catch (productError: any) {
            console.error(`Error processing product ${productId}:`, productError);
            
            // Store error result
            allResults[productId] = {
              status: 'error',
              product_id: productId,
              image_count: productFiles.length,
              error: productError.message || 'ファイル処理中にエラーが発生しました',
              processing_time: Date.now()
            };
          }
          
          // Update progress
          totalProcessed++;
          setProcessingStatus(prev => ({
            ...prev,
            completed: totalProcessed,
            results: { ...allResults },
            productImageUrls: { ...allProductImageUrls } // Update image URLs here
          }));
          
          // Add a small delay to prevent overwhelming the server
          if (i < productIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between products
          }
        }
        
        // Final update
        setProcessingStatus({
          isProcessing: false,
          total: productIds.length,
          completed: totalProcessed,
          results: allResults,
          totalTimeSeconds: 0,
          productImageUrls: allProductImageUrls // Keep existing URLs
        });
        
      } 
      // If manual directory path was entered, use the original API
      else if (directory) {
        // Send batch processing request with directory path
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/batch-process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            directory_path: directory,
            metadata: {
              has_scale: true
            }
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
          setProcessingStatus({
            isProcessing: false,
            total: data.total_products || 0,
            completed: data.processed_count || 0,
            results: data.results || {},
            totalTimeSeconds: data.total_time_seconds,
            productImageUrls: { ...processingStatus.productImageUrls } // Keep existing URLs
          });
        } else {
          setError(data.error || 'バッチ処理中にエラーが発生しました');
        }
      }
    } catch (err: any) {
      console.error("Error during batch processing:", err);
      setError(`サーバーに接続できませんでした: ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate statistics for the results
  const resultStats = useMemo(() => {
    if (!processingStatus.results || Object.keys(processingStatus.results).length === 0) {
      return { success: 0, error: 0, avgTime: 0, needsReview: 0, autoApproved: 0 };
    }
    
    const results = Object.values(processingStatus.results);
    const success = results.filter(r => r.status === 'success').length;
    const error = results.filter(r => r.status === 'error').length;
    
    // Calculate manual review statistics
    const successResults = results.filter(r => r.status === 'success');
    const needsReview = successResults.filter(result => needsManualReview(result)).length;
    const autoApproved = successResults.length - needsReview;
    
    // Calculate average processing time
    let totalTime = 0;
    let timeCount = 0;
    
    results.forEach(result => {
      if (result.processing_time) {
        totalTime += result.processing_time;
        timeCount++;
      }
    });
    
    const avgTime = timeCount > 0 ? (totalTime / timeCount).toFixed(2) : 0;
    
    return { success, error, avgTime, needsReview, autoApproved };
  }, [processingStatus.results]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>商品一括処理 (最大5000点)</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="directory">画像ディレクトリパス</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="directory" 
              placeholder="例: /path/to/images" 
              value={directory}
              onChange={handleDirectoryChange}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDirectorySelect}
            >
              ディレクトリを選択
            </Button>
          </div>
          {/* Hidden file input for directory selection */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDirectorySelected}
            // @ts-expect-error webkitdirectory and directory are not in the standard HTML attributes
            webkitdirectory="true"
            directory="true"
            multiple
            style={{ display: 'none' }}
          />
          <p className="text-sm text-muted-foreground">
            処理したい商品画像を含むディレクトリを選択または入力してください
            <br />
            <span className="text-xs text-yellow-600">
              ※サーバー上のパスを入力するか、ブラウザからディレクトリを選択できます
            </span>
          </p>
        </div>
        
        {processingStatus.isProcessing && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${(processingStatus.completed / processingStatus.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-center">
              処理中: {processingStatus.completed} / {processingStatus.total} 商品
            </p>
          </div>
        )}
        
        {!processingStatus.isProcessing && processingStatus.completed > 0 && (
          <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="p-4 bg-muted/20 rounded-md">
              <h3 className="font-medium mb-2">処理結果サマリー</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>処理完了: {processingStatus.completed} / {processingStatus.total} 商品</p>
                  <p>成功: {resultStats.success} 商品</p>
                  <p>エラー: {resultStats.error} 商品</p>
                  <p className="text-green-600">✅ 自動承認: {resultStats.autoApproved} 商品</p>
                  <p className="text-yellow-600">⚠️ 手動確認必要: {resultStats.needsReview} 商品</p>
                </div>
                <div>
                  <p>総処理時間: {processingStatus.totalTimeSeconds ? `${processingStatus.totalTimeSeconds}秒` : '不明'}</p>
                  <p>平均処理時間: {resultStats.avgTime}秒/商品</p>
                </div>
              </div>
              {resultStats.needsReview > 0 && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>👁️ 注意:</strong> {resultStats.needsReview}個の商品がブランドまたはサイズ不明のため、手動確認が必要です。
                    下記の黄色いボーダーの商品を確認して、画像を見ながら不明な情報を入力してください。
                  </p>
                </div>
              )}
            </div>
            
            {/* Detailed Results for each product */}
            <div className="space-y-3">
              <h3 className="font-medium">各商品の詳細結果</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {Object.entries(processingStatus.results).map(([productId, result]: [string, any]) => {
                  const needsReview = needsManualReview(result);
                  const reviewReasons = getReviewReasons(result);
                  const productImages = processingStatus.productImageUrls?.[productId] || [];
                  
                  return (
                    <Card key={productId} className={`p-3 ${needsReview ? 'border-l-4 border-l-yellow-500 bg-yellow-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">{productId} ({result.image_count}枚)</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.status === 'success' ? '成功' : 'エラー'}
                            </span>
                            {needsReview && (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                                手動確認必要
                              </span>
                            )}
                          </div>
                          
                          {/* Manual Review Alert */}
                          {needsReview && (
                            <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                              <p className="text-sm font-medium text-yellow-800 mb-1">
                                👁️ 手動確認が必要です
                              </p>
                              <p className="text-xs text-yellow-700">
                                理由: {reviewReasons.join(', ')}
                              </p>
                              <p className="text-xs text-yellow-700">
                                以下の商品画像を確認して、不明な情報を手動で入力してください。
                              </p>
                            </div>
                          )}
                          
                          {/* Product Images Preview for Manual Review */}
                          {needsReview && productImages.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-medium text-gray-700 mb-2">商品画像（確認用）:</h5>
                              <div className="grid grid-cols-2 gap-2 max-w-md">
                                {productImages.slice(0, 4).map((imageUrl, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={imageUrl}
                                      alt={`${productId} - 画像 ${index + 1}`}
                                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => {
                                        // Open image in new tab for detailed view
                                        window.open(imageUrl, '_blank');
                                      }}
                                      onError={(e) => {
                                        console.error(`Failed to load image for product ${productId}, image ${index + 1}`);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <span className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-tl">
                                      {index + 1}
                                    </span>
                                  </div>
                                ))}
                                {productImages.length > 4 && (
                                  <div className="col-span-2 text-center text-xs text-gray-500 mt-1">
                                    +{productImages.length - 4} その他の画像
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        
                          {result.status === 'success' ? (
                            <div className="space-y-1 text-sm">
                              <p><strong>タイトル:</strong> {result.title}</p>
                              {result.detected_brand && (
                                <p className={result.detected_brand === '不明' ? 'text-red-600' : ''}>
                                  <strong>ブランド:</strong> {result.detected_brand}
                                  {result.detected_brand === '不明' && <span className="text-xs ml-1">(要確認)</span>}
                                </p>
                              )}
                              {result.detected_color && (
                                <p><strong>色:</strong> {result.detected_color}</p>
                              )}
                              {result.detected_size && (
                                <p className={result.detected_size === '不明' ? 'text-red-600' : ''}>
                                  <strong>サイズ:</strong> {result.detected_size}
                                  {result.detected_size === '不明' && <span className="text-xs ml-1">(要確認)</span>}
                                </p>
                              )}
                              {result.item_type && (
                                <p><strong>商品タイプ:</strong> {result.item_type}</p>
                              )}
                              
                              {/* MacroExportCard with marketplace variants */}
                              <div className="mt-3 p-3 bg-muted/30 rounded-md">
                                <MacroExportCard 
                                  macroData={result.macro_data}
                                  marketplaceVariants={result.marketplace_variants}
                                  titleValidation={result.title_validation}
                                  dataQuality={result.data_quality}
                                />
                              </div>
                            
                            {/* Expandable detailed information */}
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                詳細情報を表示
                              </summary>
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                                {result.extracted_text && (
                                  <div>
                                    <strong>抽出テキスト:</strong>
                                    <p className="mt-1 whitespace-pre-wrap">{result.extracted_text}</p>
                                  </div>
                                )}
                                {result.macro_data && (
                                  <div>
                                    <strong>マクロデータ:</strong>
                                    <pre className="mt-1 text-xs overflow-auto max-h-32">
                                      {JSON.stringify(result.macro_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">
                            <p><strong>エラー:</strong> {result.error}</p>
                            {needsManualReview(result) && (
                              <p className="text-xs text-yellow-600 mt-1">
                                手動レビューが必要: {getReviewReasons(result).join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            {/* Export Options */}
            {resultStats.success > 0 && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium mb-2">データエクスポート</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const successResults = Object.entries(processingStatus.results)
                        .filter(([, result]: [string, any]) => result.status === 'success')
                        .map(([productId, result]: [string, any]) => ({
                          productId,
                          imageCount: result.image_count,
                          title: result.title,
                          brand: result.detected_brand,
                          color: result.detected_color,
                          size: result.detected_size,
                          itemType: result.item_type,
                          macroData: result.macro_data
                        }));
                      
                      const blob = new Blob([JSON.stringify(successResults, null, 2)], { 
                        type: 'application/json' 
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `batch_processing_results_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    JSONエクスポート
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const successResults = Object.entries(processingStatus.results)
                        .filter(([, result]: [string, any]) => result.status === 'success');
                      
                      // Define comprehensive CSV headers matching the listing format
                      const csvHeaders = 'カテゴリ,管理番号,タイトル,付属品,ラック,ランク,型番,コメント,仕立て・収納,素材,色,サイズ,トップス,パンツ,スカート,ワンピース,スカートスーツ,パンツスーツ,靴,ブーツ,スニーカー,ベルト,ネクタイ縦横,帽子,バッグ,ネックレス,サングラス,あまり,出品日,出品URL,原価,売値,梱包サイズ,仕入先,仕入日,ID,ブランド,シリーズ名,原産国\n';
                      
                      const csvContent = successResults
                        .map(([productId, result]: [string, any]) => {
                          // Use comprehensive listing data if available, otherwise create from basic data
                          let listingData;
                          if (result.macro_data && result.macro_data.comprehensive_listing_data) {
                            listingData = result.macro_data.comprehensive_listing_data;
                          } else {
                            // Create comprehensive data from available fields
                            listingData = {
                              'カテゴリ': '',
                              '管理番号': productId,
                              'タイトル': result.title || '',
                              '付属品': '',
                              'ラック': '',
                              'ランク': '',
                              '型番': '',
                              'コメント': '',
                              '仕立て・収納': '',
                              '素材': result.macro_data?.material || '',
                              '色': result.detected_color || '',
                              'サイズ': result.detected_size || '',
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
                              'ID': productId,
                              'ブランド': result.detected_brand || '',
                              'シリーズ名': '',
                              '原産国': ''
                            };
                          }
                          
                          // Format the row according to the header order
                          return [
                            listingData['カテゴリ'] || '',
                            listingData['管理番号'] || '',
                            listingData['タイトル'] || '',
                            listingData['付属品'] || '',
                            listingData['ラック'] || '',
                            listingData['ランク'] || '',
                            listingData['型番'] || '',
                            listingData['コメント'] || '',
                            listingData['仕立て・収納'] || '',
                            listingData['素材'] || '',
                            listingData['色'] || '',
                            listingData['サイズ'] || '',
                            listingData['トップス'] || '',
                            listingData['パンツ'] || '',
                            listingData['スカート'] || '',
                            listingData['ワンピース'] || '',
                            listingData['スカートスーツ'] || '',
                            listingData['パンツスーツ'] || '',
                            listingData['靴'] || '',
                            listingData['ブーツ'] || '',
                            listingData['スニーカー'] || '',
                            listingData['ベルト'] || '',
                            listingData['ネクタイ縦横'] || '',
                            listingData['帽子'] || '',
                            listingData['バッグ'] || '',
                            listingData['ネックレス'] || '',
                            listingData['サングラス'] || '',
                            listingData['あまり'] || '',
                            listingData['出品日'] || '',
                            listingData['出品URL'] || '',
                            listingData['原価'] || '',
                            listingData['売値'] || '',
                            listingData['梱包サイズ'] || '',
                            listingData['仕入先'] || '',
                            listingData['仕入日'] || '',
                            listingData['ID'] || '',
                            listingData['ブランド'] || '',
                            listingData['シリーズ名'] || '',
                            listingData['原産国'] || ''
                          ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
                        })
                        .join('\n');
                      
                      // Add UTF-8 BOM to ensure proper Japanese character display
                      const BOM = '\uFEFF';
                      const csvWithBOM = BOM + csvHeaders + csvContent;
                      
                      const blob = new Blob([csvWithBOM], { 
                        type: 'text/csv;charset=utf-8;' 
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `comprehensive_listing_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    CSVエクスポート（出品フォーマット）
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          onClick={handleBatchProcess}
          disabled={loading || !directory}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              処理中...
            </div>
          ) : 'バッチ処理を開始'}
        </Button>
      </CardFooter>
    </Card>
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
    marketplace_variants?: Record<string, any>;
    title_validation?: any;
    data_quality?: {
      quality_score: number;
      max_score: number;
      grade: string;
      grade_description: string;
      completion_rate: string;
      issues: string[];
      recommendations: string[];
      field_completeness: Record<string, boolean>;
    };
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

  // Function to compress image to reduce file size
  const compressImageToBase64 = (imageDataUrl: string, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img') as HTMLImageElement;
      
      img.onload = () => {
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  };

  const handleImagesAdded = async (imageDataArray: string[]) => {
    console.log("Adding images:", imageDataArray.length);
    
    // Compress large images before adding them
    const compressedImages: string[] = [];
    
    for (const imageData of imageDataArray) {
      try {
        // Check if image is likely large (base64 string length as rough estimate)
        if (imageData.length > 1.5 * 1024 * 1024) { // Roughly 1.5MB in base64
          console.log("Compressing large image...");
          const compressed = await compressImageToBase64(imageData);
          compressedImages.push(compressed);
          console.log(`Compressed image from ${(imageData.length / 1024 / 1024).toFixed(2)}MB to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
        } else {
          compressedImages.push(imageData);
        }
      } catch (error) {
        console.error("Error compressing image:", error);
        // If compression fails, use original image
        compressedImages.push(imageData);
      }
    }
    
    setProductImages(prev => [...prev, ...compressedImages]);
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
      const productId = '';
      
      const requestData = {
        product_images: validImages,
        has_scale: hasScale,
        ...formData,
        product_type: "Unknown Type",
        color: "Unknown Color",
        material: "Unknown Material",
        product_id: productId
      };
      
      console.log(`Sending request with ${validImages.length} images`);
      setDebugData({
        requestInfo: {
          imageCount: validImages.length,
          firstImagePreview: validImages.length > 0 ? validImages[0].substring(0, 100) + '...' : 'No images',
          hasScale,
          productId,
          ...formData
        }
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-title`, {
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
        let rawResponse;
        let multipleProducts = false;
        
        try {
          if (typeof data.raw_response === 'string') {
            const jsonRegex = /(\{[\s\S]*?\})/g;
            const matches = data.raw_response.match(jsonRegex);
            
            if (matches && matches.length > 0) {
              let longestMatch = '';
              for (const match of matches) {
                if (match.length > longestMatch.length) {
                  longestMatch = match;
                }
              }
              
              try {
                rawResponse = JSON.parse(longestMatch);
                console.log("Successfully extracted and parsed JSON from string", rawResponse);
              } catch (innerError) {
                console.error("Failed to parse extracted JSON:", innerError);
                throw new Error("Failed to parse extracted JSON");
              }
            } else {
              console.warn("No JSON object found in response, creating default object");
              rawResponse = {
                title: data.raw_response.substring(0, 100) || "タイトルなし",
                brand: "不明",
                color: "不明",
                product_type: "不明",
                material: "不明",
                size: "不明",
                accessories: "不明",
                tailoring_storage: "不明",
                remaining_fabric: "不明",
                key_features: []
              };
            }
          } else {
            rawResponse = data.raw_response;
          }
          
          multipleProducts = data.multiple_products || (rawResponse && rawResponse.products && Array.isArray(rawResponse.products));
          
        } catch (parseError) {
          console.error("Error processing raw_response:", parseError);
          rawResponse = {
            title: "タイトル解析エラー",
            brand: "不明",
            color: "不明",
            product_type: "不明",
            material: "不明",
            size: "不明",
            accessories: "不明",
            tailoring_storage: "不明",
            remaining_fabric: "不明",
            key_features: []
          };
          
          console.log("Using fallback object for rawResponse");
        }
        
        if (multipleProducts && rawResponse.products && Array.isArray(rawResponse.products)) {
          console.log("Processing multiple products:", rawResponse.products.length);
          
          const titleAlternatives = rawResponse.products.map((product: any, index: number) => {
            if (product.parse_error) {
              return {
                title: product.title || `製品 ${index + 1}`,
                brand: "不明",
                model: formData.model_number || "",
                product_type: product.raw_text ? "解析テキスト" : "不明",
                size: "不明",
                keywords: [],
                product_features: [],
                raw_text: product.raw_text || ""
              };
            }
            
            return {
              title: product.title || `製品 ${index + 1}`,
              brand: product.brand || "不明",
              model: formData.model_number || "",
              product_type: product.product_type || "不明",
              size: product.size || "不明",
              accessories: product.accessories || "不明",
              tailoring_storage: product.tailoring_storage || "不明",
              remaining_fabric: product.remaining_fabric || "不明",
              keywords: [],
              product_features: Array.isArray(product.key_features) ? product.key_features : []
            };
          });
          
          const firstProduct = rawResponse.products[0] || {};
          const mainResult = {
            title: firstProduct.title || "タイトルなし",
            detected_brand: firstProduct.brand || "不明",
            detected_model: formData.model_number || "",
            detected_size: firstProduct.size || "不明",
            extracted_text: typeof data.raw_response === 'string' ? data.raw_response : "",
            detected_color: firstProduct.color || "不明",
            measurements: {},
            item_type: firstProduct.product_type || "不明",
            macro_data: {
              title: firstProduct.title || "タイトルなし",
              brand: firstProduct.brand || "不明",
              model_number: formData.model_number || "",
              color: firstProduct.color || "不明",
              product_type: firstProduct.product_type || "不明",
              material: firstProduct.material || "不明",
              size: firstProduct.size || formData.size || "不明",
              accessories: firstProduct.accessories || "不明",
              tailoring_storage: firstProduct.tailoring_storage || "不明",
              remaining_fabric: firstProduct.remaining_fabric || "不明",
              key_features: Array.isArray(firstProduct.key_features) ? firstProduct.key_features : []
            },
          };
          
          setResult({
            ...mainResult,
            marketplace_variants: data.marketplace_variants || {},
            title_validation: data.title_validation || null,
            data_quality: data.data_quality || null,
            title_alternatives: titleAlternatives
          });
        } else {
          const mainResult = {
            title: rawResponse?.title || "タイトルなし",
            detected_brand: rawResponse?.brand || "不明",
            detected_model: formData.model_number || "",
            detected_size: rawResponse?.size || "不明",
            extracted_text: typeof data.raw_response === 'string' ? data.raw_response : "",
            detected_color: rawResponse?.color || "不明",
            measurements: {},
            item_type: rawResponse?.product_type || "不明",
            macro_data: {
              title: rawResponse?.title || "タイトルなし",
              brand: rawResponse?.brand || "不明",
              model_number: formData.model_number || "",
              color: rawResponse?.color || "不明",
              product_type: rawResponse?.product_type || "不明",
              material: rawResponse?.material || "不明",
              size: rawResponse?.size || formData.size || "不明",
              accessories: rawResponse?.accessories || "不明",
              tailoring_storage: rawResponse?.tailoring_storage || "不明",
              remaining_fabric: rawResponse?.remaining_fabric || "不明",
              key_features: Array.isArray(rawResponse?.key_features) ? rawResponse.key_features : []
            },
          };
          
          const titleAlternatives = [];
          if (rawResponse?.key_features && Array.isArray(rawResponse.key_features)) {
            titleAlternatives.push({
              title: rawResponse.title || "タイトルなし",
              brand: rawResponse.brand || "不明",
              model: formData.model_number || "",
              product_type: rawResponse.product_type || "不明",
              size: rawResponse.size || "不明",
              accessories: rawResponse.accessories || "不明",
              tailoring_storage: rawResponse.tailoring_storage || "不明",
              remaining_fabric: rawResponse.remaining_fabric || "不明",
              keywords: [],
              product_features: rawResponse.key_features
            });
          }
          
          setResult({
            ...mainResult,
            marketplace_variants: data.marketplace_variants || {},
            title_validation: data.title_validation || null,
            data_quality: data.data_quality || null,
            title_alternatives: titleAlternatives
          });
        }
      } else if (data.error) {
        setError(data.error || 'タイトル生成中にエラーが発生しました');
        setActiveTab('input');
      } else {
        setError('タイトル生成中にエラーが発生しました');
        setActiveTab('input');
      }
    } catch (err: any) {
      console.error("Error during API call:", err);
      setError(`サーバーに接続できませんでした: ${err.message || ''}`);
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
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="input">入力</TabsTrigger>
          <TabsTrigger value="batch">一括処理</TabsTrigger>
          <TabsTrigger value="results" disabled={!result && !loading}>結果</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3>商品画像</h3>
                </div>
                
                <MultiImageUploader onImagesAdded={handleImagesAdded} maxImages={10} />
                
                {productImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {productImages.map((image, index) => (
                      <div key={index} className="relative">
                        <Image 
                          src={image} 
                          alt={`Product ${index + 1}`} 
                          width={200}
                          height={200}
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
        
        <TabsContent value="batch">
          <BatchProcessing />
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
                  </CardHeader>
                  <CardContent>
                    <ResultsList 
                      results={result.title_alternatives}
                      isMultipleProducts={result.title_alternatives.length > 1} 
                    />
                  </CardContent>
                </Card>
              )}
              
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>マクロデータ出力</CardTitle>
                  <CardDescription>各マーケットプレイス向けデータ</CardDescription>
                </CardHeader>
                <CardContent>
                  <MacroExportCard 
                    macroData={result.macro_data} 
                    marketplaceVariants={result.marketplace_variants}
                    titleValidation={result.title_validation}
                    dataQuality={result.data_quality}
                  />
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
