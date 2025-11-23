import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingState from "@/components/ui/LoadingState";

/**
 * Mobile-Optimized Proposal Builder
 * Simplified, touch-friendly interface for building proposals on mobile
 */
export default function MobileProposalBuilder({ proposalId }) {
  const navigate = useNavigate();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const PHASES = [
    { id: 'phase1', label: 'Basic Info', icon: FileText, description: 'Project details' },
    { id: 'phase2', label: 'Team', icon: Users, description: 'Team formation' },
    { id: 'phase3', label: 'Resources', icon: Settings, description: 'Gather resources' },
    { id: 'phase4', label: 'Content', icon: FileText, description: 'Write sections' },
    { id: 'phase5', label: 'Review', icon: CheckCircle2, description: 'Final review' }
  ];

  const { data: proposal, isLoading, refetch } = useQuery({
    queryKey: ['mobile-proposal', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0] || null;
    },
    enabled: !!proposalId,
  });

  const currentPhase = PHASES[currentPhaseIndex];
  const Icon = currentPhase.icon;

  const handleNext = () => {
    if (currentPhaseIndex < PHASES.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(currentPhaseIndex - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  if (isLoading) {
    return <LoadingState message="Loading proposal..." />;
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Proposal not found</p>
            <Button className="mt-4" onClick={() => navigate(createPageUrl("Pipeline"))}>
              Back to Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Pipeline"))}
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-slate-900 truncate">{proposal.proposal_name}</h1>
              <p className="text-xs text-slate-600">Mobile Builder</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>

          {/* Phase Progress */}
          <div className="flex items-center gap-1">
            {PHASES.map((phase, idx) => (
              <button
                key={phase.id}
                onClick={() => setCurrentPhaseIndex(idx)}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  idx < currentPhaseIndex ? "bg-green-500" :
                  idx === currentPhaseIndex ? "bg-blue-600" :
                  "bg-slate-200"
                )}
                aria-label={`Go to ${phase.label}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Phase Content */}
      <main className="p-4">
        <Card className="border-none shadow-lg mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{currentPhase.label}</CardTitle>
                <p className="text-sm text-slate-600">{currentPhase.description}</p>
              </div>
              <Badge variant="outline">
                Step {currentPhaseIndex + 1}/{PHASES.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-6 text-center">
              <p className="text-slate-600">
                Phase content would appear here.
                <br />
                Optimized for mobile interaction.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-friendly info cards */}
        <div className="space-y-3">
          <Card className="border-none shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Due Date</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {proposal.due_date || 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Team Members</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {proposal.assigned_team_members?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPhaseIndex === 0}
            className="flex-1 min-h-[48px]"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentPhaseIndex === PHASES.length - 1}
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </nav>
    </div>
  );
}