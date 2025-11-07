
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
  CheckCircle,
  ArrowRight,
  ArrowLeft
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

  // TOKEN SAFETY: Light extraction - only basic fields
  const extractSolicitationData = async (fileUrl, fileName) => {
    try {
      setIsExtracting(true);
      
      const aiPrompt = `Extract ONLY these basic fields from this solicitation:
- Solicitation Number
- Agency Name  
- Project Title
- Due Date (YYYY-MM-DD)
- Project Type (RFP/RFQ/RFI/IFB/Other)

Return JSON with these exact keys: solicitation_number, agency_name, project_title, due_date, project_type`;

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
            project_type: { type: "string" }
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
      }
    } catch (error) {
      console.error("Error extracting basic data:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  // TOKEN SAFETY: Split deep analysis into smaller, focused calls
  const deepAnalyzeSolicitation = async () => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsAnalyzingDeep(true);
    setExtractionResults({ mandatory_requirements: [], pricing_structure: null });
    setExtractionProgress(0);

    try {
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId.id
      });

      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url && doc.document_type !== 'reference')
        .map(doc => doc.file_url)
        .slice(0, 10); // Limit files for analysis to prevent token overload

      if (fileUrls.length === 0) {
        alert("Please upload solicitation documents first");
        setIsAnalyzingDeep(false);
        return;
      }

      setExtractionProgress(10);

      // CALL 1: Extract Requirements Only (focused, smaller prompt)
      const requirementsPrompt = `Extract compliance requirements from this solicitation document(s). For each requirement, provide an ID, a concise title (max 100 chars), a brief description (max 200 chars), the source section, a category (technical|administrative|certification), and a risk level (low|medium|high|critical).

Return JSON in the format:
{
  "requirements": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "requirement_description": "string",
      "source_section": "string",
      "category": "technical|administrative|certification",
      "risk_level": "low|medium|high|critical"
    }
  ]
}

Limit the response to the 30 most critical or important requirements.`;

      const requirementsResult = await base44.integrations.Core.InvokeLLM({
        prompt: requirementsPrompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            requirements: { type: "array", items: { type: "object" } }
          }
        }
      });

      setExtractionProgress(40);

      // Create compliance requirements
      let createdCount = 0;
      if (requirementsResult && requirementsResult.requirements && requirementsResult.requirements.length > 0) {
        for (const req of requirementsResult.requirements.slice(0, 30)) { // Hard limit to ensure a reasonable number
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

      setExtractionProgress(70);

      // CALL 2: Extract Pricing Info Only (separate, focused call)
      const pricingPrompt = `Extract key pricing requirements from this solicitation document(s). Identify the contract type, any specified option years, and any stated budget ranges (low and high values).

Return JSON in the format:
{
  "contract_type": "FFP|T&M|CPFF|CPAF|Hybrid|Other",
  "option_years": "number (number of option years, if specified, otherwise null)",
  "budget_low": "number (lower bound of budget, if specified, otherwise null)",
  "budget_high": "number (upper bound of budget, if specified, otherwise null)"
}`;

      const pricingResult = await base44.integrations.Core.InvokeLLM({
        prompt: pricingPrompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            contract_type: { type: "string" },
            option_years: { type: "number", nullable: true },
            budget_low: { type: "number", nullable: true },
            budget_high: { type: "number", nullable: true }
          }
        }
      });

      setExtractionProgress(85);

      // Save pricing strategy
      if (pricingResult) {
        const strategies = await base44.entities.PricingStrategy.filter({ proposal_id: proposalId });
        
        const pricingData = {
          proposal_id: proposalId,
          organization_id: currentOrgId.id,
          pricing_approach: pricingResult.contract_type || 'competitive',
          // Simplified, other fields like basis_of_estimate, assumptions are not extracted in this simplified flow
        };

        if (strategies.length > 0) {
          await base44.entities.PricingStrategy.update(strategies[0].id, pricingData);
        } else {
          await base44.entities.PricingStrategy.create(pricingData);
        }
      }

      setExtractionProgress(100);
      setExtractionResults({
        mandatory_requirements: requirementsResult.requirements || [],
        pricing_structure: pricingResult
      });

      alert(`✓ Analysis complete! Created ${createdCount} compliance requirements.`);

    } catch (error) {
      console.error("Error analyzing solicitation:", error);
      alert("Error during analysis. Please try again.");
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
      alert("Organization not found");
      return;
    }

    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        let docType = "other";
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('rfp')) docType = "rfp";
        else if (lowerName.includes('rfq')) docType = "rfq";
        else if (lowerName.includes('sow')) docType = "sow";
        else if (lowerName.includes('pws')) docType = "pws";
        
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
        alert(`Error uploading ${file.name}`);
      }
    }
  };

  const suggestEvaluationFactors = async () => {
    setIsSuggesting(true);
    try {
      const prompt = `Suggest 5-8 typical evaluation factors for a ${proposalData.project_type} at ${proposalData.agency_name}.

Return JSON array: {"factors": [string]}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            factors: { type: "array", items: { type: "string" } }
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
      alert("Please fill in at least Project Type, Solicitation Number, and Agency Name");
      return;
    }
    setCurrentStep(2);
  };

  const handleViewCompliancePreview = () => {
    if (!extractionResults) {
      alert("Please run Deep AI Analysis first");
      return;
    }
    setCurrentStep(3);
  };

  const steps = [
    { number: 1, label: "Enter Details", completed: currentStep > 1 },
    { number: 2, label: "Upload & Analyze", completed: currentStep > 2 },
    { number: 3, label: "Review", completed: false }
  ];

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Phase 3: Solicitation Analysis
        </CardTitle>
        <CardDescription>
          Upload documents and let AI extract requirements
        </CardDescription>
        
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
              <Alert className="bg-blue-50 border-blue-200">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <AlertDescription>
                  AI is reading your documents...
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Type *</Label>
                <Select
                  value={proposalData.project_type}
                  onValueChange={(value) => setProposalData({...proposalData, project_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RFP">RFP</SelectItem>
                    <SelectItem value="RFQ">RFQ</SelectItem>
                    <SelectItem value="RFI">RFI</SelectItem>
                    <SelectItem value="IFB">IFB</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agency Name *</Label>
                <Input
                  value={proposalData.agency_name}
                  onChange={(e) => setProposalData({...proposalData, agency_name: e.target.value})}
                  placeholder="e.g., Department of Defense"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Solicitation Number *</Label>
              <Input
                value={proposalData.solicitation_number}
                onChange={(e) => setProposalData({...proposalData, solicitation_number: e.target.value})}
                placeholder="e.g., W912DY24R0001"
              />
            </div>

            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input
                value={proposalData.project_title}
                onChange={(e) => setProposalData({...proposalData, project_title: e.target.value})}
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={proposalData.due_date}
                onChange={(e) => setProposalData({...proposalData, due_date: e.target.value})}
              />
            </div>

            {/* Contract Value and Evaluation Factors sections removed from step 1 as per outline */}

            <div className="flex justify-end pt-6 border-t">
              <Button onClick={handleContinueToUpload} className="bg-blue-600 hover:bg-blue-700">
                Continue to Upload
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Document Upload & Analysis */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-lg">Upload Documents</h3>
              
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
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
                  <p className="font-medium">Click to upload PDFs</p>
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
                  <p className="font-medium">Uploaded ({uploadedDocs.length}):</p>
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{doc.name}</span>
                        <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadedDocs.length > 0 && ( /* Condition simplified */
              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Deep AI Analysis
                    </h3>
                    <p className="text-sm mb-4">
                      Extract compliance requirements and pricing structure
                    </p>
                    <Button
                      onClick={deepAnalyzeSolicitation}
                      disabled={isAnalyzingDeep}
                      className="bg-indigo-600 hover:bg-indigo-700 w-full"
                      size="lg"
                    >
                      {isAnalyzingDeep ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Run Analysis
                        </>
                      )}
                    </Button>

                    {isAnalyzingDeep && extractionProgress > 0 && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-indigo-900">Processing...</span>
                          <span className="text-sm text-indigo-700">{extractionProgress}%</span>
                        </div>
                        <Progress value={extractionProgress} className="h-2" />
                        <p className="text-xs text-indigo-600 mt-2">
                          {extractionProgress < 40 && "Extracting requirements..."}
                          {extractionProgress >= 40 && extractionProgress < 70 && "Creating compliance records..."}
                          {extractionProgress >= 70 && "Analyzing pricing..."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {extractionResults && (
                <Button onClick={handleViewCompliancePreview} className="bg-blue-600">
                  Review Results
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Compliance Preview */}
        {currentStep === 3 && extractionResults && (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900">Analysis Complete!</p>
                <ul className="text-sm text-green-800 space-y-1 mt-2">
                  <li>✓ {extractionResults.mandatory_requirements?.length || 0} requirements extracted</li>
                  {extractionResults.pricing_structure && <li>✓ Pricing structure identified</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-700">
                    {extractionResults.mandatory_requirements?.length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Requirements</p>
                </CardContent>
              </Card>

              {extractionResults.pricing_structure && extractionResults.pricing_structure.contract_type && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 mb-1">Contract Type</p>
                    <Badge className="bg-purple-600 text-white">
                      {extractionResults.pricing_structure.contract_type}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <p className="text-sm text-green-600 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Phase 3 Complete!
              </p>
            </div>
          </div>
        )}
      </CardContent>

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
