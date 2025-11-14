import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SourceContentViewer Component
 * 
 * PHASE 4: Citation Viewing
 * 
 * Displays the original source content when user clicks on a citation.
 * Shows the exact section/paragraph that influenced the AI-generated content.
 */
export default function SourceContentViewer({
  isOpen,
  onClose,
  proposalId,
  sectionName
}) {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [section, setSection] = useState(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadSourceContent();
    }
  }, [isOpen, proposalId, sectionName]);

  const loadSourceContent = async () => {
    try {
      setLoading(true);

      // Fetch proposal
      const prop = await base44.entities.Proposal.get(proposalId);
      setProposal(prop);

      // Try to find matching section by name
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      });

      // Match by section name (case-insensitive, partial match)
      const matchingSection = sections.find(s => 
        s.section_name.toLowerCase().includes(sectionName.toLowerCase()) ||
        sectionName.toLowerCase().includes(s.section_name.toLowerCase())
      );

      setSection(matchingSection || null);

    } catch (error) {
      console.error('[SourceContentViewer] Error loading source:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Source Reference
          </DialogTitle>
          <DialogDescription>
            Original content from reference proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Proposal Info */}
            {proposal && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-blue-900 mb-1">
                        {proposal.proposal_name}
                      </h3>
                      {proposal.project_title && (
                        <p className="text-sm text-blue-700">{proposal.project_title}</p>
                      )}
                    </div>
                    {proposal.status === 'won' && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Won
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-blue-800">
                    {proposal.agency_name && (
                      <p><strong>Agency:</strong> {proposal.agency_name}</p>
                    )}
                    {proposal.solicitation_number && (
                      <p><strong>Solicitation:</strong> {proposal.solicitation_number}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Content */}
            {section ? (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-slate-900 mb-1">
                      {section.section_name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {section.section_type?.replace('_', ' ')}
                      </Badge>
                      {section.word_count && (
                        <Badge variant="outline" className="text-xs">
                          {section.word_count} words
                        </Badge>
                      )}
                      <Badge className={cn(
                        "text-xs",
                        section.status === 'approved' && "bg-green-100 text-green-800",
                        section.status === 'reviewed' && "bg-blue-100 text-blue-800"
                      )}>
                        {section.status}
                      </Badge>
                    </div>
                  </div>

                  <div 
                    className="prose prose-sm max-w-none bg-slate-50 rounded-lg p-4 border"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-amber-400 mb-3" />
                  <p className="text-amber-900 font-semibold">
                    Could not find matching section
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Looking for: "{sectionName}"
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}