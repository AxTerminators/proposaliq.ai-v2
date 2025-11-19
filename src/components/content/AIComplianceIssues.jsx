import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI Compliance Issues Display
 * Shows compliance issues detected during AI generation
 */
export default function AIComplianceIssues({ section }) {
  const metadata = section?.ai_generation_metadata || {};
  const issues = metadata.compliance_issues || [];

  if (issues.length === 0) {
    return null;
  }

  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50 text-red-900';
      case 'medium': return 'border-amber-200 bg-amber-50 text-amber-900';
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-900';
      default: return 'border-slate-200 bg-slate-50 text-slate-900';
    }
  };

  return (
    <div className="space-y-3">
      {highIssues.length > 0 && (
        <Alert className={getSeverityColor('high')}>
          {getSeverityIcon('high')}
          <AlertDescription>
            <p className="font-semibold mb-2">High Priority Issues ({highIssues.length})</p>
            <ul className="space-y-1 text-sm">
              {highIssues.map((issue, idx) => (
                <li key={idx}>• {issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {mediumIssues.length > 0 && (
        <Alert className={getSeverityColor('medium')}>
          {getSeverityIcon('medium')}
          <AlertDescription>
            <p className="font-semibold mb-2">Medium Priority Issues ({mediumIssues.length})</p>
            <ul className="space-y-1 text-sm">
              {mediumIssues.map((issue, idx) => (
                <li key={idx}>
                  • {issue.message}
                  {issue.details && (
                    <ul className="ml-4 mt-1 text-xs opacity-80">
                      {issue.details.map((detail, didx) => (
                        <li key={didx}>- {detail}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {lowIssues.length > 0 && (
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-slate-700 mb-2">
            Low Priority Issues ({lowIssues.length}) - Click to expand
          </summary>
          <Alert className={getSeverityColor('low')}>
            {getSeverityIcon('low')}
            <AlertDescription>
              <ul className="space-y-1 text-sm">
                {lowIssues.map((issue, idx) => (
                  <li key={idx}>• {issue.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </details>
      )}
    </div>
  );
}