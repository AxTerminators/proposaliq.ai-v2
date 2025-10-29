
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Users
} from "lucide-react";
import moment from "moment";

export default function ApprovalManager({ proposal, organization, user }) {
  // Guard clause
  if (!proposal || !organization || !user) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-slate-300" />
          <p className="text-slate-600">Loading approval manager...</p>
        </CardContent>
      </Card>
    );
  }

  return <ApprovalManagerContent proposal={proposal} organization={organization} user={user} />;
}

function ApprovalManagerContent({ proposal, organization, user }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [approvalComments, setApprovalComments] = useState("");
  const [formData, setFormData] = useState({
    workflow_name: "",
    description: "",
    milestone: "final_review",
    approval_steps: [],
    requires_all_approvals: true
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['approval-workflows', proposal.id],
    queryFn: async () => {
      return base44.entities.ApprovalWorkflow.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization.id],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    initialData: [],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData) => {
      const workflow = await base44.entities.ApprovalWorkflow.create({
        ...workflowData,
        organization_id: organization.id,
        proposal_id: proposal.id,
        workflow_status: "not_started",
        current_step: 0,
        created_by: user.email, // Ensure created_by is set
      });

      // Notify first approver
      if (workflowData.approval_steps.length > 0) {
        const firstStep = workflowData.approval_steps[0];
        await base44.entities.Notification.create({
          user_email: firstStep.approver_email,
          notification_type: "approval_request",
          title: "Approval Required",
          message: `Your approval is needed for: ${workflowData.workflow_name}`,
          related_proposal_id: proposal.id,
          related_entity_id: workflow.id,
          related_entity_type: "approval",
          from_user_email: user.email,
          from_user_name: user.full_name,
          action_url: `/app/ProposalBuilder?id=${proposal.id}`
        });
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows', proposal.id] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ workflowId, stepIndex, approved, comments }) => {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const updatedSteps = [...workflow.approval_steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        approval_status: approved ? "approved" : "rejected",
        approval_date: new Date().toISOString(),
        comments: comments
      };

      const allApproved = updatedSteps.every(step => 
        !step.is_required || step.approval_status === "approved"
      );
      const anyRejected = updatedSteps.some(step => step.approval_status === "rejected");

      let newStatus = workflow.workflow_status;
      let completedDate = null;
      let nextStepIndex = workflow.current_step;

      if (anyRejected) {
        newStatus = "rejected";
        completedDate = new Date().toISOString();
      } else if (allApproved) {
        newStatus = "completed";
        completedDate = new Date().toISOString();
      } else {
        // Only advance current_step if the current step was approved and it's not the last step
        if (approved && stepIndex === workflow.current_step && workflow.auto_advance !== false) { // Default auto_advance to true if not explicitly false
          nextStepIndex = workflow.current_step + 1;
        }
        newStatus = "in_progress";
      }

      await base44.entities.ApprovalWorkflow.update(workflowId, {
        approval_steps: updatedSteps,
        current_step: nextStepIndex, // Update current_step based on logic above
        workflow_status: newStatus,
        completed_date: completedDate
      });

      // Notify next approver if exists and approved
      if (approved && nextStepIndex < updatedSteps.length && workflow.auto_advance !== false && newStatus === "in_progress") {
        const nextApprover = updatedSteps[nextStepIndex];
        if (nextApprover?.approver_email) { // Ensure there is a next approver and email
          await base44.entities.Notification.create({
            user_email: nextApprover.approver_email,
            notification_type: "approval_request",
            title: "Approval Required",
            message: `Your approval is needed for: ${workflow.workflow_name}`,
            related_proposal_id: proposal.id,
            related_entity_id: workflowId,
            related_entity_type: "approval",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: `/app/ProposalBuilder?id=${proposal.id}`
          });
        }
      }

      // Notify workflow creator of completion/rejection
      if (newStatus === "completed" || newStatus === "rejected") {
        if (workflow.created_by) { // Ensure created_by exists
          await base44.entities.Notification.create({
            user_email: workflow.created_by,
            notification_type: "status_change",
            title: `Approval Workflow ${newStatus === "completed" ? "Completed" : "Rejected"}`,
            message: `${workflow.workflow_name} has been ${newStatus}`,
            related_proposal_id: proposal.id,
            related_entity_id: workflowId,
            related_entity_type: "approval",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: `/app/ProposalBuilder?id=${proposal.id}`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows', proposal.id] });
      setApprovalComments("");
    },
  });

  const resetForm = () => {
    setFormData({
      workflow_name: "",
      description: "",
      milestone: "final_review",
      approval_steps: [],
      requires_all_approvals: true
    });
  };

  const addApprovalStep = () => {
    setFormData({
      ...formData,
      approval_steps: [
        ...formData.approval_steps,
        {
          step_order: formData.approval_steps.length,
          step_name: "",
          approver_email: "",
          approver_name: "",
          approver_role: "",
          approval_status: "pending",
          is_required: true
        }
      ]
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.approval_steps];
    if (field === 'approver_email') {
      const member = teamMembers.find(m => m.email === value);
      newSteps[index] = {
        ...newSteps[index],
        approver_email: value,
        approver_name: member?.full_name || value
      };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    setFormData({ ...formData, approval_steps: newSteps });
  };

  const removeStep = (index) => {
    setFormData({
      ...formData,
      approval_steps: formData.approval_steps.filter((_, i) => i !== index)
    });
  };

  const handleCreateWorkflow = () => {
    createWorkflowMutation.mutate(formData);
  };

  const handleApproval = (workflowId, stepIndex, approved) => {
    updateApprovalMutation.mutate({
      workflowId,
      stepIndex,
      approved,
      comments: approvalComments
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "pending": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getWorkflowStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Approval Workflows
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Manage approval steps for proposal milestones
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading workflows...</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">No approval workflows yet</p>
            <p className="text-sm mb-4">Create workflows to require approvals at key milestones</p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {workflows.map((workflow) => {
              const currentStepData = workflow.approval_steps?.[workflow.current_step];
              // Ensure approval_steps is an array before trying to access elements
              const isCurrentUserApprover = currentStepData?.approver_email === user?.email;

              return (
                <Card key={workflow.id} className="overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{workflow.workflow_name}</h4>
                        <p className="text-sm text-slate-600">{workflow.description}</p>
                      </div>
                      <Badge className={getWorkflowStatusColor(workflow.workflow_status)}>
                        {workflow.workflow_status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {(workflow.approval_steps || []).map((step, index) => {
                        const isCurrentStep = index === workflow.current_step;
                        const canApprove = isCurrentStep && step.approver_email === user?.email && step.approval_status === "pending";

                        return (
                          <div key={index} className={`flex items-start gap-4 p-3 rounded-lg border-2 ${
                            isCurrentStep ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                          }`}>
                            <div className="flex-shrink-0 mt-1">
                              {step.approval_status === "approved" ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              ) : step.approval_status === "rejected" ? (
                                <XCircle className="w-6 h-6 text-red-600" />
                              ) : isCurrentStep ? (
                                <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
                              ) : (
                                <Clock className="w-6 h-6 text-slate-400" />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">
                                  Step {index + 1}: {step.step_name || "Approval Required"}
                                </span>
                                <Badge variant="outline" className={getStatusColor(step.approval_status)}>
                                  {step.approval_status}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                <Users className="w-4 h-4" />
                                <span>{step.approver_name}</span>
                                {step.approver_role && (
                                  <>
                                    <span>•</span>
                                    <span>{step.approver_role}</span>
                                  </>
                                )}
                              </div>

                              {step.comments && (
                                <p className="text-sm text-slate-600 bg-white p-2 rounded border mt-2">
                                  💬 {step.comments}
                                </p>
                              )}

                              {step.approval_date && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {step.approval_status === "approved" ? "Approved" : "Rejected"} {moment(step.approval_date).fromNow()}
                                </p>
                              )}

                              {canApprove && (
                                <div className="mt-3 space-y-2">
                                  <Textarea
                                    placeholder="Add comments (optional)..."
                                    value={approvalComments}
                                    onChange={(e) => setApprovalComments(e.target.value)}
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleApproval(workflow.id, index, true)}
                                      disabled={updateApprovalMutation.isPending}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleApproval(workflow.id, index, false)}
                                      disabled={updateApprovalMutation.isPending}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Show arrow if it's not the last step */}
                            {index < (workflow.approval_steps?.length || 0) - 1 && (
                              <div className="flex-shrink-0 self-center">
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Approval Workflow</DialogTitle>
            <DialogDescription>
              Set up approval steps for this proposal milestone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  placeholder="e.g., Final Review Approval"
                  value={formData.workflow_name}
                  onChange={(e) => setFormData({ ...formData, workflow_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What is this workflow for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Milestone</Label>
                <Select value={formData.milestone} onValueChange={(value) => setFormData({ ...formData, milestone: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase_completion">Phase Completion</SelectItem>
                    <SelectItem value="section_completion">Section Completion</SelectItem>
                    <SelectItem value="final_review">Final Review</SelectItem>
                    <SelectItem value="submission">Before Submission</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Approval Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Approval Steps (Sequential)</Label>
                <Button size="sm" variant="outline" onClick={addApprovalStep}>
                  <Plus className="w-3 h-3 mr-2" />
                  Add Step
                </Button>
              </div>

              {formData.approval_steps.map((step, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Step {index + 1}</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Step name (e.g., Manager Approval)"
                      value={step.step_name}
                      onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                    />

                    <Select
                      value={step.approver_email}
                      onValueChange={(value) => updateStep(index, 'approver_email', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.length === 0 ? (
                          <SelectItem value={null} disabled>No team members found</SelectItem>
                        ) : (
                          teamMembers.map(member => (
                            <SelectItem key={member.email} value={member.email}>
                              {member.full_name} ({member.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Role (e.g., Project Manager)"
                      value={step.approver_role}
                      onChange={(e) => updateStep(index, 'approver_role', e.target.value)}
                    />
                  </div>
                </Card>
              ))}

              {formData.approval_steps.length === 0 && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No approval steps configured</p>
                  <p className="text-xs mt-1">Add at least one approval step</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={
                !formData.workflow_name || 
                formData.approval_steps.length === 0 || 
                formData.approval_steps.some(step => !step.approver_email || !step.step_name) ||
                createWorkflowMutation.isPending
              }
            >
              {createWorkflowMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workflow"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
