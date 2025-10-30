import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Users,
  Building2,
  Calendar,
  MessageSquare
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";
import { createPageUrl } from "@/utils";

export default function GlobalProposalManagementModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClientView, setFilterClientView] = useState("all");

  const { data: proposals } = useQuery({
    queryKey: ['admin-all-proposals'],
    queryFn: () => base44.entities.Proposal.list('-updated_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-proposal-orgs'],
    queryFn: () => base44.entities.Organization.list(),
    initialData: []
  });

  const { data: clients } = useQuery({
    queryKey: ['admin-proposal-clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  const getOrganization = (orgId) => {
    return organizations.find(o => o.id === orgId);
  };

  const getSharedClients = (proposal) => {
    if (!proposal.shared_with_client_ids || proposal.shared_with_client_ids.length === 0) return [];
    return clients.filter(c => proposal.shared_with_client_ids.includes(c.id));
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = 
      proposal.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || proposal.status === filterStatus;
    
    const matchesClientView = 
      filterClientView === "all" ||
      (filterClientView === "shared" && proposal.client_view_enabled) ||
      (filterClientView === "not_shared" && !proposal.client_view_enabled);
    
    return matchesSearch && matchesStatus && matchesClientView;
  });

  const getStatusColor = (status) => {
    const colors = {
      evaluating: "bg-slate-100 text-slate-700",
      watch_list: "bg-yellow-100 text-yellow-700",
      draft: "bg-blue-100 text-blue-700",
      in_progress: "bg-indigo-100 text-indigo-700",
      client_review: "bg-purple-100 text-purple-700",
      submitted: "bg-green-100 text-green-700",
      client_accepted: "bg-green-100 text-green-700",
      client_rejected: "bg-red-100 text-red-700",
      won: "bg-emerald-100 text-emerald-700",
      lost: "bg-red-100 text-red-700",
      archived: "bg-slate-100 text-slate-700"
    };
    return colors[status] || "bg-slate-100 text-slate-700";
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

  // Stats
  const totalProposals = proposals.length;
  const sharedWithClients = proposals.filter(p => p.client_view_enabled).length;
  const awaitingClientReview = proposals.filter(p => p.status === 'client_review').length;
  const clientAccepted = proposals.filter(p => p.status === 'client_accepted').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Global Proposal Management</h2>
        <p className="text-slate-600">View and manage all proposals across all organizations</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalProposals}</p>
            <p className="text-sm text-slate-600">Total Proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{sharedWithClients}</p>
            <p className="text-sm text-slate-600">Shared with Clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{awaitingClientReview}</p>
            <p className="text-sm text-slate-600">Awaiting Review</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{clientAccepted}</p>
            <p className="text-sm text-slate-600">Client Accepted</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search proposals by name, agency, or solicitation number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="evaluating">Evaluating</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="client_review">Client Review</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="client_accepted">Client Accepted</SelectItem>
                <SelectItem value="client_rejected">Client Rejected</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClientView} onValueChange={setFilterClientView}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Proposals</SelectItem>
                <SelectItem value="shared">Shared with Clients</SelectItem>
                <SelectItem value="not_shared">Not Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredProposals.map((proposal) => {
              const org = getOrganization(proposal.organization_id);
              const sharedClients = getSharedClients(proposal);

              return (
                <div key={proposal.id} className="p-4 border-2 rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {proposal.proposal_name}
                        </h3>
                        <Badge className={getStatusColor(proposal.status)}>
                          {getStatusIcon(proposal.status)}
                          <span className="ml-1 capitalize">{proposal.status.replace(/_/g, ' ')}</span>
                        </Badge>
                      </div>

                      {proposal.project_title && (
                        <p className="text-sm text-slate-600 mb-2">{proposal.project_title}</p>
                      )}

                      <div className="grid md:grid-cols-3 gap-2 text-sm mb-3">
                        {org && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            {org.organization_name}
                          </div>
                        )}
                        {proposal.agency_name && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            {proposal.agency_name}
                          </div>
                        )}
                        {proposal.due_date && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4" />
                            Due: {moment(proposal.due_date).format('MMM D, YYYY')}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {proposal.client_view_enabled ? (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Eye className="w-3 h-3 mr-1" />
                            Shared with Clients
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Shared</Badge>
                        )}
                        
                        {sharedClients.length > 0 && (
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {sharedClients.length} Client{sharedClients.length > 1 ? 's' : ''}
                          </Badge>
                        )}

                        {proposal.client_feedback_count > 0 && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {proposal.client_feedback_count} Comment{proposal.client_feedback_count > 1 ? 's' : ''}
                          </Badge>
                        )}

                        {proposal.solicitation_number && (
                          <Badge variant="outline">
                            #{proposal.solicitation_number}
                          </Badge>
                        )}

                        {proposal.contract_value && (
                          <Badge className="bg-green-100 text-green-700">
                            ${(proposal.contract_value / 1000000).toFixed(1)}M
                          </Badge>
                        )}
                      </div>

                      {sharedClients.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-medium">Shared with:</span>{' '}
                          {sharedClients.map(c => c.contact_name || c.client_name).join(', ')}
                        </div>
                      )}

                      {proposal.client_last_viewed && (
                        <p className="text-xs text-slate-500 mt-1">
                          Last viewed by client: {moment(proposal.client_last_viewed).fromNow()}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(createPageUrl('ProposalBuilder') + `?id=${proposal.id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredProposals.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No proposals found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}