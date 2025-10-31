import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User,
  FileText,
  MessageSquare,
  Clock,
  TrendingUp,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Zap,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientContextSidebar({ 
  clientId, 
  organization,
  isOpen,
  onToggle,
  className 
}) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Query client data
  const { data: client } = useQuery({
    queryKey: ['client-context', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    select: (data) => data[0],
    enabled: !!clientId
  });

  // Query client proposals
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-proposals', clientId],
    queryFn: async () => {
      const allProposals = await base44.entities.Proposal.filter({ 
        organization_id: organization.id 
      });
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(clientId)
      );
    },
    initialData: [],
    enabled: !!clientId && !!organization
  });

  // Query engagement metrics
  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['client-engagement', clientId],
    queryFn: () => base44.entities.ClientEngagementMetric.filter({ 
      client_id: clientId 
    }, '-created_date', 100),
    initialData: [],
    enabled: !!clientId
  });

  // Query comments
  const { data: comments = [] } = useQuery({
    queryKey: ['client-comments', clientId],
    queryFn: async () => {
      const allComments = await base44.entities.ProposalComment.list('-created_date', 100);
      return allComments.filter(c => 
        proposals.some(p => p.id === c.proposal_id) &&
        c.is_from_client
      );
    },
    initialData: [],
    enabled: proposals.length > 0
  });

  // Query health score
  const { data: healthScore } = useQuery({
    queryKey: ['client-health-score', clientId],
    queryFn: async () => {
      const scores = await base44.entities.ClientHealthScore.filter({ 
        client_id: clientId 
      }, '-calculated_date', 1);
      return scores[0];
    },
    enabled: !!clientId
  });

  if (!isOpen || !client) return null;

  // Calculate stats
  const stats = {
    totalProposals: proposals.length,
    accepted: proposals.filter(p => p.status === 'client_accepted').length,
    rejected: proposals.filter(p => p.status === 'client_rejected').length,
    pending: proposals.filter(p => p.status === 'client_review').length,
    totalViews: engagementMetrics.filter(m => m.event_type === 'page_view').length,
    totalComments: comments.length,
    avgResponseTime: client.avg_response_time_hours || 0,
    lastActivity: client.last_engagement_date || client.last_portal_access,
    lifetimeValue: proposals
      .filter(p => p.status === 'client_accepted')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0)
  };

  // Recent activity
  const recentActivity = [
    ...engagementMetrics.slice(0, 5).map(m => ({
      type: m.event_type,
      date: m.created_date,
      description: `${m.event_type.replace('_', ' ')}`,
      proposal_id: m.proposal_id
    })),
    ...comments.slice(0, 3).map(c => ({
      type: 'comment',
      date: c.created_date,
      description: c.content.substring(0, 50) + '...',
      proposal_id: c.proposal_id
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const getHealthColor = (score) => {
    if (!score) return 'text-slate-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'page_view': return Eye;
      case 'comment': return MessageSquare;
      case 'document_download': return FileText;
      case 'annotation_created': return Edit;
      default: return Activity;
    }
  };

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 h-full bg-white border-l shadow-xl z-40 transition-all duration-300",
        isCollapsed ? "w-16" : "w-96",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-semibold">
                {client.contact_name?.[0]?.toUpperCase() || 'C'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate text-sm">
                {client.contact_name || client.client_name}
              </h3>
              <p className="text-xs text-slate-600 truncate">{client.client_organization}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={onToggle}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="p-4 space-y-4">
            {/* Health Score */}
            {healthScore && (
              <Card className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Health Score</span>
                    <TrendingUp className={cn("w-4 h-4", getHealthColor(healthScore.overall_score))} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-3xl font-bold", getHealthColor(healthScore.overall_score))}>
                      {healthScore.overall_score}
                    </span>
                    <span className="text-sm text-slate-500">/ 100</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full", 
                        healthScore.overall_score >= 80 ? 'bg-green-600' :
                        healthScore.overall_score >= 60 ? 'bg-blue-600' :
                        healthScore.overall_score >= 40 ? 'bg-amber-600' : 'bg-red-600'
                      )}
                      style={{ width: `${healthScore.overall_score}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-none shadow-sm">
                <CardContent className="p-3 text-center">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xl font-bold text-slate-900">{stats.totalProposals}</p>
                  <p className="text-xs text-slate-600">Proposals</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <p className="text-xl font-bold text-slate-900">
                    ${(stats.lifetimeValue / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-slate-600">Value</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-3 text-center">
                  <Eye className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-xl font-bold text-slate-900">{stats.totalViews}</p>
                  <p className="text-xs text-slate-600">Views</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-3 text-center">
                  <MessageSquare className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                  <p className="text-xl font-bold text-slate-900">{stats.totalComments}</p>
                  <p className="text-xs text-slate-600">Comments</p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:underline truncate">
                      {client.contact_email}
                    </a>
                  </div>
                )}
                {client.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${client.contact_phone}`} className="text-blue-600 hover:underline">
                      {client.contact_phone}
                    </a>
                  </div>
                )}
                {client.client_organization && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{client.client_organization}</span>
                  </div>
                )}
                {stats.lastActivity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      Last active {moment(stats.lastActivity).fromNow()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="proposals" className="space-y-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="proposals" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Proposals
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Insights
                </TabsTrigger>
              </TabsList>

              {/* Proposals Tab */}
              <TabsContent value="proposals" className="space-y-2">
                {proposals.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No proposals shared</p>
                ) : (
                  proposals.map(proposal => (
                    <Card 
                      key={proposal.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-slate-900 line-clamp-2">
                            {proposal.proposal_name}
                          </h4>
                          {proposal.status === 'client_accepted' && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                          )}
                          {proposal.status === 'client_rejected' && (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />
                          )}
                          {proposal.status === 'client_review' && (
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {proposal.status?.replace('_', ' ')}
                          </Badge>
                          {proposal.contract_value && (
                            <span className="text-xs text-slate-600">
                              ${(proposal.contract_value / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-2">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity, idx) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={idx} className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded">
                        <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 line-clamp-2">{activity.description}</p>
                          <p className="text-xs text-slate-500">
                            {moment(activity.date).fromNow()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-3">
                {healthScore && healthScore.recommended_actions && (
                  <>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 mb-2">Recommended Actions</h4>
                      <div className="space-y-2">
                        {healthScore.recommended_actions.slice(0, 3).map((action, idx) => (
                          <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                {idx + 1}
                              </div>
                              <p className="text-blue-900">{action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {healthScore.risk_factors && healthScore.risk_factors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 mb-2">Risk Factors</h4>
                        <div className="space-y-1">
                          {healthScore.risk_factors.map((risk, idx) => (
                            <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                              ⚠️ {risk}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {stats.avgResponseTime > 0 && (
                  <div className="p-3 bg-slate-50 rounded">
                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Avg Response Time</h4>
                    <p className="text-2xl font-bold text-slate-900">{stats.avgResponseTime}h</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(createPageUrl(`Clients`))}
              >
                <User className="w-4 h-4 mr-2" />
                View Full Profile
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open(`mailto:${client.contact_email}`, '_blank')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {client.contact_name?.[0]?.toUpperCase() || 'C'}
            </span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setIsCollapsed(false)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}