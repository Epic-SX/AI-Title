'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageDrop: (imageData: string) => void;
  initialImage?: string;
}

export default function ImageUploader({ onImageDrop, initialImage = '' }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialImage || null);

  // Update preview when initialImage changes
  useEffect(() => {
    if (initialImage) {
      setPreview(initialImage);
    }
  }, [initialImage]);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('画像ファイルのみアップロードできます');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageDrop(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full">
      <div
        className={`dropzone flex flex-col items-center justify-center h-[180px] ${
          isDragging ? 'dropzone-active' : ''
        } ${preview ? 'p-1' : 'p-6'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {!preview ? (
          <div className="flex flex-col items-center text-center">
            <Upload className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              クリックまたはドロップして画像をアップロード
            </p>
          </div>
        ) : (
          <img 
            src={preview} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  );
} 