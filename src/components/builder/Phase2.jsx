
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Download,
  Eye,
  Plus
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Phase2({ proposal, onUpdate, onNext }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const { data: solicitationDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['solicitation-docs', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id
      });
    },
    enabled: !!proposal?.id
  });

  const createDocMutation = useMutation({
    mutationFn: async (docData) => {
      return await base44.entities.SolicitationDocument.create(docData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitation-docs'] });
      toast.success('Document uploaded successfully');
    }
  });

  /**
   * Handle solicitation document upload
   * Enhanced to support DOCX files and AI extraction
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - Now supports DOCX
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.ms-excel' // XLS
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word (DOCX/DOC), Excel, image, or CSV file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);

    try {
      // Upload file
      toast.info('Uploading solicitation document...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Determine document type based on file name
      const fileName = file.name.toLowerCase();
      let documentType = 'other';
      if (fileName.includes('rfp')) documentType = 'rfp';
      else if (fileName.includes('rfq')) documentType = 'rfq';
      else if (fileName.includes('rfi')) documentType = 'rfi';
      else if (fileName.includes('sow') || fileName.includes('statement of work')) documentType = 'sow';
      else if (fileName.includes('pws') || fileName.includes('performance work')) documentType = 'pws';
      else if (fileName.includes('pricing')) documentType = 'pricing_sheet';

      // Create document record
      await createDocMutation.mutateAsync({
        proposal_id: proposal.id,
        organization_id: proposal.organization_id,
        document_type: documentType,
        file_name: file.name,
        file_url,
        file_size: file.size
      });

      toast.success('Solicitation document uploaded! You can now analyze it with AI.');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const analyzeDocuments = async () => {
    if (!solicitationDocs.length) {
      toast.error('Please upload at least one solicitation document first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const fileUrls = solicitationDocs.map(doc => doc.file_url);
      
      toast.info('AI is analyzing your solicitation documents...');

      const analysisPrompt = `Analyze the uploaded solicitation documents and extract:
      1. Key requirements and compliance items
      2. Evaluation criteria and scoring methodology
      3. Submission requirements (format, page limits, deadlines)
      4. Statement of Work details
      5. Any special instructions or evaluation factors
      
      Be thorough and specific. Focus on information that would help write a winning proposal.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            key_requirements: { type: "array", items: { type: "string" } },
            evaluation_criteria: { type: "array", items: { type: "string" } },
            submission_requirements: { type: "string" },
            sow_summary: { type: "string" },
            special_instructions: { type: "array", items: { type: "string" } },
            page_limits: { type: "string" },
            due_dates: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Update proposal with analysis
      await onUpdate({
        solicitation_analysis: JSON.stringify(analysis),
        current_phase: 'phase3'
      });

      toast.success('✅ Analysis complete! Moving to next phase...');
      if (onNext) onNext();

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Upload Solicitation Documents
          </CardTitle>
          <CardDescription>
            Upload RFP, SOW, PWS, and other solicitation documents for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Supported File Types
                </p>
                <p className="text-xs text-blue-800">
                  ✅ PDF, Word (DOCX/DOC), Excel (XLSX/XLS), Images (PNG/JPG), CSV
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Upload all relevant solicitation documents. Our AI will analyze them to identify requirements, 
                  evaluation criteria, and key submission details.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full border-green-300 hover:bg-green-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Uploaded Documents List */}
          {docsLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
            </div>
          ) : solicitationDocs.length > 0 ? (
            <div className="space-y-2">
              <Label>Uploaded Documents ({solicitationDocs.length})</Label>
              {solicitationDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.file_name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {doc.document_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No documents uploaded yet</p>
            </div>
          )}

          {/* Analyze Button */}
          {solicitationDocs.length > 0 && (
            <Button
              onClick={analyzeDocuments}
              disabled={isAnalyzing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI Analyzing Documents...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze with AI & Continue
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
