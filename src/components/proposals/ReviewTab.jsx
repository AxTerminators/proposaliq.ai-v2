import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  User,
  Calendar
} from "lucide-react";
import moment from "moment";
import SectionReviewModal from "../builder/SectionReviewModal";

/**
 * ReviewTab Component
 * Displays all sections pending review for a proposal
 * Allows reviewers to click on sections to open the review modal
 */
export default function ReviewTab({ proposal, user, organization }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Fetch all sections for this proposal
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: async () => {
      const allSections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });
      return allSections.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!proposal.id
  });

  // Filter sections that need review
  const sectionsNeedingReview = sections.filter(s => 
    s.status === 'pending_review' || s.status === 'rework_needed'
  );

  const approvedSections = sections.filter(s => s.status === 'approved');

  const handleOpenReview = (section) => {
    setSelectedSection(section);
    setShowReviewModal(true);
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    setSelectedSection(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Section Review</h3>
          <p className="text-sm text-slate-600 mt-1">
            Review AI-generated sections and approve or send back for regeneration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-800">
            {sectionsNeedingReview.length} Pending Review
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            {approvedSections.length} Approved
          </Badge>
        </div>
      </div>

      {/* Sections Needing Review */}
      {sectionsNeedingReview.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Sections Pending Review
          </h4>
          <div className="space-y-3">
            {sectionsNeedingReview.map((section) => (
              <Card 
                key={section.id}
                className="border-2 border-amber-200 bg-amber-50/30 hover:border-amber-300 transition-all cursor-pointer"
                onClick={() => handleOpenReview(section)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base capitalize flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        {section.section_name?.replace(/_/g, ' ')}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                        {section.marked_for_review_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {section.marked_for_review_by}
                          </span>
                        )}
                        {section.marked_for_review_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {moment(section.marked_for_review_date).fromNow()}
                          </span>
                        )}
                        {section.word_count && (
                          <span>{section.word_count} words</span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      className={
                        section.status === 'rework_needed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }
                    >
                      {section.status === 'rework_needed' ? 'Needs Rework' : 'Pending Review'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    size="sm" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReview(section);
                    }}
                  >
                    Review Section
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Sections */}
      {approvedSections.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Approved Sections
          </h4>
          <div className="space-y-2">
            {approvedSections.map((section) => (
              <Card 
                key={section.id}
                className="border-2 border-green-200 bg-green-50/30"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-slate-900 capitalize">
                        {section.section_name?.replace(/_/g, ' ')}
                      </span>
                      {section.word_count && (
                        <span className="text-xs text-slate-600">{section.word_count} words</span>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Approved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 font-medium">No sections generated yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Sections will appear here after AI generates content
          </p>
        </div>
      )}

      {sections.length > 0 && sectionsNeedingReview.length === 0 && (
        <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
          <p className="text-green-900 font-medium">All sections reviewed!</p>
          <p className="text-sm text-green-700 mt-1">
            No sections pending review at this time
          </p>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedSection && (
        <SectionReviewModal
          isOpen={showReviewModal}
          onClose={handleCloseReview}
          section={selectedSection}
          proposal={proposal}
          organization={organization}
          currentUser={user}
        />
      )}
    </div>
  );
}