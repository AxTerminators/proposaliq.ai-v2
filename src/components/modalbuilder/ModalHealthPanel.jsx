import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ModalHealthPanel({ validation, onJumpToSection }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!validation) return null;

  const { isValid, criticalIssues, totalIssues, sections } = validation;

  const getSectionIcon = (section) => {
    if (!section) return <AlertCircle className="w-4 h-4 text-slate-400" />;
    if (section.isValid) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getSectionColor = (section) => {
    if (!section) return 'text-slate-500';
    if (section.isValid) return 'text-green-600';
    return 'text-red-600';
  };

  const sectionDetails = [
    { key: 'basicInfo', label: 'Basic Information', section: sections.basicInfo, tab: 'fields' },
    { key: 'fields', label: 'Form Fields', section: sections.fields, tab: 'fields' },
    { key: 'steps', label: 'Multi-Step Setup', section: sections.steps, tab: 'steps', optional: true },
    { key: 'operations', label: 'Entity Operations', section: sections.operations, tab: 'operations' },
    { key: 'webhooks', label: 'Webhooks', section: sections.webhooks, tab: 'operations', optional: true },
    { key: 'emails', label: 'Email Notifications', section: sections.emails, tab: 'operations', optional: true },
  ];

  return (
    <Card className={cn(
      'border-2 transition-colors',
      isValid ? 'border-green-300 bg-green-50' : criticalIssues ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : criticalIssues ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <CardTitle className="text-base">
              {isValid ? 'Modal Ready' : 'Configuration Status'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        {totalIssues > 0 && (
          <p className="text-sm text-slate-600 mt-1">
            {totalIssues} issue{totalIssues !== 1 ? 's' : ''} need{totalIssues === 1 ? 's' : ''} attention
          </p>
        )}
        {isValid && (
          <p className="text-sm text-green-700 mt-1">
            All required sections are complete. You can save this modal.
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {sectionDetails.map((detail) => (
            <div
              key={detail.key}
              className="flex items-start gap-2 p-2 bg-white rounded border border-slate-200 overflow-hidden"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getSectionIcon(detail.section)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-1">
                  <p className={cn('text-sm font-medium break-words', getSectionColor(detail.section))}>
                    {detail.label}
                  </p>
                  {detail.optional && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">Optional</Badge>
                  )}
                  {detail.section && !detail.section.isValid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onJumpToSection?.(detail.tab)}
                      className="text-xs h-6 px-2 ml-auto flex-shrink-0"
                    >
                      Fix
                    </Button>
                  )}
                </div>
                {detail.section?.issues && detail.section.issues.length > 0 && (
                  <ul className="text-xs text-slate-600 mt-1 space-y-1">
                    {detail.section.issues.map((issue, idx) => (
                      <li key={idx} className="break-words">• {issue}</li>
                    ))}
                  </ul>
                )}
                {detail.section?.fieldIssues && Object.keys(detail.section.fieldIssues).length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    {Object.keys(detail.section.fieldIssues).length} field(s) have issues
                  </p>
                )}
                {detail.section?.operationIssues && Object.keys(detail.section.operationIssues).length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    {Object.keys(detail.section.operationIssues).length} operation(s) have issues
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}