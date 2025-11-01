import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  FileText,
  Clock,
  Target,
  Plus,
  ArrowRight,
  Calendar,
  CheckSquare,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function MobileDashboard({ user, organization, proposals = [], stats = {} }) {
  const navigate = useNavigate();

  const urgentProposals = proposals.filter(p => {
    if (!p.due_date) return false;
    const daysUntil = moment(p.due_date).diff(moment(), 'days');
    return daysUntil >= 0 && daysUntil <= 7;
  }).sort((a, b) => moment(a.due_date).diff(moment(b.due_date)));

  const recentProposals = proposals
    .sort((a, b) => moment(b.updated_date || b.created_date).diff(moment(a.updated_date || a.created_date)))
    .slice(0, 3);

  return (
    <div className="space-y-4 pb-4">
      {/* Welcome Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                Welcome, {user?.full_name?.split(' ')[0]}! 👋
              </h2>
              <p className="text-blue-100 text-sm">{organization?.organization_name}</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("ProposalBuilder"))}
            className="w-full bg-white text-blue-600 hover:bg-blue-50"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Proposal
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-slate-900">{stats.total_proposals || 0}</div>
            <div className="text-xs text-slate-600">Total Proposals</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <FileText className="w-8 h-8 text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-slate-900">{stats.active_proposals || 0}</div>
            <div className="text-xs text-slate-600">Active</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <Target className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-2xl font-bold text-slate-900">{stats.win_rate || 0}%</div>
            <div className="text-xs text-slate-600">Win Rate</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <TrendingUp className="w-8 h-8 text-amber-600 mb-2" />
            <div className="text-2xl font-bold text-slate-900">
              ${((stats.total_value || 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-slate-600">Pipeline Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Deadlines */}
      {urgentProposals.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-slate-900">Urgent Deadlines</h3>
            </div>
            <div className="space-y-2">
              {urgentProposals.slice(0, 3).map(proposal => {
                const daysUntil = moment(proposal.due_date).diff(moment(), 'days');
                return (
                  <button
                    key={proposal.id}
                    onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                    className="w-full p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{proposal.proposal_name}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Recent Proposals</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl("Pipeline"))}
              className="text-blue-600"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentProposals.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">No proposals yet</p>
              </div>
            ) : (
              recentProposals.map(proposal => (
                <button
                  key={proposal.id}
                  onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{proposal.proposal_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs" variant="secondary">
                          {proposal.status?.replace('_', ' ')}
                        </Badge>
                        {proposal.agency_name && (
                          <span className="text-xs text-slate-600 truncate">{proposal.agency_name}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Calendar"))}
          className="h-20 flex-col gap-2"
        >
          <Calendar className="w-6 h-6 text-green-600" />
          <span className="text-sm">Calendar</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Tasks"))}
          className="h-20 flex-col gap-2"
        >
          <CheckSquare className="w-6 h-6 text-amber-600" />
          <span className="text-sm">My Tasks</span>
        </Button>
      </div>
    </div>
  );
}