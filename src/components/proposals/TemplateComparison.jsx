import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Calendar, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATE_INFO = {
  RFP: { 
    emoji: '📄', 
    color: 'blue',
    bestFor: 'Complex federal proposals requiring comprehensive documentation',
    keyFeatures: ['8-phase workflow', 'Compliance tracking', 'Multiple review rounds']
  },
  RFI: { 
    emoji: '📝', 
    color: 'green',
    bestFor: 'Quick capability demonstrations and information requests',
    keyFeatures: ['4-phase streamlined', 'Fast turnaround', 'Capability focused']
  },
  SBIR: { 
    emoji: '💡', 
    color: 'purple',
    bestFor: 'Research and innovation proposals with commercialization plans',
    keyFeatures: ['Innovation emphasis', 'Research planning', 'IP strategy']
  },
  GSA: { 
    emoji: '🏛️', 
    color: 'amber',
    bestFor: 'GSA Schedule applications and modifications',
    keyFeatures: ['Pricing strategy', 'Commercial sales practices', 'Schedule-specific']
  },
  IDIQ: { 
    emoji: '📑', 
    color: 'indigo',
    bestFor: 'Long-term contract vehicles and IDIQ submissions',
    keyFeatures: ['Teaming strategy', 'Capability demonstration', 'Multiple volumes']
  },
  STATE_LOCAL: { 
    emoji: '🏙️', 
    color: 'cyan',
    bestFor: 'State and local government proposals',
    keyFeatures: ['Local requirements', 'Simplified process', 'Quick response']
  }
};

export default function TemplateComparison({ templates }) {
  const templateData = useMemo(() => {
    return templates.map(template => {
      const config = typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;
      
      const info = TEMPLATE_INFO[template.proposal_type_category] || {};
      
      const totalChecklist = (config?.columns || []).reduce(
        (sum, col) => sum + (col.checklist_items?.length || 0),
        0
      );
      
      const requiredItems = (config?.columns || []).reduce(
        (sum, col) => sum + (col.checklist_items?.filter(item => item.required).length || 0),
        0
      );
      
      return {
        ...template,
        info,
        phaseCount: config?.columns?.length || 0,
        checklistCount: totalChecklist,
        requiredCount: requiredItems
      };
    });
  }, [templates]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {templateData.map((template) => (
        <Card key={template.id} className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{template.info.emoji}</div>
                <div>
                  <CardTitle className="text-lg">{template.proposal_type_category}</CardTitle>
                  <p className="text-xs text-slate-600 mt-1">
                    {template.template_name}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-700 font-medium mb-2">Best For:</p>
              <p className="text-sm text-slate-600">{template.info.bestFor}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-700 font-medium">Key Features:</p>
              <div className="space-y-1">
                {template.info.keyFeatures?.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{template.phaseCount}</div>
                <div className="text-xs text-slate-600">Phases</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{template.checklistCount}</div>
                <div className="text-xs text-slate-600">Checklist Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  ~{template.estimated_duration_days}d
                </div>
                <div className="text-xs text-slate-600">Est. Duration</div>
              </div>
            </div>

            {template.usage_count > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Usage Count:</span>
                  <Badge variant="outline" className="gap-1">
                    <Target className="w-3 h-3" />
                    {template.usage_count} proposals
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}