import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AccessibleStatusBadges from "./AccessibleStatusBadges";

/**
 * Color Blindness Simulator
 * Visual demonstration of how status indicators appear to color blind users
 */
export default function ColorBlindnessSimulator() {
  const [mode, setMode] = useState('normal');

  const simulationModes = [
    { value: 'normal', label: 'Normal Vision', description: 'Full color vision' },
    { value: 'protanopia', label: 'Protanopia', description: 'Red-blind (1% of males)' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Green-blind (1% of males)' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Blue-blind (rare)' },
    { value: 'achromatopsia', label: 'Achromatopsia', description: 'Total color blindness (rare)' }
  ];

  // CSS filters for color blindness simulation
  const filters = {
    normal: 'none',
    protanopia: 'url(#protanopia-filter)',
    deuteranopia: 'url(#deuteranopia-filter)',
    tritanopia: 'url(#tritanopia-filter)',
    achromatopsia: 'grayscale(100%)'
  };

  const currentMode = simulationModes.find(m => m.value === mode);

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Color Blindness Simulator
            </CardTitle>
            <p className="text-sm text-slate-700 mt-1">{currentMode.description}</p>
          </div>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {simulationModes.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* SVG Filters for Color Blindness */}
        <svg className="hidden">
          <defs>
            {/* Protanopia (Red-blind) */}
            <filter id="protanopia-filter">
              <feColorMatrix type="matrix" values="
                0.567, 0.433, 0, 0, 0
                0.558, 0.442, 0, 0, 0
                0, 0.242, 0.758, 0, 0
                0, 0, 0, 1, 0
              "/>
            </filter>
            
            {/* Deuteranopia (Green-blind) */}
            <filter id="deuteranopia-filter">
              <feColorMatrix type="matrix" values="
                0.625, 0.375, 0, 0, 0
                0.7, 0.3, 0, 0, 0
                0, 0.3, 0.7, 0, 0
                0, 0, 0, 1, 0
              "/>
            </filter>
            
            {/* Tritanopia (Blue-blind) */}
            <filter id="tritanopia-filter">
              <feColorMatrix type="matrix" values="
                0.95, 0.05, 0, 0, 0
                0, 0.433, 0.567, 0, 0
                0, 0.475, 0.525, 0, 0
                0, 0, 0, 1, 0
              "/>
            </filter>
          </defs>
        </svg>

        <div style={{ filter: filters[mode] }}>
          <AccessibleStatusBadges showDescription={true} />
        </div>

        <div className="mt-6 p-4 bg-white rounded-lg border-2 border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-2">How It Works</h3>
          <p className="text-sm text-slate-700 mb-3">
            The status badges above include both color AND icons/emojis. This ensures users with color vision deficiencies can still distinguish between different statuses.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
              ✅ Icons provide non-color identification
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
              ✅ Text labels complement visual indicators
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300">
              ✅ High contrast ensures readability
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}