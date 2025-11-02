
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
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  useEffect(() => {
    const loadProposalData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const proposalId = urlParams.get('proposal');
        const superadmin = urlParams.get('superadmin');

        // Super Admin bypass mode
        if (superadmin === 'true') {
          // First check if authenticated without throwing
          const isAuth = await base44.auth.isAuthenticated();
          
          if (!isAuth) {
            setError("Please log in as a super admin to preview this page.");
            setLoading(false);
            return;
          }

          try {
            const currentUser = await base44.auth.me();
            
            if (!currentUser || currentUser.role !== 'admin' || currentUser.admin_role !== 'super_admin') {
              setError("Super admin access denied. You must be a super admin to use this mode.");
              setLoading(false);
              return;
            }

            setIsSuperAdminMode(true);

            // Get first available client and proposal
            const allClients = await base44.entities.Client.list('-created_date', 1);
            if (allClients.length === 0) {
              setError("No clients in system. Create a client first to preview this page.");
              setLoading(false);
              return;
            }

            const clientData = allClients[0];
            const allProposals = await base44.entities.Proposal.list('-created_date', 1);
            
            if (allProposals.length === 0) {
              setError("No proposals in system. Create a proposal first to preview this page.");
              setLoading(false);
              return;
            }

            const proposalData = allProposals[0];

            const memberData = {
              id: 'super-admin',
              member_name: currentUser.full_name,
              member_email: currentUser.email,
              team_role: 'owner',
              permissions: {
                can_approve: true,
                can_comment: true,
                can_upload_files: true,
                can_invite_others: true,
                can_see_internal_comments: true
              }
            };

            // Get sections
            const proposalSections = await base44.entities.ProposalSection.filter({ 
              proposal_id: proposalData.id 
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
            return;
          } catch (authError) {
            console.error("Error in super admin mode:", authError);
            setError("Error accessing super admin preview. Please ensure you're logged in as a super admin.");
            setLoading(false);
            return;
          }
        }

        // Normal token-based authentication
        if (!token || !proposalId) {
          setError("Missing required parameters");
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
            id: 'primary',
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
          setError("Invalid access token");
          setLoading(false);
          return;
        }

        // Get proposal
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length === 0) {
          setError("Proposal not found");
          setLoading(false);
          return;
        }

        const proposalData = proposals[0];

        // Verify access
        if (!proposalData.shared_with_client_ids?.includes(clientData.id) || !proposalData.client_view_enabled) {
          setError("You don't have access to this proposal");
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
        setError("Failed to load proposal");
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
            {!isSuperAdminMode && (
              <Link to={createPageUrl('ClientPortal') + `?token=${new URLSearchParams(window.location.search).get('token')}`}>
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
      {/* Super Admin Mode Banner */}
      {isSuperAdminMode && proposal && client && (
        <div className="bg-purple-600 text-white px-4 py-2 text-center text-sm font-semibold">
          🔐 SUPER ADMIN MODE - Viewing: {proposal.proposal_name} for {client.client_name}
        </div>
      )}

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
              <Link to={createPageUrl('ClientPortal') + `?token=${new URLSearchParams(window.location.search).get('token')}`}>
                <Button variant="ghost" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
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
      {client && proposal && <FloatingFeedbackButton clientId={client.id} proposalId={proposal.id} />}
    </div>
  );
}
