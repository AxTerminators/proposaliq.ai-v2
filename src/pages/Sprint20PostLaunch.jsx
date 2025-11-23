import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import First24HoursMonitor from "@/components/launch/First24HoursMonitor";
import FirstWeekDashboard from "@/components/launch/FirstWeekDashboard";
import FirstMonthAnalytics from "@/components/launch/FirstMonthAnalytics";

const SPRINT_INFO = {
  number: 20,
  name: "Post-Launch: Monitoring & Iteration",
  duration: "Ongoing",
  priority: "Critical",
  dependencies: "Sprint 18",
  team: "All Teams"
};

export default function Sprint20PostLaunch() {
  const [activeTab, setActiveTab] = useState('first24hours');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });

  // Simulated launch status
  const launchStatus = {
    isLive: true,
    launchDate: "2025-01-15T00:00:00Z",
    hoursLive: 168, // 7 days
    overallHealth: "healthy"
  };

  const getTimeSinceLaunch = () => {
    const hours = launchStatus.hoursLive;
    if (hours < 24) return { value: hours, unit: "hours", phase: "first24hours" };
    if (hours < 168) return { value: Math.floor(hours / 24), unit: "days", phase: "firstweek" };
    return { value: Math.floor(hours / 168), unit: "weeks", phase: "firstmonth" };
  };

  const timeSinceLaunch = getTimeSinceLaunch();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint {SPRINT_INFO.number}: Post-Launch</h1>
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

        {/* Launch Status Card */}
        <Card className={
          launchStatus.overallHealth === 'healthy' ? 'border-2 border-green-500 bg-green-50' :
          launchStatus.overallHealth === 'warning' ? 'border-2 border-amber-500 bg-amber-50' :
          'border-2 border-red-500 bg-red-50'
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {launchStatus.overallHealth === 'healthy' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              System Status: {launchStatus.isLive ? 'Live & Operational' : 'Pre-Launch'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-slate-900">
                  {timeSinceLaunch.value}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {timeSinceLaunch.unit} since launch
                </div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-green-900">99.9%</div>
                <div className="text-sm text-green-700 mt-1">Uptime</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-blue-900">
                  {launchStatus.overallHealth === 'healthy' ? 'Healthy' : 'Warning'}
                </div>
                <div className="text-sm text-blue-700 mt-1">Overall Health</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Monitoring Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="first24hours">First 24 Hours</TabsTrigger>
            <TabsTrigger value="firstweek">First Week</TabsTrigger>
            <TabsTrigger value="firstmonth">First Month</TabsTrigger>
          </TabsList>

          <TabsContent value="first24hours">
            <First24HoursMonitor user={user} launchStatus={launchStatus} />
          </TabsContent>

          <TabsContent value="firstweek">
            <FirstWeekDashboard user={user} launchStatus={launchStatus} />
          </TabsContent>

          <TabsContent value="firstmonth">
            <FirstMonthAnalytics user={user} launchStatus={launchStatus} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}