import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * Contrast Checker - WCAG Compliance Tool
 * Tests color contrast ratios for accessibility
 */
export default function ContrastChecker() {
  const [foreground, setForeground] = useState("#475569"); // slate-600
  const [background, setBackground] = useState("#ffffff"); // white

  // Calculate relative luminance
  const getLuminance = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Calculate contrast ratio
  const getContrastRatio = (fg, bg) => {
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const ratio = getContrastRatio(foreground, background);
  const passesAA = ratio >= 4.5;
  const passesAAA = ratio >= 7;
  const passesAALarge = ratio >= 3;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="foreground" className="text-slate-900">Foreground Color</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="foreground"
              type="color"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="flex-1"
              placeholder="#475569"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="background" className="text-slate-900">Background Color</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="background"
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="flex-1"
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <Card style={{ backgroundColor: background }} className="border-2">
        <CardContent className="p-6">
          <p style={{ color: foreground }} className="text-lg font-medium mb-2">
            Sample Text Preview
          </p>
          <p style={{ color: foreground }} className="text-sm">
            This is how your text will appear with these colors. The quick brown fox jumps over the lazy dog.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card className={passesAA ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {passesAA ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold text-slate-900">WCAG AA</span>
            </div>
            <p className="text-xs text-slate-700">Normal text: {ratio.toFixed(2)}:1</p>
            <p className="text-xs text-slate-700">Required: 4.5:1</p>
          </CardContent>
        </Card>

        <Card className={passesAALarge ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {passesAALarge ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-semibold text-slate-900">AA Large</span>
            </div>
            <p className="text-xs text-slate-700">Large text: {ratio.toFixed(2)}:1</p>
            <p className="text-xs text-slate-700">Required: 3:1</p>
          </CardContent>
        </Card>

        <Card className={passesAAA ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {passesAAA ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-semibold text-slate-900">WCAG AAA</span>
            </div>
            <p className="text-xs text-slate-700">Normal text: {ratio.toFixed(2)}:1</p>
            <p className="text-xs text-slate-700">Required: 7:1</p>
          </CardContent>
        </Card>
      </div>

      {/* Common Color Combinations */}
      <div className="mt-6">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => { setForeground('#475569'); setBackground('#ffffff'); }}
            className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            slate-600 / white
          </button>
          <button
            onClick={() => { setForeground('#374151'); setBackground('#ffffff'); }}
            className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            slate-700 / white
          </button>
          <button
            onClick={() => { setForeground('#1e3a8a'); setBackground('#ffffff'); }}
            className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            blue-900 / white
          </button>
          <button
            onClick={() => { setForeground('#ffffff'); setBackground('#1e40af'); }}
            className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            white / blue-800
          </button>
        </div>
      </div>
    </div>
  );
}