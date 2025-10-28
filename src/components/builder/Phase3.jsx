import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Phase3({ proposalData, setProposalData, proposalId }) {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const handleFileUpload = async (files) => {
    if (!proposalId) {
      alert("Please save the proposal first (complete Phase 1)");
      return;
    }

    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          document_type: "other",
          file_name: file.name,
          file_url: file_url,
          file_size: file.size
        });
        
        setUploadedDocs(prev => [...prev, { name: file.name, url: file_url }]);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
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
          <h3 className="font-semibold mb-4">Upload Solicitation Documents</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload RFP, SOW, PWS, pricing sheets, and other relevant documents (PDF, DOCX, XLSX, CSV, PNG, JPG up to 30MB)
          </p>
          
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
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
              <p className="text-sm font-medium text-slate-700">Uploaded Documents:</p>
              {uploadedDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">{doc.name}</span>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}