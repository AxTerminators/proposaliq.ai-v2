import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, AlertCircle, RefreshCw, Database, Building2, Activity, X, Layers, DollarSign, TrendingUp, Search as SearchIcon, Settings, Trash2, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ProposalsKanban from "@/components/proposals/ProposalsKanban";
import ProposalsList from "@/components/proposals/ProposalsList";
import ProposalsTable from "@/components/proposals/ProposalsTable";
import PipelineAnalytics from "@/components/analytics/PipelineAnalytics";
import SnapshotGenerator from "@/components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "@/components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "@/components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "@/components/automation/AutomationExecutor";
import MobileKanbanView from "@/components/mobile/MobileKanbanView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SampleDataGuard from "@/components/ui/SampleDataGuard";
import PredictiveHealthDashboard from "@/components/proposals/PredictiveHealthDashboard";
import QuickCreateProposal from "@/components/proposals/QuickCreateProposal";
import QuickBoardCreation from "@/components/proposals/QuickBoardCreation";
import BoardAnalytics from "@/components/proposals/BoardAnalytics";
import SavedViews from "@/components/proposals/SavedViews";
import BoardActivityFeed from "@/components/proposals/BoardActivityFeed";
import GlobalSearch from "@/components/proposals/GlobalSearch";
import MultiBoardAnalytics from "@/components/analytics/MultiBoardAnalytics";
import { Badge } from "@/components/ui/badge";
import ProposalCardModal from "@/components/proposals/ProposalCardModal";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PipelineBanner from "@/components/proposals/PipelineBanner";

export default function Pipeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSampleDataGuard, setShowSampleDataGuard] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const hasInitialized = useRef(false);
  const [isCreatingMasterBoard, setIsCreatingMasterBoard] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showCreateBoardDialog, setShowCreateBoardDialog] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showQuickBoardCreate, setShowQuickBoardCreate] = useState(false);
  const [showBoardAnalytics, setShowBoardAnalytics] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [savedFilters, setSavedFilters] = useState({
    searchQuery: "",
    filterAgency: "all",
    filterAssignee: "all"
  });
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [listGroupBy, setListGroupBy] = useState('none');
  const [tableGroupBy, setTableGroupBy] = useState('none');
  const [showMultiBoardAnalytics, setShowMultiBoardAnalytics] = useState(false);
  const [showBoardManager, setShowBoardManager] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [showDeleteBoardDialog, setShowDeleteBoardDialog] = useState(false);
  const [selectedProposalToOpen, setSelectedProposalToOpen] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [initialModalToOpen, setInitialModalToOpen] = useState(null);
  const [pendingProposalModal, setPendingProposalModal] = useState(null);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);

  // ... keep all existing code (useEffect hooks, queries, handlers) ...

  return (
    <div className="flex flex-col h-full">
      <AutomationExecutor
        organization={organization}
        proposals={proposals}
        automationRules={automationRules}
      />

      <PipelineBanner
        selectedBoard={selectedBoard}
        allBoards={allBoards}
        onCreateProposal={handleCreateProposal}
        onBoardChange={setSelectedBoardId}
        onCreateBoard={() => setShowQuickBoardCreate(true)}
        onShowStats={() => setShowBoardAnalytics(!showBoardAnalytics)}
        onShowPortfolio={() => setShowMultiBoardAnalytics(!showMultiBoardAnalytics)}
        onShowAutomation={() => setShowAutomation(!showAutomation)}
        onShowAnalytics={() => setShowAnalytics(!showAnalytics)}
        onShowActivity={() => setShowActivityFeed(!showActivityFeed)}
        onShowSavedViews={() => {}}
        onManageBoards={() => setShowBoardManager(true)}
        onCategorizeProposals={handleMigrateProposals}
        onShowAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        onShowHelp={() => setShowHelp(!showHelp)}
        onShowQuickFilters={() => setShowQuickFilters(!showQuickFilters)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pipelineValue={pipelineStats.totalValue}
        winRate={pipelineStats.winRate}
        showStats={showBoardAnalytics}
        showPortfolio={showMultiBoardAnalytics}
        showAutomation={showAutomation}
        showAnalytics={showAnalytics}
        showActivity={showActivityFeed}
        isMobile={isMobile}
      />

      {/* ... keep all existing code (rest of component) ... */}