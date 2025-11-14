import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Database, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * CachePerformanceIndicator Component
 * 
 * PHASE 3: Shows cache performance metrics
 * 
 * Displays:
 * - Cache hits vs misses
 * - Speed improvement from caching
 * - Parse duration comparison
 * - Efficiency gains
 * 
 * Helps users understand the performance benefits of caching.
 */
export default function CachePerformanceIndicator({ 
  performance,
  compact = false 
}) {
  if (!performance) return null;

  const {
    cache_hits = 0,
    cache_misses = 0,
    total_duration_seconds = 0,
    parse_duration_seconds = 0,
    parallel_speedup = ''
  } = performance;

  const totalRefs = cache_hits + cache_misses;
  const cacheHitRate = totalRefs > 0 
    ? Math.round((cache_hits / totalRefs) * 100)
    : 0;

  // Estimate time saved by caching
  // Assume each cache miss takes ~5 seconds, cache hit takes ~0.1 seconds
  const estimatedTimeWithoutCache = totalRefs * 5;
  const actualTimeTaken = total_duration_seconds;
  const timeSaved = estimatedTimeWithoutCache - actualTimeTaken;
  const speedMultiplier = estimatedTimeWithoutCache > 0 
    ? (estimatedTimeWithoutCache / actualTimeTaken).toFixed(1)
    : 1;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              className={cn(
                "gap-1",
                cache_hits > 0 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
              )}
            >
              <Zap className="w-3 h-3" />
              {cache_hits > 0 ? `${cache_hits} cached` : 'No cache'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p><strong>Cache Hits:</strong> {cache_hits}</p>
              <p><strong>Cache Misses:</strong> {cache_misses}</p>
              <p><strong>Hit Rate:</strong> {cacheHitRate}%</p>
              {timeSaved > 0 && (
                <p className="text-green-600"><strong>Time Saved:</strong> ~{timeSaved.toFixed(1)}s</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-green-900">Cache Performance</h4>
        </div>

        {/* Cache Hit Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <Database className="w-4 h-4 text-green-600" />
              <Badge className="bg-green-600 text-white text-xs">
                {cacheHitRate}%
              </Badge>
            </div>
            <p className="text-xs text-slate-600">Cache Hit Rate</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {cache_hits} / {totalRefs} references
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <Badge className="bg-green-600 text-white text-xs">
                {speedMultiplier}x
              </Badge>
            </div>
            <p className="text-xs text-slate-600">Speed Boost</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              ~{timeSaved > 0 ? timeSaved.toFixed(1) : 0}s saved
            </p>
          </div>
        </div>

        {/* Timing Breakdown */}
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-slate-700">Timing Breakdown</p>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Duration:</span>
              <span className="font-semibold text-slate-900">{total_duration_seconds.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Parsing Time:</span>
              <span className="font-semibold text-slate-900">{parse_duration_seconds.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Formatting Time:</span>
              <span className="font-semibold text-slate-900">
                {(total_duration_seconds - parse_duration_seconds).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        {cache_hits > 0 && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-2">
            <p className="text-xs text-green-900">
              <strong>⚡ Performance Boost:</strong> Cache enabled {speedMultiplier}x faster context building! 
              {timeSaved > 0 && ` Saved ~${timeSaved.toFixed(0)} seconds this request.`}
            </p>
          </div>
        )}

        {cache_hits === 0 && totalRefs > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="text-xs text-blue-900">
              <strong>💡 Tip:</strong> Next time you use these references, they'll load instantly from cache (~10x faster)!
            </p>
          </div>
        )}

        {parallel_speedup && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
            <p className="text-xs text-purple-900">
              <strong>🚀 Parallel Processing:</strong> {parallel_speedup}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}