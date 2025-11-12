import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Zap,
  MessageSquare,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Client Health Indicator
 * Visual display of client health metrics with scoring breakdown
 */
export default function ClientHealthIndicator({ 
  healthScore = 0, 
  trend = 'stable', 
  riskLevel = 'low',
  metrics = {}
}) {
  const getScoreColor = (score) => {
    if (score >= 70) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' };
    if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' };
  };

  const colors = getScoreColor(healthScore);

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-slate-400" />;
  };

  const getRiskBadge = () => {
    const configs = {
      'low': { bg: 'bg-green-100', text: 'text-green-700', label: 'Low Risk' },
      'medium': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium Risk' },
      'high': { bg: 'bg-red-100', text: 'text-red-700', label: 'High Risk' },
      'critical': { bg: 'bg-red-600', text: 'text-white', label: 'Critical Risk' }
    };
    const config = configs[riskLevel] || configs.low;
    
    return (
      <Badge className={cn(config.bg, config.text)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className={cn("border-2", colors.border, colors.bg)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className={cn("w-5 h-5", colors.text)} />
            Client Health Score
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {getRiskBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className={cn("text-6xl font-bold mb-2", colors.text)}>
            {healthScore}
          </div>
          <p className="text-sm text-slate-600">Overall Health Score</p>
          <Progress 
            value={healthScore} 
            className="h-3 mt-3"
          />
        </div>

        {/* Metric Breakdown */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            {metrics.engagement !== undefined && (
              <div className="text-center p-3 bg-white rounded-lg border">
                <Zap className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="font-bold text-slate-900">{metrics.engagement}/100</div>
                <div className="text-xs text-slate-600">Engagement</div>
              </div>
            )}
            
            {metrics.satisfaction !== undefined && (
              <div className="text-center p-3 bg-white rounded-lg border">
                <Heart className="w-5 h-5 text-pink-600 mx-auto mb-1" />
                <div className="font-bold text-slate-900">{metrics.satisfaction}/100</div>
                <div className="text-xs text-slate-600">Satisfaction</div>
              </div>
            )}
            
            {metrics.activity !== undefined && (
              <div className="text-center p-3 bg-white rounded-lg border">
                <MessageSquare className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <div className="font-bold text-slate-900">{metrics.activity}/100</div>
                <div className="text-xs text-slate-600">Activity</div>
              </div>
            )}
            
            {metrics.responseTime !== undefined && (
              <div className="text-center p-3 bg-white rounded-lg border">
                <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="font-bold text-slate-900">{metrics.responseTime}h</div>
                <div className="text-xs text-slate-600">Avg Response</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}