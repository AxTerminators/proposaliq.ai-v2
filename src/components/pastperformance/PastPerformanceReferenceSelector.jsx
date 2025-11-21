import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Award, Building2, Calendar, DollarSign, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import SmartSuggestions from './SmartSuggestions';

/**
 * PastPerformanceReferenceSelector
 * 
 * Modal for selecting past performance records to reference in proposal writing.
 * Used by AI writer to pull relevant past performance examples.
 * 
 * Props:
 * - open: boolean - dialog open state
 * - onClose: function - close handler
 * - onSelect: function - callback with selected record IDs
 * - organizationId: string - current org
 * - proposalContext: object - optional proposal context for smart suggestions
 * - selectedIds: array - currently selected record IDs
 */
export default function PastPerformanceReferenceSelector({
    open,
    onClose,
    onSelect,
    organizationId,
    proposalContext = null,
    selectedIds = []
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [localSelected, setLocalSelected] = useState(selectedIds);

    // Fetch available records
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            const allRecords = await base44.entities.PastPerformanceRecord.filter(
                { organization_id: organizationId },
                '-created_date'
            );
            
            // Filter out records with red flags unless explicitly marked as candidates
            return allRecords.filter(r => 
                !r.avoid_for_ai_default || r.is_candidate_for_proposal
            );
        },
        enabled: !!organizationId && open
    });

    // Filter records based on search
    const filteredRecords = records.filter(record => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            record.title?.toLowerCase().includes(search) ||
            record.customer_agency?.toLowerCase().includes(search) ||
            record.work_scope_tags?.some(tag => tag.toLowerCase().includes(search)) ||
            record.naics_codes?.some(code => code.includes(search))
        );
    });

    // Sort by priority and relevance
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        // Primary records first
        const aPriority = a.priority_for_proposal === 'primary' ? 3 : a.priority_for_proposal === 'secondary' ? 2 : 1;
        const bPriority = b.priority_for_proposal === 'primary' ? 3 : b.priority_for_proposal === 'secondary' ? 2 : 1;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Then by usage count
        return (b.usage_count || 0) - (a.usage_count || 0);
    });

    const handleToggle = (recordId) => {
        setLocalSelected(prev => 
            prev.includes(recordId) 
                ? prev.filter(id => id !== recordId)
                : [...prev, recordId]
        );
    };

    const handleConfirm = async () => {
        // Track usage if proposalId is provided
        if (proposalContext?.id && localSelected.length > 0) {
            try {
                await base44.functions.invoke('trackPastPerformanceUsage', {
                    record_ids: localSelected,
                    proposal_id: proposalContext.id,
                    context: 'manual_selection'
                });
            } catch (error) {
                console.error('Failed to track usage (non-blocking):', error);
            }
        }
        
        onSelect(localSelected);
        onClose();
    };

    const getPriorityBadge = (priority) => {
        if (priority === 'primary') return <Badge className="bg-green-500">Primary</Badge>;
        if (priority === 'secondary') return <Badge className="bg-blue-500">Secondary</Badge>;
        return <Badge className="bg-slate-500">Background</Badge>;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Past Performance References</DialogTitle>
                    <DialogDescription>
                        Choose records for the AI to reference when generating proposal content.
                        {proposalContext && ` For: ${proposalContext.proposal_name}`}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="suggestions">
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Suggestions
                        </TabsTrigger>
                        <TabsTrigger value="all">
                            <Search className="w-4 h-4 mr-2" />
                            All Records
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="suggestions" className="space-y-4 mt-4">
                        {proposalContext?.id && (
                            <SmartSuggestions
                                proposalId={proposalContext.id}
                                organizationId={organizationId}
                                onSelectRecord={(record) => handleToggle(record.id)}
                                maxSuggestions={5}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="all" className="space-y-4 mt-4">
                        {/* Search */}
                        <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search by title, agency, tags, or NAICS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Selection Summary */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">
                        {localSelected.length} selected
                    </span>
                    {localSelected.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocalSelected([])}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {/* Records List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading records...</div>
                    ) : sortedRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            {searchQuery ? 'No records match your search' : 'No records available'}
                        </div>
                    ) : (
                        sortedRecords.map(record => {
                            const isSelected = localSelected.includes(record.id);
                            
                            return (
                                <Card 
                                    key={record.id} 
                                    className={cn(
                                        "cursor-pointer transition-all hover:shadow-md",
                                        isSelected && "border-2 border-blue-500 bg-blue-50"
                                    )}
                                    onClick={() => handleToggle(record.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggle(record.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            
                                            <div className="flex-1 space-y-2">
                                                {/* Title and badges */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-semibold text-slate-900 flex-1">
                                                        {record.title}
                                                    </h4>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {record.priority_for_proposal && getPriorityBadge(record.priority_for_proposal)}
                                                        {record.record_type === 'cpars' && (
                                                            <Badge className="bg-purple-100 text-purple-700">CPARS</Badge>
                                                        )}
                                                        {record.overall_rating === 'Exceptional' && (
                                                            <Badge className="bg-green-100 text-green-700">
                                                                <Award className="w-3 h-3 mr-1" />
                                                                Exceptional
                                                            </Badge>
                                                        )}
                                                        {record.has_red_flags && (
                                                            <Badge variant="destructive">
                                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {record.customer_agency && (
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <Building2 className="w-3 h-3" />
                                                            {record.customer_agency}
                                                        </div>
                                                    )}
                                                    {record.pop_end_date && (
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(record.pop_end_date).getFullYear()}
                                                        </div>
                                                    )}
                                                    {record.contract_value_display && (
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <DollarSign className="w-3 h-3" />
                                                            {record.contract_value_display}
                                                        </div>
                                                    )}
                                                    {record.usage_count > 0 && (
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Used {record.usage_count}x
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tags */}
                                                {record.work_scope_tags && record.work_scope_tags.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {record.work_scope_tags.slice(0, 3).map(tag => (
                                                            <Badge key={tag} variant="outline" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {record.work_scope_tags.length > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{record.work_scope_tags.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Relevance note */}
                                                {record.relevance_to_proposal && (
                                                    <p className="text-xs text-slate-600 italic line-clamp-2">
                                                        "{record.relevance_to_proposal}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-slate-600">
                        Tip: Primary records will be featured more prominently
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} disabled={localSelected.length === 0}>
                            Use {localSelected.length} Record{localSelected.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}