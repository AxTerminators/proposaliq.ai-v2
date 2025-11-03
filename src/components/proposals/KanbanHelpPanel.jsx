import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  CheckCircle2,
  MousePointer,
  Zap,
  Shield,
  AlertCircle,
  BarChart3,
  Sparkles,
  Settings,
  Keyboard
} from 'lucide-react';

export default function KanbanHelpPanel({ isOpen, onClose }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Kanban Board Help
          </SheetTitle>
          <SheetDescription>
            Quick reference guide for using your Kanban board effectively
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="features" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Smart Checklists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">System Check</Badge>
                  <p className="text-slate-600">Auto-completes when data is present</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Manual Check</Badge>
                  <p className="text-slate-600">You mark complete manually</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">AI Trigger</Badge>
                  <p className="text-slate-600">Runs AI-powered workflows</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Modal Trigger</Badge>
                  <p className="text-slate-600">Opens relevant builder phase</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MousePointer className="w-4 h-4 text-blue-600" />
                  Drag & Drop
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>Click and drag proposal cards between columns to move them through your workflow.</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Checklist resets for new stage</li>
                  <li>Status updates automatically</li>
                  <li>Automation rules may trigger</li>
                  <li>RBAC permissions are enforced</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  WIP Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Badge className="bg-yellow-100 text-yellow-700 text-xs mb-2">Soft Limit</Badge>
                  <p className="text-slate-600">Shows warning when limit reached but allows move</p>
                </div>
                <div>
                  <Badge className="bg-red-100 text-red-700 text-xs mb-2">Hard Limit</Badge>
                  <p className="text-slate-600">Blocks drag-and-drop when limit reached</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Approval Gates
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>Some columns require approval before proposals can move out. This ensures:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Quality control at critical stages</li>
                  <li>Proper review by authorized personnel</li>
                  <li>Audit trail of approvals</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>Background automation monitors proposals and triggers actions based on:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Status changes</li>
                  <li>Column moves</li>
                  <li>Due date approaching</li>
                  <li>Checklist completion</li>
                  <li>Time in stage</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Keyboard className="w-4 h-4" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Zoom In</span>
                  <Badge variant="outline">Ctrl/Cmd + Scroll Up</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Zoom Out</span>
                  <Badge variant="outline">Ctrl/Cmd + Scroll Down</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Open Filters</span>
                  <Badge variant="outline">F</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Create Proposal</span>
                  <Badge variant="outline">N</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Search</span>
                  <Badge variant="outline">Ctrl/Cmd + K</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MousePointer className="w-4 h-4" />
                  Mouse Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Collapse Column</span>
                  <span className="text-slate-500">Click chevron icon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Open Card Details</span>
                  <span className="text-slate-500">Click card</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Move Proposal</span>
                  <span className="text-slate-500">Drag and drop</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Use filters effectively</p>
                    <p className="text-xs mt-1">Filter by agency, assignee, or search to focus on specific proposals</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Complete checklists first</p>
                    <p className="text-xs mt-1">Address action items before moving to next stage for smoother workflow</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Leverage AI actions</p>
                    <p className="text-xs mt-1">Use AI-powered checklist items to get intelligent analysis and recommendations</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Watch WIP limits</p>
                    <p className="text-xs mt-1">Keep an eye on column capacity to prevent bottlenecks in your pipeline</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Customize your board</p>
                    <p className="text-xs mt-1">Use "Configure Board" to adjust columns, checklists, and automation rules</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">Can't drag a proposal?</p>
                  <p className="text-xs mt-1">Check if you have permission or if the column has RBAC restrictions</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Move blocked?</p>
                  <p className="text-xs mt-1">Destination column may have reached its hard WIP limit</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Approval required?</p>
                  <p className="text-xs mt-1">Some stages need manager approval before moving proposals out</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}