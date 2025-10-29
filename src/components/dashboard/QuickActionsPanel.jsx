import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MessageSquare,
  Users,
  Upload,
  Zap
} from "lucide-react";

export default function QuickActionsPanel() {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Plus,
      label: "New Proposal",
      description: "Start a new proposal",
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => navigate(createPageUrl("ProposalBuilder"))
    },
    {
      icon: Search,
      label: "Find Opportunities",
      description: "Search SAM.gov (Coming Soon)",
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: () => alert("🚀 Opportunity Finder is coming soon! Stay tuned for direct SAM.gov integration.")
    },
    {
      icon: MessageSquare,
      label: "AI Chat",
      description: "Ask AI for help",
      color: "bg-indigo-500 hover:bg-indigo-600",
      onClick: () => navigate(createPageUrl("Chat"))
    },
    {
      icon: Users,
      label: "Invite Team",
      description: "Add team members",
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => navigate(createPageUrl("Team"))
    }
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center gap-2 transition-all hover:shadow-lg active:scale-95`}
            >
              <action.icon className="w-6 h-6" />
              <span className="font-semibold text-sm text-center">{action.label}</span>
              <span className="text-xs opacity-90 text-center">{action.description}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}