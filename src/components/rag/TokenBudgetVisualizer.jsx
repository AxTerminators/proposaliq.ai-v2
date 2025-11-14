import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, FileText, Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TokenBudgetVisualizer Component
 * 
 * Visual breakdown of token allocation in RAG context.
 * Shows users:
 * - Total token usage vs capacity
 * - Token distribution by source type
 * - Efficiency metrics
 * - Optimization suggestions
 */
export default function TokenBudgetVisualizer({ 
  metadata,
  compact = false 
}) {
  if (!metadata) return null;

  const {
    estimated_tokens = 0,
    max_tokens = 30000,
    token_utilization_percentage = 0,
    sources = [],
    truncated = false
  } = metadata;

  // Estimate token breakdown by source type
  const avgTokensPerSource = sources.length > 0 
    ? Math.floor(estimated_tokens * 0.8 / sources.length) // 80% to references, 20% to overhead
    : 0;

  const tokenBreakdown = [
    {
      label: "Reference Proposals",
      tokens: avgTokensPerSource * sources.length,
      color: "bg-blue-500",
      icon: FileText
    },
    {
      label: "Current Proposal",
      tokens: Math.floor(estimated_tokens * 0.05),
      color: "bg-purple-500",
      icon: Sparkles
    },
    {
      label: "System Instructions",
      tokens: Math.floor(estimated_tokens * 0.15),
      color: "bg-slate-400",
      icon: Database
    }
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Token Usage</span>
          <span className={cn(
            "font-semibold",
            token_utilization_percentage > 90 ? "text-red-600" :
            token_utilization_percentage > 70 ? "text-amber-600" :
            "text-green-600"
          )}>
            {estimated_tokens.toLocaleString()} / {max_tokens.toLocaleString()}
          </span>
        </div>
        <Progress 
          value={token_utilization_percentage} 
          className={cn(
            "h-2",
            token_utilization_percentage > 90 ? "[&>div]:bg-red-500" :
            token_utilization_percentage > 70 ? "[&>div]:bg-amber-500" :
            "[&>div]:bg-green-500"
          )}
        />
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Token Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total Usage</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-900">
                {estimated_tokens.toLocaleString()}
              </span>
              <span className="text-slate-400">/</span>
              <span className="font-mono text-slate-600">
                {max_tokens.toLocaleString()}
              </span>
              <Badge 
                className={cn(
                  "text-xs",
                  token_utilization_percentage > 90 ? "bg-red-100 text-red-700" :
                  token_utilization_percentage > 70 ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                )}
              >
                {token_utilization_percentage}%
              </Badge>
            </div>
          </div>
          <Progress 
            value={token_utilization_percentage} 
            className={cn(
              "h-2.5",
              token_utilization_percentage > 90 ? "[&>div]:bg-red-500" :
              token_utilization_percentage > 70 ? "[&>div]:bg-amber-500" :
              "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* Breakdown by Source Type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Token Distribution</p>
          {tokenBreakdown.map((item, idx) => {
            const percentage = estimated_tokens > 0 
              ? Math.round((item.tokens / estimated_tokens) * 100)
              : 0;
            const Icon = item.icon;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-slate-600" />
                    <span className="text-slate-700">{item.label}</span>
                  </div>
                  <span className="font-mono text-slate-600">
                    {item.tokens.toLocaleString()} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={cn("h-1.5 rounded-full", item.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Per-Reference Breakdown */}
        {sources.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-slate-700">
              Per-Reference Usage ({sources.length} sources)
            </p>
            {sources.map((source, idx) => {
              const tokensPerRef = avgTokensPerSource;
              const refPercentage = estimated_tokens > 0
                ? Math.round((tokensPerRef / estimated_tokens) * 100)
                : 0;

              return (
                <div key={source.proposal_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-slate-400">#{idx + 1}</span>
                    <span className="text-slate-900 truncate">{source.proposal_name}</span>
                    {source.relevance_score !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {source.relevance_score}
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-slate-600 flex-shrink-0">
                    ~{tokensPerRef.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Truncation Warning */}
        {truncated && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-semibold">Context truncated</p>
              <p>Some references were cut off to fit token limit. Consider reducing reference count.</p>
            </div>
          </div>
        )}

        {/* Optimization Tips */}
        {token_utilization_percentage > 80 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="text-xs font-semibold text-blue-900 mb-1">💡 Optimization Tips:</p>
            <ul className="text-xs text-blue-800 space-y-0.5 list-disc list-inside">
              <li>Use section-type filtering to reduce context size</li>
              <li>Select fewer but more relevant references</li>
              <li>Remove low-scoring references (score &lt; 30)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}