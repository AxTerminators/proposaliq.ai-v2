import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap,
  Send,
  Mail,
  CheckCircle2,
  MessageSquare,
  FileText,
  Calendar,
  ThumbsUp,
  Clock,
  Sparkles,
  Loader2,
  Copy,
  Download,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AIQuickActions({ 
  context, // { type, item, client, proposal }
  onComplete,
  className 
}) {
  const queryClient = useQueryClient();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Define available quick actions based on context
  const getAvailableActions = () => {
    const actions = [];

    // Client follow-up actions
    if (context.type === 'client_inactive' && context.client) {
      actions.push({
        id: 'send-engagement-email',
        icon: Mail,
        color: 'blue',
        label: 'Send Re-engagement Email',
        description: 'AI-generated personalized email to re-engage client',
        estimatedTime: '30 sec'
      });
      
      actions.push({
        id: 'schedule-call',
        icon: Calendar,
        color: 'purple',
        label: 'Schedule Check-in Call',
        description: 'Create calendar event with suggested talking points',
        estimatedTime: '1 min'
      });
    }

    // Proposal viewed but no response
    if (context.type === 'client_viewed_no_response' && context.client && context.proposal) {
      actions.push({
        id: 'send-follow-up',
        icon: MessageSquare,
        color: 'green',
        label: 'Send Smart Follow-up',
        description: 'Context-aware follow-up referencing what they viewed',
        estimatedTime: '45 sec'
      });

      actions.push({
        id: 'gentle-reminder',
        icon: Clock,
        color: 'amber',
        label: 'Gentle Reminder',
        description: 'Friendly nudge with deadline reminder',
        estimatedTime: '30 sec'
      });
    }

    // Unresolved comment
    if (context.type === 'unresolved_comment' && context.comment && context.proposal) {
      actions.push({
        id: 'generate-response',
        icon: Sparkles,
        color: 'purple',
        label: 'AI Response',
        description: 'Generate intelligent response to comment',
        estimatedTime: '20 sec'
      });

      actions.push({
        id: 'mark-resolved',
        icon: CheckCircle2,
        color: 'green',
        label: 'Mark Resolved',
        description: 'Quick resolve with auto-response',
        estimatedTime: '5 sec'
      });
    }

    // Task overdue
    if (context.type === 'task_overdue' && context.task) {
      actions.push({
        id: 'complete-task',
        icon: CheckCircle2,
        color: 'green',
        label: 'Mark Complete',
        description: 'Quick complete with note',
        estimatedTime: '10 sec'
      });

      actions.push({
        id: 'reassign-task',
        icon: Share2,
        color: 'blue',
        label: 'Reassign Task',
        description: 'Reassign to team member',
        estimatedTime: '30 sec'
      });
    }

    // Proposal deadline approaching
    if (context.type === 'proposal_deadline' && context.proposal) {
      actions.push({
        id: 'submission-checklist',
        icon: FileText,
        color: 'orange',
        label: 'Run Submission Checklist',
        description: 'Automated readiness check',
        estimatedTime: '2 min'
      });

      actions.push({
        id: 'notify-team',
        icon: Bell,
        color: 'red',
        label: 'Alert Team',
        description: 'Send deadline reminder to all stakeholders',
        estimatedTime: '30 sec'
      });
    }

    // High-value proposal
    if (context.type === 'high_value_proposal' && context.proposal) {
      actions.push({
        id: 'status-update-request',
        icon: MessageSquare,
        color: 'green',
        label: 'Request Status Update',
        description: 'Professional status inquiry email',
        estimatedTime: '1 min'
      });

      actions.push({
        id: 'thank-you-note',
        icon: ThumbsUp,
        color: 'purple',
        label: 'Send Thank You',
        description: 'Personalized thank you for consideration',
        estimatedTime: '45 sec'
      });
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  // Generate AI content for action
  const generateContentMutation = useMutation({
    mutationFn: async (actionId) => {
      setIsGenerating(true);
      
      let prompt = "";
      
      if (actionId === 'send-engagement-email') {
        prompt = `Write a professional, friendly re-engagement email to ${context.client.contact_name || 'the client'} from ${context.client.client_organization || 'their company'}. 
        They haven't logged into the portal in ${moment().diff(moment(context.client.last_portal_access), 'days')} days. 
        The tone should be helpful, not pushy. Mention we have updates they might be interested in. Keep it under 150 words.`;
      }
      
      else if (actionId === 'send-follow-up') {
        prompt = `Write a follow-up email to ${context.client.contact_name} who viewed the proposal "${context.proposal.proposal_name}" ${Math.round((new Date() - new Date(context.lastView)) / (1000 * 60 * 60))} hours ago but hasn't responded. 
        Be professional, reference specific sections they viewed, and ask if they have any questions. Keep it under 150 words.`;
      }
      
      else if (actionId === 'gentle-reminder') {
        const daysUntilDue = moment(context.proposal.due_date).diff(moment(), 'days');
        prompt = `Write a gentle reminder email about the proposal "${context.proposal.proposal_name}" which is due in ${daysUntilDue} days. 
        Mention we're here to help with any questions. Professional but friendly tone. Under 100 words.`;
      }
      
      else if (actionId === 'generate-response') {
        prompt = `Write a professional response to this client comment: "${context.comment.content}". 
        The comment is on proposal "${context.proposal.proposal_name}". 
        Be helpful, address their concern directly, and offer to discuss further if needed. Keep it under 100 words.`;
      }
      
      else if (actionId === 'status-update-request') {
        prompt = `Write a professional email to request a status update on the proposal "${context.proposal.proposal_name}" which was submitted for ${context.proposal.agency_name}. 
        Contract value is $${(context.proposal.contract_value / 1000).toFixed(0)}K. 
        Be polite, express continued interest, and ask about decision timeline. Keep it under 150 words.`;
      }
      
      else if (actionId === 'thank-you-note') {
        prompt = `Write a professional thank you email for considering our proposal "${context.proposal.proposal_name}". 
        Express appreciation for their time, mention we're available for questions, and look forward to working together. Keep it under 100 words.`;
      }

      if (!prompt) {
        return "Action content generated";
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      return response;
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
      alert("Error generating content. Please try again.");
    }
  });

  // Execute quick action
  const executeActionMutation = useMutation({
    mutationFn: async ({ actionId, content }) => {
      // Send email actions
      if (['send-engagement-email', 'send-follow-up', 'gentle-reminder', 'status-update-request', 'thank-you-note'].includes(actionId)) {
        await base44.integrations.Core.SendEmail({
          to: context.client.contact_email,
          subject: actionId === 'send-engagement-email' ? 'We have updates for you' :
                   actionId === 'gentle-reminder' ? `Reminder: ${context.proposal.proposal_name}` :
                   actionId === 'status-update-request' ? `Following up on ${context.proposal.proposal_name}` :
                   actionId === 'thank-you-note' ? `Thank you from ${context.organization?.organization_name}` :
                   'Following up',
          body: content || generatedContent
        });
        
        // Log activity
        await base44.entities.ActivityLog.create({
          proposal_id: context.proposal?.id,
          user_email: (await base44.auth.me()).email,
          user_name: (await base44.auth.me()).full_name,
          action_type: 'user_invited',
          action_description: `Sent ${actionId.replace('-', ' ')} email to ${context.client.contact_name}`
        });
      }

      // Comment response
      if (actionId === 'generate-response') {
        await base44.entities.ProposalComment.create({
          proposal_id: context.proposal.id,
          parent_comment_id: context.comment.id,
          author_email: (await base44.auth.me()).email,
          author_name: (await base44.auth.me()).full_name,
          content: content || generatedContent
        });

        // Mark original comment as resolved
        await base44.entities.ProposalComment.update(context.comment.id, {
          is_resolved: true,
          resolved_by: (await base44.auth.me()).email,
          resolved_date: new Date().toISOString()
        });
      }

      // Mark comment resolved
      if (actionId === 'mark-resolved') {
        await base44.entities.ProposalComment.update(context.comment.id, {
          is_resolved: true,
          resolved_by: (await base44.auth.me()).email,
          resolved_date: new Date().toISOString()
        });
      }

      // Complete task
      if (actionId === 'complete-task') {
        await base44.entities.ProposalTask.update(context.task.id, {
          status: 'completed',
          completed_date: new Date().toISOString()
        });
      }

      // Schedule call
      if (actionId === 'schedule-call') {
        await base44.entities.CalendarEvent.create({
          organization_id: context.organization.id,
          event_type: 'meeting',
          title: `Check-in with ${context.client.contact_name}`,
          description: `Re-engagement call with ${context.client.client_organization}`,
          start_date: moment().add(2, 'days').hour(10).minute(0).toISOString(),
          end_date: moment().add(2, 'days').hour(10).minute(30).toISOString(),
          location: 'Zoom/Teams',
          created_by_email: (await base44.auth.me()).email,
          created_by_name: (await base44.auth.me()).full_name
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowActionDialog(false);
      setGeneratedContent("");
      if (onComplete) onComplete();
    }
  });

  const handleActionClick = (action) => {
    setSelectedAction(action);
    
    // Actions that need AI generation
    if (['send-engagement-email', 'send-follow-up', 'gentle-reminder', 'generate-response', 'status-update-request', 'thank-you-note'].includes(action.id)) {
      setShowActionDialog(true);
      generateContentMutation.mutate(action.id);
    } else {
      // Immediate actions
      setShowActionDialog(true);
    }
  };

  const handleExecute = () => {
    executeActionMutation.mutate({
      actionId: selectedAction.id,
      content: customMessage || generatedContent
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert("Copied to clipboard!");
  };

  if (availableActions.length === 0) return null;

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {availableActions.map(action => {
          const Icon = action.icon;
          const colorClasses = {
            blue: "bg-blue-100 text-blue-700 hover:bg-blue-200",
            green: "bg-green-100 text-green-700 hover:bg-green-200",
            purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
            amber: "bg-amber-100 text-amber-700 hover:bg-amber-200",
            orange: "bg-orange-100 text-orange-700 hover:bg-orange-200",
            red: "bg-red-100 text-red-700 hover:bg-red-200"
          };

          return (
            <Button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn("gap-2", colorClasses[action.color])}
              size="sm"
            >
              <Icon className="w-4 h-4" />
              {action.label}
              <Badge variant="outline" className="ml-1 text-xs">
                {action.estimatedTime}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              {selectedAction?.label}
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="ml-3 text-slate-600">Generating AI content...</p>
              </div>
            ) : generatedContent ? (
              <>
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">AI-Generated Content</Label>
                    <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{generatedContent}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Customize (Optional)</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Edit the message or leave as-is..."
                    rows={5}
                  />
                </div>
              </>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This action will be executed immediately. Are you sure you want to continue?
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowActionDialog(false);
              setGeneratedContent("");
              setCustomMessage("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleExecute}
              disabled={executeActionMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {executeActionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute Action
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}