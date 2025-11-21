import React from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RecordTypeSelector Component
 * Radio button selector for choosing between General Past Performance and CPARS
 * 
 * Props:
 * - value: current record type ('general_pp' or 'cpars')
 * - onChange: callback when selection changes
 * - disabled: whether selector is disabled
 */
export default function RecordTypeSelector({ value, onChange, disabled = false }) {
    const options = [
        {
            value: 'general_pp',
            label: 'General Past Performance',
            description: 'Standard project reference or performance summary',
            icon: FileText,
            color: 'blue'
        },
        {
            value: 'cpars',
            label: 'CPARS Evaluation',
            description: 'Official Contractor Performance Assessment Reporting System record',
            icon: Award,
            color: 'purple'
        }
    ];

    return (
        <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">
                Record Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = value === option.value;
                    
                    return (
                        <Card
                            key={option.value}
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                isSelected && option.color === 'blue' && 'border-blue-500 bg-blue-50',
                                isSelected && option.color === 'purple' && 'border-purple-500 bg-purple-50',
                                !isSelected && 'border-slate-200 hover:border-slate-300',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                            onClick={() => !disabled && onChange(option.value)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        isSelected && option.color === 'blue' && 'bg-blue-600',
                                        isSelected && option.color === 'purple' && 'bg-purple-600',
                                        !isSelected && 'bg-slate-100'
                                    )}>
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            isSelected ? 'text-white' : 'text-slate-600'
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={isSelected}
                                                onChange={() => onChange(option.value)}
                                                disabled={disabled}
                                                className="w-4 h-4"
                                            />
                                            <h3 className="font-semibold text-slate-900">
                                                {option.label}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 ml-6">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}