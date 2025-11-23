import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Shield,
  Zap,
  FileText,
  Target,
  Server,
  Activity,
  Download,
  PlayCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import PreLaunchChecklist from "@/components/launch/PreLaunchChecklist";
import SmokeTestDashboard from "@/components/launch/SmokeTestDashboard";
import DeploymentPlan from "@/components/launch/DeploymentPlan";
import LaunchMetrics from "@/components/launch/LaunchMetrics";

const SPRINT_INFO = {
  number: 18,
  name: "Final QA & Launch Prep",
  duration: "1 week",
  priority: "Critical",
  dependencies: "Sprint 16",
  team: "All Developers, Product Manager, QA Lead",
  successCriteria: {
    checklistComplete: true,
    smokeTestsPass: true,
    rollbackDocumented: true,
    teamReady: true
  }
};

export default function Sprint18LaunchPrep() {
  const [activeTab, setActiveTab] = useState('checklist');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });

  // Calculate overall readiness
  const readinessScore = useMemo(() => {
    // This would be calculated based on actual checklist completion
    // For now, returning a placeholder
    return {
      percentage: 75,
      status: 'in_progress',
      criticalIssues: 2,
      blockers: 0
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint {SPRINT_INFO.number}: Launch Prep</h1>
                <p className="text-slate-600">{SPRINT_INFO.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge className="bg-red-600 text-white">
                {SPRINT_INFO.priority}
              </Badge>
              <span className="text-slate-600">
                <Clock className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.duration}
              </span>
              <span className="text-slate-600">
                <Users className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.team}
              </span>
            </div>
          </div>
        </div>

        {/* Launch Readiness Card */}
        <Card className={cn(
          "border-2",
          readinessScore.percentage >= 100 ? "border-green-500 bg-green-50" :
          readinessScore.percentage >= 75 ? "border-amber-500 bg-amber-50" :
          "border-red-500 bg-red-50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Launch Readiness
              {readinessScore.percentage >= 100 && (
                <Badge className="bg-green-600 text-white ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready for Launch
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Readiness</span>
                <span className="text-2xl font-bold text-slate-900">{readinessScore.percentage}%</span>
              </div>
              <Progress value={readinessScore.percentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                {readinessScore.blockers === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">Blockers</div>
                  <div className="text-lg font-bold text-slate-900">{readinessScore.blockers}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {readinessScore.criticalIssues === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">Critical Issues</div>
                  <div className="text-lg font-bold text-slate-900">{readinessScore.criticalIssues}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {readinessScore.status === 'ready' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">Status</div>
                  <div className="text-lg font-bold text-slate-900 capitalize">
                    {readinessScore.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Checklist Items</p>
                  <p className="text-3xl font-bold text-slate-900">45/60</p>
                  <p className="text-xs text-slate-500 mt-1">75% complete</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Smoke Tests</p>
                  <p className="text-3xl font-bold text-slate-900">28/30</p>
                  <p className="text-xs text-slate-500 mt-1">93% passed</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Documentation</p>
                  <p className="text-3xl font-bold text-slate-900">Complete</p>
                  <p className="text-xs text-slate-500 mt-1">All sections</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Team Readiness</p>
                  <p className="text-3xl font-bold text-slate-900">Ready</p>
                  <p className="text-xs text-slate-500 mt-1">All hands on deck</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="checklist">Pre-Launch Checklist</TabsTrigger>
            <TabsTrigger value="smoke-tests">Smoke Tests</TabsTrigger>
            <TabsTrigger value="deployment">Deployment Plan</TabsTrigger>
            <TabsTrigger value="metrics">Launch Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <PreLaunchChecklist user={user} />
          </TabsContent>

          <TabsContent value="smoke-tests">
            <SmokeTestDashboard user={user} />
          </TabsContent>

          <TabsContent value="deployment">
            <DeploymentPlan user={user} />
          </TabsContent>

          <TabsContent value="metrics">
            <LaunchMetrics user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}