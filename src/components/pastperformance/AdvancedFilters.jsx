import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Search, 
    Filter, 
    X, 
    Calendar,
    DollarSign,
    Star,
    Award,
    Building2,
    ChevronDown,
    ChevronUp,
    Save,
    FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AdvancedFilters Component
 * 
 * Comprehensive filtering interface for past performance records
 * Supports multiple filter types, saved presets, and quick filters
 */
export default function AdvancedFilters({ filters, onChange, onSavePreset, savedPresets = [] }) {
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        dates: false,
        financial: false,
        ratings: false,
        metadata: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateFilter = (key, value) => {
        onChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onChange({
            searchQuery: '',
            recordType: 'all',
            customerAgency: '',
            role: 'all',
            contractType: 'all',
            startDateFrom: '',
            startDateTo: '',
            endDateFrom: '',
            endDateTo: '',
            minValue: '',
            maxValue: '',
            overallRating: 'all',
            hasRedFlags: false,
            priority: 'all',
            tags: [],
            naicsCodes: []
        });
    };

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === 'searchQuery' || key === 'recordType') return false;
        if (Array.isArray(value)) return value.length > 0;
        return value && value !== 'all' && value !== false && value !== '';
    });

    const addTag = (tag) => {
        if (!filters.tags?.includes(tag)) {
            updateFilter('tags', [...(filters.tags || []), tag]);
        }
    };

    const removeTag = (tag) => {
        updateFilter('tags', filters.tags.filter(t => t !== tag));
    };

    return (
        <Card className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">Advanced Filters</h3>
                    {hasActiveFilters && (
                        <Badge variant="secondary">
                            {Object.entries(filters).filter(([k, v]) => 
                                k !== 'searchQuery' && k !== 'recordType' && 
                                ((Array.isArray(v) && v.length > 0) || (v && v !== 'all' && v !== false && v !== ''))
                            ).length} active
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="w-4 h-4 mr-1" />
                            Clear All
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={onSavePreset}>
                        <Save className="w-4 h-4 mr-1" />
                        Save Preset
                    </Button>
                </div>
            </div>

            {/* Saved Presets */}
            {savedPresets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {savedPresets.map((preset, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => onChange(preset.filters)}
                        >
                            <FolderOpen className="w-4 h-4 mr-1" />
                            {preset.name}
                        </Button>
                    ))}
                </div>
            )}

            {/* Basic Filters */}
            <FilterSection
                title="Basic Filters"
                icon={Search}
                expanded={expandedSections.basic}
                onToggle={() => toggleSection('basic')}
            >
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Record Type</Label>
                        <Select value={filters.recordType || 'all'} onValueChange={(v) => updateFilter('recordType', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="general_pp">General Past Performance</SelectItem>
                                <SelectItem value="cpars">CPARS Evaluations</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Customer/Agency</Label>
                        <Input
                            placeholder="Filter by agency name"
                            value={filters.customerAgency || ''}
                            onChange={(e) => updateFilter('customerAgency', e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Role</Label>
                        <Select value={filters.role || 'all'} onValueChange={(v) => updateFilter('role', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="prime">Prime Contractor</SelectItem>
                                <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Contract Type</Label>
                        <Select value={filters.contractType || 'all'} onValueChange={(v) => updateFilter('contractType', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="FFP">FFP</SelectItem>
                                <SelectItem value="T&M">T&M</SelectItem>
                                <SelectItem value="CPFF">CPFF</SelectItem>
                                <SelectItem value="CPAF">CPAF</SelectItem>
                                <SelectItem value="IDIQ">IDIQ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </FilterSection>

            {/* Date Filters */}
            <FilterSection
                title="Date Range"
                icon={Calendar}
                expanded={expandedSections.dates}
                onToggle={() => toggleSection('dates')}
            >
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Start Date From</Label>
                        <Input
                            type="date"
                            value={filters.startDateFrom || ''}
                            onChange={(e) => updateFilter('startDateFrom', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Start Date To</Label>
                        <Input
                            type="date"
                            value={filters.startDateTo || ''}
                            onChange={(e) => updateFilter('startDateTo', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>End Date From</Label>
                        <Input
                            type="date"
                            value={filters.endDateFrom || ''}
                            onChange={(e) => updateFilter('endDateFrom', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>End Date To</Label>
                        <Input
                            type="date"
                            value={filters.endDateTo || ''}
                            onChange={(e) => updateFilter('endDateTo', e.target.value)}
                        />
                    </div>
                </div>
            </FilterSection>

            {/* Financial Filters */}
            <FilterSection
                title="Contract Value"
                icon={DollarSign}
                expanded={expandedSections.financial}
                onToggle={() => toggleSection('financial')}
            >
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Minimum Value ($)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 1000000"
                            value={filters.minValue || ''}
                            onChange={(e) => updateFilter('minValue', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Maximum Value ($)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 10000000"
                            value={filters.maxValue || ''}
                            onChange={(e) => updateFilter('maxValue', e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => { updateFilter('minValue', '0'); updateFilter('maxValue', '1000000'); }}>
                        Under $1M
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { updateFilter('minValue', '1000000'); updateFilter('maxValue', '5000000'); }}>
                        $1M - $5M
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { updateFilter('minValue', '5000000'); updateFilter('maxValue', '10000000'); }}>
                        $5M - $10M
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { updateFilter('minValue', '10000000'); updateFilter('maxValue', ''); }}>
                        Over $10M
                    </Button>
                </div>
            </FilterSection>

            {/* Ratings Filters (CPARS) */}
            <FilterSection
                title="Performance Ratings"
                icon={Award}
                expanded={expandedSections.ratings}
                onToggle={() => toggleSection('ratings')}
            >
                <div className="space-y-4">
                    <div>
                        <Label>Overall Rating</Label>
                        <Select value={filters.overallRating || 'all'} onValueChange={(v) => updateFilter('overallRating', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ratings</SelectItem>
                                <SelectItem value="Exceptional">Exceptional</SelectItem>
                                <SelectItem value="Very Good">Very Good</SelectItem>
                                <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                                <SelectItem value="Marginal">Marginal</SelectItem>
                                <SelectItem value="Unsatisfactory">Unsatisfactory</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="hasRedFlags"
                            checked={filters.hasRedFlags || false}
                            onCheckedChange={(checked) => updateFilter('hasRedFlags', checked)}
                        />
                        <Label htmlFor="hasRedFlags" className="cursor-pointer">
                            Include records with red flags (Marginal/Unsatisfactory ratings)
                        </Label>
                    </div>
                </div>
            </FilterSection>

            {/* Metadata Filters */}
            <FilterSection
                title="Metadata & Tags"
                icon={Star}
                expanded={expandedSections.metadata}
                onToggle={() => toggleSection('metadata')}
            >
                <div className="space-y-4">
                    <div>
                        <Label>Priority Level</Label>
                        <Select value={filters.priority || 'all'} onValueChange={(v) => updateFilter('priority', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="secondary">Secondary</SelectItem>
                                <SelectItem value="background">Background</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Work Scope Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add tag and press Enter"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        addTag(e.target.value.trim());
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                        {filters.tags && filters.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {filters.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                                        {tag}
                                        <X className="w-3 h-3 ml-1" />
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </FilterSection>
        </Card>
    );
}

function FilterSection({ title, icon: Icon, expanded, onToggle, children }) {
    return (
        <div className="border-t pt-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between mb-3 hover:text-blue-600 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{title}</span>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && <div>{children}</div>}
        </div>
    );
}