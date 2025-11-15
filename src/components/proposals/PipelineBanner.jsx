import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  BarChart3,
  Layers,
  Zap,
  Activity,
  BookmarkCheck,
  Settings,
  TrendingUp,
  LayoutGrid,
  List,
  Table,
  DollarSign,
  Target,
  Filter,
  HelpCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function PipelineBanner({
  selectedBoard,
  allBoards,
  onCreateProposal,
  onBoardChange,
  onCreateBoard,
  onGlobalSearch,
  onShowStats,
  onShowPortfolio,
  onShowAutomation,
  onShowAnalytics,
  onShowActivity,
  onShowSavedViews,
  onManageBoards,
  onCategorizeProposals,
  onShowAdvancedFilters,
  onShowHelp,
  viewMode,
  onViewModeChange,
  pipelineValue,
  winRate,
  showStats,
  showPortfolio,
  showAutomation,
  showAnalytics,
  showActivity,
  isMobile
}) {
  const getBoardIcon = (boardType, isMaster) => {
    if (isMaster) return "⭐";
    switch (boardType) {
      case 'rfp': return "📋";
      case 'rfp_15_column': return "🎯";
      case 'rfi': return "📝";
      case 'sbir': return "🔬";
      case 'gsa': return "🏛️";
      case 'idiq': return "📑";
      case 'state_local': return "🏢";
      case 'template_workspace': return "📂";
      case 'custom_proposal': return "🎨";
      case 'custom_project': return "🛠️";
      default: return "📊";
    }
  };

  return (
    <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Part 1: Current Board (25%) */}
        <div className="lg:w-1/4 border-2 border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="flex flex-col gap-3">
            {selectedBoard && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getBoardIcon(selectedBoard.board_type, selectedBoard.is_master_board)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-0.5">Current Board</div>
                  <div className="font-bold text-slate-900 truncate">{selectedBoard.board_name}</div>
                </div>
              </div>
            )}
            <Button
              onClick={onCreateProposal}
              className="w-full bg-blue-600 hover:bg-blue-700 h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Button>
          </div>
        </div>

        {/* Part 2: Board Navigation (25%) */}
        <div className="lg:w-1/4 border-2 border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-2">Switch Board</div>
              <Select value={selectedBoard?.id} onValueChange={onBoardChange}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select board..." />
                </SelectTrigger>
                <SelectContent>
                  {allBoards.map(board => {
                    const icon = getBoardIcon(board.board_type, board.is_master_board);
                    return (
                      <SelectItem key={board.id} value={board.id}>
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span>{board.board_name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onCreateBoard}
              variant="outline"
              className="w-full h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Board
            </Button>
          </div>
        </div>

        {/* Part 3: Utilities & Metrics (50%) */}
        <div className="lg:w-1/2 border-2 border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-purple-50">
          <div className="flex flex-col gap-3">
            {/* Top Row: Icons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onGlobalSearch}
                className="h-9 w-9"
                title="Global Search"
              >
                <Search className="w-4 h-4" />
              </Button>

              {!isMobile && (
                <>
                  <Button
                    variant={showStats ? "default" : "ghost"}
                    size="icon"
                    onClick={onShowStats}
                    className="h-9 w-9"
                    title="Board Stats"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={showPortfolio ? "default" : "ghost"}
                    size="icon"
                    onClick={onShowPortfolio}
                    className="h-9 w-9"
                    title="Portfolio Analytics"
                  >
                    <Layers className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={showAutomation ? "default" : "ghost"}
                    size="icon"
                    onClick={onShowAutomation}
                    className="h-9 w-9"
                    title="Automation"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={showAnalytics ? "default" : "ghost"}
                    size="icon"
                    onClick={onShowAnalytics}
                    className="h-9 w-9"
                    title="Pipeline Analytics"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={showActivity ? "default" : "ghost"}
                    size="icon"
                    onClick={onShowActivity}
                    className="h-9 w-9"
                    title="Activity Feed"
                  >
                    <Activity className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShowSavedViews}
                    className="h-9 w-9"
                    title="Saved Views"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                  </Button>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="More Actions">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onShowAdvancedFilters}>
                    <Filter className="mr-2 h-4 w-4" />
                    <span>Advanced Filters</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onManageBoards}>
                    <Layers className="mr-2 h-4 w-4" />
                    <span>Manage Boards</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCategorizeProposals}>
                    <Target className="mr-2 h-4 w-4" />
                    <span>Categorize Proposals</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onShowHelp}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bottom Row: Metrics */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-xs text-slate-600">Pipeline Value</div>
                  <div className="font-bold text-slate-900">{pipelineValue}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs text-slate-600">Win Rate</div>
                  <div className="font-bold text-slate-900">{winRate}%</div>
                </div>
              </div>

              {!isMobile && (
                <div className="flex gap-1 border rounded-lg p-0.5 h-9 items-center ml-auto">
                  <Button
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewModeChange("kanban")}
                    title="Kanban View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewModeChange("list")}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewModeChange("table")}
                    title="Table View"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}