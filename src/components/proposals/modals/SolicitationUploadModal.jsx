import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, File, X, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SolicitationUploadModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [proposalData, setProposalData] = useState({
    due_date: "",
    contract_value: null,
  });

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      
      if (orgs.length > 0) {
        const org = orgs[0];
        setOrganization(org);

        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length > 0) {
          setProposalData({
            due_date: proposals[0].due_date || "",
            contract_value: proposals[0].contract_value || null,
          });
        }

        const docs = await base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: org.id
        }, '-created_date');
        setUploadedDocs(docs);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          organization_id: organization.id,
          document_type: 'rfp',
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
        });
      }
      
      await loadData();
      alert(`✓ Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error uploading files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExtractDetails = async () => {
    if (uploadedDocs.length === 0) {
      alert("Please upload a solicitation document first");
      return;
    }

    try {
      setExtracting(true);
      
      // Use the first uploaded document for extraction
      const doc = uploadedDocs[0];
      
      const extractionSchema = {
        type: "object",
        properties: {
          due_date: { type: "string" },
          contract_value: { type: "number" },
          agency_name: { type: "string" },
          project_title: { type: "string" },
        }
      };

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: doc.file_url,
        json_schema: extractionSchema
      });

      if (extractionResult.status === 'error' || !extractionResult.output) {
        alert('Could not extract data from document. Please enter manually.');
        return;
      }

      const aiResult = extractionResult.output || {};
      
      // Update proposal with extracted data
      const updateData = {};
      if (aiResult.due_date) updateData.due_date = aiResult.due_date;
      if (aiResult.contract_value) updateData.contract_value = aiResult.contract_value;
      if (aiResult.agency_name) updateData.agency_name = aiResult.agency_name;
      if (aiResult.project_title) updateData.project_title = aiResult.project_title;

      if (Object.keys(updateData).length > 0) {
        await base44.entities.Proposal.update(proposalId, updateData);
        setProposalData(prev => ({ ...prev, ...updateData }));
        alert('✓ AI extracted key details from solicitation document');
      }
    } catch (error) {
      console.error("Extraction error:", error);
      alert(`Error extracting data: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (confirm("Remove this document?")) {
      try {
        await base44.entities.SolicitationDocument.delete(docId);
        await loadData();
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.Proposal.update(proposalId, {
        due_date: proposalData.due_date,
        contract_value: proposalData.contract_value,
      });
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Solicitation</DialogTitle>
          <DialogDescription>
            Upload RFP/RFQ documents and let AI extract key details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* File Upload */}
            <div className="space-y-3">
              <Label>Upload Solicitation Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center bg-blue-50">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button size="sm" variant="outline" asChild disabled={uploading}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload PDF Files
                      </>
                    )}
                  </label>
                </Button>
                <p className="text-xs text-slate-500 mt-2">PDF format only</p>
              </div>
            </div>

            {/* AI Extraction */}
            {uploadedDocs.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-900">
                      Let AI extract key details from your solicitation
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleExtractDetails}
                      disabled={extracting}
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Details
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Uploaded Documents */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Documents ({uploadedDocs.length})</Label>
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-500">
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Entry */}
            <div className="space-y-4 pt-4 border-t">
              <Label>Key Details</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={proposalData.due_date || ""}
                    onChange={(e) => setProposalData({ ...proposalData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_value">Contract Value (USD)</Label>
                  <Input
                    id="contract_value"
                    type="number"
                    placeholder="e.g., 5000000"
                    value={proposalData.contract_value || ""}
                    onChange={(e) => setProposalData({ ...proposalData, contract_value: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}