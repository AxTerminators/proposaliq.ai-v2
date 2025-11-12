import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized data call card with touch-friendly targets
 */
export default function MobileDataCallCard({ dataCall, onClick }) {
  const completedItems = dataCall.checklist_items?.filter(item => 
    item.status === 'completed' || item.status === 'not_applicable'
  ).length || 0;
  const totalItems = dataCall.checklist_items?.length || 0;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const isOverdue = dataCall.due_date && 
                   new Date(dataCall.due_date) < new Date() && 
                   dataCall.overall_status !== 'completed';

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in_progress': return 'bg-blue-600';
      case 'partially_completed': return 'bg-amber-600';
      case 'overdue': return 'bg-red-600';
      case 'sent': return 'bg-indigo-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <Card 
      className="border-2 active:scale-98 transition-transform touch-manipulation"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base mb-2 line-clamp-2">
              {dataCall.request_title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-xs", getStatusColor(dataCall.overall_status))}>
                {dataCall.overall_status}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-600 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-600">
              {completedItems}/{totalItems} items
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Metadata - Touch-friendly spacing */}
        <div className="space-y-2">
          {dataCall.due_date && (
            <div className="flex items-center gap-2 min-h-[44px]">
              <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Due Date</p>
                <p className={cn(
                  "text-sm font-semibold",
                  isOverdue ? "text-red-600" : "text-slate-900"
                )}>
                  {moment(dataCall.due_date).format('MMM D, YYYY')}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 min-h-[44px]">
            <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Created By</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {dataCall.created_by_name || dataCall.created_by_email}
              </p>
            </div>
          </div>

          {dataCall.last_portal_access && (
            <div className="flex items-center gap-2 min-h-[44px]">
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Last Access</p>
                <p className="text-sm font-semibold text-slate-900">
                  {moment(dataCall.last_portal_access).fromNow()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            <span className="text-slate-600">{completedItems} done</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-amber-600" />
            <span className="text-slate-600">{totalItems - completedItems} pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}