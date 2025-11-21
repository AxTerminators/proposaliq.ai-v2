import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Eye, Edit, Trash2, AlertTriangle, Building2, Calendar, DollarSign, Award, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * RecordListView Component
 * Displays all past performance records with filtering and search
 * 
 * Props:
 * - organizationId: current organization ID
 * - onEdit: callback when edit is clicked
 * - onView: callback when view is clicked
 * - onDelete: callback when delete is clicked
 */
export default function RecordListView({ organizationId, onEdit, onView, onDelete }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [recordTypeFilter, setRecordTypeFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [sortBy, setSortBy] = useState('-created_date');

    // Fetch records
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            return base44.entities.PastPerformanceRecord.filter(
                { organization_id: organizationId },
                sortBy
            );
        },
        enabled: !!organizationId
    });

    // Filter records
    const filteredRecords = records.filter(record => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
            record.title?.toLowerCase().includes(searchLower) ||
            record.customer_agency?.toLowerCase().includes(searchLower) ||
            record.contract_number?.toLowerCase().includes(searchLower);

        // Record type filter
        const matchesType = recordTypeFilter === 'all' || record.record_type === recordTypeFilter;

        // Rating filter
        let matchesRating = true;
        if (ratingFilter === 'exceptional') {
            matchesRating = record.overall_rating === 'Exceptional';
        } else if (ratingFilter === 'red_flags') {
            matchesRating = record.has_red_flags;
        }

        return matchesSearch && matchesType && matchesRating;
    });

    // Get rating badge color
    const getRatingColor = (rating) => {
        if (['Exceptional', 'Very Good'].includes(rating)) return 'bg-green-100 text-green-800';
        if (rating === 'Satisfactory') return 'bg-blue-100 text-blue-800';
        if (rating === 'Marginal') return 'bg-yellow-100 text-yellow-800';
        if (rating === 'Unsatisfactory') return 'bg-red-100 text-red-800';
        return 'bg-slate-100 text-slate-800';
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters and Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Search records..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Record Type Filter */}
                        <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="general_pp">General Past Performance</SelectItem>
                                <SelectItem value="cpars">CPARS Evaluation</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Rating Filter */}
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Ratings" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ratings</SelectItem>
                                <SelectItem value="exceptional">Exceptional Only</SelectItem>
                                <SelectItem value="red_flags">With Red Flags</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    Showing <strong>{filteredRecords.length}</strong> of {records.length} records
                </p>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="-created_date">Newest First</SelectItem>
                        <SelectItem value="created_date">Oldest First</SelectItem>
                        <SelectItem value="-pop_end_date">End Date (Recent)</SelectItem>
                        <SelectItem value="title">Title (A-Z)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {searchQuery || recordTypeFilter !== 'all' || ratingFilter !== 'all'
                                ? 'No records match your filters'
                                : 'No records yet'}
                        </h3>
                        <p className="text-slate-600">
                            {searchQuery || recordTypeFilter !== 'all' || ratingFilter !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Add your first past performance record to get started'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredRecords.map((record) => (
                        <Card key={record.id} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Main Content */}
                                    <div className="flex-1 space-y-3">
                                        {/* Title and Badges */}
                                        <div className="flex items-start gap-3 flex-wrap">
                                            <h3 className="text-lg font-semibold text-slate-900 flex-1">
                                                {record.title}
                                            </h3>
                                            <Badge className={
                                                record.record_type === 'cpars'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }>
                                                {record.record_type === 'cpars' ? 'CPARS' : 'General'}
                                            </Badge>
                                            {record.has_red_flags && (
                                                <Badge variant="destructive">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    Red Flags
                                                </Badge>
                                            )}
                                            {record.is_candidate_for_proposal && (
                                                <Badge className="bg-green-100 text-green-700">
                                                    <Award className="w-3 h-3 mr-1" />
                                                    Proposal Ready
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            {record.customer_agency && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-700">{record.customer_agency}</span>
                                                </div>
                                            )}
                                            {record.pop_start_date && record.pop_end_date && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-700">
                                                        {new Date(record.pop_start_date).getFullYear()} - {new Date(record.pop_end_date).getFullYear()}
                                                    </span>
                                                </div>
                                            )}
                                            {record.contract_value && (
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-700">
                                                        ${(record.contract_value / 1000000).toFixed(1)}M
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* CPARS Rating */}
                                        {record.overall_rating && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-600">CPARS Rating:</span>
                                                <Badge className={getRatingColor(record.overall_rating)}>
                                                    {record.overall_rating}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* AI Extraction Badge */}
                                        {record.ai_extraction_metadata && (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    🤖 AI Extracted ({record.ai_extraction_metadata.confidence_score}% confidence)
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => onView(record)}
                                            title="View details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => onEdit(record)}
                                            title="Edit record"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => onDelete(record)}
                                            title="Delete record"
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}