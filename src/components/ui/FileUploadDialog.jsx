import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, File, Loader2, Plus, Tag } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
  title = "Upload Files",
  description = "Upload and categorize your files",
  categoryOptions = [],
  categoryLabel = "Category",
  acceptedFileTypes = "*",
  multiple = true,
  showTags = true,
  showDescription = true,
  uploading = false
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (index) => {
    setTags(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file");
      return;
    }

    if (categoryOptions.length > 0 && !category) {
      alert("Please select a category");
      return;
    }

    const metadata = {
      category,
      description: description.trim(),
      tags
    };

    await onUpload(selectedFiles, metadata);
    
    // Reset form
    setSelectedFiles([]);
    setCategory("");
    setDescription("");
    setTags([]);
    setCurrentTag("");
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setCategory("");
    setDescription("");
    setTags([]);
    setCurrentTag("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Selection */}
          <div className="space-y-3">
            <Label>Select Files</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
              <input
                type="file"
                multiple={multiple}
                accept={acceptedFileTypes}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
                disabled={uploading}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-700 font-medium mb-1">
                  Click to select {multiple ? 'files' : 'file'}
                </p>
                <p className="text-sm text-slate-500">
                  {acceptedFileTypes === ".pdf" ? "PDF files only" : 
                   acceptedFileTypes === "*" ? "Any file type" : 
                   `Accepted: ${acceptedFileTypes}`}
                </p>
              </label>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Selected Files ({selectedFiles.length})</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Selection */}
          {categoryOptions.length > 0 && (
            <div className="space-y-2">
              <Label>{categoryLabel} <span className="text-red-500">*</span></Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags Input */}
          {showTags && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags for better searchability..."
                  disabled={uploading}
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!currentTag.trim() || uploading}
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(index)}
                        className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                        disabled={uploading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                💡 Add keywords like: "technical", "financial", "DoD", "2024", etc.
              </p>
            </div>
          )}

          {/* Description */}
          {showDescription && (
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the file content..."
                rows={3}
                disabled={uploading}
              />
            </div>
          )}

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              <strong>📋 Organizing your files:</strong> Proper categorization and tags make it easier 
              to find documents later and help AI understand the context better.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={selectedFiles.length === 0 || uploading || (categoryOptions.length > 0 && !category)}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}` : 'Files'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}