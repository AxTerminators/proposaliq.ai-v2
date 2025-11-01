import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

const statusColors = {
  evaluating: "bg-blue-100 text-blue-700",
  watch_list: "bg-yellow-100 text-yellow-700",
  draft: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500"
};

const KanbanCard = React.memo(({ proposal, index, onClick }) => {
  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`mb-3 transition-shadow ${
            snapshot.isDragging ? 'opacity-80 rotate-2' : ''
          }`}
        >
          <Card
            onClick={onClick}
            className={`cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 ${
              snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-400' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 text-sm leading-tight flex-1">
                    {proposal.proposal_name}
                  </h3>
                  {proposal.is_sample_data && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      SAMPLE
                    </Badge>
                  )}
                </div>

                {proposal.solicitation_number && (
                  <p className="text-xs text-slate-500 truncate">
                    {proposal.solicitation_number}
                  </p>
                )}

                <div className="space-y-2 text-xs text-slate-600">
                  {proposal.agency_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{proposal.agency_name}</span>
                    </div>
                  )}
                  {proposal.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(proposal.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {proposal.match_score && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>Score: {proposal.match_score}/100</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {proposal.project_type && (
                    <Badge variant="outline" className="text-xs">
                      {proposal.project_type}
                    </Badge>
                  )}
                  {proposal.contract_value && (
                    <span className="text-xs font-semibold text-slate-700">
                      ${(proposal.contract_value / 1000000).toFixed(1)}M
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
});

KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;