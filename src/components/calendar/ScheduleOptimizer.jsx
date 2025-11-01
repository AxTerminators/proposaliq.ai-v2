import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Loader2, TrendingUp, ArrowRight, CheckCircle, AlertCircle, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ScheduleOptimizer({ organization, user, allEvents, teamMembers, onOptimizationApplied }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);
  
  const [formData, setFormData] = useState({
    request_name: "",
    optimization_goal: "meet_deadline",
    target_completion_date: moment().add(14, 'days').format('YYYY-MM-DD'),
    scope: {
      include_team_members: [],
      include_event_types: ['proposal_task', 'proposal_deadline', 'review_deadline', 'compliance_due']
    },
    constraints: {
      max_hours_per_day: 8,
      max_concurrent_tasks_per_person: 3,
      required_buffer_hours: 2,
      preserve_existing_meetings: true,
      respect_quiet_hours: true
    }
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-list', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ 
        organization_id: organization.id,
        status: { $in: ['draft', 'in_progress'] }
      });
    },
    enabled: !!organization?.id,
  });

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      // Filter events based on scope
      const scopedEvents = allEvents.filter(event => {
        const isInDateRange = moment(event.start_date).isBefore(formData.target_completion_date);
        const isInScope = formData.scope.include_event_types.includes(event.source_type);
        const isAssignedToScope = formData.scope.include_team_members.length === 0 || 
          formData.scope.include_team_members.includes(event.assigned_to || event.created_by_email);
        
        return isInDateRange && isInScope && isAssignedToScope;
      });

      // Build optimization prompt
      const optimizationPrompt = `You are a scheduling optimization expert. Analyze this schedule and provide optimized recommendations.

GOAL: ${formData.optimization_goal.replace(/_/g, ' ')}
TARGET COMPLETION: ${moment(formData.target_completion_date).format('MMMM D, YYYY')}

CONSTRAINTS:
- Max ${formData.constraints.max_hours_per_day} hours per day per person
- Max ${formData.constraints.max_concurrent_tasks_per_person} concurrent tasks per person
- ${formData.constraints.required_buffer_hours} hour buffer between tasks
- ${formData.constraints.preserve_existing_meetings ? 'DO NOT' : 'CAN'} move existing meetings
- ${formData.constraints.respect_quiet_hours ? 'Respect quiet hours (after 6 PM)' : 'No time restrictions'}

CURRENT SCHEDULE (${scopedEvents.length} items):
${scopedEvents.map(e => `- ${e.title} | ${moment(e.start_date).format('MMM D')} | Assigned: ${e.assigned_to || 'Unassigned'}`).join('\n')}

TEAM CAPACITY:
${teamMembers.map(m => {
  const memberEvents = allEvents.filter(e => e.assigned_to === m.email || e.created_by_email === m.email);
  return `- ${m.full_name}: ${memberEvents.length} current tasks`;
}).join('\n')}

Provide optimized schedule with:
1. Specific date changes for each event
2. Reasoning for each change
3. Projected completion date
4. Workload balance score (0-100)
5. Risk reduction percentage
6. Overall efficiency gain`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: optimizationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            optimization_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_id: { type: "string" },
                  event_title: { type: "string" },
                  current_date: { type: "string" },
                  recommended_date: { type: "string" },
                  reasoning: { type: "string" },
                  impact_score: { type: "number" }
                }
              }
            },
            projected_outcomes: {
              type: "object",
              properties: {
                estimated_completion_date: { type: "string" },
                workload_balance_score: { type: "number" },
                risk_reduction_percentage: { type: "number" },
                efficiency_gain: { type: "string" }
              }
            },
            confidence_score: { type: "number" }
          }
        }
      });

      setResults(response);

      // Optionally save the request
      await base44.entities.ScheduleOptimizationRequest.create({
        organization_id: organization.id,
        request_name: formData.request_name || `Optimization ${moment().format('MMM D, YYYY')}`,
        optimization_goal: formData.optimization_goal,
        target_completion_date: formData.target_completion_date,
        scope: formData.scope,
        constraints: formData.constraints,
        status: 'completed',
        optimization_results: response.optimization_results || [],
        projected_outcomes: response.projected_outcomes || {},
        requested_by: user.email,
        ai_model_used: 'gemini',
        confidence_score: response.confidence_score || 0
      });

    } catch (error) {
      console.error("Error running optimization:", error);
      alert("Failed to optimize schedule");
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = async () => {
    if (!results?.optimization_results) return;

    try {
      // Apply each recommended change
      for (const change of results.optimization_results) {
        const event = allEvents.find(e => e.id === change.event_id || e.title === change.event_title);
        if (!event || !event.can_drag) continue;

        const newStart = moment(change.recommended_date);
        const currentStart = moment(event.start_date);
        const duration = moment(event.end_date).diff(currentStart);

        if (event.source_type === 'calendar_event') {
          await base44.entities.CalendarEvent.update(event.original_id || event.id, {
            start_date: newStart.toISOString(),
            end_date: newStart.clone().add(duration).toISOString()
          });
        } else if (event.source_type === 'proposal_task') {
          await base44.entities.ProposalTask.update(event.original_id || event.id, {
            due_date: newStart.toISOString()
          });
        }
      }

      queryClient.invalidateQueries();
      if (onOptimizationApplied) onOptimizationApplied();
      
      setShowDialog(false);
      setResults(null);
      alert('Schedule optimization applied successfully!');
      
    } catch (error) {
      console.error("Error applying optimization:", error);
      alert("Failed to apply optimization");
    }
  };

  const toggleTeamMember = (email) => {
    const members = formData.scope.include_team_members;
    if (members.includes(email)) {
      setFormData({
        ...formData,
        scope: {
          ...formData.scope,
          include_team_members: members.filter(e => e !== email)
        }
      });
    } else {
      setFormData({
        ...formData,
        scope: {
          ...formData.scope,
          include_team_members: [...members, email]
        }
      });
    }
  };

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="border-green-200 hover:bg-green-50"
      >
        <Zap className="w-4 h-4 mr-2" />
        Optimize Schedule
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) setResults(null);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              AI Schedule Optimizer
            </DialogTitle>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Optimization Name</label>
                <Input
                  value={formData.request_name}
                  onChange={(e) => setFormData({ ...formData, request_name: e.target.value })}
                  placeholder={`Optimization ${moment().format('MMM D, YYYY')}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Optimization Goal</label>
                <Select 
                  value={formData.optimization_goal}
                  onValueChange={(value) => setFormData({ ...formData, optimization_goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimize_duration">Minimize Duration</SelectItem>
                    <SelectItem value="balance_workload">Balance Team Workload</SelectItem>
                    <SelectItem value="meet_deadline">Meet Deadline</SelectItem>
                    <SelectItem value="minimize_overtime">Minimize Overtime</SelectItem>
                    <SelectItem value="maximize_quality">Maximize Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Completion Date</label>
                <Input
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Team Members to Optimize (leave empty for all)</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {teamMembers.map(member => (
                    <div key={member.email} className="flex items-center gap-2">
                      <Checkbox 
                        checked={formData.scope.include_team_members.includes(member.email)}
                        onCheckedChange={() => toggleTeamMember(member.email)}
                      />
                      <span className="text-sm">{member.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Hours Per Day</label>
                  <Input
                    type="number"
                    min="1"
                    max="16"
                    value={formData.constraints.max_hours_per_day}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, max_hours_per_day: parseInt(e.target.value) || 8 }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Concurrent Tasks</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.constraints.max_concurrent_tasks_per_person}
                    onChange={(e) => setFormData({
                      ...formData,
                      constraints: { ...formData.constraints, max_concurrent_tasks_per_person: parseInt(e.target.value) || 3 }
                    })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={runOptimization}
                  disabled={optimizing}
                  className="bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Optimize Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-2 border-green-500 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {moment(results.projected_outcomes?.estimated_completion_date).format('MMM D')}
                      </div>
                      <div className="text-xs text-slate-600">New Completion</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {results.projected_outcomes?.workload_balance_score || 0}%
                      </div>
                      <div className="text-xs text-slate-600">Balance Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {results.projected_outcomes?.risk_reduction_percentage || 0}%
                      </div>
                      <div className="text-xs text-slate-600">Risk Reduction</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">
                        {results.confidence_score || 0}%
                      </div>
                      <div className="text-xs text-slate-600">Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  Recommended Changes ({results.optimization_results?.length || 0})
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {results.optimization_results?.map((change, index) => (
                    <Card key={index} className="border-none shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                              change.impact_score >= 7 ? "bg-red-500" :
                              change.impact_score >= 5 ? "bg-amber-500" :
                              "bg-blue-500"
                            )}>
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1">
                            <h5 className="font-bold text-slate-900 mb-2">{change.event_title}</h5>
                            
                            <div className="flex items-center gap-4 text-sm mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-600">
                                  {moment(change.current_date).format('MMM D')}
                                </span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-green-600" />
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {moment(change.recommended_date).format('MMM D, YYYY')}
                                </span>
                              </div>
                            </div>

                            <p className="text-sm text-slate-600">{change.reasoning}</p>
                            
                            <Badge variant="secondary" className="mt-2">
                              Impact: {change.impact_score}/10
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setResults(null)}
                >
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      setShowDialog(false);
                      setResults(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={applyOptimization}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply Optimization
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}