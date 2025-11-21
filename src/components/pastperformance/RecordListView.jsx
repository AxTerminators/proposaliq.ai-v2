import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal } from 'lucide-react';
import AdvancedFilters from './AdvancedFilters';
import FilteredRecordsList from './FilteredRecordsList';

/**
 * RecordListView Component
 * Main view for displaying and filtering past performance records
 */
export default function RecordListView({ organizationId, onView, onEdit, onDelete }) {
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [sortBy, setSortBy] = useState('created_date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filters, setFilters] = useState({
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
    const [savedPresets, setSavedPresets] = useState([]);

    // Fetch records
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            return base44.entities.PastPerformanceRecord.filter({ organization_id: organizationId });
        },
        enabled: !!organizationId
    });

    // Apply all filters
    const filteredRecords = records.filter(record => {
        // Search query
        const matchesSearch = !filters.searchQuery || 
            record.title?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
            record.customer_agency?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
            record.contract_number?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
            record.project_description?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
            record.work_scope_tags?.some(tag => tag.toLowerCase().includes(filters.searchQuery.toLowerCase()));

        // Basic filters
        const matchesType = filters.recordType === 'all' || record.record_type === filters.recordType;
        const matchesAgency = !filters.customerAgency || 
            record.customer_agency?.toLowerCase().includes(filters.customerAgency.toLowerCase());
        const matchesRole = filters.role === 'all' || record.role === filters.role;
        const matchesContractType = filters.contractType === 'all' || record.contract_type === filters.contractType;

        // Date filters
        const matchesStartDateFrom = !filters.startDateFrom || 
            (record.pop_start_date && new Date(record.pop_start_date) >= new Date(filters.startDateFrom));
        const matchesStartDateTo = !filters.startDateTo || 
            (record.pop_start_date && new Date(record.pop_start_date) <= new Date(filters.startDateTo));
        const matchesEndDateFrom = !filters.endDateFrom || 
            (record.pop_end_date && new Date(record.pop_end_date) >= new Date(filters.endDateFrom));
        const matchesEndDateTo = !filters.endDateTo || 
            (record.pop_end_date && new Date(record.pop_end_date) <= new Date(filters.endDateTo));

        // Financial filters
        const matchesMinValue = !filters.minValue || 
            (record.contract_value && record.contract_value >= parseFloat(filters.minValue));
        const matchesMaxValue = !filters.maxValue || 
            (record.contract_value && record.contract_value <= parseFloat(filters.maxValue));

        // Rating filters
        const matchesRating = filters.overallRating === 'all' || record.overall_rating === filters.overallRating;
        const matchesRedFlags = !filters.hasRedFlags || (filters.hasRedFlags && !record.has_red_flags);

        // Metadata filters
        const matchesPriority = filters.priority === 'all' || record.priority_for_proposal === filters.priority;
        const matchesTags = filters.tags.length === 0 || 
            filters.tags.some(tag => record.work_scope_tags?.includes(tag));

        return matchesSearch && matchesType && matchesAgency && matchesRole && matchesContractType &&
               matchesStartDateFrom && matchesStartDateTo && matchesEndDateFrom && matchesEndDateTo &&
               matchesMinValue && matchesMaxValue && matchesRating && matchesRedFlags &&
               matchesPriority && matchesTags;
    });

    // Handle sort
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Handle save preset
    const handleSavePreset = () => {
        const presetName = prompt('Enter a name for this filter preset:');
        if (presetName) {
            setSavedPresets([...savedPresets, { name: presetName, filters }]);
        }
    };

    // Sort records
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        let comparison = 0;
        switch (sortBy) {
            case 'title':
                comparison = (a.title || '').localeCompare(b.title || '');
                break;
            case 'pop_start_date':
                comparison = new Date(a.pop_start_date || 0) - new Date(b.pop_start_date || 0);
                break;
            case 'contract_value':
                comparison = (a.contract_value || 0) - (b.contract_value || 0);
                break;
            case 'created_date':
            default:
                comparison = new Date(b.created_date || 0) - new Date(a.created_date || 0);
        }
        return comparison * multiplier;
    });

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search by title, agency, contract number, description, tags..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        variant={showAdvancedFilters ? "default" : "outline"}
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                    </Button>
                </div>
            </Card>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
                <AdvancedFilters
                    filters={filters}
                    onChange={setFilters}
                    onSavePreset={handleSavePreset}
                    savedPresets={savedPresets}
                />
            )}

            {/* Records List */}
            <FilteredRecordsList
                records={sortedRecords}
                loading={isLoading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
}