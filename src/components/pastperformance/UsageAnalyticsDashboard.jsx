import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Award, FileText, AlertCircle } from 'lucide-react';

/**
 * Usage Analytics Dashboard
 * Displays insights about past performance record usage
 */
export default function UsageAnalyticsDashboard({ organizationId }) {
    // Fetch all past performance records for analytics
    const { data: records, isLoading } = useQuery({
        queryKey: ['pastPerformanceRecords', organizationId],
        queryFn: async () => {
            return await base44.entities.PastPerformanceRecord.filter({
                organization_id: organizationId
            });
        },
        enabled: !!organizationId
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!records || records.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-slate-500">
                    No past performance records found
                </CardContent>
            </Card>
        );
    }

    // Calculate analytics
    const totalRecords = records.length;
    const usedRecords = records.filter(r => (r.usage_count || 0) > 0);
    const totalUsages = records.reduce((sum, r) => sum + (r.usage_count || 0), 0);
    const avgUsage = totalUsages / totalRecords;
    
    // Most used records (top 5)
    const mostUsed = [...records]
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5);

    // Records with red flags
    const redFlaggedRecords = records.filter(r => r.has_red_flags);

    // Recently used records (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUsed = records.filter(r => 
        r.last_used_date && new Date(r.last_used_date) > sevenDaysAgo
    );

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                        <FileText className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRecords}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {usedRecords.length} used in proposals
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Usages</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsages}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Avg {avgUsage.toFixed(1)} per record
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
                        <Award className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentlyUsed.length}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Last 7 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Red Flags</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{redFlaggedRecords.length}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Records with issues
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Most Used Records */}
            {mostUsed.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Most Used Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {mostUsed.map((record, index) => (
                                <div 
                                    key={record.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                #{index + 1}
                                            </Badge>
                                            <p className="font-medium text-sm">{record.title}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {record.customer_agency}
                                            {record.contract_number && ` • ${record.contract_number}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-blue-600">
                                            {record.usage_count || 0}
                                        </p>
                                        <p className="text-xs text-slate-500">uses</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}