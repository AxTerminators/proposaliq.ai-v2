import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Clock,
  ThumbsUp,
  ThumbsDown,
  Download,
  Upload,
  Activity,
  BarChart3
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import moment from "moment";

export default function ClientEngagementAnalytics({ clientId, organizationId }) {
  const { data: client } = useQuery({
    queryKey: ['client-analytics', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: proposals } = useQuery({
    queryKey: ['client-proposals-analytics', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p => p.shared_with_client_ids?.includes(clientId));
    },
    initialData: [],
    enabled: !!clientId,
  });

  const { data: comments } = useQuery({
    queryKey: ['client-comments-analytics', clientId],
    queryFn: async () => {
      if (!clientId || proposals.length === 0) return [];
      const proposalIds = proposals.map(p => p.id);
      const allComments = await base44.entities.ProposalComment.list();
      return allComments.filter(c => 
        proposalIds.includes(c.proposal_id) && c.is_from_client === true
      );
    },
    initialData: [],
    enabled: !!clientId && proposals.length > 0,
  });

  const { data: clientFiles } = useQuery({
    queryKey: ['client-files-analytics', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.ClientUploadedFile.filter({ client_id: clientId });
    },
    initialData: [],
    enabled: !!clientId,
  });

  const { data: notifications } = useQuery({
    queryKey: ['client-notifications-analytics', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.ClientNotification.filter({ client_id: clientId });
    },
    initialData: [],
    enabled: !!clientId,
  });

  if (!client) {
    return <div>Loading analytics...</div>;
  }

  // Calculate engagement metrics
  const metrics = {
    totalProposals: proposals.length,
    proposalsViewed: proposals.filter(p => p.client_last_viewed).length,
    totalComments: comments.length,
    filesUploaded: clientFiles.length,
    acceptedProposals: proposals.filter(p => p.status === 'client_accepted').length,
    rejectedProposals: proposals.filter(p => p.status === 'client_rejected').length,
    pendingReview: proposals.filter(p => p.status === 'client_review').length,
    avgResponseTimeHours: client.avg_response_time_hours || 0,
    engagementScore: client.engagement_score || 0,
    notificationsRead: notifications.filter(n => n.is_read).length,
    notificationsTotal: notifications.length
  };

  // Response time trend (last 30 days)
  const responseTimeTrend = proposals
    .filter(p => p.client_last_viewed && p.created_date)
    .slice(-10)
    .map(p => {
      const created = new Date(p.created_date);
      const viewed = new Date(p.client_last_viewed);
      const hoursToView = (viewed - created) / (1000 * 60 * 60);
      return {
        name: p.proposal_name.substring(0, 15),
        hours: Math.round(hoursToView)
      };
    });

  // Activity over time (last 30 days)
  const activityData = [];
  for (let i = 29; i >= 0; i--) {
    const date = moment().subtract(i, 'days');
    const dateStr = date.format('MMM DD');
    
    const dayComments = comments.filter(c => 
      moment(c.created_date).isSame(date, 'day')
    ).length;
    
    const dayFiles = clientFiles.filter(f => 
      moment(f.created_date).isSame(date, 'day')
    ).length;
    
    const dayViews = proposals.filter(p => 
      p.client_last_viewed && moment(p.client_last_viewed).isSame(date, 'day')
    ).length;

    if (dayComments > 0 || dayFiles > 0 || dayViews > 0) {
      activityData.push({
        date: dateStr,
        comments: dayComments,
        files: dayFiles,
        views: dayViews
      });
    }
  }

  // Comment types breakdown
  const commentTypeData = [
    { name: 'Questions', value: comments.filter(c => c.comment_type === 'question').length, color: '#3b82f6' },
    { name: 'Suggestions', value: comments.filter(c => c.comment_type === 'suggestion').length, color: '#8b5cf6' },
    { name: 'Issues', value: comments.filter(c => c.comment_type === 'issue').length, color: '#ef4444' },
    { name: 'General', value: comments.filter(c => c.comment_type === 'general').length, color: '#64748b' },
    { name: 'Approval', value: comments.filter(c => c.comment_type === 'approval').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Proposal status breakdown
  const statusData = [
    { name: 'Accepted', value: metrics.acceptedProposals, color: '#10b981' },
    { name: 'Rejected', value: metrics.rejectedProposals, color: '#ef4444' },
    { name: 'Pending Review', value: metrics.pendingReview, color: '#f59e0b' },
    { name: 'Other', value: proposals.length - metrics.acceptedProposals - metrics.rejectedProposals - metrics.pendingReview, color: '#64748b' }
  ].filter(d => d.value > 0);

  const engagementLevel = metrics.engagementScore >= 70 ? 'high' : 
                          metrics.engagementScore >= 40 ? 'medium' : 'low';

  return (
    <div className="space-y-6">
      {/* Overall Engagement Score */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Client Engagement Overview
          </CardTitle>
          <CardDescription>
            {client.contact_name || client.client_name} • {client.client_organization}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-4xl font-bold text-blue-600">{metrics.engagementScore}%</p>
              <p className="text-sm text-slate-600 mt-1">Overall Engagement Score</p>
            </div>
            <Badge className={`text-lg px-4 py-2 ${
              engagementLevel === 'high' ? 'bg-green-100 text-green-700' :
              engagementLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {engagementLevel.toUpperCase()} ENGAGEMENT
            </Badge>
          </div>
          
          {client.last_engagement_date && (
            <p className="text-sm text-slate-600">
              Last active: {moment(client.last_engagement_date).fromNow()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Eye className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.proposalsViewed}</p>
                <p className="text-xs text-slate-600">Proposals Viewed</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  of {metrics.totalProposals} shared
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.totalComments}</p>
                <p className="text-xs text-slate-600">Comments</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Feedback given
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Upload className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.filesUploaded}</p>
                <p className="text-xs text-slate-600">Files Uploaded</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Documents shared
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.avgResponseTimeHours}</p>
                <p className="text-xs text-slate-600">Avg Hours</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Response time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        {activityData.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="views" name="Views" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="comments" name="Comments" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="files" name="Files" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Response Time Trend */}
        {responseTimeTrend.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Response Time Trend</CardTitle>
              <CardDescription>Hours to view proposals after sharing</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={responseTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pie Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Comment Types */}
        {commentTypeData.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Feedback Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={commentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Proposal Status */}
        {statusData.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Proposal Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decision Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6 text-center">
            <ThumbsUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-green-600">{metrics.acceptedProposals}</p>
            <p className="text-sm text-slate-600 mt-1">Proposals Accepted</p>
            {metrics.totalProposals > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {Math.round((metrics.acceptedProposals / metrics.totalProposals) * 100)}% acceptance rate
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6 text-center">
            <ThumbsDown className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-red-600">{metrics.rejectedProposals}</p>
            <p className="text-sm text-slate-600 mt-1">Proposals Rejected</p>
            {metrics.totalProposals > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {Math.round((metrics.rejectedProposals / metrics.totalProposals) * 100)}% rejection rate
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-amber-600">{metrics.pendingReview}</p>
            <p className="text-sm text-slate-600 mt-1">Pending Review</p>
            {metrics.totalProposals > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Awaiting client feedback
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Engagement */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Notification Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.notificationsTotal > 0 
                  ? Math.round((metrics.notificationsRead / metrics.notificationsTotal) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 mt-1">Read Rate</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">
                {metrics.notificationsRead} of {metrics.notificationsTotal} notifications read
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}