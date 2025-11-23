import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  PlayCircle,
  Bug,
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Globe,
  Download,
  TrendingUp,
  FileCheck,
  Users,
  Settings,
  Target,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TestCaseManager from "@/components/qa/TestCaseManager";
import BugTracker from "@/components/qa/BugTracker";
import BrowserCompatibilityMatrix from "@/components/qa/BrowserCompatibilityMatrix";
import DeviceTestingMatrix from "@/components/qa/DeviceTestingMatrix";
import TestExecutionPanel from "@/components/qa/TestExecutionPanel";
import QAMetricsDashboard from "@/components/qa/QAMetricsDashboard";

const SPRINT_INFO = {
  number: 16,
  name: "QA Testing - Full Regression",
  duration: "2 weeks",
  priority: "Critical",
  dependencies: "Sprint 13",
  team: "QA Lead, QA Engineers (2)",
  successCriteria: {
    criticalBugs: 0,
    highPriorityBugs: 5,
    browserSupport: "All major browsers",
    mobileValidation: "Required"
  }
};

const TEST_CATEGORIES = [
  {
    id: 'core',
    name: 'Core Functionality',
    icon: Settings,
    areas: [
      'User Registration & Login',
      'Organization Creation',
      'Proposal Creation',
      'Kanban Board Operations',
      'File Uploads & Management',
      'AI Features (Generation, Analysis)',
      'Export Functionality',
      'Collaboration Tools',
      'Client Portal',
      'Permissions & Roles'
    ]
  },
  {
    id: 'browsers',
    name: 'Browser Compatibility',
    icon: Globe,
    browsers: [
      { name: 'Chrome', versions: ['Latest', 'Previous'], icon: Chrome },
      { name: 'Firefox', versions: ['Latest', 'Previous'], icon: Globe },
      { name: 'Safari', versions: ['Latest', 'Previous'], icon: Globe },
      { name: 'Edge', versions: ['Latest', 'Previous'], icon: Globe }
    ]
  },
  {
    id: 'devices',
    name: 'Device Testing',
    icon: Smartphone,
    devices: [
      { type: 'Desktop', resolutions: ['1920x1080', '1366x768', '2560x1440'] },
      { type: 'Tablet', devices: ['iPad Pro', 'iPad Air', 'Samsung Tab'] },
      { type: 'Mobile', devices: ['iPhone 13', 'iPhone SE', 'Samsung S21'] }
    ]
  }
];

export default function Sprint16QA() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });

  const { data: organization } = useQuery({
    queryKey: ['current-organization', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      return orgs[0] || null;
    },
    enabled: !!user
  });

  // Fetch test cases
  const { data: testCases = [], isLoading: loadingTests } = useQuery({
    queryKey: ['qa-test-cases', organization?.id, refreshKey],
    queryFn: async () => {
      if (!organization?.id) return [];
      // You'll need to create QATestCase entity
      return [];
    },
    enabled: !!organization?.id
  });

  // Fetch bugs
  const { data: bugs = [], isLoading: loadingBugs } = useQuery({
    queryKey: ['qa-bugs', organization?.id, refreshKey],
    queryFn: async () => {
      if (!organization?.id) return [];
      // You'll need to create QABug entity
      return [];
    },
    enabled: !!organization?.id
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTests = testCases.length;
    const passedTests = testCases.filter(t => t.status === 'passed').length;
    const failedTests = testCases.filter(t => t.status === 'failed').length;
    const blockedTests = testCases.filter(t => t.status === 'blocked').length;
    const pendingTests = testCases.filter(t => t.status === 'pending' || !t.status).length;

    const criticalBugs = bugs.filter(b => b.severity === 'critical' && b.status !== 'resolved').length;
    const highBugs = bugs.filter(b => b.severity === 'high' && b.status !== 'resolved').length;
    const mediumBugs = bugs.filter(b => b.severity === 'medium' && b.status !== 'resolved').length;
    const lowBugs = bugs.filter(b => b.severity === 'low' && b.status !== 'resolved').length;

    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    const meetsSuccessCriteria = 
      criticalBugs === 0 && 
      highBugs <= SPRINT_INFO.successCriteria.highPriorityBugs;

    return {
      totalTests,
      passedTests,
      failedTests,
      blockedTests,
      pendingTests,
      passRate,
      criticalBugs,
      highBugs,
      mediumBugs,
      lowBugs,
      totalBugs: bugs.length,
      openBugs: bugs.filter(b => b.status !== 'resolved').length,
      meetsSuccessCriteria
    };
  }, [testCases, bugs]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Data refreshed');
  };

  if (!user || !organization) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-pulse" />
            <p className="text-slate-600">Loading QA Dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint {SPRINT_INFO.number}: QA Testing</h1>
                <p className="text-slate-600">{SPRINT_INFO.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge className="bg-red-600 text-white">
                <AlertCircle className="w-3 h-3 mr-1" />
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
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Success Criteria Card */}
        <Card className={cn(
          "border-2",
          metrics.meetsSuccessCriteria ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Success Criteria
              {metrics.meetsSuccessCriteria && (
                <Badge className="bg-green-600 text-white ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Met
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                {metrics.criticalBugs === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">Critical Bugs</div>
                  <div className="text-lg font-bold text-slate-900">
                    {metrics.criticalBugs} / 0 max
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {metrics.highBugs <= SPRINT_INFO.successCriteria.highPriorityBugs ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">High Priority Bugs</div>
                  <div className="text-lg font-bold text-slate-900">
                    {metrics.highBugs} / {SPRINT_INFO.successCriteria.highPriorityBugs} max
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-slate-600">Browser Support</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {SPRINT_INFO.successCriteria.browserSupport}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-purple-600" />
                <div>
                  <div className="text-sm text-slate-600">Mobile Testing</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {SPRINT_INFO.successCriteria.mobileValidation}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Test Pass Rate</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.passRate}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <Progress value={metrics.passRate} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Tests Executed</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {metrics.totalTests - metrics.pendingTests} / {metrics.totalTests}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                <Badge className="bg-green-600 text-white">{metrics.passedTests} Passed</Badge>
                <Badge className="bg-red-600 text-white">{metrics.failedTests} Failed</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Open Bugs</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.openBugs}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Bug className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex gap-1 mt-3 text-xs">
                <Badge className="bg-red-600 text-white">{metrics.criticalBugs} Critical</Badge>
                <Badge className="bg-amber-600 text-white">{metrics.highBugs} High</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Blocked Tests</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.blockedTests}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tests">Test Cases</TabsTrigger>
            <TabsTrigger value="execution">Execute Tests</TabsTrigger>
            <TabsTrigger value="bugs">Bugs</TabsTrigger>
            <TabsTrigger value="browsers">Browsers</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <QAMetricsDashboard 
              testCases={testCases}
              bugs={bugs}
              metrics={metrics}
            />

            <Card>
              <CardHeader>
                <CardTitle>Test Categories</CardTitle>
                <CardDescription>Core functionality areas to test</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TEST_CATEGORIES.map(category => {
                    const Icon = category.icon;
                    return (
                      <div key={category.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-slate-900">{category.name}</h3>
                        </div>
                        {category.areas && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.areas.map((area, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                {area}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <TestCaseManager 
              organization={organization}
              testCases={testCases}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="execution">
            <TestExecutionPanel
              organization={organization}
              testCases={testCases}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="bugs">
            <BugTracker
              organization={organization}
              bugs={bugs}
              testCases={testCases}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="browsers">
            <BrowserCompatibilityMatrix
              organization={organization}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="devices">
            <DeviceTestingMatrix
              organization={organization}
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}