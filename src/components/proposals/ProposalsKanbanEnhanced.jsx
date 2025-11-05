import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  Users,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATE_8_PHASE_SINGLE_WORD, handleChecklistAction } from "./ChecklistActionRegistry";

// Import all modals
import Phase1BasicInfoModal from "../builder/modals/Phase1BasicInfoModal";
import Phase1TeamModal from "../builder/modals/Phase1TeamModal";
import Phase2ResourcesModal from "../builder/modals/Phase2ResourcesModal";
import Phase3SolicitationModal from "../builder/modals/Phase3SolicitationModal";
import Phase4ComplianceModal from "../builder/modals/Phase4ComplianceModal";
import Phase4CompetitorModal from "../builder/modals/Phase4CompetitorModal";
import Phase5StrategyModal from "../builder/modals/Phase5StrategyModal";
import Phase5SectionsModal from "../builder/modals/Phase5SectionsModal";
import Phase8ReviewModal from "../builder/modals/Phase8ReviewModal";
import Phase8ExportModal from "../builder/modals/Phase8ExportModal";
import Phase8WinLossModal from "../builder/modals/Phase8WinLossModal";

// Kanban Card Component
function KanbanCard({ proposal, organization, onUpdate, columnId }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Get checklist for current column
  const column = TEMPLATE_8_PHASE_SINGLE_WORD.columns.find(col => col.id === columnId);
  const checklistItems = column?.checklist_items || [];

  // Get completion status from proposal
  const checklistStatus = proposal.current_stage_checklist_status?.[columnId] || {};

  const completedCount = checklistItems.filter(item => 
    checklistStatus[item.id]?.completed
  ).length;

  const handleChecklistItemClick = async (item, proposal) => {
    if (item.type === "manual_check") {
      // Toggle completion
      const isCompleted = checklistStatus[item.id]?.completed || false;
      await onUpdate(proposal.id, {
        current_stage_checklist_status: {
          ...proposal.current_stage_checklist_status,
          [columnId]: {
            ...checklistStatus,
            [item.id]: {
              completed: !isCompleted,
              completed_by: !isCompleted ? (await base44.auth.me()).email : null,
              completed_date: !isCompleted ? new Date().toISOString() : null
            }
          }
        }
      });
    } else if (item.type === "modal_trigger" || item.type === "page_trigger") {
      // Handle action
      handleChecklistAction(item.associated_action, proposal, organization, navigate, (modalName) => {
        setActiveModal(modalName);
      });
    }
  };

  const handleModalSave = async (data) => {
    await onUpdate(proposal.id, data);
    setActiveModal(null);
  };

  return (
    <>
      <Card className="mb-3 hover:shadow-lg transition-shadow cursor-pointer border-slate-200">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
                {proposal.proposal_name}
              </CardTitle>
              <div className="flex flex-wrap gap-1 text-xs text-slate-600">
                {proposal.agency_name && (
                  <span className="truncate">{proposal.agency_name}</span>
                )}
                {proposal.solicitation_number && (
                  <span className="text-slate-400">• {proposal.solicitation_number}</span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {proposal.project_type || "RFP"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-3">
          {/* Key Metrics */}
          <div className="flex items-center justify-between text-xs">
            {proposal.contract_value && (
              <div className="flex items-center gap-1 text-slate-600">
                <DollarSign className="w-3 h-3" />
                <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
              </div>
            )}
            {proposal.due_date && (
              <div className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3 h-3" />
                <span>{new Date(proposal.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Checklist Progress */}
          {checklistItems.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span>Checklist</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-semibold",
                    completedCount === checklistItems.length ? "text-green-600" : "text-slate-600"
                  )}>
                    {completedCount}/{checklistItems.length}
                  </span>
                  {completedCount === checklistItems.length && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </button>

              {/* Checklist Items */}
              {expanded && (
                <div className="mt-2 space-y-1.5 pl-2">
                  {checklistItems.map((item) => {
                    const isCompleted = checklistStatus[item.id]?.completed || false;
                    const isManual = item.type === "manual_check";

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded hover:bg-slate-50 transition-colors",
                          !isManual && "cursor-pointer"
                        )}
                        onClick={() => !isManual && handleChecklistItemClick(item, proposal)}
                      >
                        {isManual ? (
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => handleChecklistItemClick(item, proposal)}
                            className="mt-0.5"
                          />
                        ) : (
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs",
                            isCompleted ? "text-slate-500 line-through" : "text-slate-700"
                          )}>
                            {item.label}
                          </p>
                          {item.required && !isCompleted && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 mt-0.5">
                              Required
                            </Badge>
                          )}
                        </div>
                        {!isManual && !isCompleted && (
                          <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Required Alert */}
          {proposal.action_required && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-900 line-clamp-1">
                {proposal.action_required_description || "Action required"}
              </span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}`)}
              className="flex-1 text-xs h-7"
            >
              Open
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {activeModal === "phase1_basic" && (
        <Phase1BasicInfoModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
          onSave={handleModalSave}
        />
      )}
      {activeModal === "phase1_team" && (
        <Phase1TeamModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
          onSave={handleModalSave}
        />
      )}
      {activeModal === "phase2_resources" && (
        <Phase2ResourcesModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
          onSave={handleModalSave}
        />
      )}
      {activeModal === "phase3_solicitation" && (
        <Phase3SolicitationModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
          onSave={handleModalSave}
        />
      )}
      {activeModal === "phase4_compliance" && (
        <Phase4ComplianceModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
      {activeModal === "phase4_competitor" && (
        <Phase4CompetitorModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
      {activeModal === "phase5_strategy" && (
        <Phase5StrategyModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
      {activeModal === "phase5_sections" && (
        <Phase5SectionsModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
        />
      )}
      {activeModal === "phase8_review" && (
        <Phase8ReviewModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
      {activeModal === "phase8_export" && (
        <Phase8ExportModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
      {activeModal === "phase8_winloss" && (
        <Phase8WinLossModal
          open={true}
          onOpenChange={(open) => !open && setActiveModal(null)}
          proposal={proposal}
          organization={organization}
        />
      )}
    </>
  );
}

// Main Kanban Board Component
export default function ProposalsKanbanEnhanced({ organization }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals-enhanced', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Proposal.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals-enhanced'] });
    },
  });

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }

    const proposalId = draggableId;
    const newColumnId = destination.droppableId;

    await updateProposalMutation.mutateAsync({
      id: proposalId,
      data: {
        custom_workflow_stage_id: newColumnId,
        status: getStatusFromColumn(newColumnId)
      }
    });
  };

  const getStatusFromColumn = (columnId) => {
    const column = TEMPLATE_8_PHASE_SINGLE_WORD.columns.find(c => c.id === columnId);
    return column?.default_status_mapping || "evaluating";
  };

  const getProposalsForColumn = (columnId) => {
    return proposals.filter(p => 
      (p.custom_workflow_stage_id === columnId) ||
      (!p.custom_workflow_stage_id && columnId === "phase1_basics")
    );
  };

  const handleCreateProposal = async () => {
    const newProposal = await base44.entities.Proposal.create({
      proposal_name: "New Proposal",
      organization_id: organization.id,
      custom_workflow_stage_id: "phase1_basics",
      status: "evaluating",
      current_stage_checklist_status: {}
    });

    navigate(createPageUrl("ProposalBuilder") + `?id=${newProposal.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading proposals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">8-Phase Proposal Workflow</h2>
          <p className="text-sm text-slate-600 mt-1">
            Guided workflow with built-in checklists for each phase
          </p>
        </div>
        <Button onClick={handleCreateProposal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TEMPLATE_8_PHASE_SINGLE_WORD.columns.map((column) => {
            const columnProposals = getProposalsForColumn(column.id);

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80"
              >
                <Card className={cn(
                  "border-t-4",
                  column.color || "border-t-slate-400"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>{column.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {columnProposals.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[500px] space-y-0",
                          snapshot.isDraggingOver && "bg-blue-50"
                        )}
                      >
                        {columnProposals.map((proposal, index) => (
                          <Draggable
                            key={proposal.id}
                            draggableId={proposal.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  snapshot.isDragging && "opacity-50"
                                )}
                              >
                                <KanbanCard
                                  proposal={proposal}
                                  organization={organization}
                                  onUpdate={(id, data) => updateProposalMutation.mutateAsync({ id, data })}
                                  columnId={column.id}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {columnProposals.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-sm">
                            No proposals
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}