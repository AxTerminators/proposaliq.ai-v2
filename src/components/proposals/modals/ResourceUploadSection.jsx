import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
import { Upload, X, FileText, Image, Award, FileCheck, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DuplicateResourceDialog from "./DuplicateResourceDialog";

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
  
  // Supplementary document state
  const [isSupplementary, setIsSupplementary] = useState(false);
  const [supplementaryType, setSupplementaryType] = useState("");
  const [parentDocumentId, setParentDocumentId] = useState("");
  const [amendmentNumber, setAmendmentNumber] = useState("");
  const [versionDate, setVersionDate] = useState("");

  // AI processing options
  const [ingestToRAG, setIngestToRAG] = useState(true);
  const [extractKeyData, setExtractKeyData] = useState(false);
  const [extractionFieldsDescription, setExtractionFieldsDescription] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  
  // Duplicate detection state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);
  
  // Fetch parent documents for supplementary linking
  const { data: parentDocuments = [], isLoading: loadingParents } = useQuery({
    queryKey: ['solicitation-documents', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const docs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        is_supplementary: false
      });
      return docs || [];
    },
    enabled: !!proposalId && isSupplementary,
  });

  /**
   * Handle file selection via input or drag-and-drop
   */
  const handleFileSelect = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    // Auto-fill title from filename
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setTitle(fileNameWithoutExt);
    
    // Generate AI tag suggestions based on filename
    await generateTagSuggestions(fileNameWithoutExt);
  };

  /**
   * Generate AI-powered tag suggestions
   */
  const generateTagSuggestions = async (filename) => {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this filename: "${filename}", suggest 3-5 relevant tags for categorizing this document in a government proposal context. Return only the tags as a comma-separated list, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      if (response.tags && Array.isArray(response.tags)) {
        setSuggestedTags(response.tags);
      }
    } catch (error) {
      console.error("Failed to generate tag suggestions:", error);
      setSuggestedTags([]);
    }
  };

  /**
   * Add suggested tag
   */
  const handleAddSuggestedTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
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
    setIsSupplementary(false);
    setSupplementaryType("");
    setParentDocumentId("");
    setAmendmentNumber("");
    setVersionDate("");
  };

  /**
   * Check for duplicates before uploading
   */
  const checkForDuplicates = async () => {
    try {
      setUploadProgress("Checking for duplicates...");
      
      const response = await base44.functions.invoke('detectDuplicateResource', {
        organization_id: organizationId,
        file_name: selectedFile.name,
        title,
        resource_type: resourceType,
        file_size: selectedFile.size
      });

      if (response.data.has_duplicates && response.data.duplicates.length > 0) {
        setDuplicates(response.data.duplicates);
        setShowDuplicateDialog(true);
        setUploadProgress("");
        return true; // Has duplicates
      }

      return false; // No duplicates
    } catch (error) {
      console.error("Error checking duplicates:", error);
      // Continue with upload even if duplicate check fails
      return false;
    }
  };

  /**
   * Handle upload and processing with full RAG integration
   */
  const handleUpload = async () => {
    if (!selectedFile || !resourceType) {
      setUploadError("Please select a file and resource type");
      return;
    }

    if (!title.trim()) {
      setUploadError("Please provide a title for the resource");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadProgress("Preparing upload...");

    // Check for duplicates unless bypassing
    if (!bypassDuplicateCheck) {
      const hasDuplicates = await checkForDuplicates();
      if (hasDuplicates) {
        setIsUploading(false);
        return;
      }
    }

    try {
      // Build form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('resource_type', resourceType);
      formData.append('tags', JSON.stringify(tags));
      formData.append('organization_id', organizationId);
      if (proposalId) {
        formData.append('proposal_id', proposalId);
      }
      formData.append('ingest_to_rag', ingestToRAG.toString());
      formData.append('extract_key_data', extractKeyData.toString());
      if (extractKeyData && extractionFieldsDescription) {
        formData.append('extraction_fields_description', extractionFieldsDescription);
      }
      
      // Add supplementary document fields
      if (isSupplementary) {
        formData.append('is_supplementary', 'true');
        formData.append('supplementary_type', supplementaryType);
        if (parentDocumentId) {
          formData.append('parent_document_id', parentDocumentId);
        }
        if (amendmentNumber) {
          formData.append('amendment_number', amendmentNumber);
        }
        if (versionDate) {
          formData.append('version_date', versionDate);
        }
      }

      setUploadProgress("Uploading file...");

      // Call backend function to handle upload and processing
      const response = await base44.functions.invoke('uploadAndProcessResource', formData);

      if (response.data.success) {
        setUploadProgress("Processing complete!");
        
        // Clear form after short delay
        setTimeout(() => {
          handleClearFile();
          setUploadProgress("");
          
          // Notify parent component
          if (onUploadComplete) {
            onUploadComplete(response.data);
          }
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Upload failed: " + error.message);
      setUploadProgress("");
    } finally {
      setIsUploading(false);
      setBypassDuplicateCheck(false); // Reset bypass flag
    }
  };

  /**
   * Handle linking to existing resource instead of uploading
   */
  const handleLinkExisting = async (duplicate) => {
    setShowDuplicateDialog(false);
    setIsUploading(true);
    setUploadProgress("Linking to existing resource...");

    try {
      // Link the existing resource to the proposal
      if (proposalId) {
        await base44.functions.invoke('linkResourceToProposal', {
          proposal_id: proposalId,
          resources: [{
            id: duplicate.id,
            entityType: 'ProposalResource',
            type: duplicate.resource_type
          }]
        });
      }

      setUploadProgress("Linked successfully!");
      
      setTimeout(() => {
        handleClearFile();
        setUploadProgress("");
        if (onUploadComplete) {
          onUploadComplete({ linked: true, resource_id: duplicate.id });
        }
      }, 1500);
    } catch (error) {
      console.error("Linking failed:", error);
      setUploadError("Failed to link resource: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Proceed with upload despite duplicates
   */
  const handleUploadAnyway = () => {
    setShowDuplicateDialog(false);
    setBypassDuplicateCheck(true);
    // Trigger upload again with bypass flag set
    setTimeout(() => handleUpload(), 100);
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
      {/* Upload Progress/Error Messages */}
      {uploadProgress && (
        <Alert className="bg-blue-50 border-blue-300">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            {uploadProgress}
          </AlertDescription>
        </Alert>
      )}
      
      {uploadError && (
        <Alert className="bg-red-50 border-red-300">
          <X className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

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

          {/* Supplementary Document Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <Label htmlFor="is-supplementary" className="text-base font-medium">
                Is this a Supplementary Document?
              </Label>
              <p className="text-sm text-slate-500">
                Amendment, Q&A response, or additional document to a primary solicitation
              </p>
            </div>
            <Switch
              id="is-supplementary"
              checked={isSupplementary}
              onCheckedChange={(checked) => {
                setIsSupplementary(checked);
                if (!checked) {
                  setSupplementaryType("");
                  setParentDocumentId("");
                  setAmendmentNumber("");
                }
              }}
            />
          </div>

          {/* Supplementary Type */}
          {isSupplementary && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <Label htmlFor="supplementary-type">Supplementary Document Type *</Label>
                <Select 
                  value={supplementaryType} 
                  onValueChange={(value) => {
                    setSupplementaryType(value);
                    // Clear amendment number if not an amendment
                    if (value !== "amendment") {
                      setAmendmentNumber("");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder="Select supplementary type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amendment">Amendment</SelectItem>
                    <SelectItem value="q_a_response">Q&A Response</SelectItem>
                    <SelectItem value="sow">Statement of Work (SOW)</SelectItem>
                    <SelectItem value="pws">Performance Work Statement (PWS)</SelectItem>
                    <SelectItem value="clarification">Clarification</SelectItem>
                    <SelectItem value="addendum">Addendum</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Document Selection */}
              {supplementaryType && (
                <div>
                  <Label htmlFor="parent-document">Link to Parent Document</Label>
                  {loadingParents ? (
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border mt-1">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-600">Loading parent documents...</span>
                    </div>
                  ) : parentDocuments.length === 0 ? (
                    <Alert className="mt-1 bg-amber-50 border-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        No primary solicitation documents found for this proposal. 
                        You can upload this as a standalone supplementary document, or upload the primary document first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={parentDocumentId} onValueChange={setParentDocumentId}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder="Select parent document (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentDocuments.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.file_name} ({doc.document_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Optional: Link this document to a primary solicitation document
                  </p>
                </div>
              )}

              {/* Amendment Number */}
              {supplementaryType === "amendment" && (
                <div>
                  <Label htmlFor="amendment-number">Amendment Number</Label>
                  <Input
                    id="amendment-number"
                    value={amendmentNumber}
                    onChange={(e) => setAmendmentNumber(e.target.value)}
                    placeholder="e.g., 001, 002"
                    className="mt-1 bg-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Sequential number for tracking amendments
                  </p>
                </div>
              )}

              {/* Version Date */}
              <div>
                <Label htmlFor="version-date">Document Date</Label>
                <Input
                  id="version-date"
                  type="date"
                  value={versionDate}
                  onChange={(e) => setVersionDate(e.target.value)}
                  className="mt-1 bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Date of this document version (used for AI prioritization)
                </p>
              </div>
            </div>
          )}

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
            
            {/* AI Suggested Tags */}
            {suggestedTags.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium mb-2">✨ AI Suggested Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-100 border-blue-300"
                      onClick={() => handleAddSuggestedTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
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

      {/* Duplicate Detection Dialog */}
      <DuplicateResourceDialog
        isOpen={showDuplicateDialog}
        onClose={() => setShowDuplicateDialog(false)}
        duplicates={duplicates}
        onLinkExisting={handleLinkExisting}
        onUploadAnyway={handleUploadAnyway}
      />
    </div>
  );
}