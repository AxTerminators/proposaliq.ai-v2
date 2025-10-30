import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  MessageSquare, 
  FileText,
  CheckCircle2,
  Clock,
  Eye
} from "lucide-react";
import moment from "moment";

export default function ClientActionItems({ proposals, clientToken }) {
  // Calculate action items across all proposals
  const actionItems = [];

  proposals.forEach(proposal => {
    // Proposals needing review
    if (proposal.status === "client_review") {
      actionItems.push({
        id: `review-${proposal.id}`,
        type: "review_needed",
        priority: "high",
        title: "Review Needed",
        description: proposal.proposal_name,
        dueDate: proposal.due_date,
        proposalId: proposal.id,
        icon: Eye,
        color: "purple"
      });
    }

    // Proposals with unread consultant replies
    if (proposal.client_feedback_count > 0 && !proposal.client_last_viewed) {
      actionItems.push({
        id: `reply-${proposal.id}`,
        type: "new_reply",
        priority: "medium",
        title: "New Consultant Response",
        description: proposal.proposal_name,
        proposalId: proposal.id,
        icon: MessageSquare,
        color: "blue"
      });
    }

    // Proposals accepted/rejected awaiting consultant action
    if (proposal.status === "client_accepted" && !proposal.submitted) {
      actionItems.push({
        id: `accepted-${proposal.id}`,
        type: "accepted_pending",
        priority: "low",
        title: "Accepted - Awaiting Submission",
        description: proposal.proposal_name,
        proposalId: proposal.id,
        icon: CheckCircle2,
        color: "green"
      });
    }

    // Proposals with approaching deadlines
    if (proposal.due_date && proposal.status !== "submitted" && proposal.status !== "won" && proposal.status !== "lost") {
      const daysUntilDue = moment(proposal.due_date).diff(moment(), 'days');
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        actionItems.push({
          id: `deadline-${proposal.id}`,
          type: "deadline_approaching",
          priority: daysUntilDue <= 3 ? "high" : "medium",
          title: `Deadline in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
          description: proposal.proposal_name,
          dueDate: proposal.due_date,
          proposalId: proposal.id,
          icon: Clock,
          color: daysUntilDue <= 3 ? "red" : "amber"
        });
      }
    }
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return colors[priority];
  };

  if (actionItems.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">All caught up!</p>
            <p className="text-sm text-slate-500 mt-1">No pending action items at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Action Items ({actionItems.length})
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-700">
            {actionItems.filter(i => i.priority === "high").length} High Priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(item.priority)} hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 mt-0.5 text-${item.color}-600`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{item.title}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 truncate">{item.description}</p>
                      {item.dueDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Due: {moment(item.dueDate).format('MMM D, YYYY')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/ClientProposalView?token=${clientToken}&proposal=${item.proposalId}`;
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}