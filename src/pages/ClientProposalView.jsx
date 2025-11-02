
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  FileText,
  MessageSquare,
  CheckCircle2,
  Users,
  History,
  Calendar,
  Highlighter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import ProposalStatusTimeline from "../components/collaboration/ProposalStatusTimeline";
import ClientActionItems from "../components/collaboration/ClientActionItems";
import ApprovalWorkflowClient from "../components/client/ApprovalWorkflowClient";
import ProposalAnnotations from "../components/client/ProposalAnnotations";
import VersionTimeline from "../components/client/VersionTimeline";
import MeetingScheduler from "../components/client/MeetingScheduler";
import FloatingFeedbackButton from "../components/client/FloatingFeedbackButton";

export default function ClientProposalView() {
  const [proposal, setProposal] = useState(null);
  const [client, setClient] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("content");
  const [adminPreviewMode, setAdminPreviewMode] = useState(false);

  useEffect(() => {
    const loadProposalData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const proposalId = urlParams.get('proposal');
        const isAdminPreview = urlParams.get('admin_preview') === 'true';

        // Check if user is super admin in preview mode
        if (isAdminPreview && !token) { // Only attempt admin preview if no token is provided
          try {
            const user = await base44.auth.me();
            const isAdmin = user && user.admin_role === 'super_admin';
            
            if (isAdmin) {
              setAdminPreviewMode(true);
              
              // Load sample data for preview
              // Try to get a recent client to base the preview on
              const allClients = await base44.entities.Client.list('-created_date', 1);
              if (allClients.length > 0) {
                const sampleClient = allClients[0];
                setClient(sampleClient);
                setCurrentMember({
                  id: 'admin-preview',
                  member_name: 'Admin Preview',
                  member_email: user.email,
                  team_role: 'owner',
                  permissions: {
                    can_approve: true,
                    can_comment: true,
                    can_upload_files: true,
                    can_invite_others: true,
                    can_see_internal_comments: true
                  }
                });
                
                // Get a sample proposal from this client's organization
                const proposals = await base44.entities.Proposal.filter({
                  organization_id: sampleClient.organization_id
                }, '-created_date', 1);
                
                if (proposals.length > 0) {
                  const sampleProposal = proposals[0];
                  setProposal(sampleProposal);
                  
                  // Get sections for the sample proposal
                  const proposalSections = await base44.entities.ProposalSection.filter({ 
                    proposal_id: sampleProposal.id 
                  }, 'order');
                  setSections(proposalSections);
                  
                  // Get organization
                  const orgs = await base44.entities.Organization.filter({ id: sampleProposal.organization_id });
                  if (orgs.length > 0) {
                    setOrganization(orgs[0]);
                  }
                } else {
                  setError("No proposals found in the latest client's organization to preview. Please create a proposal.");
                }
              } else {
                setError("No clients found to preview. Please create a client and proposal.");
              }
              
              setLoading(false);
              return; // Exit the function as admin preview mode is handled
            }
          } catch (authError) {
            console.log("User not authenticated or not a super admin for preview, falling back to client access:", authError);
            // If authentication fails or not an admin, continue to normal token-based check
          }
        }

        // --- Normal client access logic starts here ---
        if (!token || !proposalId) {
          setError("Missing required parameters or invalid access link.");
          setLoading(false);
          return;
        }

        // Find client or team member by token
        const clients = await base44.entities.Client.filter({ access_token: token });
        const teamMembers = await base44.entities.ClientTeamMember.filter({ access_token: token });

        let clientData = null;
        let memberData = null;

        if (clients.length > 0) {
          clientData = clients[0];
          memberData = {
            id: 'primary', // Primary client is represented with a generic ID
            member_name: clientData.contact_name,
            member_email: clientData.contact_email,
            team_role: 'owner',
            permissions: {
              can_approve: true,
              can_comment: true,
              can_upload_files: true,
              can_invite_others: true,
              can_see_internal_comments: true
            }
          };
        } else if (teamMembers.length > 0) {
          memberData = teamMembers[0];
          const clientRecords = await base44.entities.Client.filter({ id: memberData.client_id });
          if (clientRecords.length > 0) {
            clientData = clientRecords[0];
          }
        }

        if (!clientData) {
          setError("Invalid or expired access token.");
          setLoading(false);
          return;
        }

        // Get proposal
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length === 0) {
          setError("Proposal not found.");
          setLoading(false);
          return;
        }

        const proposalData = proposals[0];

        // Verify access for normal client view
        if (!proposalData.shared_with_client_ids?.includes(clientData.id) || !proposalData.client_view_enabled) {
          setError("You don't have access to this proposal, or it's not enabled for client view.");
          setLoading(false);
          return;
        }

        // Update last viewed
        await base44.entities.Proposal.update(proposalId, {
          client_last_viewed: new Date().toISOString()
        });

        // Get sections
        const proposalSections = await base44.entities.ProposalSection.filter({ 
          proposal_id: proposalId 
        }, 'order');

        // Get organization
        const orgs = await base44.entities.Organization.filter({ id: proposalData.organization_id });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }

        setProposal(proposalData);
        setClient(clientData);
        setCurrentMember(memberData);
        setSections(proposalSections);
        setLoading(false);
      } catch (err) {
        console.error("Error loading proposal:", err);
        setError("Failed to load proposal. Please try again later.");
        setLoading(false);
      }
    };

    loadProposalData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            {!adminPreviewMode && (
              <Link to={createPageUrl('ClientPortal') + `?token=${new URLSearchParams(window.location.search).get('token') || ''}`}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle cases where client, proposal, or currentMember might still be null after loading (e.g. specific preview errors)
  if (!client || !proposal || !currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">Could not load all necessary data for the proposal view.</p>
            {!adminPreviewMode && (
              <Link to={createPageUrl('ClientPortal') + `?token=${new URLSearchParams(window.location.search).get('token') || ''}`}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const branding = client.custom_branding || {};
  const primaryColor = branding.primary_color || "#2563eb";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Custom CSS */}
      {branding.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: branding.custom_css }} />
      )}

      {/* Header */}
      <header 
        className="border-b bg-white shadow-sm"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!adminPreviewMode && (
                <Link to={createPageUrl('ClientPortal') + `?token=${new URLSearchParams(window.location.search).get('token')}`}>
                  <Button variant="ghost" className="text-white hover:bg-white/20">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Portal
                  </Button>
                </Link>
              )}
              {adminPreviewMode && (
                 <Button variant="ghost" className="text-white hover:bg-white/20">
                   <ArrowLeft className="w-4 h-4 mr-2" />
                   Admin Preview Mode
                 </Button>
              )}
              {branding.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Logo" 
                  className="h-8 object-contain bg-white/10 backdrop-blur rounded px-2"
                />
              )}
              <div className="text-white">
                <h1 className="text-lg font-bold">{proposal.proposal_name}</h1>
                <p className="text-sm opacity-90">{currentMember.member_name}</p>
              </div>
            </div>

            <Badge className="bg-white/20 text-white backdrop-blur">
              {currentMember.team_role}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Proposal Info */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Project Title</p>
                <p className="font-semibold text-slate-900">{proposal.project_title || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Agency</p>
                <p className="font-semibold text-slate-900">{proposal.agency_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Due Date</p>
                <p className="font-semibold text-slate-900">
                  {proposal.due_date ? moment(proposal.due_date).format('MMMM D, YYYY') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <ProposalStatusTimeline proposal={proposal} client={client} />

        {/* Action Items */}
        <ClientActionItems proposal={proposal} client={client} currentMember={currentMember} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="annotations">
              <Highlighter className="w-4 h-4 mr-2" />
              Annotations
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="versions">
              <History className="w-4 h-4 mr-2" />
              Version History
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <Calendar className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              {sections.length === 0 ? (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-600">No content available yet</p>
                  </CardContent>
                </Card>
              ) : (
                sections.map((section) => (
                  <Card key={section.id} className="border-none shadow-lg">
                    <CardHeader className="border-b">
                      <CardTitle>{section.section_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content || '<p>No content yet</p>' }}
                      />
                      <div className="mt-4 flex gap-4 text-sm text-slate-600">
                        <span>{section.word_count || 0} words</span>
                        <span>Last updated: {moment(section.updated_date).format('MMM D, YYYY')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Annotations Tab */}
          <TabsContent value="annotations">
            <ProposalAnnotations 
              proposal={proposal}
              sectionId={null}
              currentMember={currentMember}
              client={client}
            />
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <ApprovalWorkflowClient
              proposal={proposal}
              client={client}
              currentMember={currentMember}
            />
          </TabsContent>

          {/* Version History Tab */}
          <TabsContent value="versions">
            {sections.length > 0 ? (
              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.id}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{section.section_name}</h3>
                    <VersionTimeline sectionId={section.id} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <History className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600">No version history available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings">
            <MeetingScheduler
              proposal={proposal}
              client={client}
              organization={organization}
              currentMember={currentMember}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Feedback Button */}
      {client && proposal && !adminPreviewMode && <FloatingFeedbackButton clientId={client.id} proposalId={proposal.id} />}
    </div>
  );
}
