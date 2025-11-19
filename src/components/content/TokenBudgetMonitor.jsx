import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Token Budget Monitor
 * Real-time tracking of token usage and cost estimates
 */
export default function TokenBudgetMonitor({ 
  estimatedTokens = 0,
  maxTokens = 8000,
  costPerToken = 0.00001, // $0.01 per 1K tokens
  generationParams = {}
}) {
  const tokenPercentage = (estimatedTokens / maxTokens) * 100;
  const estimatedCost = (estimatedTokens * costPerToken).toFixed(4);
  
  const status = tokenPercentage < 70 ? 'safe' : 
                 tokenPercentage < 90 ? 'warning' : 'critical';

  return (
    <Card className={cn(
      "border-2",
      status === 'safe' && "border-green-200 bg-green-50",
      status === 'warning' && "border-amber-200 bg-amber-50",
      status === 'critical' && "border-red-200 bg-red-50"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4" />
          Token Budget
          <Badge className={cn(
            "ml-auto",
            status === 'safe' && "bg-green-600",
            status === 'warning' && "bg-amber-600",
            status === 'critical' && "bg-red-600"
          )}>
            {status === 'safe' && '✓ Within Budget'}
            {status === 'warning' && '⚠ High Usage'}
            {status === 'critical' && '🔴 Over Budget'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-700">Context Tokens</span>
            <span className="font-semibold">{estimatedTokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
          </div>
          <Progress 
            value={Math.min(tokenPercentage, 100)} 
            className={cn(
              "h-2",
              status === 'critical' && "bg-red-200 [&>div]:bg-red-600",
              status === 'warning' && "bg-amber-200 [&>div]:bg-amber-600"
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-white rounded border">
            <p className="text-slate-600">Est. Cost</p>
            <p className="font-bold text-lg">${estimatedCost}</p>
          </div>
          <div className="p-2 bg-white rounded border">
            <p className="text-slate-600">Remaining</p>
            <p className="font-bold text-lg">{Math.max(0, maxTokens - estimatedTokens).toLocaleString()}</p>
          </div>
        </div>

        {status === 'critical' && (
          <div className="p-2 bg-red-100 border border-red-300 rounded text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Budget Exceeded</p>
              <p className="text-red-800">Context may be truncated. Consider reducing reference proposals or adjusting settings.</p>
            </div>
          </div>
        )}

        {status === 'warning' && (
          <div className="p-2 bg-amber-100 border border-amber-300 rounded text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Approaching Limit</p>
              <p className="text-amber-800">Consider optimizing context for better performance.</p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t space-y-1 text-xs text-slate-600">
          <p>💡 <strong>Tip:</strong> Fewer references = faster generation</p>
          <p>📊 <strong>Context:</strong> {generationParams.reference_count || 0} references selected</p>
        </div>
      </CardContent>
    </Card>
  );
}