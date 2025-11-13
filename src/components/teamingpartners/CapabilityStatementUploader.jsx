import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * CapabilityStatementUploader Component
 * 
 * Allows users to upload capability statements (PDF, DOCX, images) and automatically
 * extract partner information using AI. This streamlines the process of adding new
 * teaming partners by pre-populating fields from their capability statements.
 * 
 * Supports: PDF, DOCX/DOC, PNG, JPG, CSV
 */
export default function CapabilityStatementUploader({ onDataExtracted, currentData = {} }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedFileName, setUploadedFileName] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword' // DOC
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document (DOCX), image (PNG/JPG), or CSV file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      // Step 1: Upload file
      toast.info('Uploading capability statement...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Define extraction schema for teaming partner data
      const extractionSchema = {
        type: "object",
        properties: {
          partner_name: { type: "string" },
          address: { type: "string" },
          poc_name: { type: "string" },
          poc_title: { type: "string" },
          poc_phone: { type: "string" },
          poc_email: { type: "string" },
          uei: { type: "string" },
          cage_code: { type: "string" },
          website_url: { type: "string" },
          primary_naics: { type: "string" },
          secondary_naics: { type: "array", items: { type: "string" } },
          certifications: { type: "array", items: { type: "string" } },
          core_capabilities: { type: "array", items: { type: "string" } },
          technologies_used: { type: "array", items: { type: "string" } },
          differentiators: { type: "array", items: { type: "string" } },
          past_performance_summary: { type: "string" },
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
            }
          },
          target_agencies: { type: "array", items: { type: "string" } },
          key_personnel_summary: { type: "string" },
          contract_vehicles: { type: "array", items: { type: "string" } },
          revenue_range: { type: "string" },
          employee_count: { type: "number" },
          years_in_business: { type: "number" },
          geographic_coverage: { type: "array", items: { type: "string" } },
          quality_certifications: { type: "array", items: { type: "string" } },
          security_clearances: { type: "array", items: { type: "string" } }
        }
      };

      // Step 3: Extract data based on file type
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
        // Use built-in extraction
        toast.info('AI is extracting data from document...');
        extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: extractionSchema
        });
      }

      // Step 4: Handle results
      if (extractionResult.status === 'success' && (extractionResult.output || extractionResult.structured_data)) {
        const extracted = extractionResult.output || extractionResult.structured_data;
        
        // Add the capability statement URL to the extracted data
        const enrichedData = {
          ...extracted,
          capability_statement_url: file_url,
          capability_statement_date: new Date().toISOString().split('T')[0],
          ai_extracted: true,
          extraction_date: new Date().toISOString(),
          ai_extracted_fields: Object.keys(extracted).filter(key => extracted[key])
        };

        onDataExtracted(enrichedData);
        toast.success('✅ Capability statement data extracted successfully!');
      } else {
        toast.error('AI extraction failed: ' + (extractionResult.error || 'Could not extract data. Please enter manually.'));
        // Still save the file URL even if extraction fails
        onDataExtracted({ 
          capability_statement_url: file_url,
          capability_statement_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Capability statement upload error:', error);
      toast.error('Failed to process file: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">
              💡 Upload Capability Statement for Auto-Fill
            </h4>
            <p className="text-sm text-blue-800">
              Upload the partner's capability statement and our AI will automatically extract all 
              relevant information including contact details, certifications, capabilities, and past performance.
            </p>
            <p className="text-xs text-blue-700 mt-2 font-semibold">
              ✅ Supported formats: PDF, Word (DOCX/DOC), PNG, JPG, CSV
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label>Capability Statement</Label>
        <div className="mt-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full border-blue-300 hover:bg-blue-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Data...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Capability Statement
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
        </div>

        {currentData?.capability_statement_url && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">Capability statement uploaded</span>
            </div>
            <a 
              href={currentData.capability_statement_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View
            </a>
          </div>
        )}
      </div>
    </div>
  );
}