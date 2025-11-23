import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QAMetricsDashboard({ testCases, bugs, metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Execution Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Overall Completion</span>
                <span className="text-sm font-semibold text-slate-900">
                  {metrics.totalTests - metrics.pendingTests} / {metrics.totalTests}
                </span>
              </div>
              <Progress 
                value={metrics.totalTests > 0 ? ((metrics.totalTests - metrics.pendingTests) / metrics.totalTests) * 100 : 0} 
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-slate-600">Passed</div>
                  <div className="text-lg font-bold text-slate-900">{metrics.passedTests}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-xs text-slate-600">Failed</div>
                  <div className="text-lg font-bold text-slate-900">{metrics.failedTests}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bug Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div>
                <div className="text-xs text-red-700">Critical Bugs</div>
                <div className="text-2xl font-bold text-red-900">{metrics.criticalBugs}</div>
              </div>
              {metrics.criticalBugs === 0 ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <div className="text-xs text-amber-700">High Priority</div>
                <div className="text-2xl font-bold text-amber-900">{metrics.highBugs}</div>
              </div>
              {metrics.highBugs <= 5 ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-50 rounded text-center">
                <div className="text-xs text-slate-600">Medium</div>
                <div className="text-lg font-bold text-slate-900">{metrics.mediumBugs}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded text-center">
                <div className="text-xs text-slate-600">Low</div>
                <div className="text-lg font-bold text-slate-900">{metrics.lowBugs}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}