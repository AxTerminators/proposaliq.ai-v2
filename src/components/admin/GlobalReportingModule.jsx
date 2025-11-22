import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users,
  FileText,
  DollarSign,
  Activity,
  Download,
  Eye,
  MessageSquare,
  CheckCircle2,
  Clock,
  BarChart3,
  Building2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function GlobalReportingModule() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: proposals } = useQuery({
    queryKey: ['report-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['report-organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const { data: clientNotifications } = useQuery({
    queryKey: ['report-notifications'],
    queryFn: () => base44.entities.ClientNotification.list('-created_date', 500),
    initialData: []
  });

  const { data: clientFiles } = useQuery({
    queryKey: ['report-files'],
    queryFn: () => base44.entities.ClientUploadedFile.list('-created_date', 500),
    initialData: []
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['report-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: []
  });

  // Calculate KPIs
  const totalClients = 0; // Legacy Client entity no longer in use
  const activeClients = 0;
  const totalProposals = proposals.length;
  const sharedProposals = proposals.filter(p => p.client_view_enabled).length;
  const totalOrganizations = organizations.length;
  
  // Client Engagement Metrics
  const avgEngagement = 0;
  const portalUsers = 0;
  const portalUsageRate = 0;
  
  // Notification Metrics
  const totalNotifications = clientNotifications.length;
  const readNotifications = clientNotifications.filter(n => n.is_read).length;
  const notificationReadRate = (totalNotifications > 0 ? (readNotifications / totalNotifications) : 0) * 100;
  
  // File Upload Metrics
  const totalFilesUploaded = clientFiles.length;
  const filesReviewed = clientFiles.filter(f => f.viewed_by_consultant).length;
  
  // Proposal Metrics
  const clientReviewProposals = proposals.filter(p => p.status === 'client_review').length;
  const clientAcceptedProposals = proposals.filter(p => p.status === 'client_accepted').length;
  const clientRejectedProposals = proposals.filter(p => p.status === 'client_rejected').length;
  const clientAcceptanceRate = sharedProposals > 0 ? (clientAcceptedProposals / sharedProposals) * 100 : 0;
  
  // Response Time Analytics
  const clientsWithResponseTime = [];
  const avgResponseTime = 0;
  
  // Revenue Metrics
  const totalMRR = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);
  const avgRevenuePerOrg = totalOrganizations > 0 ? (totalMRR / totalOrganizations) : 0;
  
  // Engagement by Organization Type
  const consultancies = organizations.filter(o => o.organization_type === 'consultancy').length;
  const corporates = organizations.filter(o => o.organization_type === 'corporate').length;
  const clientOrgs = organizations.filter(o => o.organization_type === 'client_organization').length;
  
  // Recent Activity
  const recentClientActivity = [];
  
  // Notification Types Breakdown
  const notificationsByType = clientNotifications.reduce((acc, notif) => {
    acc[notif.notification_type] = (acc[notif.notification_type] || 0) + 1;
    return acc;
  }, {});

  const exportReport = () => {
    alert("Exporting comprehensive platform report...");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Global Platform Reports</h2>
          <p className="text-slate-600">Comprehensive analytics across all features and organizations</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalOrganizations}</p>
            <p className="text-sm text-slate-600">Total Organizations</p>
            <p className="text-xs text-slate-500 mt-1">
              {consultancies} Consultancies • {corporates} Corporate • {clientOrgs} Clients
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{totalClients}</p>
            <p className="text-sm text-slate-600">Total Clients</p>
            <p className="text-xs text-slate-500 mt-1">{activeClients} Active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-indigo-600">{totalProposals}</p>
            <p className="text-sm text-slate-600">Total Proposals</p>
            <p className="text-xs text-slate-500 mt-1">{sharedProposals} Shared with Clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">${totalMRR.toLocaleString()}</p>
            <p className="text-sm text-slate-600">Monthly Revenue</p>
            <p className="text-xs text-slate-500 mt-1">${avgRevenuePerOrg.toFixed(0)} avg per org</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Engagement Analytics */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Client Engagement Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive client portal usage and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">{avgEngagement.toFixed(1)}%</p>
              <p className="text-sm text-slate-700 font-medium">Avg Engagement Score</p>
              <p className="text-xs text-slate-600 mt-1">
                {portalUsers} of {totalClients} clients have accessed portal
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{avgResponseTime.toFixed(1)}h</p>
              <p className="text-sm text-slate-700 font-medium">Avg Response Time</p>
              <p className="text-xs text-slate-600 mt-1">
                Across {clientsWithResponseTime.length} clients
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">{clientAcceptanceRate.toFixed(1)}%</p>
              <p className="text-sm text-slate-700 font-medium">Acceptance Rate</p>
              <p className="text-xs text-slate-600 mt-1">
                {clientAcceptedProposals} accepted, {clientRejectedProposals} rejected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Analytics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Notification Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Total Sent</p>
                <p className="text-2xl font-bold">{totalNotifications}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Read Rate</p>
                <p className="text-2xl font-bold text-green-600">{notificationReadRate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">By Type:</p>
              {Object.entries(notificationsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 capitalize">{type.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              File Upload Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Files Uploaded</p>
                <p className="text-2xl font-bold">{totalFilesUploaded}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Reviewed</p>
                <p className="text-2xl font-bold text-blue-600">{filesReviewed}</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Review Rate</p>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${totalFilesUploaded > 0 ? (filesReviewed / totalFilesUploaded) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {totalFilesUploaded > 0 ? ((filesReviewed / totalFilesUploaded) * 100).toFixed(1) : 0}% of uploaded files reviewed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Status Analytics */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Proposal Pipeline Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{sharedProposals}</p>
              <p className="text-sm text-slate-600">Shared</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-700">{clientReviewProposals}</p>
              <p className="text-sm text-slate-600">In Review</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{clientAcceptedProposals}</p>
              <p className="text-sm text-slate-600">Accepted</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{clientRejectedProposals}</p>
              <p className="text-sm text-slate-600">Rejected</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">
                {proposals.filter(p => p.client_feedback_count > 0).length}
              </p>
              <p className="text-sm text-slate-600">With Feedback</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Client Activity */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Recent Client Activity</CardTitle>
          <CardDescription>Latest engagement from clients across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentClientActivity.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{client.contact_name || client.client_name}</p>
                  <p className="text-sm text-slate-600">{client.client_organization}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {client.engagement_score || 0}% Engaged
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    {moment(client.last_engagement_date).fromNow()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}