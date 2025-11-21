import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * SmartSuggestions Component
 * 
 * Shows AI-powered suggestions for which past performance records
 * are most relevant to the current proposal based on:
 * - Work scope similarity
 * - Agency matching
 * - Contract type alignment
 * - Recent usage patterns
 */
export default function SmartSuggestions({ 
    proposalId, 
    organizationId,
    solicitation = null,
    onSelectRecord 
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch proposal details if proposalId provided
    const { data: proposal } = useQuery({
        queryKey: ['proposal', proposalId],
        queryFn: async () => {
            if (!proposalId) return null;
            const proposals = await base44.entities.Proposal.filter({ id: proposalId });
            return proposals[0] || null;
        },
        enabled: !!proposalId
    });

    // Fetch all past performance records
    const { data: allRecords = [] } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            return base44.entities.PastPerformanceRecord.filter({ 
                organization_id: organizationId 
            });
        },
        enabled: !!organizationId
    });

    // Generate AI suggestions
    useEffect(() => {
        const generateSuggestions = async () => {
            if (!allRecords.length) return;
            
            setLoading(true);
            try {
                // Score each record for relevance
                const scoredRecords = await Promise.all(
                    allRecords.map(async (record) => {
                        try {
                            const response = await base44.functions.invoke('scorePastPerformanceRelevance', {
                                record_id: record.id,
                                proposal_id: proposalId,
                                solicitation_context: solicitation || proposal?.project_title
                            });

                            return {
                                record,
                                score: response.data.relevance_score || 0,
                                reasons: response.data.match_reasons || []
                            };
                        } catch (error) {
                            console.error('Error scoring record:', error);
                            return {
                                record,
                                score: 0,
                                reasons: []
                            };
                        }
                    })
                );

                // Sort by score and take top 5
                const topSuggestions = scoredRecords
                    .filter(s => s.score > 30) // Only show if reasonably relevant
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                setSuggestions(topSuggestions);
            } catch (error) {
                console.error('Error generating suggestions:', error);
            } finally {
                setLoading(false);
            }
        };

        generateSuggestions();
    }, [allRecords, proposalId, solicitation, proposal]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
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

    if (suggestions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        AI Suggestions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-600">
                            No highly relevant records found for this proposal
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    AI Suggestions
                    <Badge variant="secondary" className="ml-auto">
                        {suggestions.length} matches
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {suggestions.map(({ record, score, reasons }) => (
                    <div
                        key={record.id}
                        className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                        onClick={() => onSelectRecord && onSelectRecord(record)}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm text-slate-900 mb-1">
                                    {record.title}
                                </h4>
                                <p className="text-xs text-slate-600">
                                    {record.customer_agency}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge 
                                    className={
                                        score >= 80 ? 'bg-green-100 text-green-700' :
                                        score >= 60 ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }
                                >
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {score}% match
                                </Badge>
                                {record.overall_rating && (
                                    <Badge variant="secondary">
                                        <Award className="w-3 h-3 mr-1" />
                                        {record.overall_rating}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        
                        {reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {reasons.slice(0, 3).map((reason, idx) => (
                                    <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className="text-xs"
                                    >
                                        {reason}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}