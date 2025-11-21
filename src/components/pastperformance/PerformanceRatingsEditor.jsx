import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PerformanceRatingsEditor Component
 * CPARS-specific ratings editor with visual indicators
 * 
 * Props:
 * - performanceRatings: object with rating values
 * - overallRating: overall rating value
 * - onChange: callback with updated ratings
 * - onOverallChange: callback with updated overall rating
 */
export default function PerformanceRatingsEditor({ 
    performanceRatings = {}, 
    overallRating, 
    onChange, 
    onOverallChange 
}) {
    const ratingOptions = [
        { value: 'Exceptional', color: 'green', icon: TrendingUp },
        { value: 'Very Good', color: 'blue', icon: TrendingUp },
        { value: 'Satisfactory', color: 'slate', icon: TrendingUp },
        { value: 'Marginal', color: 'yellow', icon: TrendingDown },
        { value: 'Unsatisfactory', color: 'red', icon: TrendingDown },
        { value: 'Not Applicable', color: 'gray', icon: null }
    ];

    const performanceFactors = [
        { key: 'quality', label: 'Quality of Product/Service' },
        { key: 'schedule', label: 'Schedule/Timeliness' },
        { key: 'cost_control', label: 'Cost Control' },
        { key: 'management', label: 'Business Relations/Management' },
        { key: 'regulatory_compliance', label: 'Regulatory Compliance' },
        { key: 'small_business_utilization', label: 'Small Business Utilization' }
    ];

    const handleRatingChange = (factor, value) => {
        onChange({
            ...performanceRatings,
            [factor]: value
        });
    };

    // Check if any rating is problematic
    const hasProblematicRatings = () => {
        const allRatings = [overallRating, ...Object.values(performanceRatings)];
        return allRatings.some(rating => ['Marginal', 'Unsatisfactory'].includes(rating));
    };

    const getRatingColor = (rating) => {
        const option = ratingOptions.find(opt => opt.value === rating);
        return option?.color || 'slate';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>CPARS Performance Ratings</CardTitle>
                <CardDescription>
                    Individual performance factor ratings from the official CPARS evaluation
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Red Flag Warning */}
                {hasProblematicRatings() && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Warning:</strong> One or more ratings are below "Satisfactory." 
                            This record will be flagged and AI will use mitigation language when referencing it.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Overall Rating */}
                <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <Label htmlFor="overall_rating" className="text-sm font-semibold mb-2 block">
                        Overall CPARS Rating <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={overallRating || ''}
                        onValueChange={onOverallChange}
                    >
                        <SelectTrigger 
                            id="overall_rating"
                            className={cn(
                                "w-full h-12 text-base font-semibold",
                                overallRating && getRatingColor(overallRating) === 'green' && 'border-green-400 bg-green-50',
                                overallRating && getRatingColor(overallRating) === 'blue' && 'border-blue-400 bg-blue-50',
                                overallRating && getRatingColor(overallRating) === 'yellow' && 'border-yellow-400 bg-yellow-50',
                                overallRating && getRatingColor(overallRating) === 'red' && 'border-red-400 bg-red-50'
                            )}
                        >
                            <SelectValue placeholder="Select overall rating" />
                        </SelectTrigger>
                        <SelectContent>
                            {ratingOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <SelectItem 
                                        key={option.value} 
                                        value={option.value}
                                        className="py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            {Icon && <Icon className="w-4 h-4" />}
                                            <span>{option.value}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Individual Performance Factors */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                        Individual Performance Factors
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {performanceFactors.map((factor) => {
                            const currentRating = performanceRatings[factor.key];
                            const isProblematic = ['Marginal', 'Unsatisfactory'].includes(currentRating);
                            
                            return (
                                <div key={factor.key} className="space-y-2">
                                    <Label 
                                        htmlFor={factor.key}
                                        className="text-sm flex items-center gap-2"
                                    >
                                        {factor.label}
                                        {isProblematic && (
                                            <Badge variant="destructive" className="text-xs">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Flag
                                            </Badge>
                                        )}
                                    </Label>
                                    <Select
                                        value={currentRating || ''}
                                        onValueChange={(value) => handleRatingChange(factor.key, value)}
                                    >
                                        <SelectTrigger 
                                            id={factor.key}
                                            className={cn(
                                                currentRating && getRatingColor(currentRating) === 'green' && 'border-green-300',
                                                currentRating && getRatingColor(currentRating) === 'blue' && 'border-blue-300',
                                                currentRating && getRatingColor(currentRating) === 'yellow' && 'border-yellow-300',
                                                currentRating && getRatingColor(currentRating) === 'red' && 'border-red-300'
                                            )}
                                        >
                                            <SelectValue placeholder="Select rating" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ratingOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.value}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rating Legend */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-blue-900 mb-2">Rating Definitions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800">
                        <div><strong>Exceptional:</strong> Performance exceeds requirements</div>
                        <div><strong>Very Good:</strong> Performance exceeds most requirements</div>
                        <div><strong>Satisfactory:</strong> Performance meets requirements</div>
                        <div><strong>Marginal:</strong> Performance meets minimum requirements</div>
                        <div><strong>Unsatisfactory:</strong> Performance does not meet requirements</div>
                        <div><strong>Not Applicable:</strong> Factor not applicable to this contract</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}