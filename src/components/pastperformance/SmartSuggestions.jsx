import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SmartSuggestions Component
 * 
 * Shows AI-suggested past performance records relevant to the current proposal
 * Displays relevance scores, key matches, and usage suggestions
 * 
 * Props:
 * - proposalId: ID of current proposal
 * - organizationId: Organization ID
 * - onSelectRecord: Callback when user selects a suggested record
 * - maxSuggestions: Maximum number of suggestions to show (default 5)
 */
export default function SmartSuggestions({ 
    proposalId, 
    organizationId, 
    onSelectRecord,
    maxSuggestions = 5 
}) {
    const [scoringRecord, setScoringRecord] = useState(null);
    const [scoredRecords, setScoredRecords] = useState({});

    // Fetch available records
    const { data: records = [], isLoading: recordsLoading } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            return await base44.entities.PastPerformanceRecord.filter(
                { organization_id: organizationId },
                '-usage_count'
            );
        },
        enabled: !!organizationId
    });

    // Auto-score top records
    React.useEffect(() => {
        if (!proposalId || !records.length || Object.keys(scoredRecords).length > 0) return;

        const scoreTopRecords = async () => {
            const topRecords = records.slice(0, Math.min(records.length, maxSuggestions));
            
            for (const record of topRecords) {
                try {
                    setScoringRecord(record.id);
                    const result = await base44.functions.invoke('scorePastPerformanceRelevance', {
                        record_id: record.id,
                        proposal_id: proposalId
                    });
                    
                    setScoredRecords(prev => ({
                        ...prev,
                        [record.id]: result.data
                    }));
                } catch (error) {
                    console.error(`Error scoring record ${record.id}:`, error);
                }
            }
            setScoringRecord(null);
        };

        scoreTopRecords();
    }, [proposalId, records, maxSuggestions, scoredRecords]);

    // Sort records by relevance score
    const sortedSuggestions = React.useMemo(() => {
        return records
            .filter(r => scoredRecords[r.id])
            .sort((a, b) => 
                (scoredRecords[b.id]?.relevance_score || 0) - 
                (scoredRecords[a.id]?.relevance_score || 0)
            )
            .slice(0, maxSuggestions);
    }, [records, scoredRecords, maxSuggestions]);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-blue-600 bg-blue-50';
        if (score >= 40) return 'text-amber-600 bg-amber-50';
        return 'text-slate-600 bg-slate-50';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Highly Relevant';
        if (score >= 60) return 'Relevant';
        if (score >= 40) return 'Moderately Relevant';
        return 'Somewhat Relevant';
    };

    if (recordsLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI Suggestions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!records.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI Suggestions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500">
                        No past performance records available yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Suggestions
                    {sortedSuggestions.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {sortedSuggestions.length} found
                        </Badge>
                    )}
                </CardTitle>
                <p className="text-sm text-slate-500">
                    Records most relevant to this proposal
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {sortedSuggestions.map((record) => {
                    const scoring = scoredRecords[record.id];
                    const isScoring = scoringRecord === record.id;

                    return (
                        <div
                            key={record.id}
                            className={cn(
                                "p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer",
                                "border-slate-200 hover:border-purple-300"
                            )}
                            onClick={() => onSelectRecord && onSelectRecord(record)}
                        >
                            {isScoring ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                                    Analyzing relevance...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-900 text-sm">
                                                {record.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {record.customer_agency}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-xs font-semibold",
                                            getScoreColor(scoring?.relevance_score || 0)
                                        )}>
                                            {scoring?.relevance_score || 0}%
                                        </div>
                                    </div>

                                    {/* Relevance badge */}
                                    <Badge className="bg-purple-100 text-purple-700">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        {getScoreLabel(scoring?.relevance_score || 0)}
                                    </Badge>

                                    {/* Key matches */}
                                    {scoring?.key_matches && scoring.key_matches.length > 0 && (
                                        <div className="space-y-1">
                                            {scoring.key_matches.slice(0, 2).map((match, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-xs">
                                                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-slate-700">{match}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectRecord && onSelectRecord(record);
                                        }}
                                    >
                                        Use This Record
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {scoringRecord && sortedSuggestions.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent mx-auto mb-2" />
                        Analyzing your records...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}