
import React, { useState, useEffect } from "react";
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

// Placeholder for page URL creation - actual implementation would depend on your routing library (e.g., Next.js useRouter, React Router history)
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "Pipeline":
      return "/dashboard/pipeline"; // Example path
    case "Analytics":
      return "/dashboard/analytics"; // Example path
    case "Opportunities":
      return "/dashboard/opportunities"; // Example path
    case "Calendar":
      return "/dashboard/calendar"; // Example path
    case "Dashboard":
      return "/dashboard"; // Example path
    default:
      return "#"; // Fallback for unknown pages
  }
};

export default function AIInsightsCard({ proposals = [], opportunities = [], user, organization }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  // Trigger insight generation when proposals or opportunities data changes
  useEffect(() => {
    // Only generate if there's data to analyze
    if (proposals.length > 0 || opportunities.length > 0) {
      generateInsights();
    } else {
      // If no data, display a default "get started" insight
      setInsights([{
        type: "info",
        icon: Sparkles,
        title: "No Data Yet",
        description: "Start adding proposals and opportunities to see AI insights.",
        actionText: "Get Started",
        actionUrl: createPageUrl("Dashboard"), // Link to a general dashboard or getting started guide
        color: "blue",
        priority: "low"
      }]);
    }
  }, [proposals, opportunities]);

  // Generate AI insights based on data
  const generateInsights = () => {
    setLoading(true);
    const newInsights = [];

    // 1. Proposals with high AI confidence but no recent activity
    const highConfidenceStale = proposals.filter(p => {
      // Ensure p and its properties exist and are relevant for this insight
      if (!p || !p.ai_confidence_score) return false;
      if (!['in_progress', 'draft'].includes(p.status)) return false; // Only consider active, user-editable statuses

      let confidence;
      try {
        confidence = JSON.parse(p.ai_confidence_score).overall_score;
      } catch (e) {
        console.error("Error parsing ai_confidence_score for proposal:", p.id, e);
        confidence = 0; // Default to 0 if parsing fails
      }

      if (confidence < 70) return false; // Must be high confidence

      const lastActivity = p.updated_date ? new Date(p.updated_date) : new Date(p.created_date);
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceActivity > 7; // No recent activity for over a week
    });

    if (highConfidenceStale.length > 0) {
      newInsights.push({
        type: 'opportunity',
        icon: TrendingUp,
        title: `${highConfidenceStale.length} High-Confidence Proposal${highConfidenceStale.length > 1 ? 's' : ''} Needs Attention`,
        description: `You have ${highConfidenceStale.length} proposal${highConfidenceStale.length > 1 ? 's' : ''} with high win probability (>70%) but no recent activity. These are ready to push forward.`,
        actionText: 'Review Now',
        actionUrl: createPageUrl("Pipeline"),
        color: "green",
        priority: 'high'
      });
    }

    // Active proposals needing attention (stale proposals)
    const staleProposals = proposals.filter(p => {
      if (!p || !['in_progress', 'draft'].includes(p.status)) return false;
      if (!p.updated_date) return false;
      const daysSinceUpdate = Math.floor(
        (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    });

    if (staleProposals.length > 0) {
      newInsights.push({
        type: "warning",
        icon: AlertTriangle,
        title: "Proposals Need Attention",
        description: `${staleProposals.length} proposals haven't been updated in over a week`,
        actionText: "Review Now",
        actionUrl: createPageUrl("Pipeline"),
        color: "amber",
        priority: "medium"
      });
    }

    // High-match opportunities
    const highMatchOpps = opportunities.filter(o => o && o.match_score >= 80);
    if (highMatchOpps.length > 0) {
      newInsights.push({
        type: "opportunity",
        icon: Target,
        title: "High-Match Opportunities",
        description: `${highMatchOpps.length} new opportunities match your profile above 80%`,
        actionText: "View Opportunities",
        actionUrl: createPageUrl("Opportunities"),
        color: "green",
        priority: "high"
      });
    }

    // Win rate trend
    // Filter proposals for win/loss statuses within the last 3 months
    const recentProposals = proposals.filter(p => {
      if (!p || !['won', 'lost'].includes(p.status) || !p.updated_date) return false;
      const monthsAgo = (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 3;
    });

    const recentWon = recentProposals.filter(p => p.status === 'won').length;
    const recentLost = recentProposals.filter(p => p.status === 'lost').length;

    if (recentWon + recentLost >= 3) { // Require at least 3 decided proposals recently to calculate trend
      const recentWinRate = (recentWon / (recentWon + recentLost)) * 100;
      const wonProposalsOverall = proposals.filter(p => p?.status === 'won').length;
      const allDecidedOverall = proposals.filter(p => p && ['won', 'lost'].includes(p.status)).length;
      const overallWinRate = allDecidedOverall > 0 ? (wonProposalsOverall / allDecidedOverall) * 100 : 0;

      if (recentWinRate > overallWinRate + 10) {
        newInsights.push({
          type: "success",
          icon: TrendingUp,
          title: "Win Rate Improving",
          description: `Recent win rate (${recentWinRate.toFixed(0)}%) is ${(recentWinRate - overallWinRate).toFixed(0)}% above average`,
          actionText: "View Analytics",
          actionUrl: createPageUrl("Analytics"),
          color: "green",
          priority: "medium"
        });
      } else if (recentWinRate < overallWinRate - 10) {
        newInsights.push({
          type: "alert",
          icon: TrendingDown,
          title: "Win Rate Declining",
          description: `Recent win rate (${recentWinRate.toFixed(0)}%) is below your average. Consider strategy review.`,
          actionText: "Analyze",
          actionUrl: createPageUrl("Analytics"),
          color: "red",
          priority: "high"
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
      newInsights.push({
        type: "info",
        icon: Lightbulb,
        title: "Upcoming Deadlines",
        description: `${upcomingDeadlines.length} proposals due within 7 days`,
        actionText: "View Calendar",
        actionUrl: createPageUrl("Calendar"),
        color: "blue",
        priority: "medium"
      });
    }

    // Sort insights by priority (high > medium > low)
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    newInsights.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    // Default insight if none generated so far (or if only low priority insights)
    if (newInsights.length === 0) {
      newInsights.push({
        type: "success",
        icon: Sparkles,
        title: "Everything Looks Good",
        description: "Your proposals are on track. Keep up the great work!",
        actionText: "View Dashboard",
        actionUrl: createPageUrl("Dashboard"),
        color: "blue",
        priority: "low"
      });
    }

    setInsights(newInsights.slice(0, 3)); // Show top 3 insights
    setLoading(false);
  };

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
            onClick={generateInsights}
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
                  <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className={cn("p-0 h-auto font-medium", colors.text)}
                    asChild // Render as an anchor tag
                  >
                    <a href={insight.actionUrl} onClick={(e) => {
                      // Prevent default navigation if actionUrl is a placeholder
                      if (insight.actionUrl === '#') {
                        e.preventDefault();
                        console.log(`Action for "${insight.title}": ${insight.actionText} (No specific URL defined)`);
                      }
                      // If it's a real URL, let the default behavior (navigation) happen
                    }}>
                      {insight.actionText}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
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
