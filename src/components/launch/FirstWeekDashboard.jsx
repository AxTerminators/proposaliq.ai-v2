import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Bug,
  Zap,
  FileText,
  CheckCircle2
} from "lucide-react";

export default function FirstWeekDashboard({ user, launchStatus }) {
  const weeklyMetrics = {
    dailyActiveUsers: [145, 178, 203, 234, 256, 289, 312],
    newSignups: [47, 52, 48, 61, 58, 67, 73],
    proposalsCreated: [89, 102, 118, 134, 147, 163, 178],
    avgSessionDuration: 24, // minutes
    bugsFiled: { critical: 0, high: 7, medium: 15, low: 23 },
    bugsFixed: { critical: 0, high: 5, medium: 8, low: 12 },
    feedbackProcessed: 58,
    docUpdates: 12,
    hotfixesDeployed: 3
  };

  const improvements = [
    { area: "Performance", metric: "Page Load Time", before: "1.8s", after: "1.3s", improvement: "-28%" },
    { area: "API", metric: "Response Time p95", before: "245ms", after: "198ms", improvement: "-19%" },
    { area: "Errors", metric: "Error Rate", before: "0.15%", after: "0.05%", improvement: "-67%" }
  ];

  const topFeedback = [
    { category: "Feature Request", count: 18, sentiment: "positive" },
    { category: "Performance", count: 12, sentiment: "positive" },
    { category: "UI/UX", count: 15, sentiment: "mixed" },
    { category: "Bug Report", count: 8, sentiment: "negative" },
    { category: "Documentation", count: 5, sentiment: "mixed" }
  ];

  return (
    <div className="space-y-4">
      {/* Daily Metrics Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Metrics Trend
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Week-over-week growth analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Daily Active Users</p>
                    <p className="text-3xl font-bold text-slate-900">{weeklyMetrics.dailyActiveUsers[6]}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  +115% from Day 1
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">New Signups</p>
                    <p className="text-3xl font-bold text-slate-900">{weeklyMetrics.newSignups[6]}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  +55% from Day 1
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Proposals Created</p>
                    <p className="text-3xl font-bold text-slate-900">{weeklyMetrics.proposalsCreated[6]}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  +100% from Day 1
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Bug Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Bug Triage & Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-red-900">{weeklyMetrics.bugsFiled.critical}</div>
                <div className="text-sm text-red-600">/</div>
                <div className="text-lg text-red-700">{weeklyMetrics.bugsFixed.critical}</div>
              </div>
              <div className="text-xs text-red-700">Critical (filed/fixed)</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-amber-900">{weeklyMetrics.bugsFiled.high}</div>
                <div className="text-sm text-amber-600">/</div>
                <div className="text-lg text-amber-700">{weeklyMetrics.bugsFixed.high}</div>
              </div>
              <div className="text-xs text-amber-700">High (filed/fixed)</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-blue-900">{weeklyMetrics.bugsFiled.medium}</div>
                <div className="text-sm text-blue-600">/</div>
                <div className="text-lg text-blue-700">{weeklyMetrics.bugsFixed.medium}</div>
              </div>
              <div className="text-xs text-blue-700">Medium (filed/fixed)</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-slate-900">{weeklyMetrics.bugsFiled.low}</div>
                <div className="text-sm text-slate-600">/</div>
                <div className="text-lg text-slate-700">{weeklyMetrics.bugsFixed.low}</div>
              </div>
              <div className="text-xs text-slate-700">Low (filed/fixed)</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">
                71% of bugs fixed within first week
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Improvements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance Optimizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {improvements.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">{item.area}</div>
                  <div className="text-sm text-slate-600">{item.metric}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-600">
                    {item.before} → {item.after}
                  </div>
                  <Badge className="bg-green-100 text-green-700 mt-1">
                    {item.improvement}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Hotfixes Deployed
              </span>
              <Badge className="bg-blue-600 text-white">
                {weeklyMetrics.hotfixesDeployed} releases
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Feedback Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            User Feedback Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Processed</span>
            <span className="text-2xl font-bold text-slate-900">{weeklyMetrics.feedbackProcessed}</span>
          </div>
          <div className="space-y-2">
            {topFeedback.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      item.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                      item.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }
                  >
                    {item.category}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-slate-900">{item.count} items</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentation Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentation Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Updates Published</p>
              <p className="text-sm text-slate-600">Based on user feedback</p>
            </div>
            <div className="text-3xl font-bold text-slate-900">{weeklyMetrics.docUpdates}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}