import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  Trash2, 
  MoreVertical,
  AlertCircle,
  Clock,
  Users,
  CheckSquare,
  TrendingUp,
  Link2,
  Flag,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProposalCardModal from "./ProposalCardModal";

export default function KanbanCard({ proposal, index, onDelete, organization }) {
  const [showModal, setShowModal] = useState(false);

  // Fetch subtasks count for progress
  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks-count', proposal.id],
    queryFn: () => base44.entities.ProposalSubtask.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  // Fetch dependencies count
  const { data: dependencies = [] } = useQuery({
    queryKey: ['proposal-dependencies-count', proposal.id],
    queryFn: () => base44.entities.ProposalDependency.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

  const getPriorityColor = () => {
    if (proposal.is_blocked) return 'border-l-red-500';
    if (isOverdue) return 'border-l-red-500';
    if (isDueSoon) return 'border-l-amber-500';
    return 'border-l-blue-500';
  };

  const formatCurrency = (value) => {
    if (!value) return null;
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <>
      <Draggable draggableId={proposal.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <Card 
              className={cn(
                "mb-3 cursor-pointer hover:shadow-lg transition-all border-l-4",
                getPriorityColor(),
                snapshot.isDragging && "shadow-2xl rotate-2 scale-105"
              )}
              onClick={(e) => {
                if (!e.target.closest('button')) {
                  setShowModal(true);
                }
              }}
            >
              <CardContent className="p-4">
                {/* Header with Title and Menu */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 line-clamp-2 text-sm">
                      {proposal.proposal_name}
                    </h4>
                    {proposal.solicitation_number && (
                      <div className="text-xs text-slate-500 mt-1">
                        {proposal.solicitation_number}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowModal(true); }}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDelete(proposal); }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {proposal.project_type && (
                    <Badge variant="secondary" className="text-xs">
                      {proposal.project_type}
                    </Badge>
                  )}
                  {proposal.is_blocked && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      Overdue
                    </Badge>
                  )}
                  {isDueSoon && !isOverdue && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      Due Soon
                    </Badge>
                  )}
                </div>

                {/* Progress Bar (if subtasks exist) */}
                {totalSubtasks > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <div className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        <span>Progress</span>
                      </div>
                      <span>{completedSubtasks}/{totalSubtasks}</span>
                    </div>
                    <Progress value={subtaskProgress} className="h-1.5" />
                  </div>
                )}

                {/* Key Metrics Row */}
                <div className="space-y-2 text-xs">
                  {proposal.due_date && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className={cn(
                        "flex-1",
                        isOverdue && "text-red-600 font-semibold",
                        isDueSoon && !isOverdue && "text-amber-600 font-semibold"
                      )}>
                        {isOverdue 
                          ? `Overdue by ${Math.abs(daysUntilDue)} days`
                          : isDueSoon
                          ? `Due in ${daysUntilDue} days`
                          : moment(proposal.due_date).format('MMM D, YYYY')}
                      </span>
                    </div>
                  )}

                  {proposal.contract_value && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-semibold text-green-700">
                        {formatCurrency(proposal.contract_value)}
                      </span>
                    </div>
                  )}

                  {proposal.agency_name && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{proposal.agency_name}</span>
                    </div>
                  )}

                  {proposal.lead_writer_email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{proposal.lead_writer_email}</span>
                    </div>
                  )}

                  {dependencies.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{dependencies.length} dependencies</span>
                    </div>
                  )}

                  {proposal.match_score && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                      <span className="text-blue-600 font-semibold">
                        {proposal.match_score}% Match
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Members Avatars (if assigned) */}
                {proposal.assigned_team_members && proposal.assigned_team_members.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {proposal.assigned_team_members.slice(0, 3).map((email, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                          title={email}
                        >
                          {email[0].toUpperCase()}
                        </div>
                      ))}
                    </div>
                    {proposal.assigned_team_members.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{proposal.assigned_team_members.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>

      {/* Card Details Modal */}
      <ProposalCardModal
        proposal={proposal}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        organization={organization}
      />
    </>
  );
}