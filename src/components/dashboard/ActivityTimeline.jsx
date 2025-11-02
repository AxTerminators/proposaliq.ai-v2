import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, MessageSquare, CheckCircle } from "lucide-react";
import moment from "moment";

export default function ActivityTimeline({ organization, activityLog = [], proposals = [] }) {
  // Defensive check to ensure we have arrays
  const safeActivityLog = Array.isArray(activityLog) ? activityLog : [];
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  const getActivityIcon = (type) => {
    const icons = {
      proposal_created: FileText,
      section_updated: FileText,
      comment_added: MessageSquare,
      status_changed: CheckCircle,
    };
    const Icon = icons[type] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const getProposalName = (proposalId) => {
    const proposal = safeProposals.find(p => p.id === proposalId);
    return proposal?.proposal_name || 'Unknown Proposal';
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {safeActivityLog.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            safeActivityLog.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(activity.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-medium">
                    {activity.action_description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500">
                      {activity.user_name || activity.user_email}
                    </p>
                    <span className="text-xs text-slate-400">•</span>
                    <p className="text-xs text-slate-500">
                      {moment(activity.created_date).fromNow()}
                    </p>
                  </div>
                  {activity.proposal_id && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {getProposalName(activity.proposal_id)}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}