import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function QuickActionsPanel() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: "New Proposal",
      description: "Start a new proposal",
      color: "from-blue-500 to-indigo-500",
      onClick: () => navigate(createPageUrl("ProposalBuilder"))
    },
    {
      icon: Search,
      label: "Find Opportunities",
      description: "Browse SAM.gov",
      color: "from-purple-500 to-pink-500",
      onClick: () => navigate(createPageUrl("OpportunityFinder"))
    },
    {
      icon: MessageSquare,
      label: "AI Assistant",
      description: "Get AI help",
      color: "from-green-500 to-emerald-500",
      onClick: () => navigate(createPageUrl("Chat"))
    },
    {
      icon: Calendar,
      label: "Schedule Event",
      description: "Add to calendar",
      color: "from-amber-500 to-orange-500",
      onClick: () => navigate(createPageUrl("Calendar"))
    },
    {
      icon: FileText,
      label: "Add Resource",
      description: "Upload content",
      color: "from-cyan-500 to-blue-500",
      onClick: () => navigate(createPageUrl("Resources"))
    },
    {
      icon: Users,
      label: "Invite Team",
      description: "Add members",
      color: "from-rose-500 to-red-500",
      onClick: () => navigate(createPageUrl("Team"))
    }
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="group relative p-4 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                  action.color
                )}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {action.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}