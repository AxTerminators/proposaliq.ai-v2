import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  CheckCircle2,
  Circle,
  BookOpen,
  FileCheck,
  Search,
  Eye
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Phase2({ proposalData, setProposalData, proposalId }) {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingFiles, setProcessingFiles] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);

  // Get current user's organization for security filtering
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
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  // SECURITY: Only fetch proposals from current user's organization
  const { data: pastProposals } = useQuery({
    queryKey: ['past-proposals', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const proposals = await base44.entities.Proposal.filter(
        { 
          organization_id: currentOrgId,
          status: { $in: ['submitted', 'won'] } 
        },
        '-created_date'
      );
      return proposals;
    },
    initialData: [],
    enabled: !!currentOrgId
  });

  // SECURITY: Only fetch resources from current user's organization
  const { data: resources } = useQuery({
    queryKey: ['proposal-resources', currentOrgId],
    queryFn: () => {
      if (!currentOrgId) return [];
      return base44.entities.ProposalResource.filter(
        { 
          organization_id: currentOrgId,
          resource_type: { $in: ['past_proposal', 'capability_statement', 'marketing_collateral'] } 
        },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!currentOrgId
  });

  // SECURITY: Only fetch reference docs from current proposal (which is org-scoped)
  const { data: existingRefs } = useQuery({
    queryKey: ['reference-docs', proposalId, currentOrgId],
    queryFn: async () => {
      if (!proposalId || !currentOrgId) return [];
      const refs = await base44.entities.SolicitationDocument.filter({ 
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: 'reference'
      });
      return refs;
    },
    initialData: [],
    enabled: !!proposalId && !!currentOrgId
  });

  useEffect(() => {
    if (existingRefs.length > 0) {
      setSelectedReferences(existingRefs.map(ref => ref.file_url));
    }
  }, [existingRefs]);

  const extractTextFromFile = async (fileUrl, fileName) => {
    try {
      setProcessingFiles(prev => [...prev, fileName]);
      
      // Use AI to extract and summarize key content
      const prompt = `Analyze this document and extract:
1. Document type and purpose
2. Key information, facts, and data
3. Writing style and tone
4. Technical capabilities or expertise mentioned
5. Past performance examples
6. Key personnel information
7. Any other relevant content

Provide a comprehensive summary that can be used as reference for proposal writing.`;

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl]
      });

      return summary;
    } catch (error) {
      console.error("Error extracting text:", error);
      return null;
    } finally {
      setProcessingFiles(prev => prev.filter(name => name !== fileName));
    }
  };

  const handleFileUpload = async (files) => {
    if (!proposalId) {
      alert("Please complete Phase 1 first to save the proposal");
      return;
    }

    if (!currentOrgId) {
      alert("Organization not found. Please complete onboarding first.");
      return;
    }

    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Extract content from the file for better AI understanding
        const extractedContent = await extractTextFromFile(file_url, file.name);
        
        // SECURITY: Always include organization_id to ensure data isolation
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          organization_id: currentOrgId,
          document_type: "reference",
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          description: extractedContent ? `AI Summary: ${extractedContent.substring(0, 500)}...` : "Reference document for proposal writing"
        });
        
        setSelectedReferences(prev => [...prev, file_url]);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleSelectPastProposal = async (proposal) => {
    if (!proposalId) {
      alert("Please complete Phase 1 first");
      return;
    }

    if (!currentOrgId) {
      alert("Organization not found.");
      return;
    }

    try {
      // SECURITY: Verify the proposal belongs to the same organization
      if (proposal.organization_id !== currentOrgId) {
        alert("Security error: Cannot access proposal from different organization");
        return;
      }

      const sections = await base44.entities.ProposalSection.filter(
        { proposal_id: proposal.id },
        'order'
      );

      // SECURITY: Always include organization_id
      await base44.entities.SolicitationDocument.create({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: "reference",
        file_name: `Reference: ${proposal.proposal_name}`,
        file_url: `proposal:${proposal.id}`,
        description: `Past proposal: ${proposal.proposal_name} - ${sections.length} sections`
      });

      setSelectedReferences(prev => [...prev, `proposal:${proposal.id}`]);
    } catch (error) {
      console.error("Error selecting past proposal:", error);
    }
  };

  const handleSelectResource = async (resource) => {
    if (!proposalId) {
      alert("Please complete Phase 1 first");
      return;
    }

    if (!currentOrgId) {
      alert("Organization not found.");
      return;
    }

    try {
      // SECURITY: Verify the resource belongs to the same organization
      if (resource.organization_id !== currentOrgId) {
        alert("Security error: Cannot access resource from different organization");
        return;
      }

      // SECURITY: Always include organization_id
      await base44.entities.SolicitationDocument.create({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: "reference",
        file_name: resource.file_name,
        file_url: resource.file_url,
        file_size: resource.file_size,
        description: `Resource: ${resource.resource_type}`
      });

      setSelectedReferences(prev => [...prev, resource.file_url]);
    } catch (error) {
      console.error("Error selecting resource:", error);
    }
  };

  const isSelected = (identifier) => selectedReferences.includes(identifier);

  const filteredProposals = pastProposals.filter(p =>
    p.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.agency_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredResources = resources.filter(r =>
    r.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Phase 2: Referenced Documents
        </CardTitle>
        <CardDescription>
          Select past proposals, templates, or upload reference documents to guide AI generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!proposalId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              ⚠️ Please complete Phase 1 and save your proposal before adding references
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Smart Document Reading + Data Privacy
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• AI reads and analyzes your reference documents (PDF, DOCX, XLSX, PNG, JPG, TXT, PPTX)</li>
            <li>• Extracts writing style, tone, and key information</li>
            <li>• Uses this knowledge to generate proposal sections that match your style</li>
            <li>• 🔒 <strong>Your documents are private to your organization only</strong></li>
            <li>• 🔒 <strong>AI never uses your docs when generating for other companies</strong></li>
          </ul>
        </div>

        {processingFiles.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-indigo-900 font-medium mb-2">📖 AI is reading documents...</p>
            {processingFiles.map((name, idx) => (
              <p key={idx} className="text-sm text-indigo-700">• {name}</p>
            ))}
          </div>
        )}

        {selectedReferences.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">
              ✓ {selectedReferences.length} reference document(s) selected
            </p>
            <p className="text-xs text-green-700">
              AI will use these references in Phase 6 to generate proposal content
            </p>
          </div>
        )}

        <Tabs defaultValue="past" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="past">Past Proposals</TabsTrigger>
            <TabsTrigger value="resources">Templates & Samples</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <TabsContent value="past" className="space-y-3">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="mb-2">No past proposals found</p>
                <p className="text-sm text-slate-400">
                  Complete more proposals to build your reference library
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected(`proposal:${proposal.id}`)
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
                    }`}
                    onClick={() => !isSelected(`proposal:${proposal.id}`) && handleSelectPastProposal(proposal)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{proposal.proposal_name}</h3>
                          {isSelected(`proposal:${proposal.id}`) && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {proposal.agency_name} • {proposal.project_type}
                        </p>
                        <div className="flex gap-2">
                          <Badge className={
                            proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }>
                            {proposal.status}
                          </Badge>
                          {proposal.match_score && (
                            <Badge variant="outline">
                              Match: {proposal.match_score}/100
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!isSelected(`proposal:${proposal.id}`) ? (
                        <Circle className="w-6 h-6 text-slate-300" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-3">
            {filteredResources.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="mb-2">No templates or samples found</p>
                <p className="text-sm text-slate-400">
                  Upload resources in the Resources page
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredResources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected(resource.file_url)
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
                    }