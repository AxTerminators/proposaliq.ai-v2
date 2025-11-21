import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle2, 
    AlertTriangle, 
    Info, 
    Edit, 
    Sparkles,
    TrendingUp,
    TrendingDown
} from 'lucide-react';

/**
 * ExtractionPreview Component
 * Displays extracted data with confidence indicators before user accepts
 * 
 * Props:
 * - extractedData: object with extracted fields
 * - onAccept: callback when user accepts the extraction
 * - onReject: callback when user wants to manually edit
 */
export default function ExtractionPreview({ extractedData, onAccept, onReject }) {
    // Calculate confidence level from metadata
    const confidenceScore = extractedData?.ai_extraction_metadata?.confidence_score || 0;
    const fieldsExtracted = extractedData?.ai_extraction_metadata?.fields_extracted || [];
    
    // Determine confidence level category
    const getConfidenceLevel = () => {
        if (confidenceScore >= 80) return { label: 'High', color: 'green', icon: TrendingUp };
        if (confidenceScore >= 50) return { label: 'Medium', color: 'yellow', icon: TrendingUp };
        return { label: 'Low', color: 'red', icon: TrendingDown };
    };

    const confidence = getConfidenceLevel();
    const ConfidenceIcon = confidence.icon;

    // Check for red flags
    const hasRedFlags = extractedData?.has_red_flags || false;

    // Format display value
    const formatValue = (value) => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return value || 'Not extracted';
    };

    // Key fields to display in preview
    const previewFields = [
        { key: 'title', label: 'Project Title' },
        { key: 'customer_agency', label: 'Customer/Agency' },
        { key: 'contract_number', label: 'Contract Number' },
        { key: 'pop_start_date', label: 'Start Date' },
        { key: 'pop_end_date', label: 'End Date' },
        { key: 'contract_value_display', label: 'Contract Value' },
        { key: 'overall_rating', label: 'Overall Rating' },
    ];

    return (
        <Card className="border-2 border-blue-200">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            AI Extraction Results
                        </CardTitle>
                        <CardDescription>
                            Review the extracted information and make edits if needed
                        </CardDescription>
                    </div>
                    <Badge 
                        className={`
                            ${confidence.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                            ${confidence.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${confidence.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                        `}
                    >
                        <ConfidenceIcon className="w-3 h-3 mr-1" />
                        {confidence.label} Confidence ({confidenceScore}%)
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Red Flag Warning */}
                {hasRedFlags && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Performance Alert:</strong> This record contains ratings below "Satisfactory."
                            The system will use mitigation language when referencing this project.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Extraction Stats */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Fields Extracted</p>
                        <p className="text-2xl font-bold text-slate-900">{fieldsExtracted.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Confidence Score</p>
                        <p className="text-2xl font-bold text-slate-900">{confidenceScore}%</p>
                    </div>
                </div>

                {/* Preview of Key Fields */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Key Information Preview
                    </h4>
                    <div className="space-y-2">
                        {previewFields.map(field => {
                            const value = extractedData[field.key];
                            const wasExtracted = fieldsExtracted.includes(field.key);
                            
                            if (!value && !wasExtracted) return null;
                            
                            return (
                                <div 
                                    key={field.key}
                                    className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">{field.label}</p>
                                        <p className="text-sm text-slate-900 mt-1">
                                            {formatValue(value)}
                                        </p>
                                    </div>
                                    {wasExtracted && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            AI
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Info Alert */}
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        All extracted data is editable. Click "Accept & Continue" to review and edit the full form,
                        or "Manual Entry" to start from scratch.
                    </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <Button 
                        onClick={onAccept}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Accept & Continue Editing
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={onReject}
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Manual Entry
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}