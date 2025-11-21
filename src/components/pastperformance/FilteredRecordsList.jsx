import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Building2, 
    Calendar, 
    DollarSign, 
    Award,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * FilteredRecordsList Component
 * 
 * Displays past performance records with applied filters
 * Includes sort options, view/edit/delete actions
 */
export default function FilteredRecordsList({ 
    records, 
    loading,
    sortBy,
    sortOrder,
    onSort,
    onView,
    onEdit,
    onDelete,
    onExport
}) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                            <div className="h-4 bg-slate-200 rounded w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Records Found
                </h3>
                <p className="text-sm text-slate-600">
                    Try adjusting your filters or search criteria
                </p>
            </Card>
        );
    }

    const formatCurrency = (value) => {
        if (!value) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const getRatingColor = (rating) => {
        switch (rating) {
            case 'Exceptional': return 'text-green-700 bg-green-100';
            case 'Very Good': return 'text-blue-700 bg-blue-100';
            case 'Satisfactory': return 'text-slate-700 bg-slate-100';
            case 'Marginal': return 'text-amber-700 bg-amber-100';
            case 'Unsatisfactory': return 'text-red-700 bg-red-100';
            default: return 'text-slate-700 bg-slate-100';
        }
    };

    return (
        <div className="space-y-4">
            {/* Sort Options */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    Showing {records.length} record{records.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSort('title')}
                        className={cn(sortBy === 'title' && 'bg-blue-50')}
                    >
                        Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSort('pop_start_date')}
                        className={cn(sortBy === 'pop_start_date' && 'bg-blue-50')}
                    >
                        Date {sortBy === 'pop_start_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSort('contract_value')}
                        className={cn(sortBy === 'contract_value' && 'bg-blue-50')}
                    >
                        Value {sortBy === 'contract_value' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Button>
                </div>
            </div>

            {/* Records List */}
            <div className="space-y-3">
                {records.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 mb-1">
                                                {record.title}
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                {record.customer_agency}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                        {record.pop_start_date && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-600">
                                                    {format(new Date(record.pop_start_date), 'MMM yyyy')} - {' '}
                                                    {record.pop_end_date ? format(new Date(record.pop_end_date), 'MMM yyyy') : 'Present'}
                                                </span>
                                            </div>
                                        )}
                                        {record.contract_value && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <DollarSign className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-600">
                                                    {formatCurrency(record.contract_value)}
                                                </span>
                                            </div>
                                        )}
                                        {record.role && (
                                            <Badge variant="secondary" className="capitalize">
                                                {record.role}
                                            </Badge>
                                        )}
                                        {record.contract_type && (
                                            <Badge variant="outline">
                                                {record.contract_type}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Ratings & Flags */}
                                    <div className="flex flex-wrap gap-2">
                                        {record.record_type === 'cpars' && record.is_official_cpars && (
                                            <Badge className="bg-purple-100 text-purple-700">
                                                <Award className="w-3 h-3 mr-1" />
                                                Official CPARS
                                            </Badge>
                                        )}
                                        {record.overall_rating && (
                                            <Badge className={getRatingColor(record.overall_rating)}>
                                                {record.overall_rating}
                                            </Badge>
                                        )}
                                        {record.has_red_flags && (
                                            <Badge className="bg-red-100 text-red-700">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Red Flags
                                            </Badge>
                                        )}
                                        {record.priority_for_proposal === 'primary' && (
                                            <Badge className="bg-green-100 text-green-700">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Primary
                                            </Badge>
                                        )}
                                        {record.work_scope_tags?.slice(0, 2).map((tag, idx) => (
                                            <Badge key={idx} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {record.work_scope_tags?.length > 2 && (
                                            <Badge variant="secondary">
                                                +{record.work_scope_tags.length - 2} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onView(record)}
                                        title="View details"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(record)}
                                        title="Edit record"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    {onExport && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onExport([record])}
                                            title="Export to PDF/Word"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(record)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete record"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}