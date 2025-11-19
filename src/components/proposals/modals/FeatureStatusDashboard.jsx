import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  History, 
  FileSpreadsheet,
  Upload,
  Save,
  TrendingUp,
  ExternalLink,
  FileText,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

/**
 * Feature Status Dashboard
 * 
 * Visual overview of completed Dynamic Modal enhancements
 * Phases 1-3 implementation status
 */
export default function FeatureStatusDashboard() {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'ChecklistItemRenderer Integration & New Templates',
      status: 'complete',
      completedDate: '2025-01-19',
      features: [
        {
          name: 'ChecklistItemRenderer Integration',
          description: 'Full integration with DynamicModal, click handling, modal triggers',
          icon: Sparkles,
          status: 'complete'
        },
        {
          name: 'Pricing Sheet Template',
          description: 'Structured pricing data collection with cost breakdowns',
          icon: FileSpreadsheet,
          status: 'complete'
        },
        {
          name: 'Compliance Matrix Template',
          description: 'Requirements mapping and compliance tracking',
          icon: CheckCircle2,
          status: 'complete'
        },
        {
          name: 'AI Checklist Generation',
          description: 'Enhanced AI suggestions for modal types based on context',
          icon: Sparkles,
          status: 'complete'
        }
      ]
    },
    {
      phase: 'Phase 2',
      title: 'Enhanced Features for Existing Dynamic Modals',
      status: 'complete',
      completedDate: '2025-01-19',
      features: [
        {
          name: 'Enhanced File Upload',
          description: 'Drag-drop upload, client-side preview, file validation',
          icon: Upload,
          status: 'complete'
        },
        {
          name: 'Autosave & Draft Recovery',
          description: 'Automatic draft saving with recovery dialog',
          icon: Save,
          status: 'complete'
        },
        {
          name: 'Performance Optimizations',
          description: 'Memoized components, optimized re-renders, faster loading',
          icon: Zap,
          status: 'complete'
        }
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Advanced Data Management',
      status: 'complete',
      completedDate: '2025-01-19',
      features: [
        {
          name: 'Version History',
          description: 'Complete audit trail with restore capability',
          icon: History,
          status: 'complete'
        },
        {
          name: 'Bulk Import/Export',
          description: 'CSV/JSON bulk operations for data management',
          icon: FileSpreadsheet,
          status: 'complete'
        }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'planned':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Dynamic Modal System - Feature Status
        </h1>
        <p className="text-slate-600">
          Implementation status of Phases 1-3 enhancements
        </p>
      </div>

      <div className="grid gap-6">
        {phases.map((phase) => (
          <Card key={phase.phase} className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{phase.phase}: {phase.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('border', getStatusColor(phase.status))}>
                      {getStatusIcon(phase.status)}
                      <span className="ml-1.5 capitalize">{phase.status.replace('_', ' ')}</span>
                    </Badge>
                    {phase.completedDate && (
                      <span className="text-sm text-slate-500">
                        Completed: {phase.completedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {phase.features.map((feature) => (
                  <Card key={feature.name} className="bg-slate-50 border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-slate-900">
                              {feature.name}
                            </h4>
                            {feature.status === 'complete' && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900 mb-1">3</div>
              <div className="text-sm text-blue-700">Phases Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900 mb-1">9</div>
              <div className="text-sm text-blue-700">Features Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900 mb-1">100%</div>
              <div className="text-sm text-blue-700">Implementation Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation and Demo Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">
                    All phases complete! 🎉
                  </p>
                  <p className="text-sm text-green-800">
                    See <code className="bg-white px-1.5 py-0.5 rounded text-xs">INTEGRATION_GUIDE.md</code> for usage examples and documentation.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                asChild
              >
                <a 
                  href="https://github.com/your-repo/blob/main/components/proposals/modals/INTEGRATION_GUIDE.md" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Guide
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <Play className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900 mb-1">
                    See it in action
                  </p>
                  <p className="text-sm text-purple-800">
                    Try the dynamic modal demo to test all features
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                asChild
              >
                <Link to={createPageUrl("DynamicModalDemo")}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Demo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Access Points */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Where to Find These Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-slate-900">In Use Now:</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Proposal Cards:</strong> Click checklist items to trigger modals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>DynamicModal:</strong> Auto-save active on all modal forms</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>File Uploads:</strong> Drag-drop in modal file fields</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-slate-900">Available Components:</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <History className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>ModalVersionHistory:</strong> Track and restore submissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>BulkModalOperations:</strong> Import/export modal data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>OptimizedDynamicModal:</strong> For large forms</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}