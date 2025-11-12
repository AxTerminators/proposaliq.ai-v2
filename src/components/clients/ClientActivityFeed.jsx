import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  FileText,
  Users,
  Send,
  Award,
  MessageSquare,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const ACTIVITY_ICONS = {
  'proposal_created': FileText,
  'proposal_won': Award,
  'user_added': Users,
  'resource_shared': Send,
  'comment_added': MessageSquare,
  'status_changed': CheckCircle2
};

const ACTIVITY_COLORS = {
  'proposal_created': 'text-blue-600 bg-blue-50',
  'proposal_won': 'text-green-600 bg-green-50',
  'user_added': 'text-purple-600 bg-purple-50',
  'resource_shared': 'text-amber-600 bg-amber-50',
  'comment_added': 'text-slate-600 bg-slate-50',
  'status_changed': 'text-indigo-600 bg-indigo-50'
};

/**
 * Client Activity Feed
 * Recent activity for a specific client workspace
 */
export default function ClientActivityFeed({ clientOrganization, limit = 10 }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['client-activity-feed', clientOrganization?.id, limit],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];

      const items = [];

      // Get recent proposals
      const proposals = await base44.entities.Proposal.filter(
        { organization_id: clientOrganization.id },
        '-updated_date',
        5
      );
      proposals.forEach(p => {
        items.push({
          type: 'proposal_created',
          title: `New proposal: ${p.proposal_name}`,
          description: p.project_title,
          user: p.created_by,
          date: p.created_date
        });

        if (p.status === 'won') {
          items.push({
            type: 'proposal_won',
            title: `Won: ${p.proposal_name}`,
            description: p.contract_value ? `$${(p.contract_value / 1000).toFixed(0)}K` : '',
            user: p.created_by,
            date: p.updated_date
          });
        }
      });

      // Get recent resource shares
      const shares = await base44.entities.ResourceShare.filter(
        { target_organization_id: clientOrganization.id },
        '-created_date',
        5
      );
      shares.forEach(s => {
        items.push({
          type: 'resource_shared',
          title: `${s.resource_type.replace('_', ' ')} shared`,
          description: s.share_type,
          user: s.shared_by_email,
          date: s.created_date
        });
      });

      // Sort by date and limit
      return items
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    },
    enabled: !!clientOrganization?.id,
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, idx) => {
              const Icon = ACTIVITY_ICONS[activity.type] || FileText;
              const colorClass = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS['comment_added'];

              return (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-slate-600">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {moment(activity.date).fromNow()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}