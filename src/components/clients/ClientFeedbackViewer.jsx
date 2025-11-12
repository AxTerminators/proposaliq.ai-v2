import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

/**
 * Client Feedback Viewer
 * View and respond to client feedback submissions
 */
export default function ClientFeedbackViewer({ clientOrganization }) {
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState(null);
  const [response, setResponse] = useState('');

  // Fetch all feedback from this client
  const { data: feedbackItems = [], isLoading } = useQuery({
    queryKey: ['client-feedback-items', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.Feedback.filter(
        { client_id: clientOrganization.id },
        '-created_date'
      );
    },
    enabled: !!clientOrganization?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ feedbackId, responseText }) => {
      // Update feedback with public response
      await base44.entities.Feedback.update(feedbackId, {
        public_response: responseText,
        consultant_response_date: new Date().toISOString(),
        status: 'resolved'
      });

      // Send notification email to client
      const feedback = feedbackItems.find(f => f.id === feedbackId);
      if (feedback) {
        await base44.functions.invoke('sendClientNotificationEmail', {
          client_id: clientOrganization.id,
          notification_type: 'consultant_reply',
          proposal_id: feedback.proposal_id,
          custom_message: responseText
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-feedback-items'] });
      toast.success('Response sent to client');
      setRespondingTo(null);
      setResponse('');
    },
  });

  const handleRespond = (feedback) => {
    setRespondingTo(feedback);
    setResponse(feedback.public_response || '');
  };

  const handleSendResponse = () => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    respondMutation.mutate({
      feedbackId: respondingTo.id,
      responseText: response
    });
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Client Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedbackItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No feedback submitted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackItems.map(feedback => {
              const isResponding = respondingTo?.id === feedback.id;

              return (
                <Card key={feedback.id} className={cn(
                  "border-2",
                  feedback.priority === 'critical' ? "border-red-300 bg-red-50" :
                  feedback.priority === 'high' ? "border-amber-300 bg-amber-50" :
                  "border-slate-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn(
                            feedback.issue_type === 'post_proposal_satisfaction' ? 'bg-blue-100 text-blue-700' :
                            feedback.issue_type === 'question' ? 'bg-purple-100 text-purple-700' :
                            feedback.issue_type === 'bug' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {feedback.issue_type.replace('_', ' ')}
                          </Badge>
                          <Badge className={cn(
                            feedback.priority === 'critical' ? 'bg-red-600 text-white' :
                            feedback.priority === 'high' ? 'bg-amber-600 text-white' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {feedback.priority}
                          </Badge>
                          <Badge className={cn(
                            feedback.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            feedback.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {feedback.status}
                          </Badge>
                        </div>
                        {feedback.title && (
                          <p className="font-semibold text-slate-900 mb-1">
                            {feedback.title}
                          </p>
                        )}
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {feedback.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {feedback.reporter_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {moment(feedback.created_date).fromNow()}
                          </span>
                        </div>
                      </div>

                      {!feedback.public_response && !isResponding && (
                        <Button
                          size="sm"
                          onClick={() => handleRespond(feedback)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Respond
                        </Button>
                      )}
                    </div>

                    {/* Existing Response */}
                    {feedback.public_response && !isResponding && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-900 font-semibold mb-2">
                            Your Response:
                          </p>
                          <p className="text-sm text-blue-900 whitespace-pre-wrap">
                            {feedback.public_response}
                          </p>
                          <p className="text-xs text-blue-700 mt-2">
                            Sent {moment(feedback.consultant_response_date).fromNow()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Response Form */}
                    {isResponding && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <Textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Write your response to the client..."
                          rows={4}
                          className="resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponse('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSendResponse}
                            disabled={!response.trim() || respondMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {respondMutation.isPending ? (
                              <>Sending...</>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Response
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}