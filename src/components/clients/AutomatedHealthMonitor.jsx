import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Automated Health Monitor
 * Automatically calculate and track client health scores
 */
export default function AutomatedHealthMonitor({ clientOrganizations = [], consultingFirm }) {
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState(0);

  const calculateAllHealthScoresMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      const total = clientOrganizations.length;
      let completed = 0;

      for (const client of clientOrganizations) {
        try {
          const response = await base44.functions.invoke('calculateClientHealth', {
            client_id: client.id,
            organization_id: consultingFirm.id
          });

          if (response.data.success) {
            results.push({
              client_id: client.id,
              success: true,
              health_score: response.data.health_score
            });
          }
        } catch (error) {
          results.push({
            client_id: client.id,
            success: false,
            error: error.message
          });
        }

        completed++;
        setProgress((completed / total) * 100);
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      queryClient.invalidateQueries({ queryKey: ['all-health-scores'] });
      queryClient.invalidateQueries({ queryKey: ['client-health-score'] });
      
      toast.success(`✅ Calculated health scores for ${successCount} of ${results.length} clients`);
      setProgress(0);
    },
    onError: (error) => {
      toast.error('Error calculating health scores: ' + error.message);
      setProgress(0);
    }
  });

  const handleCalculateAll = async () => {
    if (clientOrganizations.length === 0) {
      toast.error('No clients to calculate');
      return;
    }

    setCalculating(true);
    await calculateAllHealthScoresMutation.mutateAsync();
    setCalculating(false);
  };

  // Fetch current health scores
  const { data: healthScores = [] } = useQuery({
    queryKey: ['all-health-scores-monitor', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      
      const scores = [];
      for (const client of clientOrganizations) {
        const clientScores = await base44.entities.ClientHealthScore.filter(
          { client_id: client.id },
          '-calculated_date',
          1
        );
        if (clientScores.length > 0) {
          scores.push({
            ...clientScores[0],
            client_name: client.organization_name
          });
        }
      }
      return scores;
    },
    enabled: !!consultingFirm?.id && clientOrganizations.length > 0,
  });

  const healthSummary = React.useMemo(() => {
    const healthy = healthScores.filter(s => s.overall_score >= 70).length;
    const atRisk = healthScores.filter(s => s.overall_score >= 50 && s.overall_score < 70).length;
    const critical = healthScores.filter(s => s.overall_score < 50).length;
    const avgScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, s) => sum + s.overall_score, 0) / healthScores.length)
      : 0;

    return { healthy, atRisk, critical, avgScore, total: healthScores.length };
  }, [healthScores]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Client Health Monitor
          </CardTitle>
          <Button
            onClick={handleCalculateAll}
            disabled={calculating || clientOrganizations.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {calculating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Calculate All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Processing clients...</span>
              <span className="font-semibold text-slate-900">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {healthScores.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-900">{healthSummary.healthy}</div>
                <div className="text-xs text-green-700">Healthy</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-900">{healthSummary.atRisk}</div>
                <div className="text-xs text-amber-700">At Risk</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-900">{healthSummary.critical}</div>
                <div className="text-xs text-red-700">Critical</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{healthSummary.avgScore}</div>
                <div className="text-xs text-blue-700">Avg Score</div>
              </div>
            </div>

            {/* Top Issues */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 text-sm">Clients Needing Attention</h4>
              {healthScores
                .filter(s => s.overall_score < 70)
                .sort((a, b) => a.overall_score - b.overall_score)
                .slice(0, 5)
                .map(score => (
                  <div
                    key={score.client_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        score.overall_score < 50 ? "bg-red-600" :
                        score.overall_score < 70 ? "bg-amber-600" :
                        "bg-green-600"
                      )} />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">
                          {score.client_name}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {score.risk_factors?.slice(0, 2).map((risk, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-bold",
                          score.overall_score < 50 ? "text-red-700" :
                          score.overall_score < 70 ? "text-amber-700" :
                          "text-green-700"
                        )}>
                          {score.overall_score}
                        </div>
                        <div className="text-xs text-slate-500">Score</div>
                      </div>
                      {score.trend === 'improving' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : score.trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {healthScores.length === 0 && !calculating && (
          <div className="text-center py-8 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No health scores calculated yet</p>
            <p className="text-xs mt-1">Click "Calculate All" to generate scores</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}