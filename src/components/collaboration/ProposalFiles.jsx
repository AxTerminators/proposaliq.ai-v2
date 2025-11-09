
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  FileCode,
  Eye,
  EyeOff,
  Users,
  CheckSquare,
  Library, // New import
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import moment from "moment";
import FileUploadWithFolder from "../ui/FileUploadWithFolder"; // New import
import AttachFromLibraryButton from "../contentLibrary/AttachFromLibraryButton"; // New import

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
  const [uploadMode, setUploadMode] = useState('new'); // 'new' or 'library'
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['proposal-documents', proposal.id],
    queryFn: async () => {
      return base44.entities.SolicitationDocument.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
  });

  const uploadMutation = useMutation({
    mutationFn: async (documentData) => {
      const document = await base44.entities.SolicitationDocument.create({
        proposal_id: documentData.proposal_id,
        organization_id: documentData.organization_id,
        document_type: documentData.document_type || "other",
        file_name: documentData.file_name,
        file_url: documentData.file_url,
        file_size: documentData.file_size || 0, // file_size can be 0 for library references
        description: documentData.description || "",
        shared_with_client: false,
        client_can_download: true,
        folder_id: documentData.folder_id || null,
        tags: documentData.tags || [],
        keywords: documentData.keywords || [],
      });

      await base44.entities.ActivityLog.create({
        proposal_id: proposal.id,
        user_email: user.email,
        user_name: user.full_name,
        action_type: documentData.document_type === 'reference' ? "file_attached_from_library" : "file_uploaded",
        action_description: `added ${document.file_name} (${documentData.document_type === 'reference' ? 'from library' : 'uploaded'})`,
        related_entity_id: document.id
      });

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, updates }) => {
      return await base44.entities.SolicitationDocument.update(documentId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ documentIds, updates }) => {
      const updatePromises = documentIds.map(docId =>
        base44.entities.SolicitationDocument.update(docId, updates)
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] });
      setSelectedDocuments([]);
      setBulkActionMode(false);
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (documentId) => {
      await base44.entities.SolicitationDocument.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-documents', proposal.id] });
    },
  });

  const handleFileUploadComplete = async (fileData) => {
    try {
      await uploadMutation.mutateAsync({
        proposal_id: proposal.id,
        organization_id: organization.id,
        document_type: 'other',
        file_name: fileData.file_name,
        file_url: fileData.file_url,
        file_size: fileData.file_size,
        folder_id: fileData.folder_id || null,
        tags: [],
        keywords: [],
        description: fileData.description || ""
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    }
  };

  const handleAttachFromLibrary = async (attachment) => {
    try {
      await uploadMutation.mutateAsync({
        proposal_id: proposal.id,
        organization_id: organization.id,
        document_type: 'reference',
        file_name: attachment.file_name,
        file_url: attachment.file_url || '',
        description: `From Library: ${attachment.content_type || 'Unknown'}`,
        tags: ['from_library'],
        keywords: [],
        file_size: attachment.file_size || 0,
      });
    } catch (error) {
      console.error("Error attaching file from library:", error);
      alert("Failed to attach file from library. Please try again.");
    }
  };

  const handleDelete = async (document) => {
    if (confirm(`Delete "${document.file_name}"?`)) {
      deleteFileMutation.mutate(document.id);
    }
  };

  const toggleClientSharing = async (document) => {
    await updateDocumentMutation.mutateAsync({
      documentId: document.id,
      updates: {
        shared_with_client: !document.shared_with_client
      }
    });
  };

  const toggleDownloadPermission = async (document) => {
    await updateDocumentMutation.mutateAsync({
      documentId: document.id,
      updates: {
        client_can_download: !document.client_can_download
      }
    });
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
    }
  };

  const handleBulkShare = async () => {
    if (selectedDocuments.length === 0) return;
    if (confirm(`Share ${selectedDocuments.length} file(s) with client?`)) {
      await bulkUpdateMutation.mutateAsync({
        documentIds: selectedDocuments,
        updates: { shared_with_client: true }
      });
    }
  };

  const handleBulkUnshare = async () => {
    if (selectedDocuments.length === 0) return;
    if (confirm(`Unshare ${selectedDocuments.length} file(s) from client?`)) {
      await bulkUpdateMutation.mutateAsync({
        documentIds: selectedDocuments,
        updates: { shared_with_client: false }
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;
    if (confirm(`Delete ${selectedDocuments.length} file(s)? This cannot be undone.`)) {
      const deletePromises = selectedDocuments.map(docId =>
        deleteFileMutation.mutateAsync(docId)
      );
      await Promise.all(deletePromises);
      setSelectedDocuments([]);
      setBulkActionMode(false);
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
    if (bytes === null || bytes === undefined) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const sharedDocuments = documents.filter(d => d.shared_with_client);
  const privateDocuments = documents.filter(d => !d.shared_with_client);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Add Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={uploadMode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('new')}
            >
              Upload New File
            </Button>
            <Button
              variant={uploadMode === 'library' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('library')}
            >
              <Library className="w-4 h-4 mr-2" />
              From Library
            </Button>
          </div>

          {uploadMode === 'new' ? (
            <FileUploadWithFolder
              organization={organization}
              onUploadComplete={handleFileUploadComplete}
              allowFolderSelection={true}
              filterType="content_library"
              label="Select File to Upload"
            />
          ) : (
            <div className="text-center py-6">
              <AttachFromLibraryButton
                organization={organization}
                onAttach={handleAttachFromLibrary}
                variant="default"
                size="lg"
              />
              <p className="text-sm text-slate-600 mt-3">
                Reference files from your Content Library
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Proposal Files ({documents.length})
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {sharedDocuments.length} shared with client • {privateDocuments.length} private
              </p>
            </div>
            <div className="flex gap-2">
              {!bulkActionMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setBulkActionMode(true)}
                    disabled={documents.length === 0}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Bulk Actions
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="px-3 py-2">
                    {selectedDocuments.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkShare}
                    disabled={selectedDocuments.length === 0 || bulkUpdateMutation.isPending}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnshare}
                    disabled={selectedDocuments.length === 0 || bulkUpdateMutation.isPending}
                  >
                  <EyeOff className="w-4 h-4 mr-2" />
                    Unshare
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={selectedDocuments.length === 0}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkActionMode(false);
                      setSelectedDocuments([]);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
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
              <p className="text-sm mb-4">Upload documents, references, or any files related to this proposal using the "Add Files" section above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {bulkActionMode && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Checkbox
                    checked={selectedDocuments.length === documents.length && documents.length > 0}
                    onCheckedChange={selectAllDocuments}
                    id="select-all"
                  />
                  <Label htmlFor="select-all" className="cursor-pointer font-medium">
                    Select All Files ({documents.length})
                  </Label>
                </div>
              )}

              {/* Shared with Client */}
              {sharedDocuments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared with Client ({sharedDocuments.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sharedDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-md transition-all border-blue-200 relative">
                        {bulkActionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                              checked={selectedDocuments.includes(doc.id)}
                              onCheckedChange={() => toggleDocumentSelection(doc.id)}
                            />
                          </div>
                        )}
                        <CardContent className={`p-4 ${bulkActionMode ? 'pl-10' : ''}`}>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.file_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                                {doc.file_name}
                              </h4>
                              <Badge className="bg-blue-100 text-blue-700 mb-2">
                                <Eye className="w-3 h-3 mr-1" />
                                Client Can View
                              </Badge>
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
                              {doc.client_downloaded && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <Download className="w-3 h-3" />
                                  Downloaded by client
                                </p>
                              )}
                            </div>
                          </div>

                          {!bulkActionMode && (
                            <div className="flex gap-2 pt-3 border-t">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="outline" className="flex-1">
                                    <Users className="w-3 h-3 mr-1" />
                                    Permissions
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-sm">Client Permissions</h4>

                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`share-${doc.id}`}
                                        checked={doc.shared_with_client}
                                        onCheckedChange={() => toggleClientSharing(doc)}
                                      />
                                      <div className="flex-1">
                                        <Label htmlFor={`share-${doc.id}`} className="cursor-pointer">
                                          Share with client
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                          Client can see this file in their portal
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`download-${doc.id}`}
                                        checked={doc.client_can_download}
                                        onCheckedChange={() => toggleDownloadPermission(doc)}
                                        disabled={!doc.shared_with_client}
                                      />
                                      <div className="flex-1">
                                        <Label htmlFor={`download-${doc.id}`} className="cursor-pointer">
                                          Allow download
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                          Client can download this file
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-3 h-3" />
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
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Files */}
              {privateDocuments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Private Files ({privateDocuments.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {privateDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-md transition-all relative">
                        {bulkActionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                              checked={selectedDocuments.includes(doc.id)}
                              onCheckedChange={() => toggleDocumentSelection(doc.id)}
                            />
                          </div>
                        )}
                        <CardContent className={`p-4 ${bulkActionMode ? 'pl-10' : ''}`}>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.file_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                                {doc.file_name}
                              </h4>
                              <Badge variant="outline" className="mb-2">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Private
                              </Badge>
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

                          {!bulkActionMode && (
                            <div className="flex gap-2 pt-3 border-t">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="outline" className="flex-1">
                                    <Users className="w-3 h-3 mr-1" />
                                    Share
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-sm">Client Permissions</h4>

                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`share-${doc.id}`}
                                        checked={doc.shared_with_client}
                                        onCheckedChange={() => toggleClientSharing(doc)}
                                      />
                                      <div className="flex-1">
                                        <Label htmlFor={`share-${doc.id}`} className="cursor-pointer">
                                          Share with client
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                          Client can see this file in their portal
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`download-${doc.id}`}
                                        checked={doc.client_can_download}
                                        onCheckedChange={() => toggleDownloadPermission(doc)}
                                        disabled={!doc.shared_with_client}
                                      />
                                      <div className="flex-1">
                                        <Label htmlFor={`download-${doc.id}`} className="cursor-pointer">
                                          Allow download
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                          Client can download this file
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-3 h-3" />
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
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
