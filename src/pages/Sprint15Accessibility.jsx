import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, EyeOff, Palette, AlertTriangle } from "lucide-react";
import ContrastChecker from "@/components/accessibility/ContrastChecker";
import ColorBlindnessSimulator from "@/components/accessibility/ColorBlindnessSimulator";
import AccessibleStatusBadges from "@/components/accessibility/AccessibleStatusBadges";

export default function Sprint15Accessibility() {
  const [showSimulator, setShowSimulator] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8" role="main" aria-labelledby="sprint-title">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 id="sprint-title" className="text-3xl font-bold text-slate-900">Sprint 15: Accessibility - Color & Contrast</h1>
                <p className="text-slate-700 mt-1">WCAG AA Compliance & Color Blindness Support</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">✅ Completed</Badge>
          </div>
          <Button 
            onClick={() => setShowSimulator(!showSimulator)} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            {showSimulator ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSimulator ? 'Hide' : 'Show'} Color Blindness Simulator
          </Button>
        </header>

        {showSimulator && (
          <div className="mb-8">
            <ColorBlindnessSimulator />
          </div>
        )}

        <div className="grid gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Contrast Audit Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Text Color Compliance</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Replaced all <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-slate-400</code> with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-slate-600</code> (4.5:1+ ratio)</li>
                      <li>Replaced <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-slate-500</code> on white backgrounds with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-slate-700</code></li>
                      <li>Updated placeholder text to meet minimum contrast requirements</li>
                      <li>Ensured all body text uses <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-slate-900</code> or darker</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Link Styling</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Added underline to all text links for visibility</li>
                      <li>Ensured hover states have sufficient contrast</li>
                      <li>Added focus indicators with 3px outline offset</li>
                      <li>Updated link colors from <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-blue-500</code> to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">text-blue-700</code></li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Status Badge Icons</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Added icons to all status badges for non-color identification</li>
                      <li>Created AccessibleStatusBadges component with icon mapping</li>
                      <li>Updated all status displays across Pipeline, Dashboard, and Cards</li>
                      <li>Icons: 🔍 Evaluating, 👀 Watch List, 📝 Draft, ⚡ In Progress, 📤 Submitted, 🏆 Won, ❌ Lost, 📦 Archived</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Color Blindness Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Pattern-Based Indicators</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>All status badges now include emoji icons for pattern recognition</li>
                      <li>Progress bars include percentage text labels</li>
                      <li>Added texture patterns to charts and graphs</li>
                      <li>Error states use icons in addition to red color</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Testing Coverage</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Tested with Protanopia (red-blind) simulation</li>
                      <li>Tested with Deuteranopia (green-blind) simulation</li>
                      <li>Tested with Tritanopia (blue-blind) simulation</li>
                      <li>Verified all status indicators distinguishable without color</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Component Updates</h3>
                    <ul className="text-sm text-slate-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Updated Badge component to support icon props</li>
                      <li>Updated KanbanCard status displays</li>
                      <li>Updated MobileProposalCard status badges</li>
                      <li>Updated Pipeline status indicators</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contrast Checker Tool */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Contrast Checker Tool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContrastChecker />
            </CardContent>
          </Card>

          {/* Example Status Badges */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                Accessible Status Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccessibleStatusBadges />
            </CardContent>
          </Card>
        </div>

        <section className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6" aria-labelledby="success-title">
          <h2 id="success-title" className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            Success Criteria Met
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">WCAG AA Contrast</h3>
              <p className="text-sm text-slate-700">All text meets 4.5:1 minimum contrast ratio with comprehensive audit</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Status Without Color</h3>
              <p className="text-sm text-slate-700">Icons and patterns enable status identification for color blind users</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Simulator Verified</h3>
              <p className="text-sm text-slate-700">Passed all color blindness simulations with clear differentiation</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}