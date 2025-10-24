import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string; // Current image URL
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  onRemove?: () => Promise<{ success: boolean; error?: string }>;
  className?: string;
  placeholder?: string;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  previewSize?: 'small' | 'medium' | 'large'; // Preview image size
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onUpload,
  onRemove,
  className,
  placeholder = "Upload an image",
  accept = "image/*",
  maxSize = 5,
  disabled = false,
  previewSize = 'large'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const result = await onUpload(file);
      if (result.success && result.url) {
        onChange(result.url);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const getPreviewHeightClass = () => {
    switch (previewSize) {
      case 'small':
        return 'h-16'; // 64px - good for favicons
      case 'medium':
        return 'h-32'; // 128px - good for logos
      case 'large':
        return 'h-48'; // 192px - good for hero/large images
      default:
        return 'h-48';
    }
  };

  const getObjectFitClass = () => {
    // Use object-contain for small/medium (logos, favicons) to prevent stretching
    // Use object-cover for large images (hero, banners) to fill the space
    return previewSize === 'large' ? 'object-cover' : 'object-contain';
  };

  const handleRemove = async () => {
    if (!onRemove) {
      onChange(null);
      return;
    }

    setIsRemoving(true);
    setError(null);
    try {
      const result = await onRemove();
      if (result.success) {
        onChange(null);
      } else {
        setError(result.error || 'Remove failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Image Display */}
      {value && (
        <Card>
          <CardContent className="p-4">
            <div className={cn(
              "relative group",
              previewSize !== 'large' && "bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
            )}>
              <img
                src={value}
                alt="Uploaded image"
                className={cn("w-full rounded-lg", getPreviewHeightClass(), getObjectFitClass())}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={disabled || isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Replace
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      {!value && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={openFileDialog}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              {isUploading ? (
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isUploading ? 'Uploading...' : placeholder}
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop an image here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Max size: {maxSize}MB
                </p>
              </div>

              {!disabled && !isUploading && (
                <Button variant="outline" size="sm" type="button">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};
