import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, RefreshCw } from "lucide-react";

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  agencies = [],
  assignees = [],
  proposalTypes = []
}) {
  const activeFiltersCount = Object.values(filters || {}).filter(
    v => v && v !== "all" && v !== ""
  ).length;

  const handleReset = () => {
    onFiltersChange({
      searchQuery: "",
      filterAgency: "all",
      filterAssignee: "all",
      filterType: "all",
      filterStatus: "all"
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={activeFiltersCount === 0}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          <SheetDescription>
            Filter and search your proposals
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="mobile_search" className="text-base font-semibold">
              Search
            </Label>
            <Input
              id="mobile_search"
              placeholder="Search proposals..."
              value={filters?.searchQuery || ""}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              className="h-12 text-base"
            />
          </div>

          {/* Proposal Type */}
          {proposalTypes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Proposal Type</Label>
              <Select
                value={filters?.filterType || "all"}
                onValueChange={(value) => onFiltersChange({ ...filters, filterType: value })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {proposalTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Status</Label>
            <Select
              value={filters?.filterStatus || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, filterStatus: value })}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="evaluating">Evaluating</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agency */}
          {agencies.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Agency</Label>
              <Select
                value={filters?.filterAgency || "all"}
                onValueChange={(value) => onFiltersChange({ ...filters, filterAgency: value })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="All Agencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {agencies.map(agency => (
                    <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee */}
          {assignees.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Assigned To</Label>
              <Select
                value={filters?.filterAssignee || "all"}
                onValueChange={(value) => onFiltersChange({ ...filters, filterAssignee: value })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="All Team Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {assignees.map(email => (
                    <SelectItem key={email} value={email}>
                      {email.split('@')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button 
            onClick={onClose}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base"
          >
            Apply Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-white text-blue-600">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}