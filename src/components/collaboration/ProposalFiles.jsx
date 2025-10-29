
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  FileText, 
  Download,
  Trash2,
  Loader2,
  Paperclip,
  Image,
  FileSpreadsheet,
  FileCode
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import moment from "moment";

export default function ProposalFiles({ proposal, user, organization }) {
  // Guard clause
  if (!proposal || !user || !organization) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Paperclip className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  return <ProposalFilesContent proposal={proposal} user={user} organization={organization} />;
}

function ProposalFilesContent({ proposal, user, organization }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ['proposal-documents', proposal.id],
    queryFn: async () => {
      // The parent component ensures proposal.id is available
      return base44.entities.SolicitationDocument.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
    // `enabled` is implicitly true as `proposal.id` is guaranteed by the guard clause
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, description }) => {
      // Upload file using Core integration
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const document = await base44.entities.SolicitationDocument.create({
        proposal_id: proposal.id,
        organization_id: organization.id,
        document_type: "other",
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        description: description
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        proposal_id: proposal.id,
        user_email: user.email,
        user_name: user.full_name,
        action_type: "file_uploaded",
        action_description: `uploaded ${file.name}`,
        related_entity_id: document.id
      });

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] }); // Invalidate with proposal.id
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDescription("");
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (documentId) => {
      await base44.entities.SolicitationDocument.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] }); // Invalidate with proposal.id
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await uploadFileMutation.mutateAsync({ 
        file: selectedFile, 
        description: description 
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    if (confirm(`Delete "${document.file_name}"?`)) {
      deleteFileMutation.mutate(document.id);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-8 h-8 text-purple-600" />;
      case 'txt':
      case 'md':
        return <FileCode className="w-8 h-8 text-slate-600" />;
      default:
        return <File className="w-8 h-8 text-slate-600" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Proposal Files
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Upload and share files related to this proposal
            </p>
          </div>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </label>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading files...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Paperclip className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">No files yet</p>
            <p className="text-sm mb-4">Upload documents, references, or any files related to this proposal</p>
            <input
              type="file"
              id="file-upload-empty"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload-empty" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First File
              </label>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.file_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                        {doc.file_name}
                      </h4>
                      {doc.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{moment(doc.created_date).fromNow()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(doc)}
                      disabled={deleteFileMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Add a file to this proposal
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {getFileIcon(selectedFile.name)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="What is this file for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFile(null);
                    setDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
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
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
