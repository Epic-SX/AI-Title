'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormHydrationFixer from './FormHydrationFixer';
import LoadingSpinner from './LoadingSpinner';

interface MultiImageUploaderProps {
  onImagesAdded: (imageDataArray: string[]) => void;
  maxImages?: number;
  className?: string;
}

export default function MultiImageUploader({ 
  onImagesAdded, 
  maxImages = 10,
  className = ''
}: MultiImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  }, []);

  const processFiles = (files: File[]) => {
    // Validate all files are images
    const imageFiles = files.filter(file => file.type.match('image.*'));
    
    if (imageFiles.length === 0) {
      return;
    }
    
    if (imageFiles.length !== files.length) {
      alert('画像ファイルのみがアップロードされました');
    }
    
    setIsProcessing(true);
    const imageDataArray: string[] = [];
    let processedFiles = 0;
    
    // Process each file
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Log file metadata for debugging
        console.log("Processing image:", {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024).toFixed(2)} KB`
        });
        
        imageDataArray.push(result);
        
        processedFiles++;
        if (processedFiles === imageFiles.length) {
          // All files have been processed, now notify the parent
          onImagesAdded(imageDataArray);
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <FormHydrationFixer>
      <div className={`w-full ${className}`}>
        <div
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[220px] ${
            isDragging ? 'border-primary bg-accent/20' : 'border-border hover:border-primary hover:bg-accent/10'
          } transition-colors cursor-pointer relative`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('multiFileInput')?.click()}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner size="md" text="画像処理中..." />
            </div>
          ) : (
            <>
              <input
                id="multiFileInput"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-1">画像をドラッグ＆ドロップ</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  または、クリックして複数画像をアップロード
                </p>
                <p className="text-xs text-muted-foreground">
                  最大{maxImages}枚、JPG、PNG、GIF
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </FormHydrationFixer>
  );
} 