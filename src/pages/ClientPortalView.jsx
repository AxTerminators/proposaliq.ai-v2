import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  AlertCircle,
  MessageSquare,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import ClientProposalViewer from "../components/client-portal/ClientProposalViewer";
import ClientFeedbackForm from "../components/client-portal/ClientFeedbackForm";
import ClientDocumentLibrary from "../components/client-portal/ClientDocumentLibrary";

/**
 * Client Portal View (Token-Based Access)
 * External clients can view shared proposals without logging in
 * Access via secure token in URL
 */
export default function ClientPortalView() {
  const [accessToken, setAccessToken] = useState(null);
  const [clientOrg, setClientOrg] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setError('No access token provided');
      return;
    }

    setAccessToken(token);
  }, []);

  // Validate token and fetch client org
  const { data: validationResult, isLoading: isValidating } = useQuery({
    queryKey: ['validate-client-token', accessToken],
    queryFn: async () => {
      if (!accessToken) return null;

      const response = await base44.functions.invoke('validateClientPortalToken', {
        token: accessToken
      });

      if (!response.data.success) {
        setError(response.data.error || 'Invalid or expired token');
        return null;
      }

      return response.data;
    },
    enabled: !!accessToken,
    retry: 1,
  });

  useEffect(() => {
    if (validationResult?.client_organization) {
      setClientOrg(validationResult.client_organization);
    }
  }, [validationResult]);

  // Fetch shared proposals for this client
  const { data: sharedProposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ['client-shared-proposals', clientOrg?.id],
    queryFn: async () => {
      if (!clientOrg?.id) return [];
      
      return base44.entities.Proposal.filter({
        organization_id: clientOrg.id,
        client_view_enabled: true
      }, '-created_date');
    },
    enabled: !!clientOrg?.id,
  });

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <p className="text-sm text-slate-500">
              Please contact your consultant for a valid access link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isValidating || !clientOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying Access</h2>
            <p className="text-slate-600">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main portal view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header with Custom Branding */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {clientOrg.custom_branding?.logo_url ? (
                <img 
                  src={clientOrg.custom_branding.logo_url} 
                  alt="Logo" 
                  className="h-12 w-auto"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {clientOrg.organization_name}
                </h1>
                <p className="text-sm text-slate-600">Proposal Portal</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700">
              Client Access
            </Badge>
          </div>

          {/* Welcome Message */}
          {clientOrg.custom_branding?.welcome_message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                {clientOrg.custom_branding.welcome_message}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Detailed Proposal View */}
        {selectedProposal ? (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedProposal(null)}
            >
              ← Back to All Proposals
            </Button>

            <ClientProposalViewer
              proposal={selectedProposal}
              clientOrg={clientOrg}
              accessToken={accessToken}
            />

            <ClientFeedbackForm
              proposal={selectedProposal}
              clientOrg={clientOrg}
              accessToken={accessToken}
            />
          </div>
        ) : (
          <>
            {/* Proposals Overview */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                Your Proposals
              </h2>
              <p className="text-slate-600">
                Review proposals shared with you by your consultant
              </p>
            </div>

            {isLoadingProposals ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1,2].map(i => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : sharedProposals.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Proposals Shared Yet
                  </h3>
                  <p className="text-slate-600">
                    Your consultant will share proposals with you soon
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {sharedProposals.map(proposal => (
                  <Card 
                    key={proposal.id}
                    className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {proposal.proposal_name}
                          </CardTitle>
                          {proposal.project_title && (
                            <p className="text-sm text-slate-600">
                              {proposal.project_title}
                            </p>
                          )}
                        </div>
                        <Badge className={cn(
                          proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                          proposal.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                          proposal.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {proposal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {proposal.agency_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{proposal.agency_name}</span>
                        </div>
                      )}

                      {proposal.due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Due: {moment(proposal.due_date).format('MMM D, YYYY')}</span>
                        </div>
                      )}

                      {proposal.contract_value && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
                        </div>
                      )}

                      {proposal.client_last_viewed && (
                        <div className="text-xs text-slate-500 pt-2 border-t">
                          Last viewed: {moment(proposal.client_last_viewed).fromNow()}
                        </div>
                      )}

                      <div className="pt-3 border-t">
                        <Button
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group-hover:shadow-md transition-shadow"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Proposal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {sharedProposals.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                      <MessageSquare className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="font-semibold text-slate-900 text-sm">Provide Feedback</p>
                      <p className="text-xs text-slate-600">Share your thoughts</p>
                    </button>
                    <button className="p-4 rounded-lg border-2 border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all text-left">
                      <Download className="w-6 h-6 text-green-600 mb-2" />
                      <p className="font-semibold text-slate-900 text-sm">Download Files</p>
                      <p className="text-xs text-slate-600">Get all documents</p>
                    </button>
                    <button className="p-4 rounded-lg border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left">
                      <Calendar className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="font-semibold text-slate-900 text-sm">Schedule Meeting</p>
                      <p className="text-xs text-slate-600">Discuss with team</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-slate-600">
          <p>Secure Client Portal • Powered by ProposalIQ.ai</p>
        </div>
      </footer>
    </div>
  );
}