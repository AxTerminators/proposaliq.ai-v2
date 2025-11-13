
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Loader2,
  Plus,
  FolderOpen,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Assuming cn utility is used for conditional classes, though not explicitly in the outline's JSX

export default function ProposalFiles({ proposal, user }) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState(null); // Changed from 'uploadingFile' for clearer flow
  const [fileDescription, setFileDescription] = useState("");
  const [fileCategory, setFileCategory] = useState("other");
  const [selectedFolder, setSelectedFolder] = useState("");
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: solicitationDocs = [], isLoading } = useQuery({
    queryKey: ['solicitation-docs', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id
      }, '-created_date'); // Order by created_date desc
    },
    enabled: !!proposal?.id
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', proposal?.organization_id],
    queryFn: async () => {
      if (!proposal?.organization_id) return [];
      return await base44.entities.Folder.filter({
        organization_id: proposal.organization_id,
        purpose: 'project_files' // Assuming this purpose
      });
    },
    enabled: !!proposal?.organization_id
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, file_url, description, category, folderId }) => {
      return await base44.entities.SolicitationDocument.create({
        proposal_id: proposal.id,
        organization_id: proposal.organization_id,
        folder_id: folderId || null, // Ensure null if undefined/empty string
        document_type: category,
        file_name: file.name,
        file_url,
        file_size: file.size,
        description: description,
        // Defaulting client visibility to internal only for new uploads
        shared_with_client: false,
        client_can_download: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitation-docs', proposal?.id] });
      toast.success('File uploaded successfully');
      setIsUploadDialogOpen(false);
      setSelectedFileForUpload(null);
      setFileDescription("");
      setFileCategory("other");
      setSelectedFolder("");
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId) => {
      return await base44.entities.SolicitationDocument.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitation-docs', proposal?.id] });
      toast.success('File deleted');
    },
    onError: (error) => {
      toast.error('Delete failed: ' + error.message);
    }
  });

  /**
   * Handle file selection from the hidden input.
   * This function only sets the file in state and opens the dialog.
   * The actual upload happens when the user confirms in the dialog.
   */
  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.ms-excel', // XLS
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'text/plain' // TXT
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload PDF, Word (DOCX), Excel, PowerPoint, images, text, or CSV.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 100MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFileForUpload(file);
    // Set a default description from file name (without extension)
    setFileDescription(file.name.split('.').slice(0, -1).join('.'));
    setIsUploadDialogOpen(true); // Open dialog if file is successfully selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear input for next selection
    }
  };

  /**
   * Handles the actual upload process after user confirms in the dialog.
   */
  const handleConfirmUpload = async () => {
    if (!selectedFileForUpload) {
      toast.error('No file selected for upload.');
      return;
    }

    try {
      toast.info('Initiating file upload...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFileForUpload });

      await uploadMutation.mutateAsync({
        file: selectedFileForUpload,
        file_url,
        description: fileDescription,
        category: fileCategory,
        folderId: selectedFolder
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    }
  };

  const handleDelete = async (docId) => {
    if (confirm('Delete this file? This cannot be undone.')) {
      await deleteMutation.mutateAsync(docId);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📽️';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '🖼️';
      case 'txt':
        return '📃';
      case 'csv':
        return '📑'; // Another common icon for data files
      default:
        return '📎';
    }
  };


  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Proposal Files</h3>
        <Button
          onClick={() => setIsUploadDialogOpen(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Upload File
        </Button>
      </div>

      {/* Files List */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
        </div>
      ) : solicitationDocs.length > 0 ? (
        <div className="space-y-2">
          {solicitationDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(doc.file_name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {doc.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.document_type && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.document_type}
                      </Badge>
                    )}
                    {doc.folder_id && folders.find(f => f.id === doc.folder_id) && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {folders.find(f => f.id === doc.folder_id)?.folder_name}
                      </Badge>
                    )}
                    {doc.file_size && (
                      <span className="text-xs text-slate-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {doc.description}
                    </p>
                  )}
                  {doc.shared_with_client && (
                    <Badge className="bg-blue-100 text-blue-700 mt-1 flex items-center gap-1 w-fit">
                      <Eye className="w-3 h-3" />
                      Client Shared
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-blue-50 rounded transition-colors"
                  title="View file"
                >
                  <Eye className="w-4 h-4 text-blue-600" />
                </a>
                <a
                  href={doc.file_url}
                  download
                  className="p-2 hover:bg-green-50 rounded transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4 text-green-600" />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 hover:bg-red-50 rounded transition-colors"
                  title="Delete file"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-2">No files uploaded yet</p>
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload First File
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload documents related to this proposal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Type Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                ✅ Supported File Types
              </p>
              <p className="text-xs text-blue-800">
                PDF, Word (DOCX/DOC), Excel (XLSX/XLS), PowerPoint (PPTX), Images (PNG/JPG), Text, CSV
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Maximum file size: 100MB
              </p>
            </div>

            {/* File Selection */}
            {!selectedFileForUpload ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  Click to select a file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or drag and drop
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{selectedFileForUpload.name}</p>
                  <p className="text-xs text-slate-600">
                    {formatFileSize(selectedFileForUpload.size)}
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.png,.jpg,.jpeg,.csv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Folder Selection */}
            {folders.length > 0 && (
              <div>
                <Label>Folder (Optional)</Label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No folder</SelectItem> {/* Use empty string or null */}
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {folder.folder_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <Label>Document Category</Label>
              <Select value={fileCategory} onValueChange={setFileCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rfp">RFP</SelectItem>
                  <SelectItem value="rfq">RFQ</SelectItem>
                  <SelectItem value="rfi">RFI</SelectItem>
                  <SelectItem value="sow">Statement of Work</SelectItem>
                  <SelectItem value="pws">Performance Work Statement</SelectItem>
                  <SelectItem value="pricing_sheet">Pricing Sheet</SelectItem>
                  <SelectItem value="reference">Reference Material</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Brief description of this file..."
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFileForUpload(null);
                  setFileDescription("");
                  setFileCategory("other");
                  setSelectedFolder("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={uploadMutation.isPending || !selectedFileForUpload}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
