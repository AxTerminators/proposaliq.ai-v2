import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  MessageSquare,
  Calendar,
  Building2,
  DollarSign,
  User,
  Highlighter,
  StickyNote
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import moment from "moment";
import ClientAnnotationTool from "./ClientAnnotationTool";

/**
 * Client Proposal Viewer
 * Read-only view of proposal with annotation capabilities
 */
export default function ClientProposalViewer({ proposal, clientOrg, accessToken }) {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Fetch proposal sections
  const { data: sections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['proposal-sections-client', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalSection.filter(
        { proposal_id: proposal.id },
        'order'
      );
    },
    enabled: !!proposal?.id,
  });

  // Fetch annotations for this client
  const { data: annotations = [] } = useQuery({
    queryKey: ['client-annotations', proposal?.id, clientOrg?.id],
    queryFn: async () => {
      if (!proposal?.id || !clientOrg?.id) return [];
      return base44.entities.ProposalAnnotation.filter({
        proposal_id: proposal.id,
        client_id: clientOrg.id
      }, '-created_date');
    },
    enabled: !!proposal?.id && !!clientOrg?.id,
  });

  // Track view
  useEffect(() => {
    if (proposal?.id && clientOrg?.id) {
      const trackView = async () => {
        try {
          await base44.entities.Proposal.update(proposal.id, {
            client_last_viewed: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error tracking view:', error);
        }
      };
      trackView();
    }
  }, [proposal?.id, clientOrg?.id]);

  return (
    <div className="space-y-6">
      {/* Proposal Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">
                {proposal.proposal_name}
              </CardTitle>
              {proposal.project_title && (
                <p className="text-lg text-slate-600 mb-3">
                  {proposal.project_title}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn(
                  proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                  proposal.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {proposal.status.replace('_', ' ')}
                </Badge>
                {proposal.solicitation_number && (
                  <Badge variant="outline">
                    {proposal.solicitation_number}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                <Highlighter className="w-4 h-4 mr-2" />
                {showAnnotations ? 'Hide' : 'Show'} Annotations
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {proposal.agency_name && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Agency</p>
                <p className="font-medium text-slate-900">{proposal.agency_name}</p>
              </div>
            )}
            {proposal.due_date && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Due Date</p>
                <p className="font-medium text-slate-900">
                  {moment(proposal.due_date).format('MMM D, YYYY')}
                </p>
              </div>
            )}
            {proposal.contract_value && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Contract Value</p>
                <p className="font-medium text-slate-900">
                  ${(proposal.contract_value / 1000000).toFixed(2)}M
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500 mb-1">Your Annotations</p>
              <p className="font-medium text-slate-900">
                {annotations.length} comment{annotations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Content */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Proposal Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSections ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600">Loading proposal...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No content available yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div key={section.id} className="border-b pb-6 last:border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1">
                        {idx + 1}. {section.section_name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {section.section_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <StickyNote className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>

                  <div className="prose prose-slate max-w-none relative">
                    <ReactMarkdown>{section.content || '*No content yet*'}</ReactMarkdown>

                    {/* Show annotations for this section */}
                    {showAnnotations && (
                      <ClientAnnotationTool
                        proposal={proposal}
                        section={section}
                        clientOrg={clientOrg}
                        annotations={annotations.filter(a => a.section_id === section.id)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}