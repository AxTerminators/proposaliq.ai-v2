import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BarChart3,
  Plus,
  Download,
  Clock,
  Star,
  Trash2,
  Edit,
  Play,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  Save,
  Mail
} from "lucide-react";
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
import moment from "moment";

const REPORT_TYPES = [
  { value: "proposal_pipeline", label: "Proposal Pipeline", icon: TrendingUp },
  { value: "client_engagement", label: "Client Engagement", icon: BarChart3 },
  { value: "win_loss_analysis", label: "Win/Loss Analysis", icon: PieChartIcon },
  { value: "revenue_forecast", label: "Revenue Forecast", icon: LineChartIcon },
  { value: "team_productivity", label: "Team Productivity", icon: BarChartIcon },
  { value: "custom", label: "Custom Report", icon: BarChart3 }
];

const AVAILABLE_METRICS = [
  { value: "total_proposals", label: "Total Proposals", category: "proposals" },
  { value: "won_proposals", label: "Won Proposals", category: "proposals" },
  { value: "lost_proposals", label: "Lost Proposals", category: "proposals" },
  { value: "win_rate", label: "Win Rate %", category: "proposals" },
  { value: "total_revenue", label: "Total Revenue", category: "revenue" },
  { value: "avg_deal_size", label: "Average Deal Size", category: "revenue" },
  { value: "client_count", label: "Total Clients", category: "clients" },
  { value: "active_clients", label: "Active Clients", category: "clients" },
  { value: "avg_engagement", label: "Avg Engagement Score", category: "clients" },
  { value: "total_comments", label: "Total Comments", category: "engagement" },
  { value: "total_views", label: "Total Proposal Views", category: "engagement" },
  { value: "avg_response_time", label: "Avg Response Time (hours)", category: "engagement" }
];

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" }
];

const VISUALIZATION_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChartIcon },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "table", label: "Table", icon: BarChart3 }
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function CustomReportBuilder({ organization }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  const [formData, setFormData] = useState({
    report_name: "",
    report_type: "custom",
    report_config: {
      metrics: [],
      date_range: "30d",
      filters: {},
      visualization_type: "bar",
      grouping: "status"
    },
    schedule: "none",
    recipients: []
  });

  // Query reports
  const { data: reports = [] } = useQuery({
    queryKey: ['custom-reports', organization.id],
    queryFn: () => base44.entities.CustomReport.filter({
      organization_id: organization.id
    }, '-created_date'),
    initialData: []
  });

  // Query data for preview
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization.id],
    queryFn: () => base44.entities.Proposal.filter({
      organization_id: organization.id
    }),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organization.id],
    queryFn: () => base44.entities.Client.filter({
      organization_id: organization.id
    }),
    initialData: []
  });

  // Create/Update mutation
  const saveReportMutation = useMutation({
    mutationFn: async (data) => {
      if (editingReport) {
        return base44.entities.CustomReport.update(editingReport.id, data);
      } else {
        return base44.entities.CustomReport.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      setShowCreateDialog(false);
      resetForm();
    }
  });

  // Delete mutation
  const deleteReportMutation = useMutation({
    mutationFn: (reportId) => base44.entities.CustomReport.delete(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
    }
  });

  // Toggle favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => 
      base44.entities.CustomReport.update(id, { is_favorite: !is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
    }
  });

  const resetForm = () => {
    setFormData({
      report_name: "",
      report_type: "custom",
      report_config: {
        metrics: [],
        date_range: "30d",
        filters: {},
        visualization_type: "bar",
        grouping: "status"
      },
      schedule: "none",
      recipients: []
    });
    setEditingReport(null);
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      report_name: report.report_name,
      report_type: report.report_type,
      report_config: report.report_config,
      schedule: report.schedule,
      recipients: report.recipients || []
    });
    setShowCreateDialog(true);
  };

  const handleSave = () => {
    if (!formData.report_name) {
      alert("Please enter a report name");
      return;
    }
    if (formData.report_config.metrics.length === 0) {
      alert("Please select at least one metric");
      return;
    }
    saveReportMutation.mutate(formData);
  };

  const generateReportData = (report) => {
    const config = report.report_config;
    const metrics = config.metrics;

    // Calculate metrics based on proposals and clients
    const data = [];
    
    if (config.grouping === 'status') {
      const statuses = ['evaluating', 'in_progress', 'submitted', 'won', 'lost'];
      statuses.forEach(status => {
        const filtered = proposals.filter(p => p.status === status);
        const point = { name: status };
        
        metrics.forEach(metric => {
          if (metric === 'total_proposals') point[metric] = filtered.length;
          if (metric === 'total_revenue') {
            point[metric] = filtered.reduce((sum, p) => sum + (p.contract_value || 0), 0);
          }
        });
        
        if (Object.keys(point).length > 1) data.push(point);
      });
    } else if (config.grouping === 'month') {
      // Group by month
      const months = [...new Set(proposals.map(p => 
        moment(p.created_date).format('MMM YYYY')
      ))].slice(-6);
      
      months.forEach(month => {
        const filtered = proposals.filter(p => 
          moment(p.created_date).format('MMM YYYY') === month
        );
        const point = { name: month };
        
        metrics.forEach(metric => {
          if (metric === 'total_proposals') point[metric] = filtered.length;
          if (metric === 'won_proposals') {
            point[metric] = filtered.filter(p => p.status === 'won').length;
          }
          if (metric === 'total_revenue') {
            point[metric] = filtered.reduce((sum, p) => sum + (p.contract_value || 0), 0);
          }
        });
        
        data.push(point);
      });
    }

    return data;
  };

  const renderVisualization = (report, data) => {
    const vizType = report.report_config.visualization_type;
    const metrics = report.report_config.metrics;

    if (vizType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {metrics.map((metric, idx) => (
              <Bar key={metric} dataKey={metric} fill={COLORS[idx % COLORS.length]} name={metric} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {metrics.map((metric, idx) => (
              <Line 
                key={metric} 
                type="monotone" 
                dataKey={metric} 
                stroke={COLORS[idx % COLORS.length]} 
                name={metric}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === 'pie') {
      const pieData = data.map((d, idx) => ({
        name: d.name,
        value: d[metrics[0]] || 0
      }));

      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === 'table') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Name</th>
                {metrics.map(metric => (
                  <th key={metric} className="text-right p-2 font-semibold">{metric}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{row.name}</td>
                  {metrics.map(metric => (
                    <td key={metric} className="text-right p-2">{row[metric]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  const exportReport = (report) => {
    const data = generateReportData(report);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
  };

  const favoriteReports = reports.filter(r => r.is_favorite);
  const otherReports = reports.filter(r => !r.is_favorite);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Custom Report Builder
              </CardTitle>
              <CardDescription>
                Create custom reports and dashboards with your data
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Favorite Reports */}
      {favoriteReports.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Favorite Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {favoriteReports.map(report => {
                const reportType = REPORT_TYPES.find(t => t.value === report.report_type);
                const Icon = reportType?.icon || BarChart3;
                const data = generateReportData(report);

                return (
                  <Card key={report.id} className="border-2 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-slate-900">{report.report_name}</h4>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFavoriteMutation.mutate({ id: report.id, is_favorite: report.is_favorite })}
                        >
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        </Button>
                      </div>
                      
                      {data.length > 0 && renderVisualization(report, data)}
                      
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => setPreviewReport(report)}>
                          <Play className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Reports */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>All Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {otherReports.map(report => {
              const reportType = REPORT_TYPES.find(t => t.value === report.report_type);
              const Icon = reportType?.icon || BarChart3;

              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{report.report_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {reportType?.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {report.report_config.visualization_type}
                            </Badge>
                            {report.schedule !== 'none' && (
                              <Badge className="text-xs bg-green-100 text-green-700">
                                <Clock className="w-3 h-3 mr-1" />
                                {report.schedule}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFavoriteMutation.mutate({ id: report.id, is_favorite: report.is_favorite })}
                        >
                          <Star className={`w-4 h-4 ${report.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setPreviewReport(report)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(report)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => exportReport(report)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this report?")) {
                              deleteReportMutation.mutate(report.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {reports.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-medium mb-2">No reports yet</p>
                <p className="text-sm">Create your first custom report</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit" : "Create"} Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                placeholder="e.g., Q4 Pipeline Report"
              />
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select 
                value={formData.report_type}
                onValueChange={(value) => setFormData({ ...formData, report_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metrics Selection */}
            <div className="space-y-2">
              <Label>Metrics to Include *</Label>
              <div className="grid md:grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                {AVAILABLE_METRICS.map(metric => (
                  <div key={metric.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.value}
                      checked={formData.report_config.metrics.includes(metric.value)}
                      onCheckedChange={(checked) => {
                        const metrics = checked
                          ? [...formData.report_config.metrics, metric.value]
                          : formData.report_config.metrics.filter(m => m !== metric.value);
                        setFormData({
                          ...formData,
                          report_config: { ...formData.report_config, metrics }
                        });
                      }}
                    />
                    <label htmlFor={metric.value} className="text-sm cursor-pointer">
                      {metric.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select 
                value={formData.report_config.date_range}
                onValueChange={(value) => setFormData({
                  ...formData,
                  report_config: { ...formData.report_config, date_range: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visualization Type */}
            <div className="space-y-2">
              <Label>Visualization Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {VISUALIZATION_TYPES.map(viz => {
                  const Icon = viz.icon;
                  return (
                    <Button
                      key={viz.value}
                      variant={formData.report_config.visualization_type === viz.value ? "default" : "outline"}
                      onClick={() => setFormData({
                        ...formData,
                        report_config: { ...formData.report_config, visualization_type: viz.value }
                      })}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{viz.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Grouping */}
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select 
                value={formData.report_config.grouping}
                onValueChange={(value) => setFormData({
                  ...formData,
                  report_config: { ...formData.report_config, grouping: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Auto-Generate Schedule</Label>
              <Select 
                value={formData.schedule}
                onValueChange={(value) => setFormData({ ...formData, schedule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Manual)</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Recipients */}
            {formData.schedule !== 'none' && (
              <div className="space-y-2">
                <Label>Email Recipients (comma-separated)</Label>
                <Input
                  placeholder="email1@example.com, email2@example.com"
                  value={formData.recipients.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingReport ? "Update" : "Create"} Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewReport && (
        <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewReport.report_name}</DialogTitle>
              <CardDescription>
                Generated on {moment().format('MMMM D, YYYY [at] h:mm A')}
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4">
              {renderVisualization(previewReport, generateReportData(previewReport))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => exportReport(previewReport)}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setPreviewReport(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}