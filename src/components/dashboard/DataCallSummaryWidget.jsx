import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardList, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataCallSummaryWidget({ organization }) {
  const navigate = useNavigate();

  const { data: dataCallStats, isLoading } = useQuery({
    queryKey: ['data-call-summary', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      const allDataCalls = await base44.entities.DataCallRequest.filter({
        organization_id: organization.id
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const active = allDataCalls.filter(dc => 
        !['completed'].includes(dc.overall_status)
      );

      const overdue = allDataCalls.filter(dc =>
        dc.due_date && 
        new Date(dc.due_date) < now &&
        dc.overall_status !== 'completed'
      );

      const recentlyCompleted = allDataCalls.filter(dc =>
        dc.overall_status === 'completed' &&
        dc.completed_date &&
        new Date(dc.completed_date) > sevenDaysAgo
      );

      const dueSoon = allDataCalls.filter(dc =>
        dc.due_date &&
        new Date(dc.due_date) > now &&
        new Date(dc.due_date) < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) &&
        dc.overall_status !== 'completed'
      );

      // Calculate overall completion rate
      const totalItems = allDataCalls.reduce((sum, dc) => 
        sum + (dc.checklist_items?.length || 0), 0
      );
      const completedItems = allDataCalls.reduce((sum, dc) => 
        sum + (dc.checklist_items?.filter(item => item.status === 'completed').length || 0), 0
      );
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        total: allDataCalls.length,
        active: active.length,
        overdue: overdue.length,
        recentlyCompleted: recentlyCompleted.length,
        dueSoon: dueSoon.length,
        completionRate,
        needsAttention: overdue.length + dueSoon.length
      };
    },
    enabled: !!organization?.id,
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dataCallStats) return null;

  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Data Calls
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl("DataCalls"))}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
            onClick={() => navigate(createPageUrl("DataCalls"))}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-900 font-semibold">Active</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{dataCallStats.active}</p>
          </div>

          <div 
            className={cn(
              "p-3 rounded-lg cursor-pointer transition-all",
              dataCallStats.overdue > 0 
                ? "bg-red-50 hover:bg-red-100" 
                : "bg-slate-50 hover:bg-slate-100"
            )}
            onClick={() => navigate(createPageUrl("DataCalls"))}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={cn(
                "w-4 h-4",
                dataCallStats.overdue > 0 ? "text-red-600" : "text-slate-400"
              )} />
              <span className={cn(
                "text-xs font-semibold",
                dataCallStats.overdue > 0 ? "text-red-900" : "text-slate-600"
              )}>Overdue</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              dataCallStats.overdue > 0 ? "text-red-900" : "text-slate-600"
            )}>
              {dataCallStats.overdue}
            </p>
          </div>

          <div 
            className="p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-all"
            onClick={() => navigate(createPageUrl("DataCalls"))}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-900 font-semibold">Recent</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{dataCallStats.recentlyCompleted}</p>
            <p className="text-xs text-green-700">Last 7 days</p>
          </div>

          <div 
            className={cn(
              "p-3 rounded-lg cursor-pointer transition-all",
              dataCallStats.dueSoon > 0 
                ? "bg-amber-50 hover:bg-amber-100" 
                : "bg-slate-50 hover:bg-slate-100"
            )}
            onClick={() => navigate(createPageUrl("DataCalls"))}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className={cn(
                "w-4 h-4",
                dataCallStats.dueSoon > 0 ? "text-amber-600" : "text-slate-400"
              )} />
              <span className={cn(
                "text-xs font-semibold",
                dataCallStats.dueSoon > 0 ? "text-amber-900" : "text-slate-600"
              )}>Due Soon</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              dataCallStats.dueSoon > 0 ? "text-amber-900" : "text-slate-600"
            )}>
              {dataCallStats.dueSoon}
            </p>
            <p className={cn(
              "text-xs",
              dataCallStats.dueSoon > 0 ? "text-amber-700" : "text-slate-500"
            )}>Next 3 days</p>
          </div>
        </div>

        {/* Overall Completion Rate */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Completion</span>
            <span className="text-lg font-bold text-blue-600">{dataCallStats.completionRate}%</span>
          </div>
          <Progress value={dataCallStats.completionRate} className="h-2" />
        </div>

        {/* Action Required Alert */}
        {dataCallStats.needsAttention > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">
                  {dataCallStats.needsAttention} data call{dataCallStats.needsAttention > 1 ? 's' : ''} need{dataCallStats.needsAttention === 1 ? 's' : ''} attention
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {dataCallStats.overdue > 0 && `${dataCallStats.overdue} overdue`}
                  {dataCallStats.overdue > 0 && dataCallStats.dueSoon > 0 && ', '}
                  {dataCallStats.dueSoon > 0 && `${dataCallStats.dueSoon} due soon`}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(createPageUrl("DataCalls"))}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Review
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}