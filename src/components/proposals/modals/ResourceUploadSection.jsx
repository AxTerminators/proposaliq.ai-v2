import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, FileText, Image, Award, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * ResourceUploadSection - File upload and metadata collection component
 * Handles file selection, metadata input, and AI processing options
 */
export default function ResourceUploadSection({
  onUploadComplete,
  organizationId,
  proposalId,
}) {
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // AI processing options
  const [ingestToRAG, setIngestToRAG] = useState(true);
  const [extractKeyData, setExtractKeyData] = useState(false);
  const [extractionFieldsDescription, setExtractionFieldsDescription] = useState("");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Handle file selection via input or drag-and-drop
   */
  const handleFileSelect = (file) => {
    if (!file) return;

    setSelectedFile(file);
    // Auto-fill title from filename
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setTitle(fileNameWithoutExt);
  };

  /**
   * Handle drag and drop events
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  /**
   * Add tag to the list
   */
  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  /**
   * Remove tag from the list
   */
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  /**
   * Clear selected file and reset form
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setResourceType("");
    setTags([]);
    setExtractKeyData(false);
    setExtractionFieldsDescription("");
  };

  /**
   * Handle upload and processing
   * TODO: Phase 4 - Implement actual backend integration
   */
  const handleUpload = async () => {
    if (!selectedFile || !resourceType) {
      alert("Please select a file and resource type");
      return;
    }

    setIsUploading(true);

    try {
      // TODO: Phase 4 - Call functions/uploadResource
      // TODO: Phase 4 - Call functions/processRAGAndExtractData
      console.log("Upload initiated:", {
        file: selectedFile.name,
        title,
        description,
        resourceType,
        tags,
        ingestToRAG,
        extractKeyData,
        extractionFieldsDescription,
      });

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clear form and notify parent
      handleClearFile();
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Get icon for resource type
   */
  const getResourceTypeIcon = (type) => {
    switch (type) {
      case "image_graphic":
        return <Image className="w-4 h-4" />;
      case "company_certification":
        return <Award className="w-4 h-4" />;
      case "key_personnel_document":
        return <FileCheck className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Upload Document or File
        </Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-slate-50"
            }
            ${selectedFile ? "bg-green-50 border-green-500" : ""}
          `}
        >
          {!selectedFile ? (
            <>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700 mb-2">
                Drag and drop your file here
              </p>
              <p className="text-sm text-slate-500 mb-4">or</p>
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif"
              />
              <p className="text-xs text-slate-400 mt-4">
                Supports: PDF, DOCX, Excel, PowerPoint, Images (JPG, PNG)
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-300">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearFile}
                className="text-slate-400 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Fields - Only show when file is selected */}
      {selectedFile && (
        <div className="space-y-4 bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Resource Information
          </h3>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resource title"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of this resource"
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Resource Type */}
          <div>
            <Label htmlFor="resource-type">Resource Type *</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boilerplate_text">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Boilerplate Text
                  </div>
                </SelectItem>
                <SelectItem value="past_performance_supporting_doc">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    Past Performance Supporting Doc
                  </div>
                </SelectItem>
                <SelectItem value="key_personnel_document">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    Key Personnel Document
                  </div>
                </SelectItem>
                <SelectItem value="company_certification">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Company Certification
                  </div>
                </SelectItem>
                <SelectItem value="image_graphic">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Image/Graphic
                  </div>
                </SelectItem>
                <SelectItem value="client_supplementary_document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Client Supplementary Document
                  </div>
                </SelectItem>
                <SelectItem value="other_reference_document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Other Reference Document
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type and press Enter to add tags"
              className="mt-1"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* AI Processing Options */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h4 className="font-semibold text-slate-900">AI Processing Options</h4>

            {/* Ingest to RAG */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ingest-rag" className="text-base">
                  Ingest into RAG System
                </Label>
                <p className="text-sm text-slate-500">
                  Allow AI to reference this document when generating proposal content
                </p>
              </div>
              <Switch
                id="ingest-rag"
                checked={ingestToRAG}
                onCheckedChange={setIngestToRAG}
              />
            </div>

            {/* Extract Key Data */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="extract-data" className="text-base">
                  Extract Key Data
                </Label>
                <p className="text-sm text-slate-500">
                  Use AI to automatically extract structured information from this document
                </p>
              </div>
              <Switch
                id="extract-data"
                checked={extractKeyData}
                onCheckedChange={setExtractKeyData}
              />
            </div>

            {/* Conditional: Extraction Fields Description */}
            {extractKeyData && (
              <div className="ml-6 pl-4 border-l-2 border-blue-500">
                <Label htmlFor="extraction-fields">
                  What data should be extracted?
                </Label>
                <Textarea
                  id="extraction-fields"
                  value={extractionFieldsDescription}
                  onChange={(e) => setExtractionFieldsDescription(e.target.value)}
                  placeholder="e.g., 'Extract certification name, issuing body, expiration date' or 'Extract project name, contract number, customer agency, and contract value'"
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Describe the fields you want AI to extract in natural language
                </p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="pt-4">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !resourceType}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isUploading ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Process Resource
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}