import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from "lucide-react";

export default function WorkflowModule() {
  const { data: proposals } = useQuery({
    queryKey: ['workflow-proposals'],
    queryFn: () => base44.entities.Proposal.list('-updated_date', 50),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['workflow-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const statusCounts = proposals.reduce((acc, prop) => {
    acc[prop.status] = (acc[prop.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Workflow Dashboard</h2>
        <p className="text-slate-600">Track proposal progress across all organizations</p>
      </div>

      {/* Status Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{statusCounts.draft || 0}</p>
            <p className="text-sm text-slate-600">Draft</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{statusCounts.in_progress || 0}</p>
            <p className="text-sm text-slate-600">In Progress</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{statusCounts.submitted || 0}</p>
            <p className="text-sm text-slate-600">Submitted</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{statusCounts.won || 0}</p>
            <p className="text-sm text-slate-600">Won</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Recent Proposal Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proposals.slice(0, 10).map((proposal) => {
              const org = organizations.find(o => o.id === proposal.organization_id);
              
              return (
                <div key={proposal.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{proposal.proposal_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span>{org?.organization_name || 'Unknown Org'}</span>
                        {proposal.agency_name && (
                          <>
                            <span>•</span>
                            <span>{proposal.agency_name}</span>
                          </>
                        )}
                        {proposal.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(proposal.due_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className={`capitalize ${
                      proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                      proposal.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                      proposal.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {proposal.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-green-600">
                {proposals.length > 0 
                  ? ((statusCounts.won || 0) / proposals.length * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-slate-600 mt-2">
                {statusCounts.won || 0} won out of {proposals.length} total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Active Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-blue-600">{organizations.length}</p>
              <p className="text-slate-600 mt-2">Organizations using the platform</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}