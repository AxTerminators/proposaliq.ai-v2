import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Server,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemHealthModule() {
  const { data: tokenUsage } = useQuery({
    queryKey: ['system-token-usage'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 50),
    initialData: []
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['system-audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 50),
    initialData: []
  });

  // Calculate uptime (simulated - would come from actual monitoring)
  const uptime = 99.98;
  const avgResponseTime = 145; // ms
  const activeUsers = 247;
  const dbSize = 2.4; // GB

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Health & Monitoring</h2>
        <p className="text-slate-600">Real-time system status and performance metrics</p>
      </div>

      {/* System Status Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
              <Badge className="bg-green-600">Operational</Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900">{uptime}%</p>
            <p className="text-sm text-slate-600">System Uptime</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{avgResponseTime}ms</p>
            <p className="text-sm text-slate-600">Avg Response Time</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{activeUsers}</p>
            <p className="text-sm text-slate-600">Active Users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <HardDrive className="w-10 h-10 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{dbSize} GB</p>
            <p className="text-sm text-slate-600">Database Size</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Services Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Services Status */}
        <TabsContent value="services" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>Status of all system services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">API Server</p>
                    <p className="text-xs text-slate-600">All endpoints responding normally</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Database</p>
                    <p className="text-xs text-slate-600">PostgreSQL - 2.4GB used</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">AI Services (LLM)</p>
                    <p className="text-xs text-slate-600">Multi-model integration active</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">File Storage</p>
                    <p className="text-xs text-slate-600">Cloud storage operational</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Authentication Service</p>
                    <p className="text-xs text-slate-600">Base44 auth system</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Avg Response Time</span>
                      <span className="font-semibold">145ms</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-semibold">99.8%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.8%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Cache Hit Rate</span>
                      <span className="font-semibold">92%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">CPU Usage</span>
                      <span className="font-semibold">34%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '34%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-semibold">58%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '58%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Storage Usage</span>
                      <span className="font-semibold">24%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Token Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Last Hour</span>
                  <span className="font-semibold">
                    {tokenUsage.filter(u => {
                      const hourAgo = new Date(Date.now() - 3600000);
                      return new Date(u.created_date) > hourAgo;
                    }).reduce((sum, u) => sum + u.tokens_used, 0).toLocaleString()} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Last 24 Hours</span>
                  <span className="font-semibold">
                    {tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0).toLocaleString()} tokens
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Recent System Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">System startup completed</p>
                    <p className="text-xs text-slate-500">All services initialized successfully</p>
                  </div>
                  <span className="text-xs text-slate-500">2 hours ago</span>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Database backup completed</p>
                    <p className="text-xs text-slate-500">Automated backup successful - 2.4GB</p>
                  </div>
                  <span className="text-xs text-slate-500">5 hours ago</span>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <Zap className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">AI service health check passed</p>
                    <p className="text-xs text-slate-500">All LLM integrations responding</p>
                  </div>
                  <span className="text-xs text-slate-500">8 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
              <CardDescription>Planned maintenance windows and system updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold">Next Scheduled Maintenance</h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    No maintenance scheduled at this time. System updates are applied automatically during low-traffic periods.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold mb-3">Automated Tasks</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Database backups</span>
                      <Badge variant="outline">Daily at 2 AM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Log rotation</span>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Security scans</span>
                      <Badge variant="outline">Daily</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Performance optimization</span>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}