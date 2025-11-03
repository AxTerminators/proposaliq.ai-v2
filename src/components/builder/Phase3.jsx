
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Upload,
  X,
  Plus,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
  DollarSign,
  Shield,
  Eye,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function Phase3({ proposalData, setProposalData, proposalId, onSaveAndGoToPipeline }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [evaluationFactors, setEvaluationFactors] = useState([]);
  const [newFactor, setNewFactor] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzingDeep, setIsAnalyzingDeep] = useState(false);
  const [extractionResults, setExtractionResults] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [compliancePreview, setCompliancePreview] = useState(null);
  const [extractionProgress, setExtractionProgress] = useState(0);

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

  useEffect(() => {
    const loadDocuments = async () => {
      if (!proposalId || !currentOrgId) return;
      try {
        const docs = await base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id
        });
        setUploadedDocs(docs.map(doc => ({
          name: doc.file_name,
          url: doc.file_url,
          type: doc.document_type
        })));
      } catch (error) {
        console.error("Error loading documents:", error);
      }
    };
    loadDocuments();
  }, [proposalId, currentOrgId]);

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
      }
    } catch (error) {
      console.error("Error extracting basic data:", error);
      // Don't show alert - the Deep AI Analysis will handle full extraction
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
    setExtractionProgress(0);

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

      setExtractionProgress(10);

      const prompt = `You are an expert proposal compliance analyst. Perform a comprehensive analysis of these solicitation documents.

**EXTRACT THE FOLLOWING:**

1. **Key Requirements:** Identify all mandatory and desirable requirements from Section L, M, C, and other relevant sections.
2. **Compliance Checklist:** Create a detailed compliance matrix of submission requirements (format, page limits, mandatory sections).
3. **Evaluation/Scoring Criteria:** Extract the exact scoring methodology, weights, and evaluation factors.
4. **Risk Factors:** Identify potential risks, challenges, or red flags in the solicitation.
5. **Key Dates & Milestones:** All important dates beyond just the due date (pre-proposal conference, question deadline, etc.)
6. **Special Requirements:** Any unique or unusual requirements (security clearances, certifications, insurance, bonding).
7. **PRICING STRUCTURE:** Extract pricing requirements, CLIN structure, contract type, pricing periods, option years, and any cost constraints.
8. **FORMATTING REQUIREMENTS:** Page limits, font size, margins, line spacing, file formats.
9. **SUBMISSION REQUIREMENTS:** Number of copies, delivery method, required forms, certifications.

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
  },
  "submission_requirements": {
    "number_of_copies": number,
    "delivery_method": "string",
    "required_forms": ["string"],
    "required_certifications": ["string"],
    "electronic_submission": boolean,
    "portal_url": "string"
  }
}`;

      setExtractionProgress(30);

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
            pricing_structure: { type: "object" },
            submission_requirements: { type: "object" }
          }
        }
      });

      setExtractionProgress(60);
      setExtractionResults(result);

      let createdCount = 0;
      if (result.mandatory_requirements && result.mandatory_requirements.length > 0) {
        for (const req of result.mandatory_requirements) {
          await base44.entities.ComplianceRequirement.create({
            proposal_id: proposalId,
            organization_id: currentOrgId.id,
            requirement_id: req.requirement_id || `AUTO-${Date.now()}-${createdCount}`,
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
          createdCount++;
        }
      }

      setExtractionProgress(80);

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
          indirect_rates: result.pricing_structure.labor_requirements || {}
        };

        if (strategies.length > 0) {
          await base44.entities.PricingStrategy.update(strategies[0].id, pricingData);
        } else {
          await base44.entities.PricingStrategy.create(pricingData);
        }
      }

      setExtractionProgress(100);

      setCompliancePreview({
        totalRequirements: result.mandatory_requirements?.length || 0,
        criticalRisks: result.risk_factors?.filter(r => r.severity === 'critical').length || 0,
        keyDates: result.key_dates?.filter(d => d.importance === 'critical').length || 0,
        formattingRules: Object.keys(result.format_requirements || {}).length
      });

      alert(`✓ Deep analysis complete! Created ${createdCount} compliance requirements and extracted pricing structure.`);

    } catch (error) {
      console.error("Error analyzing solicitation:", error);
      alert("Error performing deep analysis. Please try again.");
    } finally {
      setIsAnalyzingDeep(false);
      setExtractionProgress(0);
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
        
        // Silent basic extraction - no alerts on failure
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

  const handleContinueToUpload = () => {
    if (!proposalData.project_type || !proposalData.solicitation_number || !proposalData.agency_name) {
      alert("Please fill in at least Project Type, Solicitation Number, and Agency Name before continuing");
      return;
    }
    setCurrentStep(2);
  };

  const handleViewCompliancePreview = () => {
    if (!extractionResults) {
      alert("Please run Deep AI Analysis first to see the compliance preview");
      return;
    }
    setCurrentStep(3);
  };

  const steps = [
    { number: 1, label: "Enter Details", completed: currentStep > 1 },
    { number: 2, label: "Upload & Analyze", completed: currentStep > 2 },
    { number: 3, label: "Review Compliance", completed: false }
  ];

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Phase 3: Solicitation Details & Compliance Analysis
        </CardTitle>
        <CardDescription>
          Follow these steps to gather solicitation information and extract compliance requirements
        </CardDescription>
        
        {/* Step Progress Indicator */}
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step.completed 
                      ? 'bg-green-600 text-white' 
                      : currentStep === step.number 
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {step.completed ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span className={`text-xs mt-2 font-medium text-center ${
                    currentStep === step.number ? 'text-blue-700' : 'text-slate-600'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                    step.completed ? 'bg-green-600' : 'bg-slate-200'
                  }`} style={{ marginTop: '-35px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* STEP 1: Solicitation Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
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
                <Label htmlFor="project_type">Project Type *</Label>
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
                <Label htmlFor="solicitation_number">Solicitation Number *</Label>
                <Input
                  id="solicitation_number"
                  value={proposalData.solicitation_number}
                  onChange={(e) => setProposalData({...proposalData, solicitation_number: e.target.value})}
                  placeholder="e.g., W912DY24R0001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency_name">Agency Name *</Label>
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Contract Value Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_value">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Contract Value
                    </div>
                  </Label>
                  <Input
                    id="contract_value"
                    type="number"
                    value={proposalData.contract_value || ""}
                    onChange={(e) => setProposalData({...proposalData, contract_value: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 5000000"
                  />
                  <p className="text-sm text-slate-500">
                    Estimated contract value in USD
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_value_type">Value Type</Label>
                  <Select
                    value={proposalData.contract_value_type || "estimated"}
                    onValueChange={(value) => setProposalData({...proposalData, contract_value_type: value})}
                  >
                    <SelectTrigger id="contract_value_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estimated">Estimated</SelectItem>
                      <SelectItem value="ceiling">Ceiling</SelectItem>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="target">Target</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-500">
                    Type of value estimate
                  </p>
                </div>
              </div>

              {proposalData.contract_value > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Contract Value Summary</span>
                  </div>
                  <div className="text-sm text-green-800">
                    <p>
                      <strong>{proposalData.contract_value_type?.charAt(0).toUpperCase() + proposalData.contract_value_type?.slice(1) || 'Estimated'} Value:</strong>{' '}
                      ${proposalData.contract_value.toLocaleString()} USD
                    </p>
                    {proposalData.contract_value >= 1000000 && (
                      <p className="mt-1">
                        That's approximately <strong>${(proposalData.contract_value / 1000000).toFixed(2)}M</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
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

            <div className="flex justify-end pt-6 border-t">
              <Button
                onClick={handleContinueToUpload}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue to Document Upload
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Document Upload & Analysis */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-lg">Upload Solicitation Documents</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Smart Document Reading + Data Privacy</p>
                    <p className="text-xs text-indigo-700 mt-1">
                      AI will automatically analyze your PDF documents and extract compliance requirements
                    </p>
                    <p className="text-xs text-indigo-700 mt-1">
                      🔒 <strong>Your documents stay private to your organization - never shared with others</strong>
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">
                Supported: <strong>PDF files only</strong> (up to 30MB per file)
              </p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-700 font-medium mb-1">Click to upload PDF files</p>
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
                    <p className="text-sm font-medium text-slate-700">Uploaded Documents ({uploadedDocs.length}):</p>
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

            {uploadedDocs.some(doc => ['rfp', 'rfq', 'sow', 'pws'].includes(doc.type)) && (
              <div className="border-t pt-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Run Deep AI Analysis
                  </h3>
                  <p className="text-sm text-slate-700 mb-4">
                    Click the button below to have AI analyze your solicitation documents and automatically extract:
                  </p>
                  <ul className="text-sm text-slate-700 space-y-1 mb-4 ml-4">
                    <li>✓ Mandatory compliance requirements</li>
                    <li>✓ Evaluation criteria and scoring</li>
                    <li>✓ Risk factors and red flags</li>
                    <li>✓ Pricing structure and constraints</li>
                    <li>✓ Formatting and submission requirements</li>
                  </ul>
                  <Button
                    onClick={deepAnalyzeSolicitation}
                    disabled={isAnalyzingDeep}
                    className="bg-indigo-600 hover:bg-indigo-700 w-full"
                    size="lg"
                  >
                    {isAnalyzingDeep ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Documents...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Run Deep AI Analysis
                      </>
                    )}
                  </Button>

                  {isAnalyzingDeep && extractionProgress > 0 && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-indigo-900">Analyzing documents...</span>
                        <span className="text-sm text-indigo-700">{extractionProgress}%</span>
                      </div>
                      <Progress value={extractionProgress} className="h-2" />
                      <p className="text-xs text-indigo-600 mt-2">
                        {extractionProgress < 30 && "Reading documents..."}
                        {extractionProgress >= 30 && extractionProgress < 60 && "Extracting requirements..."}
                        {extractionProgress >= 60 && extractionProgress < 80 && "Creating compliance records..."}
                        {extractionProgress >= 80 && "Finalizing analysis..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Details
              </Button>
              {extractionResults && (
                <Button
                  onClick={handleViewCompliancePreview}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Compliance Preview
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Compliance Preview */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {!extractionResults ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Compliance Analysis Yet</h3>
                <p className="text-slate-600 mb-4">
                  Please go back to Step 2 and run "Deep AI Analysis" to extract compliance requirements
                </p>
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Document Upload
                </Button>
              </div>
            ) : (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
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
                        <Eye className="w-3 h-3 inline mr-1" />
                        View full compliance matrix in <strong>Phase 4: Evaluator</strong>
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-3xl font-bold text-blue-700">
                        {extractionResults.mandatory_requirements?.length || 0}
                      </p>
                      <p className="text-sm text-slate-600">Requirements</p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                      <p className="text-3xl font-bold text-red-700">
                        {extractionResults.risk_factors?.filter(r => r.severity === 'critical' || r.severity === 'high').length || 0}
                      </p>
                      <p className="text-sm text-slate-600">High Risks</p>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-3xl font-bold text-amber-700">
                        {extractionResults.evaluation_criteria?.length || 0}
                      </p>
                      <p className="text-sm text-slate-600">Eval Criteria</p>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-8 h-8 text-purple-600" />
                      </div>
                      <p className="text-3xl font-bold text-purple-700">
                        {extractionResults.format_requirements ? Object.keys(extractionResults.format_requirements).length : 0}
                      </p>
                      <p className="text-sm text-slate-600">Format Rules</p>
                    </CardContent>
                  </Card>
                </div>

                {extractionResults.risk_factors && extractionResults.risk_factors.some(r => r.severity === 'critical') && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        Critical Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {extractionResults.risk_factors
                          .filter(r => r.severity === 'critical')
                          .map((risk, idx) => (
                            <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-red-900 text-sm">{risk.risk}</p>
                                  <Badge className="mt-1 text-xs bg-red-600 text-white">
                                    {risk.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

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

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => alert("Navigate to Pricing Module to build complete pricing structure")}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Build Full Pricing Strategy
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>
                          <strong>Phase 4:</strong> Review full compliance matrix and map requirements to proposal sections
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>
                          <strong>Phase 5:</strong> Use extracted data to develop win themes and strategies
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>
                          <strong>Pricing Module:</strong> Build complete pricing structure based on extracted requirements
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Documents
                  </Button>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Phase 3 Complete! Use the "Next" button below to continue to Phase 4
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* Add button at bottom */}
      {onSaveAndGoToPipeline && (
        <div className="px-6 pb-6">
          <div className="flex justify-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onSaveAndGoToPipeline}
              className="bg-white hover:bg-slate-50"
            >
              Save and Go to Pipeline
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
