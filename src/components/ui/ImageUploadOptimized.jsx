import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedImage from "./OptimizedImage";
import { toast } from "sonner";

/**
 * Image Upload with Automatic Optimization
 * Handles file upload, optimization, and preview
 */
export default function ImageUploadOptimized({
  label = "Upload Image",
  currentImageUrl,
  onUploadComplete,
  maxWidth = 1920,
  quality = 85,
  generateThumbnail = true,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMB = 10,
  className,
  showPreview = true,
  aspectRatio = "16/9"
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`Image must be less than ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('maxWidth', maxWidth.toString());
      formData.append('quality', quality.toString());
      formData.append('generateThumbnail', generateThumbnail.toString());

      setUploadProgress(40);

      // Call optimization function
      const response = await base44.functions.invoke('optimizeImage', formData);

      setUploadProgress(80);

      if (response.data.success) {
        const result = response.data;
        setOptimizationResult(result);
        setPreviewUrl(result.optimized_url);
        setUploadProgress(100);

        toast.success('Image uploaded and optimized!');

        // Return all URLs to parent component
        if (onUploadComplete) {
          onUploadComplete({
            original: result.original_url,
            optimized: result.optimized_url,
            thumbnail: result.thumbnail_url,
            medium: result.medium_url,
            large: result.large_url,
            fileName: result.file_name,
            fileSize: result.file_size
          });
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Upload failed: ' + error.message);
      setOptimizationResult(null);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setOptimizationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onUploadComplete) {
      onUploadComplete(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && <Label>{label}</Label>}

      {/* Upload Area */}
      {!previewUrl ? (
        <Card className={cn(
          "border-2 border-dashed transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50",
          uploading && "border-blue-500 bg-blue-50"
        )}>
          <CardContent className="p-8">
            <label className="cursor-pointer flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              
              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
                  <p className="text-sm font-medium text-blue-700">
                    Optimizing image...
                  </p>
                  <div className="w-full max-w-xs mt-3">
                    <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Click to upload image
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WebP up to {maxSizeMB}MB
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ⚡ Auto-optimized for web
                  </p>
                </>
              )}
            </label>
          </CardContent>
        </Card>
      ) : (
        /* Preview Area */
        <div className="space-y-2">
          {showPreview && (
            <Card className="border-2 border-green-300 bg-green-50 overflow-hidden">
              <CardContent className="p-0 relative group">
                <OptimizedImage
                  src={previewUrl}
                  thumbnailSrc={optimizationResult?.thumbnail_url}
                  mediumSrc={optimizationResult?.medium_url}
                  alt="Uploaded image preview"
                  aspectRatio={aspectRatio}
                  className="w-full h-auto object-cover"
                  priority={true}
                />
                
                {/* Remove button overlay */}
                <div className="absolute top-2 right-2">
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleRemove}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Success indicator */}
                <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Optimized
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimization Info */}
          {optimizationResult && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">File Size:</span>
                <span className="font-medium text-slate-900">
                  {(optimizationResult.file_size / 1024).toFixed(1)} KB
                </span>
              </div>
              {optimizationResult.optimization_note && (
                <p className="text-slate-500 text-xs mt-2">
                  ℹ️ {optimizationResult.optimization_note}
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Replace Image
          </Button>
        </div>
      )}
    </div>
  );
}