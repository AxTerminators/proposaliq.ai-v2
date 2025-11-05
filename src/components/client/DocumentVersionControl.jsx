import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  History,
  FileText,
  Download,
  RotateCcw,
  Upload,
  CheckCircle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function DocumentVersionControl({ proposal, client, organization }) {
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertVersion, setRevertVersion] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [versionNotes, setVersionNotes] = useState("");

  // Fetch all client uploaded files
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', proposal?.id, client?.id],
    queryFn: async () => {
      if (!proposal?.id || !client?.id) return [];
      return base44.entities.ClientUploadedFile.filter({
        proposal_id: proposal.id,
        client_id: client.id
      }, '-created_date');
    },
    enabled: !!proposal?.id && !!client?.id,
  });

  // Group documents by base file (handling versions)
  const documentGroups = React.useMemo(() => {
    const groups = {};
    documents.forEach(doc => {
      const baseId = doc.replaces_file_id || doc.id;
      if (!groups[baseId]) {
        groups[baseId] = [];
      }
      groups[baseId].push(doc);
    });
    
    // Sort versions within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.version_number - a.version_number);
    });
    
    return groups;
  }, [documents]);

  const uploadNewVersionMutation = useMutation({
    mutationFn: async ({ fileId, file, notes }) => {
      // Upload the new file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Get the current document to find max version
      const currentDoc = documents.find(d => d.id === fileId);
      const allVersions = documentGroups[currentDoc.replaces_file_id || currentDoc.id] || [];
      const maxVersion = Math.max(...allVersions.map(v => v.version_number || 1));
      
      // Mark old versions as not latest
      await Promise.all(
        allVersions.map(doc => 
          base44.entities.ClientUploadedFile.update(doc.id, { is_latest_version: false })
        )
      );
      
      // Create new version
      return base44.entities.ClientUploadedFile.create({
        client_id: client.id,
        proposal_id: proposal.id,
        organization_id: organization.id,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        file_type: file.type,
        file_category: currentDoc.file_category,
        description: notes || `Version ${maxVersion + 1}`,
        uploaded_by_name: currentDoc.uploaded_by_name,
        uploaded_by_email: currentDoc.uploaded_by_email,
        version_number: maxVersion + 1,
        replaces_file_id: currentDoc.replaces_file_id || currentDoc.id,
        is_latest_version: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      setUploadingNewVersion(false);
      setNewVersionFile(null);
      setVersionNotes("");
      setShowVersionDialog(false);
    },
  });

  const revertToVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const version = documents.find(d => d.id === versionId);
      const allVersions = documentGroups[version.replaces_file_id || version.id] || [];
      
      // Mark all as not latest
      await Promise.all(
        allVersions.map(doc => 
          base44.entities.ClientUploadedFile.update(doc.id, { is_latest_version: false })
        )
      );
      
      // Mark selected version as latest
      return base44.entities.ClientUploadedFile.update(versionId, { 
        is_latest_version: true 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      setShowRevertDialog(false);
      setRevertVersion(null);
    },
  });

  const handleViewVersions = (doc) => {
    setSelectedDocument(doc);
    setShowVersionDialog(true);
  };

  const handleUploadNewVersion = async () => {
    if (!newVersionFile || !selectedDocument) return;
    
    uploadNewVersionMutation.mutate({
      fileId: selectedDocument.id,
      file: newVersionFile,
      notes: versionNotes
    });
  };

  const handleRevertToVersion = (version) => {
    setRevertVersion(version);
    setShowRevertDialog(true);
  };

  const confirmRevert = () => {
    if (revertVersion) {
      revertToVersionMutation.mutate(revertVersion.id);
    }
  };

  const toggleVersionExpanded = (docId) => {
    setExpandedVersions(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const latestDocuments = Object.values(documentGroups).map(group => 
    group.find(doc => doc.is_latest_version) || group[0]
  );

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Document Version Control
          </CardTitle>
          <CardDescription>
            Track changes and manage document versions with full history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Loading documents...</p>
            </div>
          ) : latestDocuments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {latestDocuments.map((doc) => {
                const baseId = doc.replaces_file_id || doc.id;
                const versions = documentGroups[baseId] || [];
                const isExpanded = expandedVersions[doc.id];
                
                return (
                  <div key={doc.id} className="border rounded-lg overflow-hidden">
                    <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-900 truncate">{doc.file_name}</p>
                              <Badge className="bg-green-100 text-green-700">
                                v{doc.version_number || 1}
                              </Badge>
                              {versions.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {versions.length} versions
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doc.uploaded_by_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {moment(doc.created_date).fromNow()}
                              </span>
                              <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            {doc.description && (
                              <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          {versions.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleVersionExpanded(doc.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVersions(doc)}
                          >
                            <History className="w-4 h-4 mr-2" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Version History (Expanded) */}
                    {isExpanded && versions.length > 1 && (
                      <div className="border-t bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Version History</h4>
                        <div className="space-y-2">
                          {versions.slice(1).map((version) => (
                            <div key={version.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">v{version.version_number}</Badge>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{version.file_name}</p>
                                  <p className="text-xs text-slate-600">
                                    {moment(version.created_date).format('MMM D, YYYY h:mm A')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(version.file_url, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevertToVersion(version)}
                                  className="text-amber-600 hover:text-amber-700"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Management Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Document Versions</DialogTitle>
            <DialogDescription>
              {selectedDocument?.file_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Upload New Version */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload New Version
              </h4>
              <div className="space-y-3">
                <Input
                  type="file"
                  onChange={(e) => setNewVersionFile(e.target.files[0])}
                  className="cursor-pointer"
                />
                <Textarea
                  placeholder="Version notes (optional)"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  rows={2}
                />
                <Button
                  onClick={handleUploadNewVersion}
                  disabled={!newVersionFile || uploadNewVersionMutation.isPending}
                  className="w-full"
                >
                  {uploadNewVersionMutation.isPending ? "Uploading..." : "Upload New Version"}
                </Button>
              </div>
            </div>

            {/* Version History */}
            {selectedDocument && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Version History</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(documentGroups[selectedDocument.replaces_file_id || selectedDocument.id] || []).map((version) => (
                    <div
                      key={version.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all",
                        version.is_latest_version 
                          ? "border-green-500 bg-green-50" 
                          : "border-slate-200 bg-white hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={version.is_latest_version ? "bg-green-600" : "bg-slate-400"}>
                            v{version.version_number}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {version.description || version.file_name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {moment(version.created_date).format('MMM D, YYYY h:mm A')} by {version.uploaded_by_name}
                            </p>
                          </div>
                          {version.is_latest_version && (
                            <Badge className="bg-green-100 text-green-700">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(version.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {!version.is_latest_version && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevertToVersion(version)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Revert
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Previous Version?</DialogTitle>
            <DialogDescription>
              This will make version {revertVersion?.version_number} the current active version.
              The current version will still be accessible in the history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRevert}
              disabled={revertToVersionMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {revertToVersionMutation.isPending ? "Reverting..." : "Revert to This Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}