import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import moment from "moment";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function ClientDownloadInsights({ organization }) {
  // Fetch all download logs for the organization
  const { data: downloadLogs = [], isLoading } = useQuery({
    queryKey: ['clientDownloadLogs', organization.id],
    queryFn: async () => {
      const logs = await base44.entities.ClientDownloadLog.filter({
        organization_id: organization.id
      }, '-created_date', 100);
      return logs;
    },
    enabled: !!organization?.id
  });

  // Fetch proposals for mapping
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization.id],
    queryFn: async () => {
      const props = await base44.entities.Proposal.filter({
        organization_id: organization.id
      });
      return props;
    },
    enabled: !!organization?.id
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calculate metrics
  const totalDownloads = downloadLogs.length;
  const draftDownloads = downloadLogs.filter(log => log.download_type === 'draft').length;
  const finalDownloads = downloadLogs.filter(log => log.download_type === 'final').length;
  const uniqueClients = new Set(downloadLogs.map(log => log.downloaded_by_email)).size;
  const pdfDownloads = downloadLogs.filter(log => log.export_format === 'pdf').length;
  const docxDownloads = downloadLogs.filter(log => log.export_format === 'docx').length;

  // Downloads by day (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = moment().subtract(29 - i, 'days').format('MMM D');
    const count = downloadLogs.filter(log => 
      moment(log.created_date).format('MMM D') === date
    ).length;
    return { date, downloads: count };
  });

  // Downloads by proposal
  const downloadsByProposal = proposals.map(proposal => {
    const count = downloadLogs.filter(log => log.proposal_id === proposal.id).length;
    return {
      name: proposal.proposal_name.substring(0, 30) + (proposal.proposal_name.length > 30 ? '...' : ''),
      downloads: count
    };
  }).filter(item => item.downloads > 0)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 10);

  // Download type distribution
  const downloadTypeData = [
    { name: 'Draft', value: draftDownloads, color: '#f59e0b' },
    { name: 'Final', value: finalDownloads, color: '#10b981' }
  ];

  // Format distribution
  const formatData = [
    { name: 'PDF', value: pdfDownloads, color: '#ef4444' },
    { name: 'DOCX', value: docxDownloads, color: '#3b82f6' }
  ];

  // Recent downloads table
  const recentDownloads = downloadLogs.slice(0, 20);

  // Get proposal name by ID
  const getProposalName = (proposalId) => {
    const proposal = proposals.find(p => p.id === proposalId);
    return proposal?.proposal_name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Downloads</p>
                <p className="text-3xl font-bold text-slate-900">{totalDownloads}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Unique Clients</p>
                <p className="text-3xl font-bold text-slate-900">{uniqueClients}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Draft Downloads</p>
                <p className="text-3xl font-bold text-amber-600">{draftDownloads}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Final Downloads</p>
                <p className="text-3xl font-bold text-green-600">{finalDownloads}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Download Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Proposals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Most Downloaded Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={downloadsByProposal} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={150} fontSize={11} />
                <Tooltip />
                <Bar dataKey="downloads" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Download Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={downloadTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {downloadTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Format Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Format Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={formatData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Downloads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Client Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDownloads.length === 0 ? (
            <div className="text-center py-12">
              <Download className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600">No client downloads yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Downloads will appear here when clients access proposals through the portal
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Proposal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Downloaded By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Format</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDownloads.map((log, index) => (
                    <tr key={log.id} className={index % 2 === 0 ? 'bg-slate-50' : ''}>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {moment(log.created_date).format('MMM D, YYYY h:mm A')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                        {getProposalName(log.proposal_id)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-slate-900">{log.downloaded_by_name}</p>
                          <p className="text-xs text-slate-500">{log.downloaded_by_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={log.download_type === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                          {log.download_type === 'draft' ? 'Draft' : 'Final'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="uppercase">
                          {log.export_format}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Section */}
      {totalDownloads > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <AlertCircle className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-900">
              <p>
                • <strong>{uniqueClients}</strong> unique clients have downloaded proposals
              </p>
              <p>
                • <strong>{((finalDownloads / totalDownloads) * 100).toFixed(0)}%</strong> of downloads are final versions (approved proposals)
              </p>
              <p>
                • <strong>{((pdfDownloads / totalDownloads) * 100).toFixed(0)}%</strong> prefer PDF format
              </p>
              {downloadsByProposal.length > 0 && (
                <p>
                  • Most popular proposal: <strong>{downloadsByProposal[0].name}</strong> ({downloadsByProposal[0].downloads} downloads)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}