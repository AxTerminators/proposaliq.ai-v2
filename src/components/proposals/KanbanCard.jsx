import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function KanbanCard({ proposal, index, onProposalClick, onDeleteProposal }) {
  const statusColors = {
    evaluating: "border-l-blue-500",
    watch_list: "border-l-yellow-500",
    draft: "border-l-slate-500",
    in_progress: "border-l-purple-500",
    submitted: "border-l-indigo-500",
    won: "border-l-green-500",
    lost: "border-l-red-500",
    archived: "border-l-gray-500"
  };

  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card 
            className={cn(
              "mb-3 border-l-4 cursor-pointer hover:shadow-lg transition-shadow bg-white",
              statusColors[proposal.status] || "border-l-slate-300",
              snapshot.isDragging && "shadow-2xl rotate-2 scale-105"
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle 
                  className="text-sm font-semibold line-clamp-2 flex-1"
                  onClick={() => onProposalClick(proposal)}
                >
                  {proposal.proposal_name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProposal(proposal);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {proposal.is_sample_data && (
                <Badge className="bg-amber-100 text-amber-700 w-fit mt-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  SAMPLE
                </Badge>
              )}
            </CardHeader>
            <CardContent 
              className="p-4 pt-2 space-y-2 text-xs"
              onClick={() => onProposalClick(proposal)}
            >
              {proposal.agency_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{proposal.agency_name}</span>
                </div>
              )}
              {proposal.due_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(proposal.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {proposal.solicitation_number && (
                <div className="text-slate-500 truncate">
                  {proposal.solicitation_number}
                </div>
              )}
              {proposal.match_score && (
                <Badge variant="outline" className="text-xs">
                  Match: {proposal.match_score}%
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

export default React.memo(KanbanCard);