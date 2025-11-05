import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, X, Sparkles, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Phase3SolicitationModal({ open, onOpenChange, proposal, onSave }) {
  const [formData, setFormData] = useState({
    project_type: proposal?.project_type || "RFP",
    solicitation_number: proposal?.solicitation_number || "",
    agency_name: proposal?.agency_name || "",
    project_title: proposal?.project_title || "",
    due_date: proposal?.due_date || "",
    contract_value: proposal?.contract_value || 0,
    contract_value_type: proposal?.contract_value_type || "estimated",
  });
  
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (proposal) {
      setFormData({
        project_type: proposal.project_type || "RFP",
        solicitation_number: proposal.solicitation_number || "",
        agency_name: proposal.agency_name || "",
        project_title: proposal.project_title || "",
        due_date: proposal.due_date || "",
        contract_value: proposal.contract_value || 0,
        contract_value_type: proposal.contract_value_type || "estimated",
      });
    }
  }, [proposal]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!proposal?.id) return;
      try {
        const docs = await base44.entities.SolicitationDocument.filter({
          proposal_id: proposal.id
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
    if (open) {
      loadDocuments();
    }
  }, [proposal?.id, open]);

  const handleFileUpload = async (files) => {
    if (!proposal?.id) {
      alert("Please save the proposal first");
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
          proposal_id: proposal.id,
          organization_id: proposal.organization_id,
          document_type: docType,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size
        });
        
        setUploadedDocs(prev => [...prev, { name: file.name, url: file_url, type: docType }]);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        
        // Auto-extract basic data
        if (['rfp', 'rfq', 'sow', 'pws'].includes(docType)) {
          await extractBasicData(file_url);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        alert(`Error uploading ${file.name}`);
      }
    }
  };

  const extractBasicData = async (fileUrl) => {
    try {
      setIsExtracting(true);
      
      const aiPrompt = `Analyze this solicitation document and extract:
- Solicitation Number
- Agency Name  
- Project Title
- Due Date (YYYY-MM-DD format)
- Project Type (RFP/RFQ/RFI/IFB/Other)

Return as JSON with these keys: solicitation_number, agency_name, project_title, due_date, project_type`;

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
        setFormData(prev => ({
          ...prev,
          solicitation_number: aiResult.solicitation_number || prev.solicitation_number,
          agency_name: aiResult.agency_name || prev.agency_name,
          project_title: aiResult.project_title || prev.project_title,
          due_date: aiResult.due_date || prev.due_date,
          project_type: aiResult.project_type || prev.project_type,
        }));
      }
    } catch (error) {
      console.error("Error extracting data:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Solicitation Details & Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isExtracting && (
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <AlertDescription>
                AI is reading your document and extracting key details...
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Basic Information</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type *</Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) => setFormData({...formData, project_type: value})}
                >
                  <SelectTrigger id="project_type">
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
                <Label htmlFor="solicitation_number">Solicitation Number *</Label>
                <Input
                  id="solicitation_number"
                  value={formData.solicitation_number}
                  onChange={(e) => setFormData({...formData, solicitation_number: e.target.value})}
                  placeholder="e.g., W912DY24R0001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agency_name">Agency Name *</Label>
              <Input
                id="agency_name"
                value={formData.agency_name}
                onChange={(e) => setFormData({...formData, agency_name: e.target.value})}
                placeholder="e.g., Department of Defense"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_title">Project Title</Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => setFormData({...formData, project_title: e.target.value})}
                placeholder="Brief description of the project"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_value">Contract Value ($)</Label>
                <Input
                  id="contract_value"
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({...formData, contract_value: parseFloat(e.target.value) || 0})}
                  placeholder="e.g., 5000000"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-slate-900">Upload Solicitation Documents</h3>
            
            <Alert className="bg-indigo-50 border-indigo-200">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <AlertDescription className="text-sm text-indigo-900">
                Upload PDF files - AI will automatically extract key details
              </AlertDescription>
            </Alert>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                className="hidden"
                id="file-upload-modal"
              />
              <label htmlFor="file-upload-modal" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-700 font-medium mb-1">Click to upload PDF files</p>
                <p className="text-xs text-slate-500">or drag and drop</p>
              </label>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Uploading...</p>
                {uploadingFiles.map((name, idx) => (
                  <Badge key={idx} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
            )}

            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Uploaded ({uploadedDocs.length})</p>
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{doc.name}</span>
                      <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.solicitation_number?.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}