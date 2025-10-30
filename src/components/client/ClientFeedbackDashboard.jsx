import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bug,
  Lightbulb,
  HelpCircle,
  Star
} from "lucide-react";
import moment from "moment";

export default function ClientFeedbackDashboard({ client }) {
  const { data: feedbackItems, isLoading } = useQuery({
    queryKey: ['client-feedback', client.id],
    queryFn: () => base44.entities.Feedback.filter({ 
      client_id: client.id 
    }, '-created_date'),
    initialData: []
  });

  const getStatusBadge = (status) => {
    const configs = {
      new: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "New" },
      in_progress: { icon: Clock, color: "bg-amber-100 text-amber-700", label: "In Progress" },
      resolved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Resolved" },
      closed: { icon: CheckCircle2, color: "bg-slate-100 text-slate-700", label: "Closed" },
      wont_fix: { icon: AlertCircle, color: "bg-red-100 text-red-700", label: "Won't Fix" }
    };
    const config = configs[status] || configs.new;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    const icons = {
      bug: Bug,
      feature_request: Lightbulb,
      question: HelpCircle,
      improvement: MessageSquare,
      post_proposal_satisfaction: Star,
      other: MessageSquare
    };
    return icons[type] || MessageSquare;
  };

  const getTypeColor = (type) => {
    const colors = {
      bug: "text-red-600",
      feature_request: "text-blue-600",
      question: "text-purple-600",
      improvement: "text-green-600",
      post_proposal_satisfaction: "text-yellow-600",
      other: "text-slate-600"
    };
    return colors[type] || "text-slate-600";
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  if (feedbackItems.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-900 mb-2">No Feedback Yet</p>
          <p className="text-slate-600">Your submitted feedback will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            My Feedback History
          </CardTitle>
          <p className="text-sm text-slate-600">
            Track your feedback and see responses from our team
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackItems.map((feedback) => {
              const TypeIcon = getTypeIcon(feedback.issue_type);
              
              return (
                <div key={feedback.id} className="p-4 border-2 rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className={`w-5 h-5 ${getTypeColor(feedback.issue_type)}`} />
                        <h3 className="font-semibold text-slate-900">{feedback.title}</h3>
                        {getStatusBadge(feedback.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{feedback.description}</p>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Submitted: {moment(feedback.created_date).format('MMM D, YYYY')}</span>
                        {feedback.assigned_to_name && (
                          <span>Assigned to: {feedback.assigned_to_name}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {feedback.issue_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Public Response from Consultant */}
                  {feedback.public_response && (
                    <div className="mt-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900 mb-1">Response from our team:</p>
                          <p className="text-sm text-blue-800">{feedback.public_response}</p>
                          {feedback.consultant_response_date && (
                            <p className="text-xs text-blue-600 mt-2">
                              {moment(feedback.consultant_response_date).format('MMM D, YYYY [at] h:mm A')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolution & Rating */}
                  {(feedback.status === 'resolved' || feedback.status === 'closed') && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ {feedback.status === 'resolved' ? 'Resolved' : 'Closed'} 
                        {feedback.resolved_date && ` on ${moment(feedback.resolved_date).format('MMM D, YYYY')}`}
                      </p>
                      {feedback.user_satisfaction_rating && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-green-700">Your rating:</span>
                          <div className="flex">
                            {Array(feedback.user_satisfaction_rating).fill(0).map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Screenshot */}
                  {feedback.screenshot_url && (
                    <div className="mt-3">
                      <img 
                        src={feedback.screenshot_url} 
                        alt="Feedback screenshot" 
                        className="max-h-32 rounded border"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}