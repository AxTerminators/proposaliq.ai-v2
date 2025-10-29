
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, X, Plus, Sparkles, CheckCircle2, AlertCircle, Loader2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Phase3({ proposalData, setProposalData, proposalId }) {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [evaluationFactors, setEvaluationFactors] = useState([]);
  const [newFactor, setNewFactor] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzingDeep, setIsAnalyzingDeep] = useState(false);
  const [extractionResults, setExtractionResults] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);

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
          setCurrentOrgId(orgs[0]);
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
      
      const aiPrompt = `Analyze this solicitation document and extract the following information in JSON format:
- Solicitation Number
- Agency Name  
- Project Title
- Due Date (in YYYY-MM-DD format if possible)
- Project Type (RFP, RFQ, RFI, IFB, or other)
- Evaluation Factors (list of factors used to evaluate proposals)

Return as valid JSON with these exact keys: solicitation_number, agency_name, project_title, due_date, project_type, evaluation_factors`;

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
          } catch (e) {
            console.error("Error parsing date:", e);
          }
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

  const deepAnalyzeSolicitation = async () => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsAnalyzingDeep(true);
    setExtractionResults(null);

    try {
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId.id
      });

      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url && doc.document_type !== 'reference')
        .map(doc => doc.file_url)
        .slice(0, 10);

      if (fileUrls.length === 0) {
        alert("Please upload solicitation documents first");
        setIsAnalyzingDeep(false);
        return;
      }

      const prompt = `You are an expert proposal analyst. Perform a comprehensive analysis of these solicitation documents.

**EXTRACT THE FOLLOWING:**

1. **Key Requirements:** Identify all mandatory and desirable requirements from Section L, M, C, and other relevant sections.
2. **Compliance Checklist:** Create a detailed compliance matrix of submission requirements (format, page limits, mandatory sections).
3. **Evaluation/Scoring Criteria:** Extract the exact scoring methodology, weights, and evaluation factors.
4. **Risk Factors:** Identify potential risks, challenges, or red flags in the solicitation.
5. **Key Dates & Milestones:** All important dates beyond just the due date (pre-proposal conference, question deadline, etc.)
6. **Special Requirements:** Any unique or unusual requirements (security clearances, certifications, insurance, bonding).
7. **PRICING STRUCTURE:** Extract pricing requirements, CLIN structure, contract type, pricing periods, option years, and any cost constraints.

Return as detailed JSON following this schema:

{
  "mandatory_requirements": [
    {
      "requirement_id": "string (e.g., L-001)",
      "requirement_title": "string",
      "requirement_description": "string",
      "source_section": "string (e.g., Section L.3.2)",
      "category": "technical|submission_format|administrative|certification",
      "risk_level": "low|medium|high|critical"
    }
  ],
  "evaluation_criteria": [
    {
      "criterion_name": "string",
      "weight_percentage": number,
      "evaluation_approach": "string",
      "key_focus_areas": ["string"]
    }
  ],
  "format_requirements": {
    "page_limit": number,
    "font": "string",
    "font_size": number,
    "margins": "string",
    "line_spacing": number,
    "mandatory_sections": ["string"]
  },
  "risk_factors": [
    {
      "risk": "string",
      "severity": "low|medium|high|critical",
      "category": "technical|schedule|cost|compliance"
    }
  ],
  "key_dates": [
    {
      "date": "string (YYYY-MM-DD)",
      "event": "string",
      "importance": "critical|important|informational"
    }
  ],
  "special_requirements": [
    {
      "requirement": "string",
      "type": "clearance|certification|insurance|bonding|other",
      "details": "string"
    }
  ],
  "pricing_structure": {
    "contract_type": "FFP|T&M|CPFF|CPAF|Hybrid|Other",
    "pricing_model_preference": "string (agency's stated preference)",
    "clin_structure": {
      "base_period": "string (description)",
      "option_years": number,
      "clin_breakdown": ["string (list of expected CLINs)"]
    },
    "budget_constraints": {
      "stated_budget": number,
      "budget_range_low": number,
      "budget_range_high": number,
      "budget_notes": "string"
    },
    "pricing_submission_requirements": {
      "format": "string",
      "separate_pricing_volume": boolean,
      "required_cost_breakdown": ["string"],
      "required_justifications": ["string"]
    },
    "labor_requirements": {
      "labor_categories_specified": boolean,
      "rates_specified": boolean,
      "escalation_allowed": boolean,
      "loaded_vs_unloaded": "string"
    },
    "odc_requirements": {
      "travel_allowed": boolean,
      "materials_allowed": boolean,
      "subcontracting_allowed": boolean,
      "fee_on_odc": boolean
    },
    "pricing_risks": ["string"],
    "competitive_pricing_indicators": "string"
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            mandatory_requirements: { type: "array" },
            evaluation_criteria: { type: "array" },
            format_requirements: { type: "object" },
            risk_factors: { type: "array" },
            key_dates: { type: "array" },
            special_requirements: { type: "array" },
            pricing_structure: { type: "object" }
          }
        }
      });

      setExtractionResults(result);

      // Auto-create ComplianceRequirement records
      if (result.mandatory_requirements && result.mandatory_requirements.length > 0) {
        for (const req of result.mandatory_requirements) {
          await base44.entities.ComplianceRequirement.create({
            proposal_id: proposalId,
            organization_id: currentOrgId.id,
            requirement_id: req.requirement_id || `AUTO-${Date.now()}`,
            requirement_title: req.requirement_title,
            requirement_type: req.category || "solicitation_specific",
            requirement_category: "mandatory",
            requirement_description: req.requirement_description,
            requirement_source: req.source_section,
            compliance_status: "not_started",
            risk_level: req.risk_level || "medium",
            ai_detected: true,
            ai_confidence: 85
          });
        }
      }

      // Create PricingStrategy with extracted pricing structure
      if (result.pricing_structure) {
        const strategies = await base44.entities.PricingStrategy.filter({ proposal_id: proposalId });
        
        const pricingData = {
          proposal_id: proposalId,
          organization_id: currentOrgId.id,
          pricing_approach: result.pricing_structure.contract_type || 'competitive',
          basis_of_estimate: result.pricing_structure.pricing_model_preference || '',
          pricing_assumptions: [
            ...(result.pricing_structure.pricing_risks || []),
            result.pricing_structure.competitive_pricing_indicators || ''
          ].filter(Boolean),
          indirect_rates: result.pricing_structure.labor_requirements || {} // Store labor requirements here
        };

        if (strategies.length > 0) {
          await base44.entities.PricingStrategy.update(strategies[0].id, pricingData);
        } else {
          await base44.entities.PricingStrategy.create(pricingData);
        }
      }

      alert(`✓ Deep analysis complete! Created ${result.mandatory_requirements?.length || 0} compliance requirements and extracted pricing structure.`);

    } catch (error) {
      console.error("Error analyzing solicitation:", error);
      alert("Error performing deep analysis. Please try again.");
    } finally {
      setIsAnalyzingDeep(false);
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
        
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          organization_id: currentOrgId.id,
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
        alert(`Error uploading ${file.name}. Please try again.`);
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Uploaded Documents:</p>
                {uploadedDocs.some(doc => ['rfp', 'rfq', 'sow', 'pws'].includes(doc.type)) && (
                  <Button
                    onClick={deepAnalyzeSolicitation}
                    disabled={isAnalyzingDeep}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isAnalyzingDeep ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Deep AI Analysis
                      </>
                    )}
                  </Button>
                )}
              </div>
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

        {extractionResults && (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-900">Deep Analysis Complete!</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ {extractionResults.mandatory_requirements?.length || 0} mandatory requirements identified</li>
                    <li>✓ {extractionResults.evaluation_criteria?.length || 0} evaluation criteria extracted</li>
                    <li>✓ {extractionResults.risk_factors?.length || 0} risk factors flagged</li>
                    <li>✓ {extractionResults.key_dates?.length || 0} key dates captured</li>
                    <li>✓ Compliance requirements automatically created</li>
                    {extractionResults.pricing_structure && (
                      <li>✓ Pricing structure and requirements extracted</li>
                    )}
                  </ul>
                  <p className="text-xs text-green-700 mt-2">
                    View detailed analysis in Phase 4: Evaluator and Pricing Module
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {extractionResults.pricing_structure && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Extracted Pricing Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Contract Type</p>
                      <Badge className="bg-purple-600 text-white">
                        {extractionResults.pricing_structure.contract_type || 'Not specified'}
                      </Badge>
                    </div>

                    {extractionResults.pricing_structure.clin_structure && (
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">Option Years</p>
                        <p className="font-semibold text-slate-900">
                          {extractionResults.pricing_structure.clin_structure.option_years ?? 'Not specified'}
                        </p>
                      </div>
                    )}

                    {extractionResults.pricing_structure.budget_constraints?.stated_budget && (
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">Stated Budget</p>
                        <p className="font-semibold text-slate-900">
                          ${extractionResults.pricing_structure.budget_constraints.stated_budget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {extractionResults.pricing_structure.pricing_model_preference && (
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">Agency Preference</p>
                        <p className="text-sm text-slate-900">
                          {extractionResults.pricing_structure.pricing_model_preference}
                        </p>
                      </div>
                    )}
                  </div>

                  {extractionResults.pricing_structure.pricing_risks?.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-900 mb-1">⚠️ Pricing Risks Identified:</p>
                      <ul className="text-xs text-amber-800 space-y-1">
                        {extractionResults.pricing_structure.pricing_risks.slice(0, 3).map((risk, idx) => (
                          <li key={idx}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-purple-700">
                    💡 Use this data in the Pricing Module for AI-powered pricing recommendations
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
