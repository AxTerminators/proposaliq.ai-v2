
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Phase2({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          
          if (proposalId) {
            const docs = await base44.entities.SolicitationDocument.filter(
              { proposal_id: proposalId },
              '-created_date'
            );
            setUploadedDocs(docs);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [proposalId]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }) => {
      if (!proposalId) {
        throw new Error("Proposal ID is missing. Please save Phase 1 first.");
      }
      if (!organization || !organization.id) {
        throw new Error("Organization data is missing. Please ensure your organization is set up.");
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.SolicitationDocument.create({
        proposal_id: proposalId,
        organization_id: organization.id,
        document_type: documentType,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitation-documents', proposalId] });
      loadDocuments();
    },
    onError: (error) => {
        console.error("Upload mutation failed:", error);
        alert(`Upload failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.SolicitationDocument.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitation-documents', proposalId] });
      loadDocuments();
    },
    onError: (error) => {
        console.error("Delete mutation failed:", error);
        alert(`Deletion failed: ${error.message}`);
    }
  });

  const loadDocuments = async () => {
    if (proposalId) {
      const docs = await base44.entities.SolicitationDocument.filter(
        { proposal_id: proposalId },
        '-created_date'
      );
      setUploadedDocs(docs);
    }
  };

  const handleFileUpload = async (e, docType) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync({ file, documentType: docType });
      }
      alert(`✓ Successfully uploaded ${files.length} file(s)`);
      e.target.value = ''; // Clear file input
    } catch (error) {
      // Error handling is already in uploadMutation.onError
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (confirm("Delete this document?")) {
      await deleteMutation.mutateAsync(docId);
    }
  };

  const getDocTypeLabel = (type) => {
    const labels = {
      rfp: "RFP",
      rfq: "RFQ",
      rfi: "RFI",
      ifb: "IFB",
      sow: "Statement of Work",
      pws: "Performance Work Statement",
      pricing_sheet: "Pricing Sheet",
      reference: "Reference Document",
      other: "Other"
    };
    return labels[type] || type;
  };

  const getDocTypeColor = (type) => {
    const colors = {
      rfp: "bg-blue-100 text-blue-700",
      rfq: "bg-purple-100 text-purple-700",
      rfi: "bg-amber-100 text-amber-700",
      ifb: "bg-green-100 text-green-700",
      sow: "bg-indigo-100 text-indigo-700",
      pws: "bg-pink-100 text-pink-700",
      pricing_sheet: "bg-emerald-100 text-emerald-700",
      reference: "bg-slate-100 text-slate-700",
      other: "bg-gray-100 text-gray-700"
    };
    return colors[type] || colors.other;
  };

  const groupedDocs = uploadedDocs.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {});

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Phase 2: Upload Solicitation Documents
        </CardTitle>
        <CardDescription>
          Upload RFPs, SOWs, and other solicitation documents for AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900 mb-1">📄 Upload PDF Files for AI Analysis</p>
            <p className="text-sm text-blue-800">
              Upload <strong>PDF versions</strong> of your solicitation documents so our AI can read and analyze them to help write your proposal. 
              Convert Word/Excel files to PDF first.
            </p>
          </AlertDescription>
        </Alert>

        {!proposalId && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Please save Phase 1 first before uploading documents.
            </AlertDescription>
          </Alert>
        )}

        {proposalId && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { type: 'rfp', label: 'RFP', icon: FileText, color: 'blue' },
                { type: 'sow', label: 'SOW/PWS', icon: FileCheck, color: 'indigo' },
                { type: 'pricing_sheet', label: 'Pricing Sheet', icon: FileText, color: 'emerald' },
                { type: 'reference', label: 'Reference Docs', icon: FileText, color: 'slate' },
              ].map(({ type, label, icon: Icon, color }) => (
                <div key={type} className={`border-2 border-dashed border-${color}-200 rounded-lg p-6 text-center bg-${color}-50 hover:bg-${color}-100 transition-colors`}>
                  <Icon className={`w-12 h-12 mx-auto text-${color}-600 mb-3`} />
                  <h3 className={`font-semibold text-${color}-900 mb-2`}>{label}</h3>
                  <input
                    type="file"
                    id={`upload-${type}`}
                    className="hidden"
                    accept=".pdf"
                    multiple
                    onChange={(e) => handleFileUpload(e, type)}
                    disabled={uploading}
                  />
                  <Button size="sm" variant="outline" asChild disabled={uploading}>
                    <label htmlFor={`upload-${type}`} className="cursor-pointer">
                      <Upload className="w-3 h-3 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload PDF'}
                    </label>
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">PDF only • AI readable</p>
                </div>
              ))}
            </div>

            {uploadedDocs.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Uploaded Documents ({uploadedDocs.length})
                </h3>

                <div className="space-y-4">
                  {Object.entries(groupedDocs).map(([docType, docs]) => (
                    <div key={docType} className="space-y-2">
                      <Badge className={getDocTypeColor(docType)}>
                        {getDocTypeLabel(docType)} ({docs.length})
                      </Badge>
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                                <p className="text-xs text-slate-500">
                                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(doc.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedDocs.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Documents Uploaded Yet</h3>
                <p className="text-slate-600 mb-4">
                  Upload your solicitation PDFs to help AI analyze requirements
                </p>
              </div>
            )}
          </>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">Important: PDF Format Required</p>
              <p className="text-sm text-amber-800">
                Our AI can only read PDF files. If you have Word, Excel, or PowerPoint documents, please convert them to PDF before uploading.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
