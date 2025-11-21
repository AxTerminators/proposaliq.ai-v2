import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Info, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DuplicateWarning Component
 * 
 * Displays potential duplicate records with match scores and reasons
 * Allows user to view details, merge, or proceed anyway
 * 
 * Props:
 * - duplicates: Array of duplicate objects with record, match_score, match_reasons, confidence
 * - onProceed: Callback when user chooses to proceed anyway
 * - onCancel: Callback when user cancels
 * - onViewRecord: Optional callback to view duplicate record details
 */
export default function DuplicateWarning({ duplicates, onProceed, onCancel, onViewRecord }) {
    if (!duplicates || duplicates.length === 0) return null;

    const hasHighConfidence = duplicates.some(d => d.confidence === 'high');

    const getConfidenceBadge = (confidence) => {
        const variants = {
            high: 'bg-red-100 text-red-700 border-red-300',
            medium: 'bg-amber-100 text-amber-700 border-amber-300',
            low: 'bg-blue-100 text-blue-700 border-blue-300'
        };
        return variants[confidence] || variants.low;
    };

    const getConfidenceIcon = (confidence) => {
        if (confidence === 'high') return <AlertTriangle className="w-4 h-4" />;
        if (confidence === 'medium') return <Info className="w-4 h-4" />;
        return <CheckCircle2 className="w-4 h-4" />;
    };

    return (
        <Card className="border-2 border-amber-300 bg-amber-50/50 p-6 space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        Potential Duplicates Found
                    </h3>
                    <p className="text-sm text-slate-600">
                        {hasHighConfidence 
                            ? 'We found records that appear to be very similar. Please review before proceeding.'
                            : 'We found some records that might be related. Review to avoid duplicates.'}
                    </p>
                </div>
            </div>

            {/* Duplicate Records List */}
            <div className="space-y-3">
                {duplicates.map((dup, idx) => (
                    <Card key={idx} className="p-4 border-2 border-slate-200 bg-white">
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900">
                                        {dup.record.title}
                                    </h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {dup.record.customer_agency}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={cn('border', getConfidenceBadge(dup.confidence))}>
                                        {getConfidenceIcon(dup.confidence)}
                                        <span className="ml-1">{dup.match_score}% match</span>
                                    </Badge>
                                    {onViewRecord && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewRecord(dup.record)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Match Reasons */}
                            <div className="space-y-1">
                                {dup.match_reasons.map((reason, rIdx) => (
                                    <div key={rIdx} className="flex items-center gap-2 text-xs text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span>{reason}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Record Details */}
                            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                                {dup.record.contract_number && (
                                    <div>
                                        <span className="text-slate-500">Contract:</span>
                                        <span className="ml-1 font-medium">{dup.record.contract_number}</span>
                                    </div>
                                )}
                                {dup.record.contract_value && (
                                    <div>
                                        <span className="text-slate-500">Value:</span>
                                        <span className="ml-1 font-medium">
                                            {dup.record.contract_value_display || 
                                             `$${(dup.record.contract_value / 1000000).toFixed(1)}M`}
                                        </span>
                                    </div>
                                )}
                                {dup.record.pop_start_date && (
                                    <div>
                                        <span className="text-slate-500">Period:</span>
                                        <span className="ml-1 font-medium">
                                            {new Date(dup.record.pop_start_date).getFullYear()}
                                            {dup.record.pop_end_date && 
                                             ` - ${new Date(dup.record.pop_end_date).getFullYear()}`}
                                        </span>
                                    </div>
                                )}
                                {dup.record.record_type && (
                                    <div>
                                        <span className="text-slate-500">Type:</span>
                                        <span className="ml-1 font-medium capitalize">
                                            {dup.record.record_type}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Action Buttons */}
            <Alert>
                <AlertDescription>
                    <div className="flex items-center justify-between">
                        <p className="text-sm">
                            {hasHighConfidence 
                                ? '⚠️ High-confidence duplicate detected. Consider reviewing or canceling.'
                                : 'These records may be related. Review carefully before proceeding.'}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={onProceed}
                                className={cn(
                                    hasHighConfidence 
                                        ? 'bg-amber-600 hover:bg-amber-700' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                )}
                            >
                                {hasHighConfidence ? 'Proceed Anyway' : 'Save as New Record'}
                            </Button>
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        </Card>
    );
}