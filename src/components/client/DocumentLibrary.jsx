import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Upload,
  File,
  FileText,
  Image,
  FileCode,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Clock,
  CheckCircle2,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Filter,
  Archive,
  Tag
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

const FILE_ICONS = {
  'application/pdf': FileText,
  'image/': Image,
  'text/': FileText,
  'application/msword': FileText,
  'application/vnd.': FileText,
  default: File
};

const FILE_CATEGORIES = [
  { value: "requirement", label: "Requirements", color: "blue" },
  { value: "reference", label: "Reference Materials", color: "purple" },
  { value: "contract", label: "Contracts", color: "green" },
  { value: "specification", label: "Specifications", color: "amber" },
  { value: "supporting_doc", label: "Supporting Documents", color: "indigo" },
  { value: "signature", label: "Signatures Required", color: "red" },
  { value: "other", label: "Other", color: "slate" }
];

export default function DocumentLibrary({ client, proposal, organization, currentMember, userType = "client" }) {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [currentFolder, setCurrentFolder] = useState("");

  const [uploadData, setUploadData] = useState({
    file: null,
    file_category: "other",
    description: "",
    folder_path: "",
    tags: []
  });

  // Query files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['client-files', client.id, proposal.id],
    queryFn: () => base44.entities.ClientUploadedFile.filter({
      client_id: client.id,
      proposal_id: proposal.id,
      is_archived: false
    }, '-created_date'),
    initialData: []
  });

  // Upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      return base44.entities.ClientUploadedFile.create({
        client_id: client.id,
        proposal_id: proposal.id,
        organization_id: organization.id,
        file_name: data.file.name,
        file_url,
        file_size: data.file.size,
        file_type: data.file.type,
        file_category: data.file_category,
        description: data.description,
        folder_path: data.folder_path || currentFolder,
        tags: data.tags,
        uploaded_by_name: currentMember.member_name,
        uploaded_by_email: currentMember.member_email,
        version_number: 1,
        is_latest_version: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-files'] });
      setShowUploadDialog(false);
      setUploadData({
        file: null,
        file_category: "other",
        description: "",
        folder_path: "",
        tags: []
      });
    }
  });

  // Delete mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => base44.entities.ClientUploadedFile.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-files'] });
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      alert("Please select a file");
      return;
    }

    setUploadingFile(true);
    try {
      await uploadFileMutation.mutateAsync(uploadData);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownload = (file) => {
    window.open(file.file_url, '_blank');
  };

  const getFileIcon = (fileType) => {
    for (const [type, Icon] of Object.entries(FILE_ICONS)) {
      if (fileType.startsWith(type)) return Icon;
    }
    return FILE_ICONS.default;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get unique folders
  const folders = [...new Set(files.map(f => f.folder_path).filter(Boolean))];

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || file.file_category === categoryFilter;
    const matchesFolder = !currentFolder || file.folder_path === currentFolder;
    
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const getCategoryConfig = (category) => {
    return FILE_CATEGORIES.find(c => c.value === category) || FILE_CATEGORIES[FILE_CATEGORIES.length - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Document Library
              </CardTitle>
              <CardDescription>
                Shared documents and files for this proposal
              </CardDescription>
            </div>
            {userType === "client" && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {FILE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder Navigation */}
          {folders.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-50 rounded-lg">
              <Button
                size="sm"
                variant={!currentFolder ? "default" : "outline"}
                onClick={() => setCurrentFolder("")}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                All Files
              </Button>
              {folders.map(folder => (
                <Button
                  key={folder}
                  size="sm"
                  variant={currentFolder === folder ? "default" : "outline"}
                  onClick={() => setCurrentFolder(folder)}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  {folder}
                </Button>
              ))}
            </div>
          )}

          {/* Files Grid */}
          {isLoading ? (
            <div className="text-center py-12">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <File className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium mb-2">No files yet</p>
              <p className="text-sm">Upload documents to share with your consultant</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map(file => {
                const FileIcon = getFileIcon(file.file_type);
                const categoryConfig = getCategoryConfig(file.file_category);
                
                return (
                  <Card key={file.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg bg-${categoryConfig.color}-100 flex items-center justify-center`}>
                          <FileIcon className={`w-6 h-6 text-${categoryConfig.color}-600`} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {userType === "client" && (
                              <DropdownMenuItem 
                                onClick={() => deleteFileMutation.mutate(file.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h4 className="font-semibold text-slate-900 mb-1 truncate" title={file.file_name}>
                        {file.file_name}
                      </h4>
                      
                      {file.description && (
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{file.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`bg-${categoryConfig.color}-100 text-${categoryConfig.color}-700 text-xs`}>
                          {categoryConfig.label}
                        </Badge>
                        {file.version_number > 1 && (
                          <Badge variant="outline" className="text-xs">
                            v{file.version_number}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {moment(file.created_date).format('MMM D')}
                        </div>
                        <span>{formatFileSize(file.file_size)}</span>
                      </div>

                      {!file.viewed_by_consultant && userType === "client" && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="w-3 h-3" />
                          Awaiting review
                        </div>
                      )}
                      
                      {file.viewed_by_consultant && userType === "client" && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Viewed by consultant
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Select File *</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                {uploadData.file ? (
                  <div className="space-y-3">
                    <File className="w-12 h-12 mx-auto text-blue-600" />
                    <p className="font-medium text-slate-900">{uploadData.file.name}</p>
                    <p className="text-sm text-slate-600">{formatFileSize(uploadData.file.size)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUploadData({ ...uploadData, file: null })}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <Button size="sm" variant="outline" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">or drag and drop</p>
                  </>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                value={uploadData.file_category} 
                onValueChange={(value) => setUploadData({ ...uploadData, file_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Brief description of this document..."
                rows={3}
              />
            </div>

            {/* Folder */}
            <div className="space-y-2">
              <Label>Folder (Optional)</Label>
              <Input
                value={uploadData.folder_path}
                onChange={(e) => setUploadData({ ...uploadData, folder_path: e.target.value })}
                placeholder="e.g., Contracts/2024"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!uploadData.file || uploadingFile}>
              {uploadingFile ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}