import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

interface ImageUploaderProps {
  onProcess: (images: string[]) => void;
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onProcess, disabled = false }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('画像ファイルのみアップロードできます');
      return;
    }
    
    if (imageFiles.length > 10) {
      setError('最大10枚まで選択できます');
      return;
    }

    // Check file sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];
    
    imageFiles.forEach(file => {
      if (file.size > maxFileSize) {
        rejectedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB - サイズが大きすぎます)`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (rejectedFiles.length > 0) {
      setError(`以下のファイルはサイズが大きすぎます (最大5MB): ${rejectedFiles.join(', ')}`);
      return;
    }

    const promises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      setSelectedImages(prev => [...prev, ...results].slice(0, 10));
      setError(null);
    });
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    processFiles(files);
  };

  const handleElectronFileSelect = async () => {
    if (window.electronAPI) {
      try {
        const filePaths = await window.electronAPI.selectImages();
        if (filePaths) {
          // In Electron, we'll pass file paths directly
          setSelectedImages(prev => [...prev, ...filePaths].slice(0, 10));
          setError(null);
        }
      } catch (error) {
        setError('ファイル選択に失敗しました');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      setIsDragging(true);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setSelectedImages([]);
    setError(null);
  };

  const handleProcess = () => {
    if (selectedImages.length === 0) {
      setError('少なくとも1つの画像をアップロードしてください');
      return;
    }
    onProcess(selectedImages);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleElectronFileSelect}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium mb-2">
          {isDragging ? '画像をドロップしてください' : 'クリックまたはドラッグして画像をアップロード'}
        </p>
        <p className="text-gray-500 mb-4">最大10枚まで選択可能</p>
        <Button variant="outline" disabled={disabled} type="button">
          <Plus className="w-4 h-4 mr-2" />
          ファイルを選択
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">選択された画像 ({selectedImages.length}/10枚)</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllImages}
              disabled={disabled}
            >
              <X className="w-4 h-4 mr-1" />
              全て削除
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedImages.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                  {image.startsWith('data:') ? (
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 p-2 text-center">
                      <div>
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        {image.split('/').pop() || image.split('\\').pop()}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process Button */}
      {selectedImages.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleProcess}
            disabled={disabled || selectedImages.length === 0}
            size="lg"
            className="w-full max-w-[300px]"
          >
            {disabled ? '処理中...' : 'タイトルを生成'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader; 