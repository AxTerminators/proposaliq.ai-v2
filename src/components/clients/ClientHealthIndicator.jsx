import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Client Health Indicator
 * Visual health score for client relationships
 */
export default function ClientHealthIndicator({ 
  healthScore = 75,
  trend = 'stable',
  riskLevel = 'low',
  metrics = {}
}) {
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHealthBg = (score) => {
    if (score >= 80) return 'from-green-50 to-emerald-50';
    if (score >= 60) return 'from-blue-50 to-indigo-50';
    if (score >= 40) return 'from-amber-50 to-orange-50';
    return 'from-red-50 to-pink-50';
  };

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-600" />;
  };

  const getRiskBadge = () => {
    const configs = {
      low: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      medium: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
      high: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
      critical: { color: 'bg-red-600 text-white', icon: AlertCircle }
    };
    const config = configs[riskLevel] || configs.low;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {riskLevel} risk
      </Badge>
    );
  };

  return (
    <Card className={cn("border-none shadow-lg bg-gradient-to-br", getHealthBg(healthScore))}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className={cn("w-6 h-6", getHealthColor(healthScore))} />
            <h3 className="font-semibold text-slate-900">Client Health</h3>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {getRiskBadge()}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Overall Score</span>
            <span className={cn("text-2xl font-bold", getHealthColor(healthScore))}>
              {healthScore}
            </span>
          </div>
          <Progress value={healthScore} className="h-3" />
        </div>

        {metrics && Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
            {metrics.engagement && (
              <div>
                <p className="text-xs text-slate-500">Engagement</p>
                <p className="font-semibold text-slate-900">{metrics.engagement}%</p>
              </div>
            )}
            {metrics.satisfaction && (
              <div>
                <p className="text-xs text-slate-500">Satisfaction</p>
                <p className="font-semibold text-slate-900">{metrics.satisfaction}%</p>
              </div>
            )}
            {metrics.activity && (
              <div>
                <p className="text-xs text-slate-500">Activity</p>
                <p className="font-semibold text-slate-900">{metrics.activity}%</p>
              </div>
            )}
            {metrics.responseTime && (
              <div>
                <p className="text-xs text-slate-500">Response Time</p>
                <p className="font-semibold text-slate-900">{metrics.responseTime}h</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}