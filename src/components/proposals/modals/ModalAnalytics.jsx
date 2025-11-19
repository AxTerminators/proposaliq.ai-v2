import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Users,
  FileText
} from 'lucide-react';

/**
 * Phase 5: Modal Analytics Dashboard
 * 
 * Tracks modal usage, completion rates, and user engagement
 * to optimize form design and identify bottlenecks.
 */
export default function ModalAnalytics({ organizationId, proposalId }) {
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch modal interactions
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['modal-interactions', organizationId, proposalId, timeRange],
    queryFn: async () => {
      const query = { organization_id: organizationId };
      if (proposalId) query.proposal_id = proposalId;
      
      // Filter by date range
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      const allInteractions = await base44.entities.ModalInteraction.filter(query, '-created_date');
      return allInteractions.filter(i => new Date(i.created_date) >= cutoffDate);
    },
    enabled: !!organizationId
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const opened = interactions.filter(i => i.interaction_type === 'opened').length;
    const submitted = interactions.filter(i => i.interaction_type === 'submitted').length;
    const cancelled = interactions.filter(i => i.interaction_type === 'cancelled').length;
    const errors = interactions.filter(i => i.interaction_type === 'validation_error').length;
    
    const completionRate = opened > 0 ? (submitted / opened * 100).toFixed(1) : 0;
    
    const avgTimeToComplete = interactions
      .filter(i => i.time_to_complete_seconds)
      .reduce((sum, i) => sum + i.time_to_complete_seconds, 0) / submitted || 0;
    
    const totalUploads = interactions.reduce((sum, i) => sum + (i.file_uploads || 0), 0);
    const aiUsageCount = interactions.filter(i => i.ai_extraction_used).length;
    
    // Template usage breakdown
    const templateUsage = {};
    interactions.forEach(i => {
      if (i.modal_template_id) {
        templateUsage[i.modal_template_id] = (templateUsage[i.modal_template_id] || 0) + 1;
      }
    });
    
    // User engagement
    const uniqueUsers = new Set(interactions.map(i => i.user_email)).size;
    
    return {
      opened,
      submitted,
      cancelled,
      errors,
      completionRate,
      avgTimeToComplete,
      totalUploads,
      aiUsageCount,
      templateUsage,
      uniqueUsers
    };
  }, [interactions]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="text-sm text-slate-600 mt-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Modal Analytics</h2>
          <p className="text-slate-600 text-sm mt-1">
            Track usage and optimize modal workflows
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.completionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.submitted} of {metrics.opened} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Avg. Time to Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(metrics.avgTimeToComplete)}s
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Time from open to submit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4 text-green-600" />
              File Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalUploads}</div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.aiUsageCount} with AI extraction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.uniqueUsers}</div>
            <p className="text-xs text-slate-500 mt-1">
              Across {interactions.length} interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Template Usage</TabsTrigger>
          <TabsTrigger value="interactions">Recent Activity</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Templates</CardTitle>
              <CardDescription>
                Which modal templates are used most frequently
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(metrics.templateUsage).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(metrics.templateUsage)
                    .sort(([, a], [, b]) => b - a)
                    .map(([templateId, count]) => (
                      <div key={templateId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{templateId}</span>
                        </div>
                        <Badge variant="secondary">{count} uses</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No template usage data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Interactions</CardTitle>
              <CardDescription>
                Latest modal activity across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {interactions.slice(0, 10).map((interaction) => (
                  <div
                    key={interaction.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {interaction.interaction_type === 'submitted' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {interaction.interaction_type === 'cancelled' && (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                      {interaction.interaction_type === 'validation_error' && (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{interaction.modal_title}</p>
                        <p className="text-xs text-slate-500">
                          {interaction.user_email} • {new Date(interaction.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        interaction.interaction_type === 'submitted' ? 'default' :
                        interaction.interaction_type === 'cancelled' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {interaction.interaction_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>
                Common validation errors and submission failures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {metrics.errors}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Validation Errors</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {metrics.cancelled}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Cancellations</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {metrics.opened - metrics.submitted - metrics.cancelled}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Abandoned</p>
                  </div>
                </div>
                
                {metrics.errors > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Recent Errors:</p>
                    <div className="space-y-2">
                      {interactions
                        .filter(i => i.interaction_type === 'validation_error' && i.error_message)
                        .slice(0, 5)
                        .map(i => (
                          <div key={i.id} className="text-xs bg-red-50 p-2 rounded">
                            <span className="font-medium">{i.modal_title}:</span> {i.error_message}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}