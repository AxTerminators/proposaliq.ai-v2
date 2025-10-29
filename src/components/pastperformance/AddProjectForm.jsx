
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  X,
  Sparkles,
  Loader2,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Star,
  Users,
  Target,
  Award,
  CheckCircle2,
  Upload,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function AddProjectForm({ project, organizationId, onClose }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const [formData, setFormData] = useState(project || {
    project_name: "",
    client_name: "",
    client_agency: "",
    client_type: "federal",
    contract_number: "",
    contract_value: "",
    contract_type: "FFP",
    start_date: "",
    end_date: "",
    status: "completed",
    naics_codes: [],
    project_description: "",
    services_provided: [],
    technologies_used: [],
    team_size: "",
    key_personnel: [],
    outcomes: {
      on_time_delivery_pct: 100,
      on_budget_pct: 100,
      uptime_pct: 99.5,
      cost_savings: 0,
      quality_score: 4.5,
      customer_satisfaction: 4.5,
      sla_compliance_pct: 99.5
    },
    cpars_rating: "N/A",
    award_fee_score: "",
    client_poc: {
      name: "",
      title: "",
      email: "",
      phone: "",
      organization: ""
    },
    testimonial: "",
    reference_permission: false,
    awards_received: [],
    challenges_overcome: [],
    innovations: [],
    keywords: [],
    geographic_location: {
      city: "",
      state: "",
      country: "USA"
    },
    prime_or_sub: "prime",
    is_featured: false,
    lessons_learned: ""
  });

  const [tempInput, setTempInput] = useState({
    service: "",
    technology: "",
    naics: "",
    keyword: "",
    award: "",
    challenge: "",
    innovation: ""
  });

  const saveProjectMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate period of performance
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        data.period_of_performance_months = months;
      }

      // Convert string numbers to actual numbers
      data.contract_value = parseFloat(data.contract_value) || 0;
      data.team_size = parseInt(data.team_size) || 0;
      data.award_fee_score = parseFloat(data.award_fee_score) || null;

      // Ensure nested objects exist before trying to spread them
      if (!data.outcomes) data.outcomes = {};
      if (!data.client_poc) data.client_poc = {};
      if (!data.geographic_location) data.geographic_location = {};

      if (project) {
        return base44.entities.PastPerformance.update(project.id, data);
      } else {
        return base44.entities.PastPerformance.create({
          ...data,
          organization_id: organizationId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-performance'] });
      alert(project ? "✓ Project updated!" : "✓ Project added!");
      onClose();
    }
  });

  const handleSave = () => {
    if (!formData.project_name || !formData.client_name) {
      alert("Please provide at least a project name and client name");
      return;
    }

    saveProjectMutation.mutate(formData);
  };

  const addToArray = (field, value) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), value.trim()]
      });
      setTempInput({ ...tempInput, [field.replace(/s$/, '')]: "" });
    }
  };

  const removeFromArray = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtracting(true);
    setExtractedData(null);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI
      const prompt = `You are an AI assistant that extracts past performance project information from documents.

Analyze this document (contract, past proposal, CPARS report, project summary, etc.) and extract ALL available information about the project.

**EXTRACT THE FOLLOWING:**

**Project Basics:**
- Project Name/Title
- Client Name (company/agency)
- Client Agency (if government)
- Client Type (federal, state, local, commercial, international)
- Contract Number
- Contract Value (in USD)
- Contract Type (FFP, T&M, CPFF, CPAF, IDIQ, BPA, Other)

**Timeline:**
- Start Date (YYYY-MM-DD format)
- End Date (YYYY-MM-DD format)
- Project Status (completed, in_progress, on_hold)

**Scope & Details:**
- Project Description (2-4 sentences)
- Services Provided (array of strings for services/capabilities)
- Technologies Used (array of strings for tools/platforms/technologies)
- Team Size (number of people)
- NAICS Codes (array of strings, e.g., "541512")
- Geographic Location (city, state, country - object with string properties)

**Performance Metrics:**
- On-Time Delivery Percentage (number)
- On-Budget Percentage (number)
- System Uptime Percentage (number)
- Cost Savings Delivered (USD) (number)
- Quality Score (0-5) (number)
- Customer Satisfaction Score (0-5) (number)
- SLA Compliance Percentage (number)

**Ratings & Recognition:**
- CPARS Rating (Exceptional, Very Good, Satisfactory, Marginal, Unsatisfactory, N/A)
- Award Fee Score (if applicable, number)
- Awards Received (array of strings)

**Client Contact:**
- POC Name (string)
- POC Title (string)
- POC Email (string)
- POC Phone (string)

**Additional:**
- Client Testimonial/Feedback (string)
- Reference Permission (boolean: true if client allows reference, false otherwise)
- Key Challenges Overcome (array of strings)
- Innovations/Unique Solutions (array of strings)
- Role (prime, subcontractor, teaming_partner)

**IMPORTANT:**
- Extract only explicitly stated information
- Return null/empty for fields not found
- For dates, use YYYY-MM-DD format
- For currency and percentages, extract just the number
- For arrays, return an empty array if no items found.
- For nested objects (geographic_location, outcomes, client_poc), return an object with null properties if no sub-fields found, or the object with extracted properties.
- Be thorough - this data will populate a form

Return as valid JSON:
{
  "project_name": "string | null",
  "client_name": "string | null",
  "client_agency": "string | null",
  "client_type": "federal|state|local|commercial|international | null",
  "contract_number": "string | null",
  "contract_value": "number | null",
  "contract_type": "FFP|T&M|CPFF|CPAF|IDIQ|BPA|Other | null",
  "start_date": "string (YYYY-MM-DD) | null",
  "end_date": "string (YYYY-MM-DD) | null",
  "status": "completed|in_progress|on_hold | null",
  "project_description": "string | null",
  "services_provided": "string[]",
  "technologies_used": "string[]",
  "team_size": "number | null",
  "naics_codes": "string[]",
  "geographic_location": {
    "city": "string | null",
    "state": "string | null",
    "country": "string | null"
  },
  "outcomes": {
    "on_time_delivery_pct": "number | null",
    "on_budget_pct": "number | null",
    "uptime_pct": "number | null",
    "cost_savings": "number | null",
    "quality_score": "number | null",
    "customer_satisfaction": "number | null",
    "sla_compliance_pct": "number | null"
  },
  "cpars_rating": "Exceptional|Very Good|Satisfactory|Marginal|Unsatisfactory|N/A | null",
  "award_fee_score": "number | null",
  "client_poc": {
    "name": "string | null",
    "title": "string | null",
    "email": "string | null",
    "phone": "string | null"
  },
  "testimonial": "string | null",
  "reference_permission": "boolean | null",
  "awards_received": "string[]",
  "challenges_overcome": "string[]",
  "innovations": "string[]",
  "prime_or_sub": "prime|subcontractor|teaming_partner | null"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            project_name: { type: ["string", "null"] },
            client_name: { type: ["string", "null"] },
            client_agency: { type: ["string", "null"] },
            client_type: { enum: ["federal", "state", "local", "commercial", "international", null] },
            contract_number: { type: ["string", "null"] },
            contract_value: { type: ["number", "null"] },
            contract_type: { enum: ["FFP", "T&M", "CPFF", "CPAF", "IDIQ", "BPA", "Other", null] },
            start_date: { type: ["string", "null"] },
            end_date: { type: ["string", "null"] },
            status: { enum: ["completed", "in_progress", "on_hold", null] },
            project_description: { type: ["string", "null"] },
            services_provided: { type: "array", items: { type: "string" } },
            technologies_used: { type: "array", items: { type: "string" } },
            team_size: { type: ["number", "null"] },
            naics_codes: { type: "array", items: { type: "string" } },
            geographic_location: {
              type: "object",
              properties: {
                city: { type: ["string", "null"] },
                state: { type: ["string", "null"] },
                country: { type: ["string", "null"] },
              }
            },
            outcomes: {
              type: "object",
              properties: {
                on_time_delivery_pct: { type: ["number", "null"] },
                on_budget_pct: { type: ["number", "null"] },
                uptime_pct: { type: ["number", "null"] },
                cost_savings: { type: ["number", "null"] },
                quality_score: { type: ["number", "null"] },
                customer_satisfaction: { type: ["number", "null"] },
                sla_compliance_pct: { type: ["number", "null"] },
              }
            },
            cpars_rating: { enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "N/A", null] },
            award_fee_score: { type: ["number", "null"] },
            client_poc: {
              type: "object",
              properties: {
                name: { type: ["string", "null"] },
                title: { type: ["string", "null"] },
                email: { type: ["string", "null"] },
                phone: { type: ["string", "null"] },
              }
            },
            testimonial: { type: ["string", "null"] },
            reference_permission: { type: ["boolean", "null"] },
            awards_received: { type: "array", items: { type: "string" } },
            challenges_overcome: { type: "array", items: { type: "string" } },
            innovations: { type: "array", items: { type: "string" } },
            prime_or_sub: { enum: ["prime", "subcontractor", "teaming_partner", null] }
          }
        }
      });

      // Auto-populate form
      const updatedFormData = { ...formData };
      let fieldsPopulated = [];

      const updateField = (key, value, label, checkExisting = true) => {
        if (value !== null && value !== undefined && (!checkExisting || !updatedFormData[key])) {
          updatedFormData[key] = value;
          fieldsPopulated.push(label);
        }
      };

      const updateNumericField = (key, value, label, checkExisting = true) => {
        if (value !== null && value !== undefined && (!checkExisting || !updatedFormData[key])) {
          updatedFormData[key] = value.toString();
          fieldsPopulated.push(label);
        }
      };

      const updateArrayField = (key, value, label) => {
        if (Array.isArray(value) && value.length > 0) {
          updatedFormData[key] = value;
          fieldsPopulated.push(`${value.length} ${label}`);
        }
      };

      const updateNestedObject = (parentKey, extractedObject, label, checkExisting = true) => {
        if (extractedObject && Object.keys(extractedObject).some(k => extractedObject[k] !== null && extractedObject[k] !== undefined)) {
          updatedFormData[parentKey] = { ...(updatedFormData[parentKey] || {}), ...extractedObject };
          fieldsPopulated.push(label);
        }
      };
      
      updateField("project_name", result.project_name, "Project Name");
      updateField("client_name", result.client_name, "Client Name");
      updateField("client_agency", result.client_agency, "Agency");
      updateField("client_type", result.client_type, "Client Type");
      updateField("contract_number", result.contract_number, "Contract Number");
      updateNumericField("contract_value", result.contract_value, "Contract Value");
      updateField("contract_type", result.contract_type, "Contract Type");
      updateField("start_date", result.start_date, "Start Date");
      updateField("end_date", result.end_date, "End Date");
      updateField("status", result.status, "Status", false); // Status can always be updated if AI provides it
      updateField("project_description", result.project_description, "Description");
      updateArrayField("services_provided", result.services_provided, "Services");
      updateArrayField("technologies_used", result.technologies_used, "Technologies");
      updateNumericField("team_size", result.team_size, "Team Size");
      updateArrayField("naics_codes", result.naics_codes, "NAICS Codes");
      updateNestedObject("geographic_location", result.geographic_location, "Location");
      updateNestedObject("outcomes", result.outcomes, "Performance Metrics");
      updateField("cpars_rating", result.cpars_rating, "CPARS Rating");
      updateNumericField("award_fee_score", result.award_fee_score, "Award Fee");
      updateNestedObject("client_poc", result.client_poc, "Client POC");
      updateField("testimonial", result.testimonial, "Testimonial");
      
      if (result.reference_permission !== null && result.reference_permission !== undefined) {
        updatedFormData.reference_permission = result.reference_permission;
        fieldsPopulated.push("Reference Permission");
      }
      updateArrayField("awards_received", result.awards_received, "Awards");
      updateArrayField("challenges_overcome", result.challenges_overcome, "Challenges");
      updateArrayField("innovations", result.innovations, "Innovations");
      updateField("prime_or_sub", result.prime_or_sub, "Role");


      setFormData(updatedFormData);
      setExtractedData({
        fieldsPopulated,
        rawData: result
      });

      if (fieldsPopulated.length > 0) {
        alert(`✓ AI extracted and populated ${fieldsPopulated.length} fields from ${file.name}!\n\nFields: ${fieldsPopulated.join(', ')}\n\nPlease review and adjust as needed.`);
      } else {
        alert(`AI analyzed ${file.name} but couldn't extract data to auto-populate. You can manually enter the information.`);
      }

    } catch (error) {
      console.error("Error extracting data:", error);
      alert(`Error extracting data from ${file.name}. Please try again or enter manually. Error: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const generateNarratives = async () => {
    if (!formData.project_name || !formData.project_description) {
      alert("Please provide project name and description first");
      return;
    }

    setIsGenerating(true);
    try {
      // Get win themes if available (for current organization)
      let winThemesContext = "";
      try {
        const themes = await base44.entities.WinTheme.filter({
          organization_id: organizationId,
          status: { $in: ['approved', 'reviewed'] }
        });
        
        if (themes.length > 0) {
          winThemesContext = `\n**WIN THEMES TO EMPHASIZE:**\n${themes.slice(0, 5).map(t => `- ${t.theme_title}: ${t.theme_statement}`).join('\n')}`;
        }
      } catch (e) {
        console.warn("Could not fetch win themes, proceeding without them.", e);
        // Win themes might not exist, that's okay
      }

      const prompt = `You are an expert government proposal writer. Generate three narrative versions of this past performance project.

**PROJECT:**
Name: ${formData.project_name}
Client: ${formData.client_name} ${formData.client_agency ? `(${formData.client_agency})` : ''}
Value: $${formData.contract_value?.toLocaleString() || 'N/A'}
Period: ${formData.start_date} to ${formData.end_date || 'Present'}
Type: ${formData.contract_type}
Role: ${formData.prime_or_sub}

**DESCRIPTION:**
${formData.project_description}

**SERVICES:**
${formData.services_provided?.join(', ') || 'N/A'}

**TECHNOLOGIES:**
${formData.technologies_used?.join(', ') || 'N/A'}

**OUTCOMES:**
- On-Time Delivery: ${formData.outcomes?.on_time_delivery_pct || 'N/A'}%
- On-Budget: ${formData.outcomes?.on_budget_pct || 'N/A'}%
- Quality Score: ${formData.outcomes?.quality_score || 'N/A'}/5
- Customer Satisfaction: ${formData.outcomes?.customer_satisfaction || 'N/A'}/5
- CPARS: ${formData.cpars_rating}

**CHALLENGES OVERCOME:**
${formData.challenges_overcome?.join(', ') || 'N/A'}

**INNOVATIONS:**
${formData.innovations?.join(', ') || 'N/A'}

**AWARDS:**
${formData.awards_received?.join(', ') || 'N/A'}
${winThemesContext}

**GENERATE THREE VERSIONS:**

1. **Technical (detailed, 300-400 words):** For technical evaluation sections. Include specific technologies, methodologies, challenges overcome, quantifiable results. Emphasize technical excellence and innovation.${winThemesContext ? ' Weave in relevant win themes naturally.' : ''}

2. **Executive (concise, 150-200 words):** For executive summaries and past performance overviews. Focus on business value, outcomes, client satisfaction, strategic impact. Highlight results and client relationship.${winThemesContext ? ' Incorporate win themes where relevant.' : ''}

3. **Brief (very short, 75-100 words):** For tables, quick references, or limited space. Hit key highlights only: project scope, client, value, key outcomes, and differentiators.

**WRITING GUIDELINES:**
- Use active voice and strong action verbs
- Lead with outcomes and results
- Include specific metrics and quantifiable results
- Maintain professional government contracting tone
- Emphasize relevance and success
${winThemesContext ? '- Naturally incorporate the provided win themes where they align with this project' : ''}

Return as JSON:
{
  "technical": "string (300-400 words)",
  "executive": "string (150-200 words)",
  "brief": "string (75-100 words)"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            technical: { type: "string" },
            executive: { type: "string" },
            brief: { type: "string" }
          }
        }
      });

      setFormData({
        ...formData,
        generated_narratives: result
      });

      alert("✓ Narratives generated! Check the Narratives tab.");
    } catch (error) {
      console.error("Error generating narratives:", error);
      alert("Failed to generate narratives. Please try again.");
    }
    setIsGenerating(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {project ? (
              <>
                <FileText className="w-5 h-5" />
                Edit Project
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Past Performance Project
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Document your completed projects to showcase in future proposals
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)] pr-4">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="narratives">Narratives</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              {/* AI Document Upload - AT TOP */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    AI-Powered Data Extraction
                  </CardTitle>
                  <CardDescription>
                    Upload a contract, past proposal, CPARS report, or project document - AI will extract all the details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isExtracting && (
                    <Alert className="bg-white border-blue-300">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <AlertDescription>
                        <p className="font-semibold text-blue-900">AI is analyzing the document...</p>
                        <p className="text-xs text-blue-700 mt-1">Extracting project details, metrics, dates, and more...</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {extractedData && extractedData.fieldsPopulated.length > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription>
                        <p className="font-semibold text-green-900 mb-1">✓ AI Extracted {extractedData.fieldsPopulated.length} Fields!</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {extractedData.fieldsPopulated.map((field, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-700">
                              {field}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-green-700 mt-2">Review and adjust the information below as needed.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-white">
                    {uploadedFile ? (
                      <div className="space-y-3">
                        <FileText className="w-12 h-12 mx-auto text-blue-600" />
                        <div>
                          <p className="font-semibold text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUploadedFile(null);
                            setExtractedData(null);
                          }}
                        >
                          <X className="w-3 h-3 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto text-blue-400 mb-3" />
                        <input
                          type="file"
                          id="doc-upload"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                          disabled={isExtracting}
                        />
                        <Button size="sm" variant="outline" asChild disabled={isExtracting}>
                          <label htmlFor="doc-upload" className="cursor-pointer">
                            <Upload className="w-3 h-3 mr-2" />
                            Upload Document
                          </label>
                        </Button>
                        <p className="text-xs text-slate-500 mt-2">PDF, Word, or Text document</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="e.g., DHS Cloud Migration"
                    value={formData.project_name}
                    onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    placeholder="e.g., Department of Homeland Security"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Agency</Label>
                  <Input
                    placeholder="e.g., DHS, DoD, GSA"
                    value={formData.client_agency}
                    onChange={(e) => setFormData({...formData, client_agency: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(value) => setFormData({...formData, client_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contract Number</Label>
                  <Input
                    placeholder="e.g., GS-35F-0119Y"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({...formData, contract_number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Value (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="5000000"
                      className="pl-10"
                      value={formData.contract_value}
                      onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contract Type</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) => setFormData({...formData, contract_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FFP">Firm Fixed Price (FFP)</SelectItem>
                      <SelectItem value="T&M">Time & Materials (T&M)</SelectItem>
                      <SelectItem value="CPFF">Cost Plus Fixed Fee (CPFF)</SelectItem>
                      <SelectItem value="CPAF">Cost Plus Award Fee (CPAF)</SelectItem>
                      <SelectItem value="IDIQ">IDIQ</SelectItem>
                      <SelectItem value="BPA">BPA</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.prime_or_sub}
                    onValueChange={(value) => setFormData({...formData, prime_or_sub: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prime">Prime Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Team Size</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="10"
                      className="pl-10"
                      value={formData.team_size}
                      onChange={(e) => setFormData({...formData, team_size: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">Feature This Project</p>
                    <p className="text-xs text-amber-700">Highlight in proposal suggestions</p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label>Project Description</Label>
                <Textarea
                  placeholder="Describe the project, scope of work, and key deliverables..."
                  value={formData.project_description}
                  onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Services Provided</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Cloud Migration, Cybersecurity"
                    value={tempInput.service}
                    onChange={(e) => setTempInput({...tempInput, service: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('services_provided', tempInput.service)}
                  />
                  <Button size="sm" onClick={() => addToArray('services_provided', tempInput.service)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.services_provided?.map((service, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {service}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('services_provided', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Technologies Used</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., AWS, Docker, Kubernetes"
                    value={tempInput.technology}
                    onChange={(e) => setTempInput({...tempInput, technology: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('technologies_used', tempInput.technology)}
                  />
                  <Button size="sm" onClick={() => addToArray('technologies_used', tempInput.technology)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies_used?.map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {tech}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('technologies_used', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>NAICS Codes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 541512"
                    value={tempInput.naics}
                    onChange={(e) => setTempInput({...tempInput, naics: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('naics_codes', tempInput.naics)}
                  />
                  <Button size="sm" onClick={() => addToArray('naics_codes', tempInput.naics)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.naics_codes?.map((code, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {code}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('naics_codes', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Keywords (for searching)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., cybersecurity, agile, DevSecOps"
                    value={tempInput.keyword}
                    onChange={(e) => setTempInput({...tempInput, keyword: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('keywords', tempInput.keyword)}
                  />
                  <Button size="sm" onClick={() => addToArray('keywords', tempInput.keyword)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.keywords?.map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {keyword}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('keywords', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Challenges Overcome</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Legacy system integration"
                    value={tempInput.challenge}
                    onChange={(e) => setTempInput({...tempInput, challenge: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('challenges_overcome', tempInput.challenge)}
                  />
                  <Button size="sm" onClick={() => addToArray('challenges_overcome', tempInput.challenge)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.challenges_overcome?.map((challenge, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-sm flex-1">{challenge}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('challenges_overcome', idx)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Innovations / Unique Solutions</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Custom AI-powered automation"
                    value={tempInput.innovation}
                    onChange={(e) => setTempInput({...tempInput, innovation: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('innovations', tempInput.innovation)}
                  />
                  <Button size="sm" onClick={() => addToArray('innovations', tempInput.innovation)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.innovations?.map((innovation, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="text-sm flex-1">{innovation}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('innovations', idx)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lessons Learned</Label>
                <Textarea
                  placeholder="Key takeaways and lessons from this project..."
                  value={formData.lessons_learned}
                  onChange={(e) => setFormData({...formData, lessons_learned: e.target.value})}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="outcomes" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>On-Time Delivery %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.outcomes?.on_time_delivery_pct || 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, on_time_delivery_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>On-Budget %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="150"
                    value={formData.outcomes?.on_budget_pct || 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, on_budget_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>System Uptime %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.outcomes?.uptime_pct || 99.5}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, uptime_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Savings Delivered (USD)</Label>
                  <Input
                    type="number"
                    value={formData.outcomes?.cost_savings || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, cost_savings: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quality Score (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.outcomes?.quality_score || 4.5}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, quality_score: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Satisfaction (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.outcomes?.customer_satisfaction || 4.5}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, customer_satisfaction: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>SLA Compliance %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.outcomes?.sla_compliance_pct || 99.5}
                    onChange={(e) => setFormData({
                      ...formData.outcomes,
                      outcomes: { ...formData.outcomes, sla_compliance_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <Label>CPARS Rating</Label>
                  <Select
                    value={formData.cpars_rating}
                    onValueChange={(value) => setFormData({...formData, cpars_rating: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      <SelectItem value="Exceptional">Exceptional</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="Marginal">Marginal</SelectItem>
                      <SelectItem value="Unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Award Fee Score (if applicable)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="95"
                    value={formData.award_fee_score}
                    onChange={(e) => setFormData({...formData, award_fee_score: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label>Awards Received</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., DoD Innovation Award 2023"
                    value={tempInput.award}
                    onChange={(e) => setTempInput({...tempInput, award: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('awards_received', tempInput.award)}
                  />
                  <Button size="sm" onClick={() => addToArray('awards_received', tempInput.award)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.awards_received?.map((award, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span className="text-sm flex-1">{award}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('awards_received', idx)} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="client" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Client Point of Contact
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="John Smith"
                      value={formData.client_poc?.name || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, name: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Program Manager"
                      value={formData.client_poc?.title || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, title: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="john.smith@agency.gov"
                      value={formData.client_poc?.email || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, email: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.client_poc?.phone || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, phone: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client Testimonial</Label>
                  <Textarea
                    placeholder="Quote from client praising your work..."
                    value={formData.testimonial}
                    onChange={(e) => setFormData({...formData, testimonial: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Reference Permission</p>
                      <p className="text-xs text-green-700">Client can be contacted as reference</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.reference_permission}
                    onCheckedChange={(checked) => setFormData({...formData, reference_permission: checked})}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Narratives Tab - Enhanced */}
            <TabsContent value="narratives" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">AI-Generated Narratives</h3>
                  <p className="text-sm text-slate-600">Three versions optimized for different uses - incorporates your win themes</p>
                </div>
                <Button
                  onClick={generateNarratives}
                  disabled={isGenerating || !formData.project_name}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Narratives
                    </>
                  )}
                </Button>
              </div>

              {formData.generated_narratives ? (
                <div className="space-y-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-base">Technical Version (300-400 words)</CardTitle>
                      <CardDescription>For detailed technical evaluation sections</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.technical}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-base">Executive Version (150-200 words)</CardTitle>
                      <CardDescription>For executive summaries and overviews</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.executive}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-base">Brief Version (75-100 words)</CardTitle>
                      <CardDescription>For tables or space-constrained areas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.brief}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="mb-2">No narratives generated yet</p>
                  <p className="text-sm">Fill in the project details and click "Generate Narratives"</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveProjectMutation.isLoading}>
            {saveProjectMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {project ? 'Update' : 'Save'} Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
