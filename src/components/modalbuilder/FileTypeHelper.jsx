import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Wand2 } from 'lucide-react';

/**
 * File Type Helper Component
 * 
 * Phase 4: Automated suggestions for file upload configuration
 */
export default function FileTypeHelper({ field, onApplySuggestion }) {
  const [suggestion, setSuggestion] = React.useState(null);

  useEffect(() => {
    // Analyze field to provide suggestions
    const fieldLabel = field.label?.toLowerCase() || '';
    const fieldName = field.id?.toLowerCase() || '';

    if (fieldLabel.includes('capability') || fieldLabel.includes('statement')) {
      setSuggestion({
        type: 'capability_statement',
        message: 'This looks like a capability statement upload',
        ragConfig: {
          enabled: true,
          extractData: true,
          targetSchema: JSON.stringify({
            partner_name: 'string',
            capabilities: 'array',
            past_performance: 'string',
            certifications: 'array',
            contact_email: 'string'
          }, null, 2),
          autoIngest: true
        }
      });
    } else if (fieldLabel.includes('resume') || fieldLabel.includes('bio')) {
      setSuggestion({
        type: 'resume',
        message: 'This looks like a resume/bio upload',
        ragConfig: {
          enabled: true,
          extractData: true,
          targetSchema: JSON.stringify({
            name: 'string',
            title: 'string',
            experience_years: 'number',
            skills: 'array',
            education: 'string',
            certifications: 'array'
          }, null, 2),
          autoIngest: true
        }
      });
    } else if (fieldLabel.includes('proposal') || fieldLabel.includes('document')) {
      setSuggestion({
        type: 'proposal_doc',
        message: 'This looks like a proposal document upload',
        ragConfig: {
          enabled: true,
          extractData: false,
          autoIngest: true
        }
      });
    } else if (fieldLabel.includes('solicitation') || fieldLabel.includes('rfp')) {
      setSuggestion({
        type: 'solicitation',
        message: 'This looks like a solicitation document upload',
        ragConfig: {
          enabled: true,
          extractData: false,
          autoIngest: true
        }
      });
    }
  }, [field.label, field.id]);

  if (!suggestion) return null;

  const handleApply = () => {
    onApplySuggestion(suggestion.ragConfig);
    setSuggestion(null);
  };

  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-blue-900">AI Suggestion</p>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
              {suggestion.type}
            </Badge>
          </div>
          <p className="text-xs text-blue-800 mb-3">{suggestion.message}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleApply}
            className="gap-2 border-blue-300 hover:bg-blue-100"
          >
            <Wand2 className="w-3 h-3" />
            Apply Recommended Settings
          </Button>
        </div>
      </div>
    </div>
  );
}