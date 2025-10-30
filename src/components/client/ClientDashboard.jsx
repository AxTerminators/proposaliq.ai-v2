import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function ClientDashboard({ client, currentMember }) {
  const { data: proposals } = useQuery({
    queryKey: ['client-dashboard-proposals', client.id],
    queryFn: async () => {
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id) && p.client_view_enabled
      );
    },
    initialData: []
  });

  const { data: approvalRequests } = useQuery({
    queryKey: ['client-dashboard-approvals', client.id],
    queryFn: () => base44.entities.ClientApprovalRequest.filter({ client_id: client.id }),
    initialData: []
  });

  const { data: meetings } = useQuery({
    queryKey: ['client-dashboard-meetings', client.id],
    queryFn: () => base44.entities.ClientMeeting.filter({ 
      client_id: client.id 
    }, '-scheduled_date', 10),
    initialData: []
  });

  const { data: notifications } = useQuery({
    queryKey: ['client-dashboard-notifications', client.id],
    queryFn: () => base44.entities.ClientNotification.filter({
      client_id: client.id,
      is_read: false
    }, '-created_date', 5),
    initialData: []
  });

  // Calculate stats
  const totalProposals = proposals.length;
  const inReviewProposals = proposals.filter(p => p.status === 'client_review').length;
  const acceptedProposals = proposals.filter(p => p.status === 'client_accepted').length;
  const pendingApprovals = approvalRequests.filter(r => 
    r.overall_status === 'pending' || r.overall_status === 'in_progress'
  ).length;

  const myPendingApprovals = approvalRequests.filter(r => {
    const myApprover = r.required_approvers?.find(a => a.team_member_id === currentMember.id);
    return myApprover && myApprover.approval_status === 'pending';
  }).length;

  const upcomingMeetings = meetings.filter(m => 
    moment(m.scheduled_date).isAfter(moment()) && m.status === 'scheduled'
  );

  const recentActivity = [
    ...proposals.slice(0, 3).map(p => ({
      type: 'proposal',
      title: `Proposal shared: ${p.proposal_name}`,
      date: p.updated_date,
      icon: FileText,
      color: 'text-blue-600'
    })),
    ...notifications.slice(0, 2).map(n => ({
      type: 'notification',
      title: n.title,
      date: n.created_date,
      icon: MessageSquare,
      color: 'text-purple-600'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {currentMember.member_name}!
        </h1>
        <p className="text-blue-100">
          You have {myPendingApprovals} approval{myPendingApprovals !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalProposals}</p>
            <p className="text-sm text-slate-600">Total Proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{inReviewProposals}</p>
            <p className="text-sm text-slate-600">In Review</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{myPendingApprovals}</p>
            <p className="text-sm text-slate-600">Need Your Approval</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{acceptedProposals}</p>
            <p className="text-sm text-slate-600">Accepted</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => window.location.href = createPageUrl('ClientPortal')}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <span>View All Proposals</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span>Pending Approvals ({myPendingApprovals})</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <Calendar className="w-6 h-6 text-purple-600" />
              <span>Upcoming Meetings ({upcomingMeetings.length})</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => {
                  const Icon = activity.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Icon className={`w-5 h-5 ${activity.color} mt-0.5`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                        <p className="text-xs text-slate-500">{moment(activity.date).fromNow()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.slice(0, 3).map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">{meeting.meeting_title}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <Calendar className="w-4 h-4" />
                      {moment(meeting.scheduled_date).format('MMM D, h:mm A')}
                    </div>
                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Join Meeting →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No upcoming meetings</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unread Notifications */}
      {notifications.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Unread Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-slate-900">{notif.title}</p>
                  <p className="text-sm text-slate-600">{notif.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {moment(notif.created_date).fromNow()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}