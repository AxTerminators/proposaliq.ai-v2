import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Eye,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Shield
} from "lucide-react";
import moment from "moment";

export default function ClientPortal() {
  const [clientToken, setClientToken] = useState(null);
  const [client, setClient] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadClientData = async () => {
      try {
        // Get client token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          setError("Invalid access link. Please use the link provided by your consultant.");
          setLoading(false);
          return;
        }

        setClientToken(token);

        // Find client by token
        const clients = await base44.entities.Client.filter({ access_token: token });
        
        if (clients.length === 0) {
          setError("Invalid or expired access link. Please contact your consultant for a new link.");
          setLoading(false);
          return;
        }

        const clientData = clients[0];
        
        // Check if token is expired
        if (clientData.token_expires_at) {
          const expiresAt = new Date(clientData.token_expires_at);
          if (expiresAt < new Date()) {
            setError("This access link has expired. Please contact your consultant for a new link.");
            setLoading(false);
            return;
          }
        }

        setClient(clientData);

        // Update last access time
        await base44.entities.Client.update(clientData.id, {
          last_portal_access: new Date().toISOString()
        });

        // Load organization (consultant company)
        const orgs = await base44.entities.Organization.filter({ id: clientData.organization_id });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading client data:", error);
        setError("An error occurred. Please try again or contact your consultant.");
        setLoading(false);
      }
    };

    loadClientData();
  }, []);

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['client-proposals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const allProposals = await base44.entities.Proposal.list('-updated_date');
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id) && p.client_view_enabled
      );
    },
    initialData: [],
    enabled: !!client?.id,
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-slate-100 text-slate-700",
      in_progress: "bg-blue-100 text-blue-700",
      client_review: "bg-purple-100 text-purple-700",
      submitted: "bg-indigo-100 text-indigo-700",
      client_accepted: "bg-green-100 text-green-700",
      client_rejected: "bg-red-100 text-red-700",
      won: "bg-green-100 text-green-700",
      lost: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: "In Draft",
      in_progress: "In Progress",
      client_review: "Awaiting Your Review",
      submitted: "Submitted",
      client_accepted: "You Accepted",
      client_rejected: "You Rejected",
      won: "Awarded",
      lost: "Not Awarded"
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'client_accepted':
      case 'won':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'client_rejected':
      case 'lost':
        return <XCircle className="w-4 h-4" />;
      case 'client_review':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-32 w-full mb-6" />
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <p className="text-sm text-slate-500">
              Need help? Contact your consultant for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: proposals.length,
    needingReview: proposals.filter(p => p.status === 'client_review').length,
    accepted: proposals.filter(p => p.status === 'client_accepted').length,
    inProgress: proposals.filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status)).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  Welcome, {client?.contact_name || client?.client_name}
                </h1>
                <p className="text-blue-100 text-lg">
                  {client?.client_organization}
                </p>
                <p className="text-blue-200 text-sm mt-2">
                  Managed by {organization?.organization_name || 'Your Consultant'}
                </p>
              </div>
              {organization?.custom_branding?.logo_url && (
                <img 
                  src={organization.custom_branding.logo_url} 
                  alt="Company Logo" 
                  className="h-16 object-contain"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-600">Total Proposals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertCircle className="w-8 h-8 text-purple-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">{stats.needingReview}</p>
                  <p className="text-xs text-slate-600">Needs Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-8 h-8 text-amber-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                  <p className="text-xs text-slate-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                  <p className="text-xs text-slate-600">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Proposals List */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Your Proposals</CardTitle>
            <CardDescription>
              View and manage proposals shared with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proposalsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">No proposals yet</p>
                <p className="text-slate-500 text-sm mt-2">
                  Your consultant will share proposals with you here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    className="p-6 border-2 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => window.location.href = `/ClientProposalView?token=${clientToken}&proposal=${proposal.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                          {proposal.proposal_name}
                        </h3>
                        {proposal.project_title && (
                          <p className="text-slate-600 text-sm mb-2">{proposal.project_title}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getStatusColor(proposal.status)}>
                            {getStatusIcon(proposal.status)}
                            <span className="ml-1">{getStatusLabel(proposal.status)}</span>
                          </Badge>
                          {proposal.due_date && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Due: {moment(proposal.due_date).format('MMM D, YYYY')}
                            </Badge>
                          )}
                          {proposal.client_feedback_count > 0 && (
                            <Badge variant="secondary">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {proposal.client_feedback_count} Comments
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </div>

                    {proposal.client_last_viewed && (
                      <p className="text-xs text-slate-500">
                        Last viewed: {moment(proposal.client_last_viewed).fromNow()}
                      </p>
                    )}

                    {proposal.status === 'client_review' && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-900 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Your review is requested - Please provide feedback or accept/reject
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>© {new Date().getFullYear()} {organization?.organization_name}. All rights reserved.</p>
          <p className="mt-1">Powered by ProposalIQ.ai</p>
        </div>
      </div>
    </div>
  );
}