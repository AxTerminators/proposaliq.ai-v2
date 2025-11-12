import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function CapabilityStatementUploader({ onDataExtracted, disabled = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractionStatus, setExtractionStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadedFile(null);
    setExtractionStatus(null);

    try {
      // Step 1: Upload the file
      console.log('[CapabilityStatementUploader] 📤 Uploading file:', file.name);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      console.log('[CapabilityStatementUploader] ✅ File uploaded:', file_url);
      setUploadedFile({ name: file.name, url: file_url, type: file.type });
      setIsUploading(false);

      // Step 2: Extract data using AI
      setIsExtracting(true);
      console.log('[CapabilityStatementUploader] 🤖 Starting AI extraction...');

      const extractionSchema = {
        type: "object",
        properties: {
          partner_name: { type: "string", description: "Company name" },
          poc_name: { type: "string", description: "Point of contact full name" },
          poc_title: { type: "string", description: "Point of contact job title" },
          poc_email: { type: "string", description: "Point of contact email" },
          poc_phone: { type: "string", description: "Point of contact phone number" },
          address: { type: "string", description: "Business address" },
          website_url: { type: "string", description: "Company website URL" },
          uei: { type: "string", description: "Unique Entity Identifier (UEI)" },
          cage_code: { type: "string", description: "CAGE Code" },
          duns_number: { type: "string", description: "DUNS number" },
          primary_naics: { type: "string", description: "Primary NAICS code" },
          secondary_naics: { 
            type: "array", 
            items: { type: "string" },
            description: "Additional NAICS codes" 
          },
          certifications: { 
            type: "array", 
            items: { type: "string" },
            description: "Small business certifications (8(a), HUBZone, WOSB, SDVOSB, EDWOSB, etc.)" 
          },
          socioeconomic_designations: {
            type: "array",
            items: { type: "string" },
            description: "Additional socioeconomic designations"
          },
          core_capabilities: { 
            type: "array", 
            items: { type: "string" },
            description: "Primary service offerings and areas of expertise" 
          },
          technologies_used: {
            type: "array",
            items: { type: "string" },
            description: "Key technologies, platforms, or tools"
          },
          differentiators: { 
            type: "array", 
            items: { type: "string" },
            description: "Unique competitive advantages" 
          },
          past_performance_summary: { 
            type: "string", 
            description: "Brief overview of past performance and experience" 
          },
          key_projects_summary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project_name: { type: "string" },
                client: { type: "string" },
                description: { type: "string" },
                value: { type: "string" }
              }
            },
            description: "Summary of notable projects"
          },
          target_agencies: { 
            type: "array", 
            items: { type: "string" },
            description: "Government agencies they work with or target" 
          },
          contract_vehicles: {
            type: "array",
            items: { type: "string" },
            description: "Contract vehicles held (GSA Schedule, SEWP, etc.)"
          },
          key_personnel_summary: { 
            type: "string", 
            description: "Summary of key personnel and their expertise" 
          },
          revenue_range: { 
            type: "string", 
            description: "Annual revenue range (e.g., $1M-$5M)" 
          },
          employee_count: { 
            type: "number", 
            description: "Number of employees" 
          },
          years_in_business: { 
            type: "number", 
            description: "Years the company has been in business" 
          },
          geographic_coverage: {
            type: "array",
            items: { type: "string" },
            description: "Geographic regions served"
          },
          quality_certifications: {
            type: "array",
            items: { type: "string" },
            description: "Quality certifications (ISO 9001, CMMI, etc.)"
          },
          security_clearances: {
            type: "array",
            items: { type: "string" },
            description: "Available security clearances"
          },
          confidence_scores: {
            type: "object",
            description: "Confidence scores per field (0-100)"
          }
        }
      };

      const extractionPrompt = `You are an expert at reading and extracting structured information from company capability statements.

Analyze the attached capability statement document and extract ALL available information into the specified JSON schema.

**Instructions:**
- Extract company identification (name, UEI, CAGE, DUNS, contact info)
- Identify ALL NAICS codes mentioned
- List ALL certifications and socioeconomic designations (8(a), HUBZone, WOSB, SDVOSB, EDWOSB, Woman-Owned, Veteran-Owned, etc.)
- Extract core capabilities, services, and technical expertise
- Identify technologies, platforms, tools, and methodologies used
- List competitive differentiators and unique value propositions
- Summarize past performance and notable projects
- Extract target agencies or clients mentioned
- Identify contract vehicles (GSA Schedule numbers, SEWP, etc.)
- Extract key personnel information if mentioned
- Note revenue range, employee count, years in business
- List geographic coverage areas
- Identify quality certifications (ISO, CMMI, etc.)
- Note security clearances available

**Important:**
- If a field is not found in the document, return null or empty array for that field
- For confidence_scores object, estimate your confidence (0-100) for each major section extracted
- Be thorough - capability statements often have information scattered throughout
- Pay attention to logos, headers, footers, and sidebars which often contain contact/certification info

Return the extracted data in the exact JSON schema provided.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        file_urls: [file_url],
        response_json_schema: extractionSchema
      });

      console.log('[CapabilityStatementUploader] ✅ AI extraction complete:', response);

      // Calculate overall confidence score
      const confidenceScores = response.confidence_scores || {};
      const scores = Object.values(confidenceScores).filter(s => typeof s === 'number');
      const avgConfidence = scores.length > 0 
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 75; // Default if no confidence scores

      setIsExtracting(false);
      setExtractionStatus({
        success: true,
        confidence: avgConfidence,
        extractedData: response
      });

      // Pass extracted data to parent component
      if (onDataExtracted) {
        onDataExtracted({
          ...response,
          capability_statement_url: file_url,
          ai_extracted: true,
          extraction_date: new Date().toISOString(),
          extraction_confidence_score: avgConfidence,
          ai_extracted_fields: Object.keys(response).filter(key => 
            response[key] && 
            response[key] !== null && 
            (Array.isArray(response[key]) ? response[key].length > 0 : true)
          )
        });
      }

    } catch (err) {
      console.error('[CapabilityStatementUploader] ❌ Error:', err);
      setError(err.message || "Failed to process capability statement");
      setIsUploading(false);
      setIsExtracting(false);
      setExtractionStatus({ success: false, error: err.message });
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setExtractionStatus(null);
    setError(null);
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <Label className="text-lg font-semibold text-slate-900">
                Upload Capability Statement (Optional)
              </Label>
              <p className="text-sm text-slate-600 mt-1">
                Upload a PDF or DOCX capability statement and AI will automatically extract company details to save you time.
              </p>
            </div>
          </div>

          {!uploadedFile && !isUploading && !isExtracting && (
            <div>
              <input
                type="file"
                id="capability-statement-upload"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                disabled={disabled}
              />
              <label htmlFor="capability-statement-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                  disabled={disabled}
                  asChild
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-blue-600" />
                    <span className="font-medium text-slate-900">
                      Click to Upload Capability Statement
                    </span>
                    <span className="text-xs text-slate-500">
                      PDF or DOCX • Max 10MB
                    </span>
                  </div>
                </Button>
              </label>
            </div>
          )}

          {(isUploading || isExtracting) && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-slate-900">
                  {isUploading ? "Uploading document..." : "AI is reading the capability statement..."}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {isExtracting ? "This may take 10-20 seconds" : "Please wait"}
                </p>
              </div>
            </div>
          )}

          {uploadedFile && extractionStatus && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {uploadedFile.type.includes('pdf') ? 'PDF Document' : 'Word Document'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={disabled}
                >
                  Change
                </Button>
              </div>

              {extractionStatus.success ? (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 mb-1">
                        ✨ AI Extraction Complete!
                      </p>
                      <p className="text-sm text-green-800 mb-2">
                        Company details have been automatically populated. Please review and edit as needed.
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-xs",
                          extractionStatus.confidence >= 80 ? "bg-green-600" :
                          extractionStatus.confidence >= 60 ? "bg-amber-600" :
                          "bg-orange-600"
                        )}>
                          {extractionStatus.confidence}% Confidence
                        </Badge>
                        {extractionStatus.confidence < 80 && (
                          <p className="text-xs text-green-700">
                            Please verify extracted information carefully
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">
                        Extraction Failed
                      </p>
                      <p className="text-sm text-red-800 mb-2">
                        {extractionStatus.error || "Unable to extract data from the document"}
                      </p>
                      <p className="text-xs text-red-700">
                        You can continue by manually entering the company details below.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="mt-3"
                  >
                    Try Another File
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && !extractionStatus && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>
                Fields populated by AI will be marked with a ✨ icon. You can edit any field.
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}