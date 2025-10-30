import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Circle, 
  Clock,
  FileText,
  Eye,
  MessageSquare,
  Send,
  Award,
  XCircle
} from "lucide-react";
import moment from "moment";

export default function ProposalStatusTimeline({ proposal }) {
  // Define the proposal journey stages
  const stages = [
    {
      id: "created",
      label: "Proposal Created",
      icon: FileText,
      description: "Proposal initiated by consultant",
      color: "blue"
    },
    {
      id: "in_progress",
      label: "In Development",
      icon: Clock,
      description: "Consultant is working on the proposal",
      color: "amber"
    },
    {
      id: "client_review",
      label: "Your Review",
      icon: Eye,
      description: "Awaiting your feedback",
      color: "purple"
    },
    {
      id: "revisions",
      label: "Revisions",
      icon: MessageSquare,
      description: "Addressing your feedback",
      color: "indigo"
    },
    {
      id: "submitted",
      label: "Submitted",
      icon: Send,
      description: "Submitted to agency",
      color: "blue"
    },
    {
      id: "decision",
      label: "Decision",
      icon: Award,
      description: "Awaiting award decision",
      color: "slate"
    }
  ];

  // Determine current stage based on proposal status
  const getCurrentStageIndex = () => {
    const statusMap = {
      "draft": 0,
      "evaluating": 0,
      "in_progress": 1,
      "client_review": 2,
      "submitted": 4,
      "client_accepted": 2,
      "client_rejected": 2,
      "won": 5,
      "lost": 5
    };
    
    return statusMap[proposal.status] ?? 0;
  };

  const currentStageIndex = getCurrentStageIndex();
  const hasClientFeedback = proposal.client_feedback_count > 0;
  const isRejected = proposal.status === "client_rejected" || proposal.status === "lost";
  const isAccepted = proposal.status === "client_accepted" || proposal.status === "won";

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Proposal Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-8">
            {stages.map((stage, index) => {
              const isPast = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isFuture = index > currentStageIndex;
              
              // Special handling for revisions stage
              const isRevisionsStage = stage.id === "revisions";
              const showRevisions = hasClientFeedback && (currentStageIndex >= 2);
              
              // Skip revisions stage if not applicable
              if (isRevisionsStage && !showRevisions) {
                return null;
              }

              const Icon = stage.icon;
              
              let stageStatus = "future";
              let iconColor = "text-slate-300";
              let bgColor = "bg-white";
              let borderColor = "border-slate-200";
              let textColor = "text-slate-500";

              if (isPast) {
                stageStatus = "completed";
                iconColor = "text-green-600";
                bgColor = "bg-green-50";
                borderColor = "border-green-200";
                textColor = "text-slate-900";
              } else if (isCurrent) {
                stageStatus = "active";
                iconColor = `text-${stage.color}-600`;
                bgColor = `bg-${stage.color}-50`;
                borderColor = `border-${stage.color}-300`;
                textColor = "text-slate-900";
              }

              return (
                <div key={stage.id} className="relative flex items-start gap-4">
                  {/* Icon Circle */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 ${borderColor} ${bgColor} flex items-center justify-center`}>
                    {isPast ? (
                      <CheckCircle2 className={`w-6 h-6 ${iconColor}`} />
                    ) : isCurrent ? (
                      <Icon className={`w-6 h-6 ${iconColor} animate-pulse`} />
                    ) : (
                      <Circle className={`w-6 h-6 ${iconColor}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-semibold ${textColor} mb-1`}>
                          {stage.label}
                        </h3>
                        <p className="text-sm text-slate-600">{stage.description}</p>
                        
                        {/* Additional context */}
                        {stage.id === "created" && proposal.created_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            {moment(proposal.created_date).format('MMM D, YYYY')}
                          </p>
                        )}
                        
                        {stage.id === "client_review" && isCurrent && (
                          <div className="mt-2">
                            <Badge className="bg-purple-100 text-purple-700">
                              Action Required
                            </Badge>
                          </div>
                        )}
                        
                        {stage.id === "client_review" && proposal.client_last_viewed && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last viewed: {moment(proposal.client_last_viewed).fromNow()}
                          </p>
                        )}
                        
                        {stage.id === "revisions" && hasClientFeedback && (
                          <p className="text-xs text-slate-500 mt-1">
                            {proposal.client_feedback_count} feedback item(s)
                          </p>
                        )}
                        
                        {stage.id === "submitted" && proposal.status === "submitted" && (
                          <p className="text-xs text-slate-500 mt-1">
                            Submitted {moment(proposal.updated_date).fromNow()}
                          </p>
                        )}
                        
                        {stage.id === "decision" && (isAccepted || isRejected) && (
                          <div className="mt-2">
                            {isAccepted ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {proposal.status === "won" ? "Award Received!" : "You Accepted"}
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                {proposal.status === "lost" ? "Not Awarded" : "You Rejected"}
                              </Badge>
                            )}
                            {proposal.client_decision_date && (
                              <p className="text-xs text-slate-500 mt-1">
                                {moment(proposal.client_decision_date).format('MMM D, YYYY')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isCurrent && (
                        <Badge variant="outline" className={`bg-${stage.color}-50 border-${stage.color}-200 text-${stage.color}-700`}>
                          Current Stage
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}