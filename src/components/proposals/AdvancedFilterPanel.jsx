import React, { useState } from "react";
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
import { format } from "date-fns";
import {
  Filter,
  Plus,
  X,
  Calendar as CalendarIcon,
  DollarSign,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER_FIELDS = [
  { value: 'status', label: 'Status', type: 'select' },
  { value: 'proposal_type_category', label: 'Proposal Type', type: 'select' },
  { value: 'agency_name', label: 'Agency', type: 'text' },
  { value: 'contract_value', label: 'Contract Value', type: 'number' },
  { value: 'due_date', label: 'Due Date', type: 'date' },
  { value: 'match_score', label: 'Match Score', type: 'number' },
  { value: 'lead_writer_email', label: 'Lead Writer', type: 'select' },
  { value: 'current_phase', label: 'Builder Phase', type: 'select' },
  { value: 'project_type', label: 'Project Type', type: 'select' },
];

const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'starts_with', label: 'Starts With' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  date: [
    { value: 'is', label: 'Is' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is Empty' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is Not' },
    { value: 'is_empty', label: 'Is Empty' },
  ]
};

const STATUS_OPTIONS = [
  'evaluating', 'watch_list', 'draft', 'in_progress', 
  'submitted', 'won', 'lost', 'archived'
];

const PROPOSAL_TYPE_OPTIONS = [
  'RFP', 'RFI', 'SBIR', 'GSA', 'IDIQ', 'STATE_LOCAL', 'OTHER'
];

const PROJECT_TYPE_OPTIONS = [
  'RFP', 'RFQ', 'RFI', 'IFB', 'Other'
];

const PHASE_OPTIONS = [
  'phase1', 'phase2', 'phase3', 'phase4', 
  'phase5', 'phase6', 'phase7', 'phase8'
];

export default function AdvancedFilterPanel({ 
  proposals, 
  onFilterChange, 
  teamMembers = [] 
}) {
  const [filters, setFilters] = useState([
    {
      id: Date.now(),
      field: '',
      operator: '',
      value: '',
      value2: '', // For 'between' operators
    }
  ]);

  const handleAddFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now(),
        field: '',
        operator: '',
        value: '',
        value2: '',
      }
    ]);
  };

  const handleRemoveFilter = (filterId) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const handleFilterChange = (filterId, field, value) => {
    setFilters(filters.map(f => {
      if (f.id === filterId) {
        const updatedFilter = { ...f, [field]: value };
        
        // Reset operator and values when field changes
        if (field === 'field') {
          const fieldConfig = FILTER_FIELDS.find(ff => ff.value === value);
          updatedFilter.operator = '';
          updatedFilter.value = '';
          updatedFilter.value2 = '';
        }
        
        return updatedFilter;
      }
      return f;
    }));
  };

  const handleApplyFilters = () => {
    // Validate filters
    const validFilters = filters.filter(f => 
      f.field && f.operator && (f.value || f.operator === 'is_empty')
    );

    if (validFilters.length === 0) {
      onFilterChange([]);
      return;
    }

    // Apply filtering logic
    const filtered = proposals.filter(proposal => {
      return validFilters.every(filter => {
        const fieldValue = proposal[filter.field];
        
        // Handle empty checks
        if (filter.operator === 'is_empty') {
          return !fieldValue || fieldValue === '';
        }

        // Text operators
        if (filter.operator === 'contains') {
          return fieldValue?.toString().toLowerCase().includes(filter.value.toLowerCase());
        }
        if (filter.operator === 'equals') {
          return fieldValue?.toString().toLowerCase() === filter.value.toLowerCase();
        }
        if (filter.operator === 'not_equals') {
          return fieldValue?.toString().toLowerCase() !== filter.value.toLowerCase();
        }
        if (filter.operator === 'starts_with') {
          return fieldValue?.toString().toLowerCase().startsWith(filter.value.toLowerCase());
        }

        // Number operators
        if (filter.operator === 'greater_than') {
          return parseFloat(fieldValue) > parseFloat(filter.value);
        }
        if (filter.operator === 'less_than') {
          return parseFloat(fieldValue) < parseFloat(filter.value);
        }

        // Date operators
        if (filter.operator === 'before') {
          return new Date(fieldValue) < new Date(filter.value);
        }
        if (filter.operator === 'after') {
          return new Date(fieldValue) > new Date(filter.value);
        }
        if (filter.operator === 'is' && filter.field.includes('date')) {
          return new Date(fieldValue).toDateString() === new Date(filter.value).toDateString();
        }

        // Between operators
        if (filter.operator === 'between') {
          if (filter.field.includes('date')) {
            const date = new Date(fieldValue);
            return date >= new Date(filter.value) && date <= new Date(filter.value2);
          } else {
            const num = parseFloat(fieldValue);
            return num >= parseFloat(filter.value) && num <= parseFloat(filter.value2);
          }
        }

        return true;
      });
    });

    onFilterChange(filtered);
  };

  const handleClearFilters = () => {
    setFilters([{
      id: Date.now(),
      field: '',
      operator: '',
      value: '',
      value2: '',
    }]);
    onFilterChange([]);
  };

  const getFieldType = (fieldValue) => {
    const field = FILTER_FIELDS.find(f => f.value === fieldValue);
    return field?.type || 'text';
  };

  const getOperators = (fieldValue) => {
    const fieldType = getFieldType(fieldValue);
    return OPERATORS[fieldType] || OPERATORS.text;
  };

  const renderValueInput = (filter) => {
    const fieldType = getFieldType(filter.field);
    
    if (filter.operator === 'is_empty') {
      return null;
    }

    if (fieldType === 'date') {
      return (
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filter.value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.value ? format(new Date(filter.value), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filter.value ? new Date(filter.value) : undefined}
                onSelect={(date) => handleFilterChange(filter.id, 'value', date)}
              />
            </PopoverContent>
          </Popover>
          
          {filter.operator === 'between' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filter.value2 && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value2 ? format(new Date(filter.value2), "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filter.value2 ? new Date(filter.value2) : undefined}
                  onSelect={(date) => handleFilterChange(filter.id, 'value2', date)}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      );
    }

    if (fieldType === 'select') {
      let options = [];
      
      if (filter.field === 'status') options = STATUS_OPTIONS;
      else if (filter.field === 'proposal_type_category') options = PROPOSAL_TYPE_OPTIONS;
      else if (filter.field === 'current_phase') options = PHASE_OPTIONS;
      else if (filter.field === 'project_type') options = PROJECT_TYPE_OPTIONS;
      else if (filter.field === 'lead_writer_email') options = teamMembers;
      
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => handleFilterChange(filter.id, 'value', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === 'number') {
      return (
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="Enter value"
            value={filter.value}
            onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
          />
          {filter.operator === 'between' && (
            <Input
              type="number"
              placeholder="End value"
              value={filter.value2}
              onChange={(e) => handleFilterChange(filter.id, 'value2', e.target.value)}
            />
          )}
        </div>
      );
    }

    return (
      <Input
        placeholder="Enter value"
        value={filter.value}
        onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
      />
    );
  };

  const validFiltersCount = filters.filter(f => 
    f.field && f.operator && (f.value || f.operator === 'is_empty')
  ).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Advanced Filters
          {validFiltersCount > 0 && (
            <Badge className="bg-blue-600 text-white h-5 w-5 p-0 flex items-center justify-center">
              {validFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="end">
        <div className="p-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Advanced Filters</h3>
            </div>
            {validFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {filters.map((filter, index) => (
            <div key={filter.id} className="p-3 border rounded-lg bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Filter {index + 1}
                </span>
                {filters.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveFilter(filter.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
                {/* Field Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Field</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) => handleFilterChange(filter.id, 'field', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                {filter.field && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => handleFilterChange(filter.id, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperators(filter.field).map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Value Input */}
                {filter.field && filter.operator && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    {renderValueInput(filter)}
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={handleAddFilter}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Filter
          </Button>
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-2">
          <Button
            onClick={handleApplyFilters}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={validFiltersCount === 0}
          >
            <Zap className="w-4 h-4 mr-2" />
            Apply Filters ({validFiltersCount})
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}