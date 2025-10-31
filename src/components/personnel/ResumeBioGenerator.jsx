import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Sparkles,
  Copy,
  Check,
  Loader2,
  User,
  FileText,
  Download,
  Edit
} from "lucide-react";
import FileUploadDialog from "@/components/ui/FileUploadDialog";

export default function ResumeBioGenerator({ organization, onPersonnelCreated }) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [generatedBios, setGeneratedBios] = useState(null);
  const [copied, setCopied] = useState({});
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);

  const handleFileUpload = async (files, metadata) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from resume using AI
      const extractionSchema = {
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
          clearance_level: { type: "string" },
          skills: {
            type: "array",
            items: { type: "string" }
          },
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
                achievements: {
                  type: "array",
                  items: { type: "string" }
                }
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
                technologies: {
                  type: "array",
                  items: { type: "string" }
                },
                achievements: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          awards_recognition: {
            type: "array",
            items: { type: "string" }
          },
          publications: {
            type: "array",
            items: { type: "string" }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: extractionSchema
      });

      if (result.status === 'success') {
        setExtractedData({
          ...result.output,
          resume_url: file_url
        });
        alert("✓ Resume data extracted successfully! Review and generate bios below.");
      } else {
        alert("Error extracting resume data: " + result.details);
      }

      setShowUploadDialog(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error processing resume: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const generateBios = async () => {
    if (!extractedData) return;

    setGenerating(true);
    try {
      const prompt = `You are an expert at writing professional bios for government proposal key personnel sections. 
      
Given the following personnel information, generate FOUR different versions of a professional bio:

1. SHORT BIO (150 words): Concise, high-impact summary suitable for executive summaries or tables
2. MEDIUM BIO (300 words): Standard detailed bio for key personnel sections
3. LONG BIO (500 words): Comprehensive bio with full detail for technical volumes
4. EXECUTIVE SUMMARY (200 words): C-level appropriate, emphasizing leadership and strategic impact

Personnel Information:
Name: ${extractedData.full_name}
Title: ${extractedData.title}
Experience: ${extractedData.years_experience} years
Education: ${JSON.stringify(extractedData.education)}
Certifications: ${JSON.stringify(extractedData.certifications)}
Clearance: ${extractedData.clearance_level || 'Not specified'}
Skills: ${extractedData.skills?.join(', ')}
Work History: ${JSON.stringify(extractedData.work_history)}
Projects: ${JSON.stringify(extractedData.relevant_projects)}
Awards: ${extractedData.awards_recognition?.join('; ')}

Guidelines:
- Use third person perspective
- Lead with most impressive credentials
- Quantify achievements with metrics where possible
- Emphasize government/federal experience if present
- Highlight security clearances prominently
- Use strong action verbs
- Format for easy scanning (short paragraphs)
- Maintain professional government proposal tone

Return ONLY a JSON object with this exact structure:
{
  "bio_short": "150 word bio here",
  "bio_medium": "300 word bio here",
  "bio_long": "500 word bio here",
  "bio_executive_summary": "200 word executive bio here"
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            bio_short: { type: "string" },
            bio_medium: { type: "string" },
            bio_long: { type: "string" },
            bio_executive_summary: { type: "string" }
          }
        }
      });

      setGeneratedBios(response);
      alert("✓ Bios generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      alert("Error generating bios: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const savePersonnel = async () => {
    if (!extractedData || !generatedBios) {
      alert("Please extract resume data and generate bios first");
      return;
    }

    try {
      const personnel = await base44.entities.KeyPersonnel.create({
        organization_id: organization.id,
        ...extractedData,
        ...generatedBios,
        usage_count: 0,
        is_available: true
      });

      alert("✓ Personnel profile saved successfully!");
      
      if (onPersonnelCreated) {
        onPersonnelCreated(personnel);
      }

      // Reset form
      setExtractedData(null);
      setGeneratedBios(null);
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving personnel: " + error.message);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => {
      setCopied({ ...copied, [key]: false });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!extractedData && (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="p-12 text-center">
            <Upload className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Upload Resume or LinkedIn Profile
            </h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Upload a resume (PDF, DOCX, TXT) or paste LinkedIn URL. Our AI will automatically extract 
              education, certifications, work history, and skills to generate professional bios.
            </p>
            <Button onClick={() => setShowUploadDialog(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-5 h-5 mr-2" />
              Upload Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Review */}
      {extractedData && !generatedBios && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Review Extracted Data
            </CardTitle>
            <CardDescription>
              Review and edit the information extracted from the resume before generating bios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={extractedData.full_name || ""}
                  onChange={(e) => setExtractedData({...extractedData, full_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Title/Position *</Label>
                <Input
                  value={extractedData.title || ""}
                  onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={extractedData.email || ""}
                  onChange={(e) => setExtractedData({...extractedData, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={extractedData.phone || ""}
                  onChange={(e) => setExtractedData({...extractedData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  value={extractedData.years_experience || ""}
                  onChange={(e) => setExtractedData({...extractedData, years_experience: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Security Clearance</Label>
                <Input
                  value={extractedData.clearance_level || ""}
                  onChange={(e) => setExtractedData({...extractedData, clearance_level: e.target.value})}
                  placeholder="e.g., Secret, Top Secret, TS/SCI"
                />
              </div>
            </div>

            {/* Skills */}
            {extractedData.skills && extractedData.skills.length > 0 && (
              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {extractedData.education && extractedData.education.length > 0 && (
              <div>
                <Label>Education</Label>
                <div className="space-y-2 mt-2">
                  {extractedData.education.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                      <p className="font-medium">{edu.degree} in {edu.field}</p>
                      <p className="text-sm text-slate-600">{edu.institution} - {edu.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {extractedData.certifications && extractedData.certifications.length > 0 && (
              <div>
                <Label>Certifications</Label>
                <div className="space-y-2 mt-2">
                  {extractedData.certifications.map((cert, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                      <p className="font-medium">{cert.name}</p>
                      {cert.issuing_org && (
                        <p className="text-sm text-slate-600">{cert.issuing_org}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setExtractedData(null)} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Different Resume
              </Button>
              <Button onClick={generateBios} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Bios...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Professional Bios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Bios */}
      {generatedBios && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Generated Professional Bios
                </CardTitle>
                <CardDescription>
                  Four versions optimized for different proposal sections
                </CardDescription>
              </div>
              <Button onClick={savePersonnel} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Save Personnel Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="short" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="short">Short (150w)</TabsTrigger>
                <TabsTrigger value="medium">Medium (300w)</TabsTrigger>
                <TabsTrigger value="long">Long (500w)</TabsTrigger>
                <TabsTrigger value="executive">Executive</TabsTrigger>
              </TabsList>

              <TabsContent value="short">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Short Bio (150 words)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedBios.bio_short, 'short')}
                    >
                      {copied.short ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedBios.bio_short}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Best for: Executive summaries, tables, quick reference sections
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="medium">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Medium Bio (300 words)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedBios.bio_medium, 'medium')}
                    >
                      {copied.medium ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedBios.bio_medium}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Best for: Standard key personnel sections, management plans
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="long">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Long Bio (500 words)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedBios.bio_long, 'long')}
                    >
                      {copied.long ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedBios.bio_long}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Best for: Technical volumes, detailed qualifications sections, full resumes
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="executive">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Executive Summary Bio (200 words)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedBios.bio_executive_summary, 'executive')}
                    >
                      {copied.executive ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedBios.bio_executive_summary}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Best for: Executive summaries, C-level presentations, leadership emphasis
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button onClick={() => {
                setExtractedData(null);
                setGeneratedBios(null);
              }} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button onClick={generateBios} variant="outline" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate Bios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleFileUpload}
        title="Upload Resume"
        description="Upload a resume in PDF, DOCX, or TXT format. AI will extract all relevant information."
        acceptedFileTypes=".pdf,.doc,.docx,.txt"
        multiple={false}
        uploading={uploading}
        showCategory={false}
        showTags={false}
        showDescription={false}
      />
    </div>
  );
}