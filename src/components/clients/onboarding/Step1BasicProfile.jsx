import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Sparkles, X, Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function Step1BasicProfile({ formData, setFormData, onNext }) {
  const [isAIAssisting, setIsAIAssisting] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);

  /**
   * Handle file upload and AI extraction
   * Extracts client organization data from uploaded documents (company profiles, capability statements, etc.)
   * Supports: PDF, PNG, JPG, JPEG, CSV, and DOCX files
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - Now includes DOCX support
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword' // DOC (legacy)
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document (DOCX), image (PNG/JPG), or CSV file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsExtracting(true);
    setUploadedFile(file.name);

    try {
      // Step 1: Upload the file to get a URL
      toast.info('Uploading file...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Define the JSON schema for extraction
      const extractionSchema = {
        type: "object",
        properties: {
          organization_name: { type: "string" },
          contact_name: { type: "string" },
          contact_email: { type: "string" },
          address: { type: "string" },
          website_url: { type: "string" },
          uei: { type: "string" },
          cage_code: { type: "string" },
          primary_naics: { type: "string" },
          secondary_naics: { 
            type: "array", 
            items: { type: "string" } 
          },
          certifications: { 
            type: "array", 
            items: { type: "string" } 
          },
          organization_industry: { 
            type: "string",
            enum: [
              "aerospace_defense",
              "healthcare",
              "information_technology",
              "professional_services",
              "construction_engineering",
              "research_development",
              "logistics_supply_chain",
              "education_training",
              "environmental_services",
              "financial_services",
              "manufacturing",
              "telecommunications",
              "other"
            ]
          },
          organization_size: { 
            type: "string",
            enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]
          },
          market_segments: { 
            type: "array", 
            items: { type: "string" } 
          },
          mission_statement: { type: "string" },
          current_challenges: { 
            type: "array", 
            items: { type: "string" } 
          },
          strategic_goals: { 
            type: "array", 
            items: { type: "string" } 
          },
          competition_landscape: { 
            type: "array", 
            items: { type: "string" } 
          },
          key_certifications: { 
            type: "array", 
            items: { type: "string" } 
          }
        }
      };

      // Step 3: Determine extraction method based on file type
      let extractionResult;
      
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.type === 'application/msword') {
        // Use custom DOCX parser
        toast.info('AI is extracting data from Word document...');
        extractionResult = await base44.functions.invoke('parseDocxFile', {
          file_url,
          json_schema: extractionSchema,
          extract_structured_data: true
        });
      } else {
        // Use built-in extraction for PDF, images, CSV
        toast.info('AI is extracting data from document...');
        extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: extractionSchema
        });
      }

      // Step 4: Handle extraction results
      if (extractionResult.status === 'success' && (extractionResult.output || extractionResult.structured_data)) {
        const extracted = extractionResult.output || extractionResult.structured_data;

        // Merge extracted data with existing form data (prefer existing if already filled)
        const updatedFormData = {
          ...formData,
          organization_name: formData.organization_name || extracted.organization_name || "",
          contact_name: formData.contact_name || extracted.contact_name || "",
          contact_email: formData.contact_email || extracted.contact_email || "",
          address: formData.address || extracted.address || "",
          website_url: formData.website_url || extracted.website_url || "",
          uei: formData.uei || extracted.uei || "",
          cage_code: formData.cage_code || extracted.cage_code || "",
          primary_naics: formData.primary_naics || extracted.primary_naics || "",
          secondary_naics: formData.secondary_naics?.length > 0 ? formData.secondary_naics : (extracted.secondary_naics || []),
          certifications: formData.certifications?.length > 0 ? formData.certifications : (extracted.certifications || extracted.key_certifications || []),
          organization_industry: formData.organization_industry || extracted.organization_industry || "",
          organization_size: formData.organization_size || extracted.organization_size || "",
          market_segments: formData.market_segments?.length > 0 ? formData.market_segments : (extracted.market_segments || []),
          mission_statement: formData.mission_statement || extracted.mission_statement || "",
          current_challenges: formData.current_challenges?.length > 0 ? formData.current_challenges : (extracted.current_challenges || []),
          strategic_goals: formData.strategic_goals?.length > 0 ? formData.strategic_goals : (extracted.strategic_goals || []),
          competition_landscape: formData.competition_landscape?.length > 0 ? formData.competition_landscape : (extracted.competition_landscape || []),
          key_certifications: formData.key_certifications?.length > 0 ? formData.key_certifications : (extracted.key_certifications || [])
        };

        setFormData(updatedFormData);
        toast.success('✅ Data extracted successfully! Review and adjust as needed.');
      } else {
        // Extraction failed - show detailed error
        console.error('Extraction failed:', extractionResult);
        toast.error('AI extraction failed: ' + (extractionResult.error || 'Could not extract data from this file. Try entering data manually.'));
      }
    } catch (error) {
      console.error('File upload/extraction error:', error);
      toast.error('Failed to process file: ' + error.message);
    } finally {
      setIsExtracting(false);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAISuggestions = async () => {
    if (!formData.organization_name && !formData.website_url) {
      toast.error('Please enter organization name or website first');
      return;
    }

    setIsAIAssisting(true);
    try {
      const prompt = `Based on the organization "${formData.organization_name || ''}" with website ${formData.website_url || 'not provided'}, suggest:
      1. The most likely industry (choose from: aerospace_defense, healthcare, information_technology, professional_services, construction_engineering, research_development, logistics_supply_chain, education_training, environmental_services, financial_services, manufacturing, telecommunications, other)
      2. 3-5 potential market segments they serve
      3. 3-5 current business challenges they might face
      4. 3-5 strategic goals they might have
      5. 2-4 potential competitors in their landscape
      
      Be specific and realistic.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: !!formData.website_url,
        response_json_schema: {
          type: "object",
          properties: {
            industry: { type: "string" },
            market_segments: { type: "array", items: { type: "string" } },
            current_challenges: { type: "array", items: { type: "string" } },
            strategic_goals: { type: "array", items: { type: "string" } },
            competition_landscape: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFormData({
        ...formData,
        organization_industry: result.industry || formData.organization_industry,
        market_segments: result.market_segments || formData.market_segments,
        current_challenges: result.current_challenges || formData.current_challenges,
        strategic_goals: result.strategic_goals || formData.strategic_goals,
        competition_landscape: result.competition_landscape || formData.competition_landscape
      });

      toast.success('AI suggestions applied! Review and adjust as needed.');
    } catch (error) {
      toast.error('AI assistance failed: ' + error.message);
    } finally {
      setIsAIAssisting(false);
    }
  };

  const addArrayItem = (field, value) => {
    if (!value.trim()) return;
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), value.trim()]
    });
  };

  const removeArrayItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleNext = () => {
    if (!formData.organization_name?.trim() || !formData.contact_email?.trim()) {
      toast.error('Organization name and contact email are required');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Basic & Organizational Profile
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Core information about the client organization
          </p>
        </div>
        <div className="flex gap-2">
          {/* Upload & Extract Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            variant="outline"
            className="border-green-300 hover:bg-green-50"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Extract
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.docx,.doc"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* AI Assist Button */}
          <Button
            onClick={handleAISuggestions}
            disabled={isAIAssisting}
            variant="outline"
            className="border-purple-300 hover:bg-purple-50"
          >
            {isAIAssisting ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                AI Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assist
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Instructions */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-1">
              💡 Pro Tip: Upload a Document to Auto-Fill
            </h4>
            <p className="text-sm text-green-800">
              Upload the client's company profile, capability statement, annual report, or similar document. 
              Our AI will extract and pre-populate all relevant fields automatically.
            </p>
            <p className="text-xs text-green-700 mt-2 font-semibold">
              ✅ Supported formats: PDF, Word (DOCX/DOC), PNG, JPG, CSV
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Organization Name *</Label>
          <Input
            value={formData.organization_name}
            onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
            placeholder="Acme Defense Solutions"
            className={!formData.organization_name && "border-red-300"}
          />
        </div>

        <div>
          <Label>Primary Contact Name</Label>
          <Input
            value={formData.contact_name}
            onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
            placeholder="John Smith"
          />
        </div>

        <div>
          <Label>Contact Email *</Label>
          <Input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
            placeholder="john.smith@acme.com"
            className={!formData.contact_email && "border-red-300"}
          />
        </div>

        <div>
          <Label>Website</Label>
          <Input
            value={formData.website_url}
            onChange={(e) => setFormData({...formData, website_url: e.target.value})}
            placeholder="https://acmedefense.com"
          />
        </div>

        <div>
          <Label>Address</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder="123 Defense Ave, Arlington, VA"
          />
        </div>

        <div>
          <Label>Industry *</Label>
          <Select
            value={formData.organization_industry}
            onValueChange={(value) => setFormData({...formData, organization_industry: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aerospace_defense">Aerospace & Defense</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="information_technology">Information Technology</SelectItem>
              <SelectItem value="professional_services">Professional Services</SelectItem>
              <SelectItem value="construction_engineering">Construction & Engineering</SelectItem>
              <SelectItem value="research_development">Research & Development</SelectItem>
              <SelectItem value="logistics_supply_chain">Logistics & Supply Chain</SelectItem>
              <SelectItem value="education_training">Education & Training</SelectItem>
              <SelectItem value="environmental_services">Environmental Services</SelectItem>
              <SelectItem value="financial_services">Financial Services</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="telecommunications">Telecommunications</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Organization Size</Label>
          <Select
            value={formData.organization_size}
            onValueChange={(value) => setFormData({...formData, organization_size: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="501-1000">501-1,000 employees</SelectItem>
              <SelectItem value="1001-5000">1,001-5,000 employees</SelectItem>
              <SelectItem value="5001+">5,000+ employees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>UEI</Label>
          <Input
            value={formData.uei}
            onChange={(e) => setFormData({...formData, uei: e.target.value})}
            placeholder="Unique Entity Identifier"
          />
        </div>

        <div>
          <Label>CAGE Code</Label>
          <Input
            value={formData.cage_code}
            onChange={(e) => setFormData({...formData, cage_code: e.target.value})}
            placeholder="1A2B3"
          />
        </div>

        <div>
          <Label>Primary NAICS Code</Label>
          <Input
            value={formData.primary_naics}
            onChange={(e) => setFormData({...formData, primary_naics: e.target.value})}
            placeholder="541330"
          />
        </div>

        <div className="col-span-2">
          <Label>Mission Statement</Label>
          <Textarea
            value={formData.mission_statement}
            onChange={(e) => setFormData({...formData, mission_statement: e.target.value})}
            placeholder="Our mission is to..."
            rows={3}
          />
        </div>
      </div>

      {/* Secondary NAICS Codes */}
      <div className="pt-4 border-t">
        <Label>Secondary NAICS Codes</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add NAICS code (e.g., 541511)..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('secondary_naics', e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {(formData.secondary_naics || []).map((naics, idx) => (
            <Badge key={idx} variant="secondary" className="pl-3 pr-1">
              {naics}
              <button
                onClick={() => removeArrayItem('secondary_naics', idx)}
                className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <Label>Certifications (Small Business, Quality, etc.)</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add certification (e.g., 8(a), ISO 9001, CMMI Level 3)..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('certifications', e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {(formData.certifications || []).map((cert, idx) => (
            <Badge key={idx} variant="secondary" className="pl-3 pr-1 bg-blue-100 text-blue-700">
              {cert}
              <button
                onClick={() => removeArrayItem('certifications', idx)}
                className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Array Fields */}
      <div className="space-y-4 pt-4 border-t">
        {/* Market Segments */}
        <div>
          <Label>Market Segments</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add market segment..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('market_segments', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.market_segments || []).map((segment, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {segment}
                <button
                  onClick={() => removeArrayItem('market_segments', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Current Challenges */}
        <div>
          <Label>Current Challenges</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add challenge..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('current_challenges', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.current_challenges || []).map((challenge, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {challenge}
                <button
                  onClick={() => removeArrayItem('current_challenges', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Strategic Goals */}
        <div>
          <Label>Strategic Goals</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add strategic goal..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('strategic_goals', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.strategic_goals || []).map((goal, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {goal}
                <button
                  onClick={() => removeArrayItem('strategic_goals', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Competition Landscape */}
        <div>
          <Label>Competition Landscape</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add competitor or competitive factor..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('competition_landscape', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.competition_landscape || []).map((comp, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {comp}
                <button
                  onClick={() => removeArrayItem('competition_landscape', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Key Certifications */}
      <div className="pt-4 border-t">
        <Label>Key Certifications (ISO, CMMI, etc.)</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add certification (e.g., ISO 9001:2015, CMMI Level 3)..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('key_certifications', e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {(formData.key_certifications || []).map((cert, idx) => (
            <Badge key={idx} variant="secondary" className="pl-3 pr-1 bg-purple-100 text-purple-700">
              {cert}
              <button
                onClick={() => removeArrayItem('key_certifications', idx)}
                className="ml-2 hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Engagement Preferences →
        </Button>
      </div>
    </div>
  );
}