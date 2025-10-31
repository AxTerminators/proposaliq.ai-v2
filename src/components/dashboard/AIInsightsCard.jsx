import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIInsightsCard({ proposals = [], opportunities = [] }) {
  const [loading, setLoading] = useState(false);

  // Generate AI insights based on data
  const generateInsights = () => {
    const insights = [];

    // Active proposals needing attention
    const staleProposals = proposals.filter(p => {
      if (!p || !['in_progress', 'draft'].includes(p.status)) return false;
      if (!p.updated_date) return false;
      const daysSinceUpdate = Math.floor(
        (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    });

    if (staleProposals.length > 0) {
      insights.push({
        type: "warning",
        icon: AlertTriangle,
        title: "Proposals Need Attention",
        message: `${staleProposals.length} proposals haven't been updated in over a week`,
        action: "Review Now",
        color: "amber"
      });
    }

    // High-match opportunities
    const highMatchOpps = opportunities.filter(o => o && o.match_score >= 80);
    if (highMatchOpps.length > 0) {
      insights.push({
        type: "opportunity",
        icon: Target,
        title: "High-Match Opportunities",
        message: `${highMatchOpps.length} new opportunities match your profile above 80%`,
        action: "View Opportunities",
        color: "green"
      });
    }

    // Win rate trend
    const recentWon = proposals.filter(p => {
      if (!p || p.status !== 'won' || !p.updated_date) return false;
      const monthsAgo = (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 3;
    }).length;

    const recentLost = proposals.filter(p => {
      if (!p || p.status !== 'lost' || !p.updated_date) return false;
      const monthsAgo = (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 3;
    }).length;

    if (recentWon + recentLost >= 3) {
      const recentWinRate = (recentWon / (recentWon + recentLost)) * 100;
      const wonProposals = proposals.filter(p => p?.status === 'won').length;
      const allDecided = proposals.filter(p => p && ['won', 'lost'].includes(p.status)).length;
      const overallWinRate = allDecided > 0 ? (wonProposals / allDecided) * 100 : 0;

      if (recentWinRate > overallWinRate + 10) {
        insights.push({
          type: "success",
          icon: TrendingUp,
          title: "Win Rate Improving",
          message: `Recent win rate (${recentWinRate.toFixed(0)}%) is ${(recentWinRate - overallWinRate).toFixed(0)}% above average`,
          action: "View Analytics",
          color: "green"
        });
      } else if (recentWinRate < overallWinRate - 10) {
        insights.push({
          type: "alert",
          icon: TrendingDown,
          title: "Win Rate Declining",
          message: `Recent win rate (${recentWinRate.toFixed(0)}%) is below your average. Consider strategy review.`,
          action: "Analyze",
          color: "red"
        });
      }
    }

    // Deadlines approaching
    const upcomingDeadlines = proposals.filter(p => {
      if (!p || !p.due_date || !['in_progress', 'draft'].includes(p.status)) return false;
      const daysUntil = Math.floor(
        (new Date(p.due_date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (upcomingDeadlines.length > 0) {
      insights.push({
        type: "info",
        icon: Lightbulb,
        title: "Upcoming Deadlines",
        message: `${upcomingDeadlines.length} proposals due within 7 days`,
        action: "View Calendar",
        color: "blue"
      });
    }

    // Default insight if none
    if (insights.length === 0) {
      insights.push({
        type: "success",
        icon: Sparkles,
        title: "Everything Looks Good",
        message: "Your proposals are on track. Keep up the great work!",
        action: "View Dashboard",
        color: "blue"
      });
    }

    return insights.slice(0, 3); // Show top 3 insights
  };

  const insights = generateInsights();

  const colorMap = {
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      iconBg: "bg-amber-100"
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      iconBg: "bg-green-100"
    },
    red: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      iconBg: "bg-red-100"
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      iconBg: "bg-blue-100"
    }
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1000);
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => {
          const colors = colorMap[insight.color];
          return (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors.iconBg)}>
                  <insight.icon className={cn("w-5 h-5", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-semibold mb-1", colors.text)}>
                    {insight.title}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">{insight.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("p-0 h-auto font-medium", colors.text)}
                  >
                    {insight.action}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}