import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Award, Building2, Flag, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Past Performance Template Library
 * Pre-configured templates for common record types
 */

const TEMPLATES = [
    {
        id: 'cpars_federal',
        name: 'CPARS - Federal Contract',
        description: 'Official CPARS evaluation with performance ratings',
        icon: Award,
        color: 'purple',
        record_type: 'cpars',
        pre_fill: {
            is_official_cpars: true,
            work_scope_tags: ['Federal Contract Performance'],
            priority_for_proposal: 'primary'
        },
        required_fields: ['contract_number', 'overall_rating', 'performance_ratings'],
        guidance: 'Upload your CPARS PDF or enter evaluation details manually. All ratings and narratives will be extracted.'
    },
    {
        id: 'federal_rfp',
        name: 'Federal RFP Past Performance',
        description: 'General federal contract past performance reference',
        icon: Building2,
        color: 'blue',
        record_type: 'general_pp',
        pre_fill: {
            work_scope_tags: ['Federal RFP'],
            priority_for_proposal: 'primary'
        },
        required_fields: ['contract_number', 'customer_agency'],
        guidance: 'Provide contract details and key accomplishments for federal proposal references.'
    },
    {
        id: 'state_local',
        name: 'State/Local Government',
        description: 'State or local government contract experience',
        icon: Flag,
        color: 'green',
        record_type: 'general_pp',
        pre_fill: {
            work_scope_tags: ['State/Local Government'],
            priority_for_proposal: 'secondary'
        },
        required_fields: ['customer_agency', 'project_description'],
        guidance: 'Document state or local government project experience, including outcomes and client satisfaction.'
    },
    {
        id: 'sbir_sttr',
        name: 'SBIR/STTR Project',
        description: 'Small Business Innovation Research project',
        icon: Rocket,
        color: 'orange',
        record_type: 'general_pp',
        pre_fill: {
            work_scope_tags: ['SBIR', 'Research', 'Innovation'],
            small_business_program: ['SBIR'],
            priority_for_proposal: 'primary'
        },
        required_fields: ['customer_agency', 'project_description', 'key_accomplishments'],
        guidance: 'Highlight innovation, research outcomes, and commercialization potential.'
    },
    {
        id: 'commercial',
        name: 'Commercial Project',
        description: 'Private sector or commercial client project',
        icon: Building2,
        color: 'slate',
        record_type: 'general_pp',
        pre_fill: {
            work_scope_tags: ['Commercial'],
            priority_for_proposal: 'background',
            allow_customer_name_use: false
        },
        required_fields: ['customer_agency', 'project_description'],
        guidance: 'Document commercial experience. Consider anonymizing client name if confidential.'
    },
    {
        id: 'subcontractor',
        name: 'Subcontractor Experience',
        description: 'Performance as a subcontractor or teaming partner',
        icon: FileText,
        color: 'indigo',
        record_type: 'general_pp',
        pre_fill: {
            role: 'subcontractor',
            work_scope_tags: ['Subcontractor'],
            priority_for_proposal: 'secondary'
        },
        required_fields: ['customer_agency', 'project_description'],
        guidance: 'Highlight your specific role, deliverables, and value added to the prime contractor.'
    }
];

export default function TemplateLibrary({ onSelectTemplate, selectedTemplateId }) {
    const getIconColor = (color) => {
        const colors = {
            purple: 'text-purple-600 bg-purple-100',
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            orange: 'text-orange-600 bg-orange-100',
            slate: 'text-slate-600 bg-slate-100',
            indigo: 'text-indigo-600 bg-indigo-100'
        };
        return colors[color] || colors.slate;
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Start with a Template
                </h3>
                <p className="text-sm text-slate-600">
                    Choose a template to pre-configure fields for your record type
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplateId === template.id;

                    return (
                        <Card
                            key={template.id}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md border-2",
                                isSelected 
                                    ? 'border-blue-500 bg-blue-50/50' 
                                    : 'border-slate-200 hover:border-blue-300'
                            )}
                            onClick={() => onSelectTemplate(template)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        getIconColor(template.color)
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="font-semibold text-slate-900">
                                                {template.name}
                                            </h4>
                                            {isSelected && (
                                                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">
                                            {template.description}
                                        </p>
                                        <Badge 
                                            variant="secondary" 
                                            className="text-xs"
                                        >
                                            {template.record_type === 'cpars' ? 'CPARS' : 'General'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => onSelectTemplate(null)}>
                    Skip Templates
                </Button>
                {selectedTemplateId && (
                    <Button onClick={() => onSelectTemplate(
                        TEMPLATES.find(t => t.id === selectedTemplateId)
                    )}>
                        Use Selected Template
                    </Button>
                )}
            </div>
        </div>
    );
}

export { TEMPLATES };