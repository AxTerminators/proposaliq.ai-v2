import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowRight,
  Users,
  Settings,
  PlayCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ReviewWorkflowBuilder({ proposal, client, teamMembers = [] }) {
  const queryClient = useQueryClient();
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowData, setWorkflowData] = useState({
    request_title: "",
    request_description: "",
    request_type: "proposal_acceptance",
    approval_type: "all_required",
    is_sequential: false,
    required_approvers: [],
    due_date: ""
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientApprovalRequest.create({
        ...data,
        proposal_id: proposal.id,
        client_id: client.id,
        overall_status: 'pending',
        requested_by: 'consultant',
        requested_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-approval-requests'] });
      setShowWorkflowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setWorkflowData({
      request_title: "",
      request_description: "",
      request_type: "proposal_acceptance",
      approval_type: "all_required",
      is_sequential: false,
      required_approvers: [],
      due_date: ""
    });
  };

  const handleAddApprover = () => {
    if (teamMembers.length === 0) {
      alert("No team members available. Add team members first.");
      return;
    }

    const newApprover = {
      team_member_id: teamMembers[0].id,
      member_name: teamMembers[0].member_name,
      member_email: teamMembers[0].member_email,
      approval_status: 'pending',
      vote_weight: 1
    };

    setWorkflowData({
      ...workflowData,
      required_approvers: [...workflowData.required_approvers, newApprover]
    });
  };

  const handleRemoveApprover = (index) => {
    const newApprovers = workflowData.required_approvers.filter((_, i) => i !== index);
    setWorkflowData({ ...workflowData, required_approvers: newApprovers });
  };

  const handleUpdateApprover = (index, field, value) => {
    const newApprovers = [...workflowData.required_approvers];
    
    if (field === 'team_member_id') {
      const selectedMember = teamMembers.find(m => m.id === value);
      if (selectedMember) {
        newApprovers[index] = {
          ...newApprovers[index],
          team_member_id: value,
          member_name: selectedMember.member_name,
          member_email: selectedMember.member_email
        };
      }
    } else {
      newApprovers[index][field] = value;
    }
    
    setWorkflowData({ ...workflowData, required_approvers: newApprovers });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(workflowData.required_approvers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWorkflowData({ ...workflowData, required_approvers: items });
  };

  const handleCreateWorkflow = () => {
    if (!workflowData.request_title.trim()) {
      alert("Please enter a workflow title");
      return;
    }

    if (workflowData.required_approvers.length === 0) {
      alert("Please add at least one approver");
      return;
    }

    createWorkflowMutation.mutate(workflowData);
  };

  const getApprovalTypeLabel = (type) => {
    const labels = {
      all_required: "All Must Approve",
      majority: "Majority Vote",
      any_one: "Any One Approver",
      weighted: "Weighted Vote"
    };
    return labels[type] || type;
  };

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-600" />
                Review & Approval Workflows
              </CardTitle>
              <CardDescription>
                Create structured review cycles with formal approval gates
              </CardDescription>
            </div>
            <Button onClick={() => setShowWorkflowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Benefits of Formal Workflows</p>
                <ul className="text-sm text-green-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Clear approval requirements and accountability</li>
                  <li>Audit trail of all review and approval decisions</li>
                  <li>Sequential or parallel approval processes</li>
                  <li>Automatic notifications to stakeholders</li>
                  <li>Track approval progress in real-time</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Creation Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Review & Approval Workflow</DialogTitle>
            <DialogDescription>
              Set up a formal review process for {proposal.proposal_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Workflow Title *</label>
                <Input
                  value={workflowData.request_title}
                  onChange={(e) => setWorkflowData({ ...workflowData, request_title: e.target.value })}
                  placeholder="e.g., Final Executive Review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={workflowData.request_description}
                  onChange={(e) => setWorkflowData({ ...workflowData, request_description: e.target.value })}
                  placeholder="What needs to be reviewed and approved?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Workflow Type</label>
                  <Select
                    value={workflowData.request_type}
                    onValueChange={(value) => setWorkflowData({ ...workflowData, request_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal_acceptance">Proposal Acceptance</SelectItem>
                      <SelectItem value="budget_approval">Budget Approval</SelectItem>
                      <SelectItem value="scope_change">Scope Change</SelectItem>
                      <SelectItem value="final_review">Final Review</SelectItem>
                      <SelectItem value="milestone">Milestone Approval</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={workflowData.due_date}
                    onChange={(e) => setWorkflowData({ ...workflowData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Approval Type */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Approval Logic</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Approval Type</label>
                  <Select
                    value={workflowData.approval_type}
                    onValueChange={(value) => setWorkflowData({ ...workflowData, approval_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_required">All Must Approve</SelectItem>
                      <SelectItem value="majority">Majority Vote (51%+)</SelectItem>
                      <SelectItem value="any_one">Any One Approver</SelectItem>
                      <SelectItem value="weighted">Weighted Vote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Approval Order</label>
                  <Select
                    value={workflowData.is_sequential ? 'sequential' : 'parallel'}
                    onValueChange={(value) => setWorkflowData({ ...workflowData, is_sequential: value === 'sequential' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parallel">Parallel (all at once)</SelectItem>
                      <SelectItem value="sequential">Sequential (one by one)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 text-sm text-blue-700">
                {workflowData.approval_type === 'all_required' && "All approvers must approve for workflow to complete."}
                {workflowData.approval_type === 'majority' && "More than 50% of approvers must approve."}
                {workflowData.approval_type === 'any_one' && "Only one approver needs to approve."}
                {workflowData.approval_type === 'weighted' && "Approval based on weighted votes (configure weights below)."}
              </div>
            </div>

            {/* Approvers List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">Required Approvers</h4>
                <Button variant="outline" size="sm" onClick={handleAddApprover}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Approver
                </Button>
              </div>

              {workflowData.required_approvers.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No approvers added yet</p>
                  <p className="text-xs text-slate-500 mt-1">Click "Add Approver" to start</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="approvers">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {workflowData.required_approvers.map((approver, index) => (
                          <Draggable key={index} draggableId={`approver-${index}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-4 border-2 rounded-lg bg-white transition-all",
                                  snapshot.isDragging ? "border-blue-500 shadow-lg" : "border-slate-200"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
                                    {workflowData.is_sequential ? index + 1 : <Users className="w-4 h-4" />}
                                  </div>
                                  
                                  <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium mb-1">Team Member</label>
                                        <Select
                                          value={approver.team_member_id}
                                          onValueChange={(value) => handleUpdateApprover(index, 'team_member_id', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {teamMembers.map((member) => (
                                              <SelectItem key={member.id} value={member.id}>
                                                {member.member_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {workflowData.approval_type === 'weighted' && (
                                        <div>
                                          <label className="block text-xs font-medium mb-1">Vote Weight</label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={approver.vote_weight}
                                            onChange={(e) => handleUpdateApprover(index, 'vote_weight', parseInt(e.target.value))}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {workflowData.is_sequential && (
                                      <div className="flex items-center gap-2 text-xs text-blue-600">
                                        <ArrowRight className="w-3 h-3" />
                                        Step {index + 1} of {workflowData.required_approvers.length}
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveApprover(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Warning */}
            {workflowData.required_approvers.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Important:</p>
                    <p>Once started, this workflow cannot be cancelled. All approvers will be notified immediately.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkflowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={createWorkflowMutation.isPending || workflowData.required_approvers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {createWorkflowMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}