import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Client Feedback Form
 * Allows clients to provide structured feedback on proposals
 */
export default function ClientFeedbackForm({ proposal, clientOrg, accessToken }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({
    issue_type: 'post_proposal_satisfaction',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [submitted, setSubmitted] = useState(false);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Feedback.create({
        organization_id: clientOrg.parent_organization_id, // Consultant's org
        client_id: clientOrg.id,
        proposal_id: proposal.id,
        reporter_email: clientOrg.contact_email,
        reporter_name: clientOrg.contact_name,
        ...data
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      setTimeout(() => {
        setSubmitted(false);
        setFeedback({
          issue_type: 'post_proposal_satisfaction',
          title: '',
          description: '',
          priority: 'medium'
        });
      }, 3000);
    },
    onError: (error) => {
      toast.error('Failed to submit feedback: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (!feedback.description.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    submitFeedbackMutation.mutate(feedback);
  };

  if (submitted) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Thank You!
          </h3>
          <p className="text-slate-600">
            Your feedback has been sent to your consultant
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Share Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Feedback Type</Label>
          <Select
            value={feedback.issue_type}
            onValueChange={(value) => setFeedback({...feedback, issue_type: value})}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="post_proposal_satisfaction">General Feedback</SelectItem>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="improvement">Suggestion</SelectItem>
              <SelectItem value="bug">Issue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Subject</Label>
          <Textarea
            value={feedback.title}
            onChange={(e) => setFeedback({...feedback, title: e.target.value})}
            placeholder="Brief summary..."
            rows={1}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Your Feedback</Label>
          <Textarea
            value={feedback.description}
            onChange={(e) => setFeedback({...feedback, description: e.target.value})}
            placeholder="Please share your thoughts, questions, or concerns..."
            rows={6}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Priority</Label>
          <Select
            value={feedback.priority}
            onValueChange={(value) => setFeedback({...feedback, priority: value})}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!feedback.description.trim() || submitFeedbackMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitFeedbackMutation.isPending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}