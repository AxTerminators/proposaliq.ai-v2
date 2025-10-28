import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, X, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Phase3({ proposalData, setProposalData, proposalId }) {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [evaluationFactors, setEvaluationFactors] = useState([]);
  const [newFactor, setNewFactor] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(null);

  // SECURITY: Get current user's organization for data isolation
  useEffect(() => {
    const loadOrgId = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  const extractSolicitationData = async (fileUrl, fileName) => {
    try {
      setIsExtracting(true);
      
      // Check file extension - ExtractDataFromUploadedFile only supports: csv, png, jpg, jpeg, pdf
      const lowerFileName = fileName.toLowerCase();
      const supportedByExtractor = lowerFileName.endsWith('.pdf') || 
                                   lowerFileName.endsWith('.csv') || 
                                   lowerFileName.endsWith('.png') || 
                                   lowerFileName.endsWith('.jpg') || 
                                   lowerFileName.endsWith('.jpeg');

      if (supportedByExtractor) {
        // Try structured extraction first for supported files
        const schema = {
          type: "object",
          properties: {
            solicitation_number: { type: "string" },
            agency_name: { type: "string" },
            project_title: { type: "string" },
            due_date: { type: "string" },
            project_type: { type: "string" },
            evaluation_factors: {
              type: "array",
              items: { type: "string" }
            },
            key_requirements: {
              type: "array",
              items: { type: "string" }
            }
          }
        };

        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: schema
        });

        if (result.status === "success" && result.output) {
          const data = result.output;
          
          if (data.solicitation_number && !proposalData.solicitation_number) {
            setProposalData(prev => ({...prev, solicitation_number: data.solicitation_number}));
          }
          if (data.agency_name && !proposalData.agency_name) {
            setProposalData(prev => ({...prev, agency_name: data.agency_name}));
          }
          if (data.project_title && !proposalData.project_title) {
            setProposalData(prev => ({...prev, project_title: data.project_title}));
          }
          if (data.due_date && !proposalData.due_date) {
            const dateStr = new Date(data.due_date).toISOString().split('T')[0];
            setProposalData(prev => ({...prev, due_date: dateStr}));
          }
          if (data.project_type && !proposalData.project_type) {
            setProposalData(prev => ({...prev, project_type: data.project_type}));
          }
          
          if (data.evaluation_factors && data.evaluation_factors.length > 0) {
            setEvaluationFactors(prev => {
              const combined = [...prev, ...data.evaluation_factors];
              return [...new Set(combined)];
            });
          }

          alert(`✓ Auto-populated fields from ${fileName}!`);
          return; // Success, no need for fallback
        }
      }
      
      // Fallback to AI extraction for all files (especially DOCX, XLSX, PPTX, TXT)
      const aiPrompt = `Analyze this solicitation document and extract the following information in JSON format:
- Solicitation Number
- Agency Name  
- Project Title
- Due Date (in YYYY-MM-DD format if possible)
- Project Type (RFP, RFQ, RFI, IFB, or other)
- Evaluation Factors (list of factors used to evaluate proposals)

Return as valid JSON.`;

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            solicitation_number: { type: "string" },
            agency_name: { type: "string" },
            project_title: { type: "string" },
            due_date: { type: "string" },
            project_type: { type: "string" },
            evaluation_factors: { type: "array", items: { type: "string" } }
          }
        }
      });

      if (aiResult) {
        if (aiResult.solicitation_number && !proposalData.solicitation_number) {
          setProposalData(prev => ({...prev, solicitation_number: aiResult.solicitation_number}));
        }
        if (aiResult.agency_name && !proposalData.agency_name) {
          setProposalData(prev => ({...prev, agency_name: aiResult.agency_name}));
        }
        if (aiResult.project_title && !proposalData.project_title) {
          setProposalData(prev => ({...prev, project_title: aiResult.project_title}));
        }
        if (aiResult.due_date && !proposalData.due_date) {
          try {
            const dateStr = new Date(aiResult.due_date).toISOString().split('T')[0];
            setProposalData(prev => ({...prev, due_date: dateStr}));
          } catch (e) {}
        }
        if (aiResult.project_type && !proposalData.project_type) {
          setProposalData(prev => ({...prev, project_type: aiResult.project_type}));
        }
        if (aiResult.evaluation_factors && aiResult.evaluation_factors.length > 0) {
          setEvaluationFactors(prev => {
            const combined = [...prev, ...aiResult.evaluation_factors];
            return [...new Set(combined)];
          });
        }
        
        alert(`✓ AI extracted data from ${fileName}!`);
      }
    } catch (error) {
      console.error("Error extracting data:", error);
      alert(`Note: Could not auto-extract data from ${fileName}. You can still manually enter the details.`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!proposalId) {
      alert("Please save the proposal first (complete Phase 1)");
      return;
    }

    if (!currentOrgId) {
      alert("Organization not found. Please complete onboarding first.");
      return;
    }

    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        let docType = "other";
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('rfp') || lowerName.includes('request for proposal')) {
          docType = "rfp";
        } else if (lowerName.includes('rfq') || lowerName.includes('request for quote')) {
          docType = "rfq";
        } else if (lowerName.includes('sow') || lowerName.includes('statement of work')) {
          docType = "sow";
        } else if (lowerName.includes('pws') || lowerName.includes('performance work')) {
          docType = "pws";
        }
        
        // SECURITY: Always include organization_id to ensure data isolation
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          organization_id: currentOrgId,
          document_type: docType,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size
        });
        
        setUploadedDocs(prev => [...prev, { name: file.name, url: file_url, type: docType }]);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        
        if (['rfp', 'rfq', 'sow', 'pws'].includes(docType)) {
          await extractSolicitationData(file_url, file.name);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const suggestEvaluationFactors = async () => {
    setIsSuggesting(true);
    try {
      const prompt = `Based on this ${proposalData.project_type} solicitation for ${proposalData.agency_name}, suggest 5-8 key evaluation factors that are typically used in government proposals. 

Project: ${proposalData.project_title}
Type: ${proposalData.project_type}

Return a JSON array of evaluation factor names.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            factors: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (result.factors) {
        setEvaluationFactors(result.factors);
      }
    } catch (error) {
      console.error("Error suggesting factors:", error);
    }
    setIsSuggesting(false);
  };

  const addFactor = () => {
    if (newFactor.trim()) {
      setEvaluationFactors([...evaluationFactors, newFactor.trim()]);
      setNewFactor("");
    }
  };

  const removeFactor = (index) => {
    setEvaluationFactors(evaluationFactors.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Phase 3: Solicitation Details
        </CardTitle>
        <CardDescription>
          Add information about the opportunity and upload documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isExtracting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-blue-900 font-medium">AI is reading and extracting data from your documents...</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project_type">Project Type</Label>
            <Select
              value={proposalData.project_type}
              onValueChange={(value) => setProposalData({...proposalData, project_type: value})}
            >
              <SelectTrigger id="project_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RFP">RFP - Request for Proposal</SelectItem>
                <SelectItem value="RFQ">RFQ - Request for Quotation</SelectItem>
                <SelectItem value="RFI">RFI - Request for Information</SelectItem>
                <SelectItem value="IFB">IFB - Invitation for Bid</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {proposalData.project_type === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="project_type_other">Specify Type</Label>
              <Input
                id="project_type_other"
                value={proposalData.project_type_other || ""}
                onChange={(e) => setProposalData({...proposalData, project_type_other: e.target.value})}
                placeholder="Enter project type"
              />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="solicitation_number">Solicitation Number</Label>
            <Input
              id="solicitation_number"
              value={proposalData.solicitation_number}
              onChange={(e) => setProposalData({...proposalData, solicitation_number: e.target.value})}
              placeholder="e.g., W912DY24R0001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency_name">Agency Name</Label>
            <Input
              id="agency_name"
              value={proposalData.agency_name}
              onChange={(e) => setProposalData({...proposalData, agency_name: e.target.value})}
              placeholder="e.g., Department of Defense"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project_title">Project Title</Label>
          <Input
            id="project_title"
            value={proposalData.project_title}
            onChange={(e) => setProposalData({...proposalData, project_title: e.target.value})}
            placeholder="Brief description of the project"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={proposalData.due_date}
            onChange={(e) => setProposalData({...proposalData, due_date: e.target.value})}
          />
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Evaluation Factors</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={suggestEvaluationFactors}
              disabled={isSuggesting}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${isSuggesting ? 'animate-spin' : ''}`} />
              {isSuggesting ? 'Suggesting...' : 'AI Suggest Factors'}
            </Button>
          </div>
          
          <p className="text-sm text-slate-600 mb-4">
            Add evaluation factors that will be used to assess your proposal
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              value={newFactor}
              onChange={(e) => setNewFactor(e.target.value)}
              placeholder="e.g., Technical Capability"
              onKeyPress={(e) => e.key === 'Enter' && addFactor()}
            />
            <Button onClick={addFactor}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {evaluationFactors.map((factor, idx) => (
              <Badge key={idx} variant="secondary" className="gap-2 py-2 px-3">
                {factor}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-600"
                  onClick={() => removeFactor(idx)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-2">Upload Solicitation Documents</h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-indigo-900">Smart Document Reading + Data Privacy</p>
                <p className="text-xs text-indigo-700 mt-1">
                  AI will automatically read all document types and auto-populate fields above
                </p>
                <p className="text-xs text-indigo-700 mt-1">
                  🔒 <strong>Your documents stay private to your organization - never shared with others</strong>
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-slate-600 mb-4">
            Supported: PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG, TXT, PPTX (up to 30MB)
          </p>
          
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt,.pptx"
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-700 font-medium mb-1">Click to upload files</p>
              <p className="text-sm text-slate-500">or drag and drop</p>
            </label>
          </div>

          {uploadingFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 mb-2">Uploading...</p>
              {uploadingFiles.map((name, idx) => (
                <Badge key={idx} variant="secondary" className="mr-2 mb-2">
                  {name}
                </Badge>
              ))}
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Uploaded Documents:</p>
              {uploadedDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-medium">{doc.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}