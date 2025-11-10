
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  FileText,
  TrendingUp,
  Clock,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  BarChart3,
  Activity
} from "lucide-react";
import moment from "moment";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ClientReportingDashboard({ client, currentMember }) {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch client's proposals
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-reporting-proposals', client.id],
    queryFn: async () => {
      try {
        const allProposals = await base44.entities.Proposal.list();
        return (allProposals || []).filter(p => 
          p?.shared_with_client_ids && Array.isArray(p.shared_with_client_ids) && 
          p.shared_with_client_ids.includes(client.id) && p.client_view_enabled
        );
      } catch (error) {
        console.error('Error fetching proposals:', error);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  // Fetch engagement metrics
  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['client-reporting-engagement', client.id, timeRange],
    queryFn: async () => {
      try {
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = moment().subtract(daysBack, 'days').toISOString();
        
        const allMetrics = await base44.entities.ClientEngagementMetric.filter({
          client_id: client.id
        }, '-created_date', 1000);
        
        return (allMetrics || []).filter(m => m && moment(m.created_date).isAfter(startDate));
      } catch (error) {
        console.error('Error fetching engagement metrics:', error);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  // Fetch meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ['client-reporting-meetings', client.id],
    queryFn: async () => {
      try {
        return await base44.entities.ClientMeeting.filter({
          client_id: client.id
        }, '-scheduled_date', 100);
      } catch (error) {
        console.error('Error fetching meetings:', error);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  // Fetch uploaded files
  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['client-reporting-files', client.id],
    queryFn: async () => {
      try {
        return await base44.entities.ClientUploadedFile.filter({
          client_id: client.id
        });
      } catch (error) {
        console.error('Error fetching files:', error);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalProposals = proposals.length;
    const inReview = proposals.filter(p => p.status === 'client_review').length;
    const accepted = proposals.filter(p => p.status === 'client_accepted').length;
    const totalValue = proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    const totalEngagementTime = engagementMetrics.reduce((sum, m) => 
      sum + (m.time_spent_seconds || 0), 0
    );
    
    const validProposalsForResponseTime = proposals.filter(p => p.client_last_viewed && p.updated_date);
    const avgResponseTime = validProposalsForResponseTime.length > 0
      ? validProposalsForResponseTime.reduce((sum, p) => {
        const responseTime = moment(p.client_last_viewed).diff(moment(p.updated_date), 'hours');
        return sum + responseTime;
      }, 0) / validProposalsForResponseTime.length
      : 0;

    return {
      totalProposals,
      inReview,
      accepted,
      acceptanceRate: totalProposals > 0 ? (accepted / totalProposals) * 100 : 0,
      totalValue,
      totalEngagementHours: totalEngagementTime / 3600,
      avgResponseTimeHours: avgResponseTime,
      totalMeetings: meetings.length,
      completedMeetings: meetings.filter(m => m.status === 'completed').length,
      totalFilesUploaded: uploadedFiles.length
    };
  }, [proposals, engagementMetrics, meetings, uploadedFiles]);

  // Proposal status breakdown
  const statusBreakdown = useMemo(() => {
    const statuses = {};
    proposals.forEach(p => {
      const status = p.status || 'unknown';
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    const data = Object.entries(statuses).map(([status, count]) => ({
      name: status.replace(/_/g, ' ').toUpperCase(),
      value: count,
      percentage: (count / proposals.length) * 100
    }));

    return data.filter(item => item.value > 0); // Filter out statuses with 0 count
  }, [proposals]);

  // Engagement over time
  const engagementTimeline = useMemo(() => {
    const dateGroups = {};
    
    engagementMetrics.forEach(metric => {
      const date = moment(metric.created_date).format('MMM D');
      if (!dateGroups[date]) {
        dateGroups[date] = { date, views: 0, interactions: 0, timeMinutes: 0 };
      }
      
      if (metric.event_type === 'page_view' || metric.event_type === 'section_view') {
        dateGroups[date].views += 1;
      }
      
      if (['annotation_created', 'comment_added', 'file_uploaded'].includes(metric.event_type)) {
        dateGroups[date].interactions += 1;
      }
      
      dateGroups[date].timeMinutes += (metric.time_spent_seconds || 0) / 60;
    });
    
    return Object.values(dateGroups).sort((a, b) => 
      moment(a.date, 'MMM D').diff(moment(b.date, 'MMM D'))
    );
  }, [engagementMetrics]);

  // Meeting timeline
  const meetingTimeline = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'completed');
    const scheduled = meetings.filter(m => m.status === 'scheduled');
    const cancelled = meetings.filter(m => m.status === 'cancelled');
    
    return [
      { name: 'Completed', value: completed.length },
      { name: 'Scheduled', value: scheduled.length },
      { name: 'Cancelled', value: cancelled.length }
    ].filter(item => item.value > 0);
  }, [meetings]);

  // Response time trends
  const responseTimeTrends = useMemo(() => {
    return proposals
      .filter(p => p.client_last_viewed && p.updated_date)
      .map(p => ({
        proposal: p.proposal_name ? (p.proposal_name.length > 20 ? p.proposal_name.substring(0, 17) + '...' : p.proposal_name) : 'Untitled Proposal',
        responseHours: moment(p.client_last_viewed).diff(moment(p.updated_date), 'hours')
      }))
      .slice(0, 10);
  }, [proposals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            My Dashboard & Reports
          </h2>
          <p className="text-slate-600 mt-1">
            Comprehensive insights into your proposals and engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{summaryMetrics.totalProposals}</div>
            <div className="text-sm text-slate-600 mt-1">Total Proposals</div>
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {summaryMetrics.accepted} accepted ({summaryMetrics.acceptanceRate.toFixed(0)}%)
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-amber-600">{summaryMetrics.inReview}</div>
            <div className="text-sm text-slate-600 mt-1">Awaiting Review</div>
            <div className="mt-2 text-xs text-slate-500">
              Requires your attention
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {summaryMetrics.totalEngagementHours.toFixed(1)}h
            </div>
            <div className="text-sm text-slate-600 mt-1">Total Engagement</div>
            <div className="mt-2 text-xs text-slate-500">
              Time reviewing proposals
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{summaryMetrics.totalMeetings}</div>
            <div className="text-sm text-slate-600 mt-1">Total Meetings</div>
            <div className="mt-2 text-xs text-green-600">
              {summaryMetrics.completedMeetings} completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="proposals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Proposal Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of your proposals by current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    No proposal data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
                <CardDescription>
                  How quickly you respond to proposals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {responseTimeTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={responseTimeTrends} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="proposal" angle={-45} textAnchor="end" interval={0} height={100} />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="responseHours" fill="#3b82f6" name="Response Time (hours)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    No response data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Proposals List */}
          <Card className="border-none shadow-lg mt-6">
            <CardHeader>
              <CardTitle>All Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposals.length > 0 ? (
                  proposals.map((proposal) => (
                    <div key={proposal.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:border-blue-300 transition-all">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{proposal.proposal_name || 'Untitled Proposal'}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                          {proposal.status && (
                            <Badge className="capitalize">
                              {proposal.status.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {proposal.contract_value && (
                            <span>${(proposal.contract_value / 1000).toFixed(0)}K</span>
                          )}
                          {proposal.client_last_viewed && (
                            <span>Last viewed {moment(proposal.client_last_viewed).fromNow()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No proposals found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Engagement Activity Over Time</CardTitle>
              <CardDescription>
                Your interactions with proposals over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={engagementTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#3b82f6" name="Views" strokeWidth={2} />
                    <Line type="monotone" dataKey="interactions" stroke="#10b981" name="Interactions" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-96 text-slate-500">
                  No engagement data for this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Engagement Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Total Views</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {engagementMetrics.filter(m => m.event_type === 'page_view' || m.event_type === 'section_view').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Comments Added</span>
                    <span className="text-2xl font-bold text-green-600">
                      {engagementMetrics.filter(m => m.event_type === 'comment_added').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Files Uploaded</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {uploadedFiles.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Avg Session (min)</span>
                    <span className="text-2xl font-bold text-amber-600">
                      {engagementMetrics.length > 0 ? (summaryMetrics.totalEngagementHours * 60 / engagementMetrics.length).toFixed(1) : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {engagementMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Views', value: engagementMetrics.filter(m => m.event_type === 'page_view' || m.event_type === 'section_view').length },
                          { name: 'Comments', value: engagementMetrics.filter(m => m.event_type === 'comment_added').length },
                          { name: 'Annotations', value: engagementMetrics.filter(m => m.event_type === 'annotation_created').length },
                          { name: 'File Uploads', value: engagementMetrics.filter(m => m.event_type === 'file_uploaded').length }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    No activity data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Meeting Status</CardTitle>
                <CardDescription>
                  Distribution of meetings by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meetingTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={meetingTimeline}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {meetingTimeline.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    No meeting data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Upcoming Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {meetings
                    .filter(m => moment(m.scheduled_date).isAfter(moment()) && m.status === 'scheduled')
                    .slice(0, 5)
                    .map((meeting) => (
                      <div key={meeting.id} className="p-3 bg-slate-50 rounded-lg border">
                        <h4 className="font-medium text-slate-900">{meeting.meeting_title || 'Untitled Meeting'}</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {moment(meeting.scheduled_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                      </div>
                    ))}
                  {meetings.filter(m => moment(m.scheduled_date).isAfter(moment())).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No upcoming meetings scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Your Uploaded Documents</CardTitle>
              <CardDescription>
                Files you've shared with your consultant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length > 0 ? (
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{file.file_name || 'Untitled File'}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                          <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{moment(file.created_date).format('MMM D, YYYY')}</span>
                          {file.viewed_by_consultant && (
                            <>
                              <span>•</span>
                              <Badge className="bg-green-100 text-green-700">Viewed</Badge>
                            </>
                          )}
                        </div>
                      </div>
                      {file.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
