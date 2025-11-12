import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Filter, 
  X, 
  Save, 
  Calendar as CalendarIcon,
  Star,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const RECIPIENT_TYPES = [
  { value: 'client_organization', label: 'Client Organization' },
  { value: 'internal_team_member', label: 'Internal Team' },
  { value: 'teaming_partner', label: 'Teaming Partner' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'partially_completed', label: 'Partially Complete' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

export default function AdvancedDataCallFilters({ 
  filters, 
  onFiltersChange,
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [viewName, setViewName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    handleFilterChange(key, updated);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      recipientTypes: [],
      statuses: [],
      priorities: [],
      dateFrom: null,
      dateTo: null,
      createdBy: '',
      hasOverdue: false
    });
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      return;
    }
    onSaveView?.({ name: viewName, filters });
    setViewName('');
    setShowSaveDialog(false);
  };

  const activeFilterCount = 
    (filters.search ? 1 : 0) +
    (filters.recipientTypes?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.createdBy ? 1 : 0) +
    (filters.hasOverdue ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm text-slate-600">Quick Views:</Label>
          {savedViews.map(view => (
            <div key={view.id} className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadView?.(view)}
                className="h-8"
              >
                <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                {view.name}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDeleteView?.(view.id)}
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            showFilters && "bg-blue-50 border-blue-300"
          )}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-blue-600">{activeFilterCount}</Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}

        {activeFilterCount > 0 && !showSaveDialog && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="w-4 h-4 mr-2" />
            Save View
          </Button>
        )}
      </div>

      {/* Save View Input */}
      {showSaveDialog && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-sm">View Name</Label>
                <Input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="e.g., High Priority Client Calls"
                  className="mt-1 bg-white"
                />
              </div>
              <Button onClick={handleSaveView} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowSaveDialog(false);
                  setViewName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="border-2 border-slate-200">
          <CardContent className="p-6 space-y-6">
            {/* Search */}
            <div>
              <Label>Search</Label>
              <Input
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search title, description, recipient..."
                className="mt-1"
              />
            </div>

            {/* Multi-select Filters */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Recipient Types */}
              <div>
                <Label className="mb-2 block">Recipient Type</Label>
                <div className="space-y-2">
                  {RECIPIENT_TYPES.map(type => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`recipient-${type.value}`}
                        checked={filters.recipientTypes?.includes(type.value)}
                        onCheckedChange={() => toggleArrayFilter('recipientTypes', type.value)}
                      />
                      <Label 
                        htmlFor={`recipient-${type.value}`} 
                        className="text-sm cursor-pointer font-normal"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statuses */}
              <div>
                <Label className="mb-2 block">Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(status => (
                    <div key={status.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.statuses?.includes(status.value)}
                        onCheckedChange={() => toggleArrayFilter('statuses', status.value)}
                      />
                      <Label 
                        htmlFor={`status-${status.value}`} 
                        className="text-sm cursor-pointer font-normal"
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priorities */}
              <div>
                <Label className="mb-2 block">Priority</Label>
                <div className="space-y-2">
                  {PRIORITY_OPTIONS.map(priority => (
                    <div key={priority.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`priority-${priority.value}`}
                        checked={filters.priorities?.includes(priority.value)}
                        onCheckedChange={() => toggleArrayFilter('priorities', priority.value)}
                      />
                      <Label 
                        htmlFor={`priority-${priority.value}`} 
                        className="text-sm cursor-pointer font-normal"
                      >
                        {priority.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => handleFilterChange('dateFrom', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Due Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => handleFilterChange('dateTo', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasOverdue"
                checked={filters.hasOverdue}
                onCheckedChange={(checked) => handleFilterChange('hasOverdue', checked)}
              />
              <Label htmlFor="hasOverdue" className="cursor-pointer font-normal">
                Show only overdue items
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600">Active filters:</span>
          
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterChange('search', '')}
              />
            </Badge>
          )}

          {filters.recipientTypes?.map(type => (
            <Badge key={type} variant="secondary" className="gap-1">
              {RECIPIENT_TYPES.find(t => t.value === type)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('recipientTypes', type)}
              />
            </Badge>
          ))}

          {filters.statuses?.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              Status: {STATUS_OPTIONS.find(s => s.value === status)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('statuses', status)}
              />
            </Badge>
          ))}

          {filters.priorities?.map(priority => (
            <Badge key={priority} variant="secondary" className="gap-1">
              Priority: {PRIORITY_OPTIONS.find(p => p.value === priority)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('priorities', priority)}
              />
            </Badge>
          ))}

          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, 'MMM d, yyyy')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterChange('dateFrom', null)}
              />
            </Badge>
          )}

          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, 'MMM d, yyyy')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterChange('dateTo', null)}
              />
            </Badge>
          )}

          {filters.hasOverdue && (
            <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">
              Overdue Only
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterChange('hasOverdue', false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}