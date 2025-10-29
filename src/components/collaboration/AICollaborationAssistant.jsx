import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Users,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Send,
  FileText,
  Clock,
  Target,
  RefreshCw,
  Mail,
  UserPlus,
  Edit
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function AICollaborationAssistant({ 
  proposal, 
  sections = [], 
  tasks = [], 
  comments = [], 
  teamMembers = [],
  user,
  organization 
}) {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [draftedMessage, setDraftedMessage] = useState("");
  const [messageRecipient, setMessageRecipient] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDraftingMessage, setIsDraftingMessage] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      return base44.entities.ProposalTask.create({
        ...taskData,
        proposal_id: proposal.id,
        assigned_by_email: user.email,
        assigned_by_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
      alert("✓ Task created successfully!");
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData) => {
      return base44.entities.Notification.create(notificationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const runAnalysis = async () => {
    if (!proposal?.id || !organization?.id) {
      alert("Missing proposal or organization data");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Get compliance requirements
      const complianceReqs = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      // Get review rounds
      const reviewRounds = await base44.entities.ReviewRound.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      // Calculate statistics
      const sectionsTotal = sections.length;
      const sectionsComplete = sections.filter(s => s.status === 'approved' || s.status === 'reviewed').length;
      const sectionsDraft = sections.filter(s => s.status === 'draft' || s.status === 'ai_generated').length;
      
      const tasksTotal = tasks.length;
      const tasksPending = tasks.filter(t => t.status !== 'completed').length;
      const tasksOverdue = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < new Date();
      }).length;

      const unresolvedComments = comments.filter(c => !c.is_resolved).length;
      
      const complianceAtRisk = complianceReqs.filter(c => 
        c.compliance_status === 'at_risk' || c.compliance_status === 'not_started'
      ).length;

      const activeReviews = reviewRounds.filter(r => r.status === 'in_progress' || r.status === 'scheduled').length;

      // Build team context
      const teamContext = teamMembers.map(member => ({
        email: member.email,
        name: member.full_name,
        role: member.organization_app_role
      }));

      const prompt = `You are an AI collaboration assistant for proposal development. Analyze the current proposal state and identify specific collaboration opportunities.

**PROPOSAL CONTEXT:**
- Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Due Date: ${proposal.due_date || 'Not set'}
- Status: ${proposal.status}
- Current Phase: ${proposal.current_phase}

**TEAM:**
${teamContext.map(t => `- ${t.name} (${t.email}) - ${t.role}`).join('\n')}

**CONTENT STATUS:**
- Total Sections: ${sectionsTotal}
- Complete/Reviewed: ${sectionsComplete}
- Draft/AI Generated: ${sectionsDraft}
- Empty: ${sectionsTotal - sectionsComplete - sectionsDraft}

**TASK STATUS:**
- Total Tasks: ${tasksTotal}
- Pending: ${tasksPending}
- Overdue: ${tasksOverdue}

**COLLABORATION METRICS:**
- Unresolved Comments: ${unresolvedComments}
- Compliance Items At Risk: ${complianceAtRisk}
- Active Review Rounds: ${activeReviews}

**SECTION DETAILS:**
${sections.slice(0, 10).map(s => `
- ${s.section_name}: ${s.status} (${s.word_count || 0} words)
  Last updated: ${s.updated_date || 'Never'}
`).join('')}

**TASK DETAILS:**
${tasks.slice(0, 10).map(t => `
- ${t.title}: ${t.status}
  Assigned to: ${t.assigned_to_name}
  Due: ${t.due_date || 'Not set'}
`).join('')}

**YOUR MISSION:**
Analyze this data and provide specific, actionable collaboration recommendations. Focus on:
1. Who should review what sections (based on roles and section complexity)
2. Missing or delayed tasks that should be created
3. Communication gaps (sections needing feedback, overdue reviews)
4. Risk areas requiring immediate attention
5. Workload imbalances among team members

Return JSON:
{
  "overall_health": <string: "excellent", "good", "concerning", "critical">,
  "health_summary": <string: 2-3 sentence assessment>,
  "priority_score": <number 0-100: urgency level>,
  
  "suggestions": [
    {
      "type": <string: "assign_reviewer", "create_task", "send_reminder", "flag_risk", "balance_workload">,
      "priority": <string: "critical", "high", "medium", "low">,
      "title": <string: brief title>,
      "description": <string: detailed explanation>,
      "target_section": <string: section name if applicable>,
      "recommended_user_email": <string: suggested team member email>,
      "recommended_user_name": <string: suggested team member name>,
      "recommended_user_role": <string: their role>,
      "rationale": <string: why this person/action>,
      "suggested_action": <string: specific action to take>,
      "estimated_effort_hours": <number: estimated time needed>,
      "impact": <string: "high", "medium", "low">
    }
  ],
  
  "risks": [
    {
      "risk": <string: specific risk>,
      "severity": <string: "critical", "high", "medium", "low">,
      "affected_sections": [<string>],
      "mitigation": <string: recommended action>
    }
  ],
  
  "workload_analysis": {
    "overloaded_members": [<string: member names>],
    "underutilized_members": [<string: member names>],
    "recommendations": [<string: rebalancing suggestions>]
  },
  
  "communication_needs": [
    {
      "type": <string: "status_update", "review_request", "reminder", "clarification">,
      "from_user": <string: who should send>,
      "to_user": <string: who should receive>,
      "regarding": <string: what it's about>,
      "urgency": <string: "high", "medium", "low">
    }
  ]
}

**IMPORTANT:** Base all recommendations on actual data provided. Be specific with names, sections, and actions. Prioritize time-sensitive items.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_health: { type: "string" },
            health_summary: { type: "string" },
            priority_score: { type: "number" },
            suggestions: { type: "array" },
            risks: { type: "array" },
            workload_analysis: { type: "object" },
            communication_needs: { type: "array" }
          }
        }
      });

      setInsights(result);

    } catch (error) {
      console.error("Error running collaboration analysis:", error);
      alert("Error analyzing collaboration needs. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTask = async (suggestion) => {
    const section = sections.find(s => s.section_name === suggestion.target_section);
    
    await createTaskMutation.mutateAsync({
      title: suggestion.title,
      description: suggestion.description,
      section_id: section?.id,
      assigned_to_email: suggestion.recommended_user_email,
      assigned_to_name: suggestion.recommended_user_name,
      priority: suggestion.priority === 'critical' ? 'urgent' : suggestion.priority,
      status: 'todo',
      estimated_hours: suggestion.estimated_effort_hours
    });

    // Create notification
    await createNotificationMutation.mutateAsync({
      user_email: suggestion.recommended_user_email,
      notification_type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You've been assigned: ${suggestion.title}`,
      related_proposal_id: proposal.id,
      from_user_email: user.email,
      from_user_name: user.full_name
    });
  };

  const handleDraftMessage = async (suggestion) => {
    setSelectedSuggestion(suggestion);
    setMessageRecipient(suggestion.recommended_user_email || '');
    setIsDraftingMessage(true);

    try {
      const section = sections.find(s => s.section_name === suggestion.target_section);
      
      const prompt = `Draft a professional, friendly message for a proposal team member.

**CONTEXT:**
- Proposal: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Due Date: ${proposal.due_date}
- Recommendation: ${suggestion.description}
- Rationale: ${suggestion.rationale}
${section ? `- Section: ${section.section_name} (${section.word_count || 0} words, status: ${section.status})` : ''}

**RECIPIENT:**
- Name: ${suggestion.recommended_user_name}
- Role: ${suggestion.recommended_user_role}

**YOUR TASK:**
Write a clear, actionable message that:
1. Explains what's needed
2. Provides context about the proposal
3. States the specific action requested
4. Mentions timeline/urgency if applicable
5. Is encouraging and collaborative in tone
6. Is 3-5 sentences long

Return JSON:
{
  "subject": <string: email subject line>,
  "message": <string: the message body>
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            message: { type: "string" }
          }
        }
      });

      setMessageSubject(result.subject);
      setDraftedMessage(result.message);
      setShowMessageDialog(true);

    } catch (error) {
      console.error("Error drafting message:", error);
      alert("Error drafting message. Please try again.");
    } finally {
      setIsDraftingMessage(false);
    }
  };

  const handleSendMessage = async () => {
    setIsSendingMessage(true);
    try {
      await base44.integrations.Core.SendEmail({
        from_name: user.full_name,
        to: messageRecipient,
        subject: messageSubject,
        body: draftedMessage
      });

      // Create notification
      await createNotificationMutation.mutateAsync({
        user_email: messageRecipient,
        notification_type: 'comment_reply',
        title: messageSubject,
        message: draftedMessage.substring(0, 200),
        related_proposal_id: proposal.id,
        from_user_email: user.email,
        from_user_name: user.full_name
      });

      alert("✓ Message sent successfully!");
      setShowMessageDialog(false);
      setDraftedMessage("");
      setMessageSubject("");
      setMessageRecipient("");
      setSelectedSuggestion(null);

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'concerning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'assign_reviewer': return <Users className="w-4 h-4" />;
      case 'create_task': return <CheckCircle2 className="w-4 h-4" />;
      case 'send_reminder': return <Clock className="w-4 h-4" />;
      case 'flag_risk': return <AlertCircle className="w-4 h-4" />;
      case 'balance_workload': return <Target className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Collaboration Assistant</CardTitle>
              <CardDescription>
                Intelligent recommendations for team coordination and workflow optimization
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Collaboration
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!insights && !isAnalyzing && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Smart Collaboration Insights
            </h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Let AI analyze your proposal's progress, team workload, and content status to provide 
              intelligent recommendations for reviewer assignments, task creation, and team communication.
            </p>
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="p-4 bg-white rounded-lg border border-indigo-200">
                <Users className="w-8 h-8 text-indigo-600 mb-2" />
                <h4 className="font-semibold text-sm mb-1">Smart Assignments</h4>
                <p className="text-xs text-slate-600">AI suggests the right reviewer for each section</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                <h4 className="font-semibold text-sm mb-1">Draft Messages</h4>
                <p className="text-xs text-slate-600">Auto-generate context-aware team communications</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-pink-200">
                <Target className="w-8 h-8 text-pink-600 mb-2" />
                <h4 className="font-semibold text-sm mb-1">Risk Detection</h4>
                <p className="text-xs text-slate-600">Identify bottlenecks and collaboration gaps</p>
              </div>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-900">
              AI is analyzing your proposal's collaboration needs... This may take 15-20 seconds.
            </AlertDescription>
          </Alert>
        )}

        {insights && (
          <div className="space-y-6">
            {/* Health Overview */}
            <Card className="border-2 border-indigo-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">Collaboration Health</h3>
                      <Badge className={getPriorityColor(insights.priority_score >= 75 ? 'critical' : insights.priority_score >= 50 ? 'high' : insights.priority_score >= 25 ? 'medium' : 'low')}>
                        Priority: {insights.priority_score}/100
                      </Badge>
                    </div>
                    <p className={`text-2xl font-bold ${getHealthColor(insights.overall_health)} mb-2`}>
                      {insights.overall_health?.toUpperCase()}
                    </p>
                    <p className="text-slate-700">{insights.health_summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            {insights.suggestions && insights.suggestions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Recommendations ({insights.suggestions.length})
                </h3>
                <div className="space-y-3">
                  {insights.suggestions.map((suggestion, idx) => (
                    <Card key={idx} className={`border-2 ${getPriorityColor(suggestion.priority)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getPriorityColor(suggestion.priority)}`}>
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">{suggestion.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize">
                                {suggestion.type.replace(/_/g, ' ')}
                              </Badge>
                              {suggestion.impact && (
                                <Badge className="text-xs">
                                  Impact: {suggestion.impact}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{suggestion.description}</p>
                            
                            {suggestion.recommended_user_name && (
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                    {suggestion.recommended_user_name[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-slate-600">
                                  <strong>{suggestion.recommended_user_name}</strong> ({suggestion.recommended_user_role})
                                </span>
                              </div>
                            )}
                            
                            <p className="text-xs text-slate-600 italic mb-3">
                              💡 {suggestion.rationale}
                            </p>

                            <div className="flex gap-2 flex-wrap">
                              {suggestion.type === 'create_task' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCreateTask(suggestion)}
                                  disabled={createTaskMutation.isPending}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Create Task
                                </Button>
                              )}
                              {(suggestion.type === 'assign_reviewer' || suggestion.type === 'send_reminder') && suggestion.recommended_user_email && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDraftMessage(suggestion)}
                                  disabled={isDraftingMessage}
                                >
                                  {isDraftingMessage ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Mail className="w-3 h-3 mr-1" />
                                  )}
                                  Draft Message
                                </Button>
                              )}
                              {suggestion.estimated_effort_hours && (
                                <Badge variant="outline" className="text-xs">
                                  ⏱️ Est. {suggestion.estimated_effort_hours}h
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {insights.risks && insights.risks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Identified Risks ({insights.risks.length})
                </h3>
                <div className="space-y-2">
                  {insights.risks.map((risk, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>{risk.risk}</strong>
                        <p className="text-sm mt-1">Mitigation: {risk.mitigation}</p>
                        {risk.affected_sections && risk.affected_sections.length > 0 && (
                          <p className="text-xs mt-1">Affects: {risk.affected_sections.join(', ')}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Workload Analysis */}
            {insights.workload_analysis && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-600" />
                    Workload Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.workload_analysis.overloaded_members?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ Overloaded:</p>
                      <p className="text-sm text-amber-800">{insights.workload_analysis.overloaded_members.join(', ')}</p>
                    </div>
                  )}
                  {insights.workload_analysis.underutilized_members?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">💡 Available Capacity:</p>
                      <p className="text-sm text-amber-800">{insights.workload_analysis.underutilized_members.join(', ')}</p>
                    </div>
                  )}
                  {insights.workload_analysis.recommendations?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">Recommendations:</p>
                      <ul className="text-sm text-amber-800 space-y-1">
                        {insights.workload_analysis.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={runAnalysis}
                variant="outline"
                disabled={isAnalyzing}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Analysis
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Draft Message
            </DialogTitle>
            <DialogDescription>
              Review and customize the AI-drafted message before sending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input
                value={messageRecipient}
                onChange={(e) => setMessageRecipient(e.target.value)}
                placeholder="recipient@email.com"
              />
            </div>

            <div>
              <Label>Subject</Label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject"
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={draftedMessage}
                onChange={(e) => setDraftedMessage(e.target.value)}
                rows={8}
                placeholder="Message content..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !messageRecipient || !draftedMessage}
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}