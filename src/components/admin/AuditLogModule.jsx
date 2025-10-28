import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, CheckCircle2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuditLogModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
    initialData: []
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.target_entity?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    return matchesSearch && matchesAction;
  });

  const actionColors = {
    user_created: "bg-green-100 text-green-700",
    user_updated: "bg-blue-100 text-blue-700",
    user_deleted: "bg-red-100 text-red-700",
    role_assigned: "bg-purple-100 text-purple-700",
    subscription_modified: "bg-amber-100 text-amber-700",
    content_created: "bg-green-100 text-green-700",
    content_updated: "bg-blue-100 text-blue-700",
    content_deleted: "bg-red-100 text-red-700",
    ai_settings_changed: "bg-indigo-100 text-indigo-700",
    security_settings_changed: "bg-orange-100 text-orange-700",
    impersonation_started: "bg-yellow-100 text-yellow-700",
    impersonation_ended: "bg-slate-100 text-slate-700",
    billing_action: "bg-emerald-100 text-emerald-700",
    system_configuration: "bg-pink-100 text-pink-700"
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Audit Logs</h2>
        <p className="text-slate-600">Immutable record of all admin actions</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by admin email or target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="user_updated">User Updated</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="role_assigned">Role Assigned</SelectItem>
                <SelectItem value="subscription_modified">Subscription Modified</SelectItem>
                <SelectItem value="ai_settings_changed">AI Settings Changed</SelectItem>
                <SelectItem value="security_settings_changed">Security Settings</SelectItem>
                <SelectItem value="impersonation_started">Impersonation Started</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={actionColors[log.action_type]}>
                      {log.action_type.replace(/_/g, ' ')}
                    </Badge>
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.created_date).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Admin:</span>
                    <span className="font-medium">{log.admin_email}</span>
                    {log.admin_role && (
                      <Badge variant="outline" className="text-xs">
                        {log.admin_role.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {log.target_entity && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Target:</span>
                      <span className="font-medium">{log.target_entity}</span>
                    </div>
                  )}
                  {log.details && (
                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono">
                      {log.details}
                    </div>
                  )}
                  {log.ip_address && (
                    <div className="text-xs text-slate-500">
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <ScrollText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}