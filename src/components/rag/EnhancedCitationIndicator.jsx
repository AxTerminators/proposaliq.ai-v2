import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink, Info, Award, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

/**
 * PHASE 6: Enhanced Citation Indicator
 * 
 * Displays citations for AI-generated content with:
 * - Inline citation markers
 * - Source proposal details
 * - Win/loss status indicators
 * - Links to view full proposals
 */
export default function EnhancedCitationIndicator({ 
  citations = [],
  compact = false,
  showFooter = true 
}) {
  const [selectedCitation, setSelectedCitation] = React.useState(null);
  const [proposalDetails, setProposalDetails] = React.useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);

  if (!citations || citations.length === 0) return null;

  const handleViewDetails = async (citation) => {
    setSelectedCitation(citation);
    
    if (citation.type === 'proposal' && citation.id) {
      setIsLoadingDetails(true);
      try {
        const proposal = await base44.entities.Proposal.get(citation.id);
        setProposalDetails(proposal);
      } catch (error) {
        console.error('Error loading proposal details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  // Compact inline view
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs cursor-help border-blue-300 bg-blue-50 text-blue-700">
              <FileText className="w-3 h-3 mr-1" />
              {citations.length} Citation{citations.length !== 1 ? 's' : ''}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2">
              <p className="font-semibold text-xs">Referenced Sources:</p>
              {citations.slice(0, 3).map((citation, idx) => (
                <div key={idx} className="text-xs">
                  {citation.inline_marker} {citation.citation_text}
                </div>
              ))}
              {citations.length > 3 && (
                <p className="text-xs text-slate-500">
                  +{citations.length - 3} more...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full citation display
  return (
    <>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
            <FileText className="w-4 h-4" />
            Content Citations ({citations.length})
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-blue-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    This content was generated using reference material from past proposals.
                    Click citations to view source details.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {citations.map((citation, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-blue-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                    {citation.inline_marker}
                  </Badge>
                  <span className="text-sm font-medium text-slate-900">
                    {citation.citation_text}
                  </span>
                  {citation.type === 'proposal' && citation.status === 'won' && (
                    <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                      <Award className="w-3 h-3 mr-1" />
                      Won
                    </Badge>
                  )}
                </div>
                {citation.relevance_note && (
                  <p className="text-xs text-slate-600 mt-1 ml-7">
                    {citation.relevance_note}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetails(citation)}
                className="text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {showFooter && (
            <div className="pt-2 mt-2 border-t border-blue-200">
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                All sources documented for audit compliance
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Citation Details Dialog */}
      <Dialog open={selectedCitation !== null} onOpenChange={() => setSelectedCitation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Citation Details {selectedCitation?.inline_marker}
            </DialogTitle>
            <DialogDescription>
              Source information for referenced content
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="p-8 text-center text-slate-500">
              Loading details...
            </div>
          ) : proposalDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600">Proposal Name</p>
                  <p className="font-medium">{proposalDetails.proposal_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Status</p>
                  <Badge className={
                    proposalDetails.status === 'won' 
                      ? 'bg-green-100 text-green-800' 
                      : proposalDetails.status === 'submitted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                  }>
                    {proposalDetails.status}
                  </Badge>
                </div>
                {proposalDetails.agency_name && (
                  <div>
                    <p className="text-xs text-slate-600">Agency</p>
                    <p className="font-medium">{proposalDetails.agency_name}</p>
                  </div>
                )}
                {proposalDetails.solicitation_number && (
                  <div>
                    <p className="text-xs text-slate-600">Solicitation #</p>
                    <p className="font-medium">{proposalDetails.solicitation_number}</p>
                  </div>
                )}
              </div>

              {proposalDetails.project_title && (
                <div>
                  <p className="text-xs text-slate-600">Project Title</p>
                  <p className="text-sm">{proposalDetails.project_title}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Link to={createPageUrl('ProposalBuilder') + '?id=' + proposalDetails.id}>
                  <Button className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Full Proposal
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm"><strong>Citation:</strong> {selectedCitation?.citation_text}</p>
              {selectedCitation?.relevance_note && (
                <p className="text-sm text-slate-600">
                  <strong>Note:</strong> {selectedCitation.relevance_note}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}