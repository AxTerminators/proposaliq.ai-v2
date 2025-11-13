import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Sparkles, Loader2, Copy, Download, FileText, User, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * ResumeBioGenerator Component
 * 
 * Allows users to upload resumes (PDF, DOCX, etc.) and automatically generate
 * multiple bio variations using AI. This component is used in the Key Personnel
 * management workflow.
 * 
 * Enhanced to support DOCX resume parsing for comprehensive data extraction.
 */
export default function ResumeBioGenerator({ personnel, onBiosGenerated, onPersonnelUpdated }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [bios, setBios] = React.useState({
    short: personnel?.bio_short || "",
    medium: personnel?.bio_medium || "",
    long: personnel?.bio_long || "",
    executive: personnel?.bio_executive_summary || "",
    technical: personnel?.bio_technical || ""
  });
  const [extractedData, setExtractedData] = React.useState(null);
  const fileInputRef = React.useRef(null);

  /**
   * Generate all bio variations from extracted resume data
   */
  const generateBiosFromData = async (data) => {
    setIsGenerating(true);
    
    try {
      const bioPrompt = `Generate professional bios for ${data.full_name || 'this person'} based on the following resume data:

${JSON.stringify(data, null, 2)}

Generate 5 different bio variations:
1. SHORT (150 words): Brief professional summary
2. MEDIUM (300 words): Comprehensive overview with key achievements
3. LONG (500+ words): Detailed bio with extensive background
4. EXECUTIVE SUMMARY: C-suite focused, emphasizing leadership and strategic impact
5. TECHNICAL: Detailed technical expertise and project experience

Each bio should be professional, compelling, and tailored to government proposals.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: bioPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            bio_short: { type: "string" },
            bio_medium: { type: "string" },
            bio_long: { type: "string" },
            bio_executive_summary: { type: "string" },
            bio_technical: { type: "string" }
          }
        }
      });

      setBios(result);
      if (onBiosGenerated) {
        onBiosGenerated(result);
      }
      toast.success('All bio variations generated successfully!');
    } catch (error) {
      console.error('Bio generation error:', error);
      toast.error('Failed to generate bios: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle resume upload with AI extraction
   * Supports PDF, DOCX, and image formats
   */
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword' // DOC
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document (DOCX), or image file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload file
      toast.info('Uploading resume...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Define extraction schema for resume data
      const resumeSchema = {
        type: "object",
        properties: {
          full_name: { type: "string" },
          title: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          years_experience: { type: "number" },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                degree: { type: "string" },
                field: { type: "string" },
                institution: { type: "string" },
                year: { type: "string" }
              }
            }
          },
          certifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                issuing_org: { type: "string" },
                date_obtained: { type: "string" }
              }
            }
          },
          clearance_level: { 
            type: "string",
            enum: ["none", "public_trust", "secret", "top_secret", "ts_sci"]
          },
          skills: { type: "array", items: { type: "string" } },
          work_history: {
            type: "array",
            items: {
              type: "object",
              properties: {
                employer: { type: "string" },
                title: { type: "string" },
                start_date: { type: "string" },
                end_date: { type: "string" },
                description: { type: "string" },
                achievements: { type: "array", items: { type: "string" } }
              }
            }
          },
          relevant_projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project_name: { type: "string" },
                role: { type: "string" },
                description: { type: "string" },
                technologies: { type: "array", items: { type: "string" } },
                achievements: { type: "array", items: { type: "string" } }
              }
            }
          },
          awards_recognition: { type: "array", items: { type: "string" } },
          publications: { type: "array", items: { type: "string" } }
        }
      };

      // Step 3: Extract data based on file type
      let extractionResult;
      
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        // Use DOCX parser
        toast.info('AI is extracting data from resume...');
        extractionResult = await base44.functions.invoke('parseDocxFile', {
          file_url,
          json_schema: resumeSchema,
          extract_structured_data: true
        });
      } else {
        // Use built-in extraction for PDF and images
        toast.info('AI is extracting data from resume...');
        extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: resumeSchema
        });
      }

      // Step 4: Process extraction results
      if (extractionResult.status === 'success' && (extractionResult.output || extractionResult.structured_data)) {
        const extracted = extractionResult.output || extractionResult.structured_data;
        setExtractedData(extracted);

        // Update personnel record with extracted data
        if (onPersonnelUpdated) {
          onPersonnelUpdated({
            ...extracted,
            resume_url: file_url
          });
        }

        toast.success('Resume data extracted! Now generating bios...');
        
        // Auto-generate bios from extracted data
        await generateBiosFromData(extracted);
      } else {
        // Even if extraction fails, save the resume URL
        if (onPersonnelUpdated) {
          onPersonnelUpdated({ resume_url: file_url });
        }
        toast.warning('Resume uploaded but data extraction failed. You can still generate bios manually.');
      }

    } catch (error) {
      console.error('Resume upload error:', error);
      toast.error('Failed to process resume: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyBio = (bioType) => {
    navigator.clipboard.writeText(bios[bioType]);
    toast.success('Bio copied to clipboard');
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <User className="w-5 h-5" />
          Resume & Bio Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Upload Resume */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                💡 Upload Resume for Auto-Generation
              </h4>
              <p className="text-sm text-green-800 mb-3">
                Upload a resume and our AI will extract all information and generate multiple bio variations automatically.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGenerating}
                variant="outline"
                className="border-green-300 hover:bg-green-100"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Resume...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Resume
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                onChange={handleResumeUpload}
                className="hidden"
              />
              <p className="text-xs text-green-700 mt-2">
                ✅ Supported: PDF, Word (DOCX/DOC), Images (PNG/JPG)
              </p>
            </div>
          </div>
        </div>

        {/* Resume URL Display */}
        {personnel?.resume_url && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-700">Resume uploaded</span>
            </div>
            <a
              href={personnel.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View Resume
            </a>
          </div>
        )}

        {/* Extracted Data Preview */}
        {extractedData && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              ✨ Extracted Resume Data:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {extractedData.full_name && (
                <div><span className="font-medium">Name:</span> {extractedData.full_name}</div>
              )}
              {extractedData.title && (
                <div><span className="font-medium">Title:</span> {extractedData.title}</div>
              )}
              {extractedData.years_experience && (
                <div><span className="font-medium">Experience:</span> {extractedData.years_experience} years</div>
              )}
              {extractedData.clearance_level && extractedData.clearance_level !== 'none' && (
                <div><span className="font-medium">Clearance:</span> {extractedData.clearance_level}</div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-600">Generating bio variations...</p>
            </div>
          </div>
        )}

        {/* Generated Bios Tabs */}
        {!isGenerating && (bios.short || bios.medium || bios.long) && (
          <Tabs defaultValue="short" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="short">Short</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="long">Long</TabsTrigger>
              <TabsTrigger value="executive">Executive</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
            </TabsList>

            {Object.entries({
              short: { label: "Short Bio (150 words)", content: bios.short },
              medium: { label: "Medium Bio (300 words)", content: bios.medium },
              long: { label: "Long Bio (500+ words)", content: bios.long },
              executive: { label: "Executive Summary", content: bios.executive },
              technical: { label: "Technical Bio", content: bios.technical }
            }).map(([key, { label, content }]) => (
              <TabsContent key={key} value={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Button
                    onClick={() => copyBio(key)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => {
                    const newBios = { ...bios, [key]: e.target.value };
                    setBios(newBios);
                    if (onBiosGenerated) {
                      onBiosGenerated(newBios);
                    }
                  }}
                  rows={12}
                  className="font-serif"
                />
                <p className="text-xs text-slate-500">
                  Word count: {content?.split(/\s+/).filter(Boolean).length || 0}
                </p>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Manual Generation Option */}
        {!isGenerating && !bios.short && personnel && (
          <Button
            onClick={() => generateBiosFromData(personnel)}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Bios from Current Data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}