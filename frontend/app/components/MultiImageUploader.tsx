'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MultiImageUploaderProps {
  onImagesAdded: (imageDataArray: string[]) => void;
  maxImages?: number;
}

export default function MultiImageUploader({ 
  onImagesAdded, 
  maxImages = 10 
}: MultiImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('画像ファイルのみアップロードできます');
      return;
    }
    
    if (imageFiles.length > maxImages) {
      alert(`最大${maxImages}枚まで選択できます`);
      return;
    }

    const promises = imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      onImagesAdded(results);
    });
  }, [maxImages, onImagesAdded]);

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

  // Handle file selection from input
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    
    // Filter out files that are too large and not images
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];
    
    fileArray.forEach(file => {
      if (!file.type.startsWith('image/')) {
        rejectedFiles.push(`${file.name} (画像ファイルではありません)`);
      } else if (file.size > maxFileSize) {
        rejectedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB - サイズが大きすぎます)`);
      } else {
        validFiles.push(file);
      }
    });
    
    // Show error for rejected files
    if (rejectedFiles.length > 0) {
      alert(`以下のファイルは除外されました:\n${rejectedFiles.join('\n')}\n\n5MB以下の画像ファイルを使用してください。`);
    }
    
    if (validFiles.length === 0) return;
    
    if (validFiles.length > maxImages) {
      alert(`最大${maxImages}枚まで選択できます`);
      return;
    }

    // Convert valid files to base64
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
      onImagesAdded(results);
    });
  }, [maxImages, onImagesAdded]);

  return (
    <div className="w-full">
      <div
        className={`dropzone flex flex-col items-center justify-center h-[180px] p-6 ${
          isDragging ? 'dropzone-active' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('multiFileInput')?.click()}
      >
        <input
          id="multiFileInput"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center text-center">
          <Upload className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            クリックまたはドロップして画像をアップロード
          </p>
          <p className="text-xs text-muted-foreground">
            最大{maxImages}枚まで選択可能
          </p>
        </div>
      </div>
    </div>
  );
} 