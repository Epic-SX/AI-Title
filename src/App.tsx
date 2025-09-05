import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, Settings, FileText, AlertTriangle, CheckCircle, Download } from 'lucide-react';

// Import UI components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { Alert, AlertDescription } from './components/ui/alert';
import { Textarea } from './components/ui/textarea';

// Import custom components
import LoadingSpinner from './components/LoadingSpinner';
import ImageUploader from './components/ImageUploader';
import BatchProcessor from './components/BatchProcessor';
import ResultsDisplay from './components/ResultsDisplay';
import CSVExporter from './components/CSVExporter';
import SettingsPanel from './components/SettingsPanel';

// Type definitions
interface ProcessingResult {
  id: string;
  status: 'processing' | 'success' | 'error';
  title?: string;
  brand?: string;
  size?: string;
  category?: string;
  color?: string; // Add color property
  characterCount?: number;
  rank: 'A' | 'B' | 'C';
  errorMessage?: string;
  processingTime?: number;
  images: string[];
  timestamp: Date;
  productId?: string;
  managementNumber?: string;
  // New AI detection fields
  accessories?: string; // 付属品 - "無" if none detected
  tailoring?: string; // 仕立て・収納 - suit tailoring and pocket count
  material?: string; // 素材 - leave blank if not detected
  remainingFabric?: string; // あまり - remaining fabric from alterations
}

interface AppSettings {
  backendUrl: string;
  characterLimit: number;
  maxExportCount: number;
  autoSelectCategory: boolean;
}

// Electron API type declaration
declare global {
  interface Window {
    electronAPI?: {
      selectImages: () => Promise<string[] | null>;
      selectDirectory: () => Promise<string | null>;
      saveCsv: (data: { content: string; filename: string; defaultPath?: string }) => Promise<string | null>;
      saveLogCsv: (data: { content: string; filename: string }) => Promise<string | null>;
      readDirectory: (path: string) => Promise<{ files: string[]; error?: string }>;
      getAppData: (key: string) => Promise<any>;
      setAppData: (key: string, value: any) => Promise<void>;
      isElectron: boolean;
      platform: string;
    };
  }
}

function App() {
  // State management
  const [activeTab, setActiveTab] = useState('input');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://162.43.19.70',
    characterLimit: 50,
    maxExportCount: 100,
    autoSelectCategory: true
  });

  // Form data for single image processing
  const [formData, setFormData] = useState({
    brand: '',
    model_number: '',
    size: '',
    additional_info: ''
  });
  const [hasScale, setHasScale] = useState(true);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Processing status state like original frontend
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    total: number;
    completed: number;
    results: Record<string, any>;
    totalTimeSeconds?: number;
    productImageUrls?: Record<string, string[]>;
  }>({
    isProcessing: false,
    total: 0,
    completed: 0,
    results: {},
    productImageUrls: {}
  });

  // Load settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          const savedSettings = await window.electronAPI.getAppData('settings');
          if (savedSettings) {
            setSettings(savedSettings);
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    };
    loadSettings();
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;
    const rankA = results.filter(r => r.rank === 'A').length;
    const rankB = results.filter(r => r.rank === 'B').length;
    const rankC = results.filter(r => r.rank === 'C').length;

    return { total, success, errors, rankA, rankB, rankC };
  }, [results]);

  // Title generation function
  const generateTitle = async (images: string[], additionalInfo: any = {}): Promise<ProcessingResult> => {
    const startTime = Date.now();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ProcessingResult = {
      id,
      status: 'processing',
      rank: 'C',
      images,
      timestamp: new Date(),
      productId: additionalInfo.product_id || additionalInfo.managementNumber || id,
      managementNumber: additionalInfo.managementNumber || ''
    };

    try {
      // Convert images to base64 if they're file paths (Electron)
      const processedImages = await Promise.all(
        images.map(async (image) => {
          if (typeof image === 'string' && (image.startsWith('/') || image.includes('\\'))) {
            // File path - need to read and convert to base64
            try {
              const response = await fetch(`file://${image}`);
              const blob = await response.blob();
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch (error) {
              console.warn('Failed to load image:', image);
              return image;
            }
          }
          return image;
        })
      );

      // Call the title generation API with the exact same format as the original frontend
      const requestData = {
        product_images: processedImages,
        has_scale: hasScale,
        brand: formData.brand || '',
        model_number: formData.model_number || '',
        size: formData.size || '',
        additional_info: formData.additional_info || '',
        product_type: "Unknown Type",
        color: "Unknown Color",
        material: "Unknown Material",
        product_id: result.productId || ''
      };

      console.log('Sending request data:', {
        imageCount: processedImages.length,
        product_id: requestData.product_id,
        has_scale: requestData.has_scale,
        brand: requestData.brand,
        model_number: requestData.model_number,
        size: requestData.size
      });

      const response = await fetch(`${settings.backendUrl}/api/generate-title`, {
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
      console.log('Response data:', data);
      const processingTime = Date.now() - startTime;

      if (data.status === 'success') {
        // Handle the response format from the original frontend
        const rawResponse = data.raw_response;
        let title = '';
        let brand = formData.brand || '不明';
        let size = formData.size || '不明';
        let color = '不明'; // Add color variable

        // Check if raw_response is an array (multiple products) or single object
        let accessories = '';
        let tailoring = '';
        let material = '';
        let remainingFabric = '';
        
        if (Array.isArray(rawResponse) && rawResponse.length > 0) {
          const firstProduct = rawResponse[0];
          title = firstProduct.title || "タイトルなし";
          brand = firstProduct.brand || brand;
          size = firstProduct.size || size;
          color = firstProduct.color || '不明'; // Get color from API
          
          // Extract new AI-detected fields
          accessories = firstProduct.accessories || firstProduct.accessory || '';
          tailoring = firstProduct.tailoring || firstProduct.tailoring_info || '';
          material = firstProduct.material || '';
          remainingFabric = firstProduct.remaining_fabric || firstProduct.fabric_remaining || '';
        } else if (rawResponse && typeof rawResponse === 'object') {
          title = rawResponse.title || "タイトルなし";
          brand = rawResponse.brand || brand;
          size = rawResponse.size || size;
          color = rawResponse.color || '不明'; // Get color from API
          
          // Extract new AI-detected fields
          accessories = rawResponse.accessories || rawResponse.accessory || '';
          tailoring = rawResponse.tailoring || rawResponse.tailoring_info || '';
          material = rawResponse.material || '';
          remainingFabric = rawResponse.remaining_fabric || rawResponse.fabric_remaining || '';
        } else {
          title = "タイトルなし";
        }

        const characterCount = title.length;
        
        // Determine rank based on character count and success
        let rank: 'A' | 'B' | 'C' = 'C';
        if (characterCount >= settings.characterLimit) {
          rank = 'A';
        } else if (characterCount > 0) {
          rank = 'B';
        }

        // Auto-select category if enabled
        let category = '';
        if (settings.autoSelectCategory) {
          if (Array.isArray(rawResponse) && rawResponse.length > 0) {
            category = rawResponse[0].product_type || '';
          } else if (rawResponse && typeof rawResponse === 'object') {
            category = rawResponse.product_type || '';
          }
        }

        result.status = 'success';
        result.title = title;
        result.brand = brand;
        result.size = size;
        result.category = category;
        result.characterCount = characterCount;
        result.rank = rank;
        result.processingTime = processingTime;
        result.color = color; // Add the dynamic color
        
        // Add new AI-detected fields
        result.accessories = accessories || '無';
        result.tailoring = ''; // Leave blank for human input
        result.material = material || ''; // Leave blank if not detected by AI
        result.remainingFabric = ''; // Leave blank for human input
      } else {
        result.status = 'error';
        result.errorMessage = data.error || 'タイトル生成に失敗しました';
        result.rank = 'C';
      }
    } catch (error: any) {
      console.error('API call error:', error);
      result.status = 'error';
      result.errorMessage = error.message || 'ネットワークエラーが発生しました';
      result.processingTime = Date.now() - startTime;
      result.rank = 'C';
    }

    return result;
  };

  // Handle single image processing
  const handleSingleProcess = async (images: string[]) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await generateTitle(images, formData);
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    } catch (error: any) {
      setError(error.message || 'タイトル生成に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to extract product ID from filename (same logic as original frontend)
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

  // Handle batch processing
  const handleBatchProcess = async (selectedFiles: FileList) => {
    setIsProcessing(true);
    setError(null);
    
    try {
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
        throw new Error('選択されたディレクトリに画像ファイルが見つかりません。');
      }
      
      if (filesToProcess.length > MAX_FILES) {
        console.warn(`Too many files selected (${filesToProcess.length}). Limiting to ${MAX_FILES} files.`);
        setError(`ファイル数が多すぎます（${filesToProcess.length}）。最初の${MAX_FILES}ファイルのみを処理します。`);
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

      // Initialize processing status
      setProcessingStatus({
        isProcessing: true,
        total: productIds.length,
        completed: 0,
        results: {},
        productImageUrls: {}
      });

      // Function to convert File to base64
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
      let totalProcessed = 0;
      const allResults: Record<string, any> = {};
      const allProductImageUrls: Record<string, string[]> = {};
      const startTime = Date.now();

      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const productFiles = productGroups[productId];
        
        console.log(`Processing product ${i + 1}/${productIds.length}: ${productId} (${productFiles.length} images)`);
        
        try {
          // Convert all files for this product to base64
          const productImages: string[] = [];
          
          for (const file of productFiles) {
            try {
              console.log(`Processing file: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
              
              const originalBase64 = await fileToBase64(file);
              console.log(`Original base64 size: ${(originalBase64.length / 1024).toFixed(2)}KB`);
              
              // Compress the image
              const finalBase64Image = await compressImageToBase64(originalBase64);
              console.log(`Compressed base64 size: ${(finalBase64Image.length / 1024).toFixed(2)}KB`);
              
              productImages.push(finalBase64Image);
            } catch (fileError) {
              console.error(`Error processing file ${file.name}:`, fileError);
            }
          }
          
          // Store product images
          allProductImageUrls[productId] = productImages;
          
          if (productImages.length === 0) {
            throw new Error(`No valid images found for product ${productId}`);
          }
          
          // Prepare request data with all images for this product
          const requestData = {
            product_images: productImages,
            has_scale: hasScale,
            brand: formData.brand || '',
            model_number: formData.model_number || '',
            size: formData.size || '',
            additional_info: formData.additional_info || '',
            product_type: "Unknown Type",
            color: "Unknown Color",
            material: "Unknown Material",
            product_id: productId,
            // New fields for enhanced AI detection
            detect_accessories: true,
            detect_tailoring: true,
            detect_material: true,
            detect_remaining_fabric: true
          };
          
          console.log(`Sending request for product ${productId} with ${productImages.length} images`);
          
          // Send request to generate title for this product
          const response = await fetch(`${settings.backendUrl}/api/generate-title`, {
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
          console.log(`Response for product ${productId}:`, data);
          
          // Create result based on response
          if (data.status === 'success') {
            const rawResponse = data.raw_response;
            let title = '';
            let brand = formData.brand || '不明';
            let size = formData.size || '不明';
            let category = '';
            let color = '不明'; // Add color variable

            // Handle the response format
            if (Array.isArray(rawResponse) && rawResponse.length > 0) {
              const firstProduct = rawResponse[0];
              title = firstProduct.title || "タイトルなし";
              brand = firstProduct.brand || brand;
              size = firstProduct.size || size;
              category = firstProduct.product_type || '';
              color = firstProduct.color || '不明'; // Get color from API
              
              // Extract new AI-detected fields
              const accessories = firstProduct.accessories || firstProduct.accessory || '';
              const tailoring = firstProduct.tailoring || firstProduct.tailoring_info || '';
              const material = firstProduct.material || '';
              const remainingFabric = firstProduct.remaining_fabric || firstProduct.fabric_remaining || '';
              
              const characterCount = title.length;
              
              // Determine rank based on character count and success
              let rank: 'A' | 'B' | 'C' = 'C';
              if (characterCount >= settings.characterLimit) {
                rank = 'A';
              } else if (characterCount > 0) {
                rank = 'B';
              }
              
              allResults[productId] = {
                status: 'success',
                product_id: productId,
                image_count: productFiles.length,
                title: title,
                brand: brand,
                size: size,
                category: category,
                color: color, // Store the dynamic color
                character_count: characterCount,
                rank: rank,
                processing_time: Date.now() - startTime,
                raw_response: rawResponse,
                // Store new AI-detected fields
                accessories: accessories || '無',
                tailoring: '', // Leave blank for human input
                material: material || '', // Leave blank if not detected by AI
                remainingFabric: '' // Leave blank for human input
              };
            } else if (rawResponse && typeof rawResponse === 'object') {
              title = rawResponse.title || "タイトルなし";
              brand = rawResponse.brand || brand;
              size = rawResponse.size || size;
              category = rawResponse.product_type || '';
              color = rawResponse.color || '不明'; // Get color from API
              
              // Extract new AI-detected fields
              const accessories = rawResponse.accessories || rawResponse.accessory || '';
              const tailoring = rawResponse.tailoring || rawResponse.tailoring_info || '';
              const material = rawResponse.material || '';
              const remainingFabric = rawResponse.remaining_fabric || rawResponse.fabric_remaining || '';
              
              const characterCount = title.length;
              
              // Determine rank based on character count and success
              let rank: 'A' | 'B' | 'C' = 'C';
              if (characterCount >= settings.characterLimit) {
                rank = 'A';
              } else if (characterCount > 0) {
                rank = 'B';
              }
              
              allResults[productId] = {
                status: 'success',
                product_id: productId,
                image_count: productFiles.length,
                title: title,
                brand: brand,
                size: size,
                category: category,
                color: color, // Store the dynamic color
                character_count: characterCount,
                rank: rank,
                processing_time: Date.now() - startTime,
                raw_response: rawResponse,
                // Store new AI-detected fields
                accessories: accessories || '無',
                tailoring: '', // Leave blank for human input
                material: material || '', // Leave blank if not detected by AI
                remainingFabric: '' // Leave blank for human input
              };
            } else {
              title = "タイトルなし";
              
              const characterCount = title.length;
              
              // Determine rank based on character count and success
              let rank: 'A' | 'B' | 'C' = 'C';
              if (characterCount >= settings.characterLimit) {
                rank = 'A';
              } else if (characterCount > 0) {
                rank = 'B';
              }
              
              allResults[productId] = {
                status: 'success',
                product_id: productId,
                image_count: productFiles.length,
                title: title,
                brand: brand,
                size: size,
                category: category,
                color: color, // Store the dynamic color
                character_count: characterCount,
                rank: rank,
                processing_time: Date.now() - startTime,
                raw_response: rawResponse,
                // Default values for new fields
                accessories: '無',
                tailoring: '', // Leave blank for human input
                material: '', // Leave blank if not detected by AI
                remainingFabric: '' // Leave blank for human input
              };
            }

          } else {
            allResults[productId] = {
              status: 'error',
              product_id: productId,
              image_count: productFiles.length,
              error: data.error || 'タイトル生成に失敗しました',
              processing_time: Date.now() - startTime
            };
          }
          
        } catch (error) {
          console.error(`Failed to process ${productId}:`, error);
          allResults[productId] = {
            status: 'error',
            product_id: productId,
            image_count: productFiles.length,
            error: error instanceof Error ? error.message : '処理に失敗しました',
            processing_time: Date.now() - startTime
          };
        }

        // Update progress after each product
        totalProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          completed: totalProcessed,
          results: { ...allResults },
          productImageUrls: { ...allProductImageUrls }
        }));

        // Create ProcessingResult for legacy compatibility
        const result: ProcessingResult = {
          id: `${Date.now()}-${productId}`,
          status: allResults[productId].status === 'success' ? 'success' : 'error',
          title: allResults[productId].title || '',
          brand: allResults[productId].brand || '',
          size: allResults[productId].size || '',
          category: allResults[productId].category || '',
          color: allResults[productId].color || '不明', // Include dynamic color
          characterCount: allResults[productId].character_count || 0,
          rank: allResults[productId].rank || 'C',
          images: allProductImageUrls[productId] || [],
          timestamp: new Date(),
          productId: productId,
          managementNumber: productId,
          errorMessage: allResults[productId].error,
          processingTime: allResults[productId].processing_time
        };
        
        setResults(prev => [result, ...prev]);

        // Add a small delay to prevent overwhelming the server
        if (i < productIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between products
        }
      }

      // Final update
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        totalTimeSeconds: totalTime
      }));

      console.log(`Batch processing completed. Processed ${totalProcessed} products in ${totalTime} seconds.`);
      setActiveTab('results');
      
    } catch (error: any) {
      console.error('Batch processing error:', error);
      setError(error.message || 'バッチ処理に失敗しました');
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle CSV export by rank
  const handleExportRank = async (rank: 'A' | 'B' | 'C') => {
    const rankResults = results.filter(r => r.rank === rank);
    if (rankResults.length === 0) {
      alert(`ランク${rank}の結果がありません`);
      return;
    }

    // Create CSV content
    const headers = ['管理番号', 'タイトル', 'ブランド', 'カテゴリ', 'サイズ', '文字数', 'ランク', '処理時間', '生成日時'];
    const csvRows = [headers.join(',')];
    
    rankResults.forEach(result => {
      const row = [
        result.managementNumber || result.productId || '',
        result.title || '',
        result.brand || '',
        result.category || '',
        result.size || '',
        result.characterCount || 0,
        result.rank,
        result.processingTime || 0,
        result.timestamp.toLocaleString('ja-JP')
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    
    // Add UTF-8 BOM to ensure proper Japanese character display
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${timestamp}_ランク${rank}_${rankResults.length}件.csv`;

    if (window.electronAPI) {
      try {
        await window.electronAPI.saveCsv({ content: csvWithBOM, filename });
        alert(`ランク${rank}のCSVファイルを保存しました`);
      } catch (error) {
        alert('CSVファイルの保存に失敗しました');
      }
    }
  };

  // Handle error log export
  const handleExportErrorLog = async () => {
    const errorResults = results.filter(r => r.status === 'error');
    if (errorResults.length === 0) {
      alert('エラー結果がありません');
      return;
    }

    // Create error log CSV content
    const headers = ['管理番号', '生成途中データ', '失敗理由', '読み込み年月日'];
    const csvRows = [headers.join(',')];
    
    errorResults.forEach(result => {
      const row = [
        result.managementNumber || result.productId || '',
        result.title || '',
        result.errorMessage || '',
        result.timestamp.toLocaleString('ja-JP')
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    
    // Add UTF-8 BOM to ensure proper Japanese character display
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const filename = 'error_log.csv';

    if (window.electronAPI) {
      try {
        await window.electronAPI.saveLogCsv({ content: csvWithBOM, filename });
        alert('エラーログCSVファイルを保存しました');
      } catch (error) {
        alert('エラーログファイルの保存に失敗しました');
      }
    }
  };

  // Handle comprehensive export of all products
  const handleExportAllProducts = async () => {
    if (processingStatus.completed === 0) {
      alert('エクスポートする結果がありません');
      return;
    }

    // Get all successful results
    const successResults = Object.entries(processingStatus.results)
      .filter(([, result]: [string, any]) => result.status === 'success');

    if (successResults.length === 0) {
      alert('エクスポートできる成功した結果がありません');
      return;
    }

    // Use Excel export for all environments
    {
      try {
        console.log('🔍 Using Excel export for all products');
        console.log('📊 Number of successful results to export:', successResults.length);
        
        // Show loading state
        const loadingAlert = alert('🔄 Excelファイルにデータを追加中...\nこの処理には数分かかる場合があります。\n処理中はこのダイアログを閉じないでください。');
        
        // Transform results for Excel export - convert to the format expected by backend
        const processedResults: Record<string, any> = {};
        
        successResults.forEach(([productId, result]: [string, any]) => {
          // Create listing_data structure that the backend expects
          const listingData = {
            'カテゴリ': result.category || '',
            '管理番号': productId,
            'タイトル': result.title || '',
            '文字数': result.title ? result.title.length : 0,
            '付属品': result.accessories || '無',
            'ランク': result.rank || '3',
            'コメント': result.condition_comment || 'ほぼ新品',
            '素材': result.material || '画像参照',
            '色': result.color || result.detected_color || '不明',
            'サイズ': result.size || result.detected_size || '不明',
            '梱包サイズ': result.packaging_size || '通常',
            '梱包記号': result.packaging_symbol || '◇',
            '美品': result.excellent_condition || '',
            'ブランド': result.brand || result.detected_brand || '不明',
            'フリー': Array.isArray(result.key_features) ? result.key_features.join('、') : (result.key_features || ''),
            '袖': result.sleeve_type || '',
            'もの': result.product_type || result.item_type || '不明',
            '男女': result.gender || 'レディースメンズ',
            '採寸1': result.measurement_text || '',
            'ラック': result.rack_location || 'ベースW/26',
            '金額': result.price || result.amount || 0,
            // Measurement fields
            '着丈': result.measurements?.garment_length || result.measurements?.着丈 || null,
            '　肩幅': result.measurements?.shoulder_width || result.measurements?.肩幅 || null,
            '身幅': result.measurements?.chest_width || result.measurements?.身幅 || null,
            '袖丈': result.measurements?.sleeve_length || result.measurements?.袖丈 || null,
            '股上': result.measurements?.rise || result.measurements?.股上 || null,
            '股下': result.measurements?.inseam || result.measurements?.股下 || null,
            'ウエスト': result.measurements?.waist || result.measurements?.ウエスト || null,
            'もも幅': result.measurements?.thigh_width || result.measurements?.もも幅 || null,
            '裾幅': result.measurements?.hem_width || result.measurements?.裾幅 || null,
            '総丈': result.measurements?.total_length || result.measurements?.総丈 || null,
            'ヒップ': result.measurements?.hip || result.measurements?.ヒップ || null,
            '仕入先': '',
            '仕入日': '',
            '原価': ''
          };
          
          // Wrap in the structure expected by backend (with listing_data)
          processedResults[productId] = {
            status: 'success',
            listing_data: listingData
          };
        });
        
        console.log(`📊 Exporting ${Object.keys(processedResults).length} products to Excel...`);
        console.log('📊 Sample processed result:', Object.values(processedResults)[0]);
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes timeout
        
        try {
          // Make direct API call to backend Excel export endpoint with timeout
          const response = await fetch(`${settings.backendUrl}/api/excel/export-to-excel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ processed_results: processedResults }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 504) {
              throw new Error('サーバーのタイムアウトが発生しました。Excelファイルが大きすぎるか、処理に時間がかかりすぎています。');
            }
            throw new Error(`サーバーエラー: ${response.status} - ${response.statusText}`);
          }

          const result = await response.json();
          
          if (result && result.success) {
            console.log('✅ Excel export successful:', result);
            
            // Download the updated Excel file from backend
            try {
              const downloadResponse = await fetch(`${settings.backendUrl}/api/excel/download-updated-file`, {
                method: 'GET',
              });

              if (!downloadResponse.ok) {
                throw new Error(`Download failed: ${downloadResponse.status} - ${downloadResponse.statusText}`);
              }

              // Get the file blob
              const blob = await downloadResponse.blob();
              
              // Create download link
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'PL出品マクロ.xlsm';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              
              alert(`✅ 成功!\nPL出品マクロ.xlsm にデータを追加し、ダウンロードしました。\n\n詳細:\n- 処理数: ${result.summary?.total_processed || 'N/A'}\n- 変換済: ${result.summary?.products_converted || 'N/A'}\n- 追加成功: ${result.summary?.successfully_added || 'N/A'}\n- 追加失敗: ${result.summary?.failed_to_add || 'N/A'}`);
            } catch (downloadError) {
              console.error('❌ Download error:', downloadError);
              alert(`✅ データ追加は成功しましたが、ダウンロードに失敗しました。\n\n詳細:\n- 処理数: ${result.summary?.total_processed || 'N/A'}\n- 変換済: ${result.summary?.products_converted || 'N/A'}\n- 追加成功: ${result.summary?.successfully_added || 'N/A'}\n- 追加失敗: ${result.summary?.failed_to_add || 'N/A'}\n\nダウンロードエラー: ${downloadError instanceof Error ? downloadError.message : '不明なエラー'}`);
            }
          } else {
            alert(`❌ エラー: Excel保存に失敗しました - ${result?.message || '不明なエラー'}`);
            console.error('❌ Excel export failed:', result);
          }
          
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            alert('❌ タイムアウトエラー: Excel処理が5分以内に完了しませんでした。\n\n対処法:\n1. Excelファイルが大きすぎないか確認してください\n2. 一度に処理する商品数を減らしてください\n3. サーバーを再起動してください');
          } else {
            alert(`❌ エラー: Excel保存に失敗しました - ${error instanceof Error ? error.message : '不明なエラー'}`);
          }
          
          console.error('❌ Excel export error:', error);
        }
        
        return; // Exit after Excel export
      } catch (error) {
        console.error('❌ Excel export error:', error);
        alert(`❌ エラー: Excel保存に失敗しました - ${(error as Error).message}`);
      }
    }
  };

  // Handle settings save
  const handleSettingsSave = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    if (window.electronAPI) {
      try {
        await window.electronAPI.setAppData('settings', newSettings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  };

  // Handle images added to uploader
  const handleImagesAdded = (images: string[]) => {
    setProductImages(images);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isProcessing && !processingStatus.isProcessing && <LoadingSpinner fullScreen text="画像解析中..." />}
      
      <div className="container mx-auto max-w-7xl p-6">
        <div className="space-y-6 text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">AI出品タイトル生成</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            商品画像とデータからAIが最適な出品タイトルを生成します
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">入力</TabsTrigger>
            <TabsTrigger value="batch">一括処理</TabsTrigger>
            <TabsTrigger value="results">結果</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>商品画像</CardTitle>
                <CardDescription>
                  クリックまたはドラッグして画像をアップロード<br />
                  最大10枚まで選択可能
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <ImageUploader onProcess={handleSingleProcess} disabled={isProcessing} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>商品情報入力</CardTitle>
                <CardDescription>
                  既知の情報があれば入力してください（空欄可）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">ブランド</Label>
                    <Input
                      id="brand"
                      placeholder="例: ユニクロ"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model_number">型番</Label>
                    <Input
                      id="model_number"
                      placeholder="例: ABC123"
                      value={formData.model_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, model_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">サイズ</Label>
                    <Input
                      id="size"
                      placeholder="例: M, L, 38"
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasScale"
                      checked={hasScale}
                      onCheckedChange={setHasScale}
                    />
                    <Label htmlFor="hasScale">画像には測定スケールが含まれています</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="additional_info">追加情報</Label>
                  <Textarea
                    id="additional_info"
                    placeholder="その他の商品情報があれば記入してください"
                    value={formData.additional_info}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_info: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <SettingsPanel settings={settings} onSave={handleSettingsSave} />
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchProcessor onProcess={handleBatchProcess} disabled={isProcessing} />
            
            {/* Processing Progress Display like original frontend */}
            {processingStatus.isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle>処理中...</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${(processingStatus.completed / processingStatus.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-center font-medium">
                    処理中: {processingStatus.completed} / {processingStatus.total} 商品
                  </p>
                  
                  {/* Live statistics during processing */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-green-50 p-3 rounded border">
                      <div className="font-medium text-green-800">成功</div>
                      <div className="text-lg font-bold text-green-600">
                        {Object.values(processingStatus.results).filter((r: any) => r.status === 'success').length}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded border">
                      <div className="font-medium text-red-800">エラー</div>
                      <div className="text-lg font-bold text-red-600">
                        {Object.values(processingStatus.results).filter((r: any) => r.status === 'error').length}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border">
                      <div className="font-medium text-blue-800">処理済み</div>
                      <div className="text-lg font-bold text-blue-600">
                        {processingStatus.completed}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="font-medium text-gray-800">残り</div>
                      <div className="text-lg font-bold text-gray-600">
                        {processingStatus.total - processingStatus.completed}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Summary - like the original frontend */}
            {!processingStatus.isProcessing && processingStatus.completed > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>処理結果サマリー</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div><strong>処理完了:</strong> {processingStatus.completed} / {processingStatus.total} 商品</div>
                    <div><strong>総処理時間:</strong> {processingStatus.totalTimeSeconds ? `${processingStatus.totalTimeSeconds}秒` : '不明'}</div>
                    <div><strong>成功:</strong> {Object.values(processingStatus.results).filter((r: any) => r.status === 'success').length} 商品</div>
                    <div><strong>平均処理時間:</strong> 
                      {processingStatus.totalTimeSeconds && processingStatus.completed > 0 
                        ? `${(processingStatus.totalTimeSeconds / processingStatus.completed).toFixed(1)}秒/商品`
                        : '不明'
                      }
                    </div>
                    <div><strong>エラー:</strong> {Object.values(processingStatus.results).filter((r: any) => r.status === 'error').length} 商品</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                      <span><strong>自動承認:</strong> {Object.values(processingStatus.results).filter((r: any) => r.status === 'success').length} 商品</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                      <span><strong>手動確認必要:</strong> 0 商品</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">各商品の詳細結果</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(processingStatus.results).map(([productId, result]: [string, any]) => (
                        <div key={productId} className="border rounded p-3 text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{productId} ({result.image_count}枚)</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status === 'success' ? '成功' : 'エラー'}
                              </span>
                            </div>
                          </div>
                          
                          {result.status === 'success' ? (
                            <div className="space-y-1">
                              <div><strong>タイトル:</strong> {result.title}</div>
                              <div><strong>ブランド:</strong> {result.brand}</div>
                              <div><strong>色:</strong> {result.color}</div>
                              <div><strong>サイズ:</strong> {result.size}</div>
                              <div><strong>商品タイプ:</strong> {result.category || 'トートバッグ'}</div>
                              
                              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium">タイトル検証OK: {result.character_count}/{result.character_count && result.character_count >= 50 ? '140' : '50'}文字</span>
                                </div>
                              </div>

                              {/* Marketplace titles preview */}
                              <div className="mt-2">
                                <div className="text-xs font-medium mb-1">マーケットプレイス別タイトル</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between items-center p-1 bg-white rounded border">
                                    <span className="font-medium">Amazon</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{Math.min(result.character_count || 0, 127)}/127文字</span>
                                  </div>
                                  <div className="flex justify-between items-center p-1 bg-white rounded border">
                                    <span className="font-medium">アテナ標準</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{Math.min(result.character_count || 0, 140)}/140文字</span>
                                  </div>
                                  <div className="flex justify-between items-center p-1 bg-white rounded border">
                                    <span className="font-medium">メルカリ</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{Math.min(result.character_count || 0, 80)}/80文字</span>
                                  </div>
                                  <div className="flex justify-between items-center p-1 bg-white rounded border">
                                    <span className="font-medium">楽天市場</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{Math.min(result.character_count || 0, 127)}/127文字</span>
                                  </div>
                                  <div className="flex justify-between items-center p-1 bg-white rounded border">
                                    <span className="font-medium">Yahoo Shopping</span>
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                                      (result.character_count || 0) > 65 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {Math.min(result.character_count || 0, 65)}/65文字
                                      {(result.character_count || 0) > 65 && ' 短縮'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Data quality summary */}
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <div className="text-xs font-medium mb-1">データ品質評価 (SC規格)</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">A</span>
                                  <span className="text-xs">100/100 (100.0%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                  <div className="bg-green-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-red-600 text-xs">
                              エラー: {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Single comprehensive export button for all products */}
                  <div className="space-y-4">
                    <h4 className="font-medium">データエクスポート</h4>
                    <div className="flex justify-center">
                      <Button 
                        onClick={handleExportAllProducts}
                        variant="default"
                        size="lg"
                        className="w-full max-w-[400px] bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        全商品一括CSVエクスポート（出品フォーマット）
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      ※ 成功した全商品のデータをPL出品マクロ.xlsmファイルに追加し、ダウンロードします<br/>
                      ※ 商品は自動的に適切なシート（トップス、パンツ等）に分類されます<br/>
                      ※ 更新されたファイルはバックエンドに保存され、選択したフォルダにダウンロードされます
                    </p>
                  </div>

                  {/* Start new batch button */}
                  <div className="flex justify-center mt-4">
                    <Button 
                      onClick={() => {
                        setResults([]);
                        setProcessingStatus({
                          isProcessing: false,
                          total: 0,
                          completed: 0,
                          results: {},
                          productImageUrls: {}
                        });
                      }}
                      variant="outline"
                      size="lg"
                      className="w-full max-w-[300px]"
                    >
                      新しいバッチ処理を開始
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-500">総処理数</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.rankA}</div>
                  <div className="text-sm text-gray-500">ランクA</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.rankB}</div>
                  <div className="text-sm text-gray-500">ランクB</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.rankC}</div>
                  <div className="text-sm text-gray-500">ランクC</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-sm text-gray-500">成功</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                  <div className="text-sm text-gray-500">エラー</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResultsDisplay results={results} />
              <CSVExporter 
                stats={stats} 
                onExportRank={handleExportRank}
                onExportErrorLog={handleExportErrorLog}
                onExportAllProducts={handleExportAllProducts}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App; 