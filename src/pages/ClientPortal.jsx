
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Eye,
  Users,
  Calendar,
  CheckCircle2,
  MessageSquare,
  LogOut,
  Home
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import ClientNotificationCenter from "../components/collaboration/ClientNotificationCenter";
import ClientDashboard from "../components/client/ClientDashboard";
import ClientTeamManager from "../components/client/ClientTeamManager";
import MeetingScheduler from "../components/client/MeetingScheduler";
import FloatingFeedbackButton from "../components/client/FloatingFeedbackButton";
import ClientFeedbackDashboard from "../components/client/ClientFeedbackDashboard";
import { useQuery } from '@tanstack/react-query';
import DocumentLibrary from "../components/client/DocumentLibrary";
import ClientReportingDashboard from "../components/client/ClientReportingDashboard";
import ClientNotificationPreferences from "../components/client/ClientNotificationPreferences";

export default function ClientPortal() {
  const [client, setClient] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  useEffect(() => {
    const loadClientData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const superadmin = urlParams.get('superadmin');

      // Super Admin bypass mode
      if (superadmin === 'true') {
        try {
          const currentUser = await base44.auth.me();
          
          // Check if user has admin rights
          if (!currentUser || currentUser.role !== 'admin' || currentUser.admin_role !== 'super_admin') {
            setError("Super admin access denied. You must be a super admin to use this mode.");
            setLoading(false);
            return;
          }

          setIsSuperAdminMode(true);

          // Get first available client for preview
          const allClients = await base44.entities.Client.list('-created_date', 1);
          if (allClients.length === 0) {
            setError("No clients in system. Create a client first to preview this page.");
            setLoading(false);
            return;
          }

          const clientData = allClients[0];
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

          // Get organization
          const orgs = await base44.entities.Organization.filter({ id: clientData.organization_id });
          if (orgs.length > 0) {
            setOrganization(orgs[0]);
          }

          setClient(clientData);
          setCurrentMember(memberData);
          setLoading(false);
          return;
        } catch (authError) {
          console.error("Error in super admin mode:", authError);
          setError("Not authenticated. Please log in to your admin account first, then access this page again.");
          setLoading(false);
          return;
        }
      }

      // Normal token-based authentication
      try {
        if (!token) {
          setError("No access token provided");
          setLoading(false);
          return;
        }

        // Find client or team member by token
        const clients = await base44.entities.Client.filter({ access_token: token });
        const teamMembers = await base44.entities.ClientTeamMember.filter({ access_token: token });

        let clientData = null;
        let memberData = null;

        if (clients.length > 0) {
          // Primary client contact
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
          // Team member
          memberData = teamMembers[0];
          const clientRecords = await base44.entities.Client.filter({ id: memberData.client_id });
          if (clientRecords.length > 0) {
            clientData = clientRecords[0];
          }
        }

        if (!clientData) {
          setError("Invalid or expired access token");
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (clientData.token_expires_at && new Date(clientData.token_expires_at) < new Date()) {
          setError("Access token has expired. Please contact your consultant for a new link.");
          setLoading(false);
          return;
        }

        // Update last access
        await base44.entities.Client.update(clientData.id, {
          last_portal_access: new Date().toISOString()
        });

        // Get organization
        const orgs = await base44.entities.Organization.filter({ id: clientData.organization_id });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }

        setClient(clientData);
        setCurrentMember(memberData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading client data:", err);
        setError("Failed to load client portal. Please try again.");
        setLoading(false);
      }
    };

    loadClientData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <p className="text-sm text-slate-500">
              Please contact your consultant if you continue to have issues accessing the portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Apply custom branding if set
  const branding = client.custom_branding || {};
  const primaryColor = branding.primary_color || "#2563eb";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Super Admin Mode Banner */}
      {isSuperAdminMode && client && (
        <div className="bg-purple-600 text-white px-4 py-2 text-center text-sm font-semibold">
          🔐 SUPER ADMIN MODE - Viewing as: {client.client_name}
        </div>
      )}

      {/* Custom CSS if provided */}
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
              {branding.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="h-10 object-contain bg-white/10 backdrop-blur rounded px-2"
                />
              )}
              <div className="text-white">
                <h1 className="text-xl font-bold">
                  {branding.company_name || client.client_organization || 'Client Portal'}
                </h1>
                <p className="text-sm opacity-90">Welcome, {currentMember.member_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ClientNotificationCenter client={client} />
              <Badge className="bg-white/20 text-white backdrop-blur">
                {currentMember.team_role === 'owner' ? 'Owner' :
                 currentMember.team_role === 'approver' ? 'Approver' :
                 currentMember.team_role === 'reviewer' ? 'Reviewer' : 'Observer'}
              </Badge>
            </div>
          </div>

          {branding.welcome_message && (
            <div className="mt-3 p-3 bg-white/20 backdrop-blur rounded text-sm text-white">
              {branding.welcome_message}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="proposals">
              <FileText className="w-4 h-4 mr-2" />
              Proposals
            </TabsTrigger>
            {(currentMember.team_role === 'owner' || currentMember.permissions?.can_invite_others) && (
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
            )}
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <Calendar className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="reports">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              My Reports
            </TabsTrigger>
            <TabsTrigger value="settings">
              <MessageSquare className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              My Feedback
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <ClientDashboard client={client} currentMember={currentMember} />
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            <ProposalsView client={client} currentMember={currentMember} />
          </TabsContent>

          {/* Team Tab */}
          {(currentMember.team_role === 'owner' || currentMember.permissions?.can_invite_others) && (
            <TabsContent value="team">
              <ClientTeamManager client={client} />
            </TabsContent>
          )}

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentLibrary client={client} organization={organization} />
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings">
            <MeetingScheduler
              proposal={null}
              client={client}
              organization={organization}
              currentMember={currentMember}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ClientReportingDashboard client={client} currentMember={currentMember} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <ClientNotificationPreferences client={client} />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <ClientFeedbackDashboard client={client} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton clientId={client.id} />
    </div>
  );
}

// Proposals View Component
function ProposalsView({ client, currentMember }) {
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['client-proposals', client.id],
    queryFn: async () => {
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p =>
        p.shared_with_client_ids?.includes(client.id) && p.client_view_enabled
      );
    },
    initialData: []
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading proposals...</div>;
  }

  if (proposals.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-900 mb-2">No Proposals Yet</p>
          <p className="text-slate-600">Your consultant hasn't shared any proposals with you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const statusColors = {
          client_review: "bg-amber-100 text-amber-700",
          client_accepted: "bg-green-100 text-green-700",
          client_rejected: "bg-red-100 text-red-700",
          in_progress: "bg-blue-100 text-blue-700"
        };

        return (
          <Card key={proposal.id} className="border-none shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">{proposal.proposal_name}</h3>
                    <Badge className={statusColors[proposal.status] || "bg-slate-100 text-slate-700"}>
                      {proposal.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {proposal.project_title && (
                    <p className="text-slate-600 mb-2">{proposal.project_title}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {proposal.agency_name && (
                      <span>Agency: {proposal.agency_name}</span>
                    )}
                    {proposal.due_date && (
                      <span>Due: {moment(proposal.due_date).format('MMM D, YYYY')}</span>
                    )}
                    {proposal.client_feedback_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {proposal.client_feedback_count} comment{proposal.client_feedback_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {proposal.client_last_viewed && (
                    <p className="text-xs text-slate-500 mt-2">
                      Last viewed: {moment(proposal.client_last_viewed).fromNow()}
                    </p>
                  )}
                </div>

                <Link to={`${createPageUrl('ClientProposalView')}?token=${client.access_token}&proposal=${proposal.id}`}>
                  <Button>
                    <Eye className="w-4 h-4 mr-2" />
                    View Proposal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
