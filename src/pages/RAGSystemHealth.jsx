import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Database,
  FileText,
  Zap,
  TrendingUp,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RAGSystemHealth() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.email],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      return orgs[0];
    },
    enabled: !!user
  });

  // Health checks
  const { data: healthChecks = {}, isLoading, refetch } = useQuery({
    queryKey: ['rag-health', organization?.id],
    queryFn: async () => {
      const checks = {};

      // 1. AI Configuration Check
      const aiConfigs = await base44.entities.AiConfiguration.filter({
        organization_id: organization.id,
        is_active: true
      });
      checks.aiConfig = {
        status: aiConfigs.length > 0 ? 'pass' : 'fail',
        message: aiConfigs.length > 0 
          ? `Active configuration: ${aiConfigs[0].config_name}`
          : 'No active AI configuration found',
        details: aiConfigs[0] || null
      };

      // 2. Reference Proposals Check
      const wonProposals = await base44.entities.Proposal.filter({
        organization_id: organization.id,
        status: 'won'
      });
      checks.references = {
        status: wonProposals.length >= 3 ? 'pass' : wonProposals.length >= 1 ? 'warning' : 'fail',
        message: `${wonProposals.length} won proposals available as references`,
        count: wonProposals.length
      };

      // 3. Cache Status Check
      const cachedProposals = await base44.entities.ParsedProposalCache.filter({
        organization_id: organization.id
      });
      const recentCache = cachedProposals.filter(c => {
        const age = Date.now() - new Date(c.cached_at).getTime();
        return age < 7 * 24 * 60 * 60 * 1000; // 7 days
      });
      checks.cache = {
        status: recentCache.length > 0 ? 'pass' : 'warning',
        message: `${cachedProposals.length} proposals cached (${recentCache.length} recent)`,
        count: cachedProposals.length,
        recentCount: recentCache.length
      };

      // 4. Feedback Loop Check
      const feedback = await base44.entities.ContentQualityFeedback.filter({
        organization_id: organization.id
      });
      checks.feedback = {
        status: feedback.length >= 10 ? 'pass' : feedback.length >= 1 ? 'warning' : 'info',
        message: `${feedback.length} quality ratings collected`,
        count: feedback.length
      };

      // 5. Token Usage Check
      const tokenUsage = await base44.entities.TokenUsage.filter({
        organization_id: organization.id,
        feature_type: 'proposal_generation'
      });
      const avgTokens = tokenUsage.length > 0
        ? tokenUsage.reduce((sum, t) => sum + t.tokens_used, 0) / tokenUsage.length
        : 0;
      checks.tokens = {
        status: avgTokens < 50000 ? 'pass' : avgTokens < 80000 ? 'warning' : 'fail',
        message: `Avg ${avgTokens.toLocaleString()} tokens per generation`,
        avgTokens
      };

      // 6. Content Library Check
      const libraryResources = await base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      });
      checks.contentLibrary = {
        status: libraryResources.length >= 5 ? 'pass' : libraryResources.length >= 1 ? 'warning' : 'info',
        message: `${libraryResources.length} boilerplate resources available`,
        count: libraryResources.length
      };

      return checks;
    },
    enabled: !!organization
  });

  if (!organization || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const allChecks = Object.values(healthChecks);
  const passCount = allChecks.filter(c => c.status === 'pass').length;
  const failCount = allChecks.filter(c => c.status === 'fail').length;
  const overallHealth = failCount === 0 ? (passCount >= 4 ? 'healthy' : 'good') : 'issues';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-600" />
              RAG System Health
            </h1>
            <p className="text-slate-600 mt-1">
              Monitor and verify your AI enhancement system
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <Card className={cn(
          "border-2",
          overallHealth === 'healthy' && "border-green-200 bg-green-50",
          overallHealth === 'good' && "border-blue-200 bg-blue-50",
          overallHealth === 'issues' && "border-red-200 bg-red-50"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {overallHealth === 'healthy' && '✅ System Healthy'}
                  {overallHealth === 'good' && '👍 System Operational'}
                  {overallHealth === 'issues' && '⚠️ Issues Detected'}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {passCount} checks passed, {failCount} issues found
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">
                  {Math.round((passCount / allChecks.length) * 100)}%
                </p>
                <p className="text-xs text-slate-600">Health Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Checks */}
        <div className="space-y-3">
          {/* AI Configuration */}
          {healthChecks.aiConfig && (
            <Card className={cn(
              "border-l-4",
              healthChecks.aiConfig.status === 'pass' && "border-l-green-500",
              healthChecks.aiConfig.status === 'warning' && "border-l-amber-500",
              healthChecks.aiConfig.status === 'fail' && "border-l-red-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.aiConfig.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      AI Configuration
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.aiConfig.message}</p>
                    {healthChecks.aiConfig.status === 'fail' && (
                      <Button size="sm" className="mt-2" onClick={() => window.location.href = '/SuperAdminAiSettings'}>
                        Configure AI Settings
                      </Button>
                    )}
                  </div>
                  <Badge className={cn(
                    healthChecks.aiConfig.status === 'pass' && "bg-green-600",
                    healthChecks.aiConfig.status === 'warning' && "bg-amber-600",
                    healthChecks.aiConfig.status === 'fail' && "bg-red-600"
                  )}>
                    {healthChecks.aiConfig.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reference Proposals */}
          {healthChecks.references && (
            <Card className={cn(
              "border-l-4",
              healthChecks.references.status === 'pass' && "border-l-green-500",
              healthChecks.references.status === 'warning' && "border-l-amber-500",
              healthChecks.references.status === 'fail' && "border-l-red-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.references.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Reference Proposals
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.references.message}</p>
                    {healthChecks.references.status !== 'pass' && (
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Win more proposals to build a stronger reference library
                      </p>
                    )}
                  </div>
                  <Badge className={cn(
                    healthChecks.references.status === 'pass' && "bg-green-600",
                    healthChecks.references.status === 'warning' && "bg-amber-600",
                    healthChecks.references.status === 'fail' && "bg-red-600"
                  )}>
                    {healthChecks.references.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cache Status */}
          {healthChecks.cache && (
            <Card className={cn(
              "border-l-4",
              healthChecks.cache.status === 'pass' && "border-l-green-500",
              healthChecks.cache.status === 'warning' && "border-l-amber-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.cache.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Proposal Cache
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.cache.message}</p>
                  </div>
                  <Badge className={cn(
                    healthChecks.cache.status === 'pass' && "bg-green-600",
                    healthChecks.cache.status === 'warning' && "bg-amber-600"
                  )}>
                    {healthChecks.cache.recentCount} recent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Loop */}
          {healthChecks.feedback && (
            <Card className={cn(
              "border-l-4",
              healthChecks.feedback.status === 'pass' && "border-l-green-500",
              healthChecks.feedback.status === 'warning' && "border-l-amber-500",
              healthChecks.feedback.status === 'info' && "border-l-blue-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.feedback.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Quality Feedback Loop
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.feedback.message}</p>
                    {healthChecks.feedback.count < 10 && (
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Rate generated content to improve future results
                      </p>
                    )}
                  </div>
                  <Badge className={cn(
                    healthChecks.feedback.status === 'pass' && "bg-green-600",
                    healthChecks.feedback.status === 'warning' && "bg-amber-600",
                    healthChecks.feedback.status === 'info' && "bg-blue-600"
                  )}>
                    {healthChecks.feedback.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Usage */}
          {healthChecks.tokens && (
            <Card className={cn(
              "border-l-4",
              healthChecks.tokens.status === 'pass' && "border-l-green-500",
              healthChecks.tokens.status === 'warning' && "border-l-amber-500",
              healthChecks.tokens.status === 'fail' && "border-l-red-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.tokens.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Token Efficiency
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.tokens.message}</p>
                    {healthChecks.tokens.status !== 'pass' && (
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Consider reducing reference count or optimizing context
                      </p>
                    )}
                  </div>
                  <Badge className={cn(
                    healthChecks.tokens.status === 'pass' && "bg-green-600",
                    healthChecks.tokens.status === 'warning' && "bg-amber-600",
                    healthChecks.tokens.status === 'fail' && "bg-red-600"
                  )}>
                    {healthChecks.tokens.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Library */}
          {healthChecks.contentLibrary && (
            <Card className={cn(
              "border-l-4",
              healthChecks.contentLibrary.status === 'pass' && "border-l-green-500",
              healthChecks.contentLibrary.status === 'warning' && "border-l-amber-500",
              healthChecks.contentLibrary.status === 'info' && "border-l-blue-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(healthChecks.contentLibrary.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Content Library
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{healthChecks.contentLibrary.message}</p>
                  </div>
                  <Badge className={cn(
                    healthChecks.contentLibrary.status === 'pass' && "bg-green-600",
                    healthChecks.contentLibrary.status === 'warning' && "bg-amber-600",
                    healthChecks.contentLibrary.status === 'info' && "bg-blue-600"
                  )}>
                    {healthChecks.contentLibrary.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recommendations */}
        {overallHealth !== 'healthy' && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Optimization Tips:</strong>
              <ul className="list-disc ml-4 mt-2 space-y-1 text-sm">
                {failCount > 0 && <li>Address failed checks to improve system reliability</li>}
                {healthChecks.references?.count < 3 && <li>Build reference library by marking proposals as "won"</li>}
                {healthChecks.feedback?.count < 10 && <li>Provide quality ratings to enable continuous learning</li>}
                {healthChecks.tokens?.status !== 'pass' && <li>Optimize token usage by selecting fewer references</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}