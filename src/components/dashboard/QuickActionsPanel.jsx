import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  LayoutGrid,
  Search,
  Users,
  Calendar,
  MessageSquare,
  Library,
  Award,
  Briefcase
} from "lucide-react";

const QuickActionsPanel = React.memo(function QuickActionsPanel({ organization }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const quickActions = React.useMemo(() => [
    {
      icon: Plus,
      label: "New Proposal",
      description: "Start a new proposal",
      color: "from-blue-500 to-indigo-600",
      action: () => navigate(createPageUrl("Pipeline"))
    },
    {
      icon: LayoutGrid,
      label: "Proposal Board",
      description: "View all proposals",
      color: "from-purple-500 to-pink-600",
      action: () => navigate(createPageUrl("Pipeline"))
    },
    {
      icon: Search,
      label: "Find Opportunities",
      description: "SAM.gov search",
      color: "from-green-500 to-emerald-600",
      action: () => navigate(createPageUrl("OpportunityFinder")),
      adminOnly: true
    },
    {
      icon: Library,
      label: "Resources",
      description: "Manage content",
      color: "from-amber-500 to-orange-600",
      action: () => navigate(createPageUrl("Resources"))
    },
    {
      icon: Award,
      label: "Past Performance",
      description: "Project history",
      color: "from-cyan-500 to-blue-600",
      action: () => navigate(createPageUrl("PastPerformance"))
    },
    {
      icon: Users,
      label: "Team",
      description: "Manage users",
      color: "from-rose-500 to-red-600",
      action: () => navigate(createPageUrl("Team"))
    },
    {
      icon: Calendar,
      label: "Calendar",
      description: "Schedule & deadlines",
      color: "from-violet-500 to-purple-600",
      action: () => navigate(createPageUrl("Calendar"))
    },
    {
      icon: MessageSquare,
      label: "AI Chat",
      description: "Ask questions",
      color: "from-teal-500 to-cyan-600",
      action: () => navigate(createPageUrl("Chat"))
    }
  ], [navigate]);

  const userIsSuperAdmin = user?.admin_role === 'super_admin';

  const filteredActions = React.useMemo(() => quickActions.filter(action => {
    if (action.adminOnly && !userIsSuperAdmin) {
      return false;
    }
    return true;
  }), [quickActions, userIsSuperAdmin]);

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredActions.map((action, idx) => (
            <Button
              key={idx}
              onClick={action.action}
              variant="outline"
              className={`h-24 flex-col gap-2 bg-gradient-to-br ${action.color} text-white border-none hover:opacity-90 transition-opacity`}
            >
              <action.icon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold text-sm">{action.label}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default QuickActionsPanel;