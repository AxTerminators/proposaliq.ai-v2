import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paintbrush, Palette } from 'lucide-react';

// Predefined Tailwind gradient presets
const GRADIENT_PRESETS = [
  { label: 'Slate', value: 'from-slate-400 to-slate-600', colors: ['#94a3b8', '#475569'] },
  { label: 'Gray', value: 'from-gray-400 to-gray-600', colors: ['#9ca3af', '#4b5563'] },
  { label: 'Blue', value: 'from-blue-400 to-blue-600', colors: ['#60a5fa', '#2563eb'] },
  { label: 'Cyan', value: 'from-cyan-400 to-cyan-600', colors: ['#22d3ee', '#0891b2'] },
  { label: 'Teal', value: 'from-teal-400 to-teal-600', colors: ['#2dd4bf', '#0d9488'] },
  { label: 'Green', value: 'from-green-400 to-green-600', colors: ['#4ade80', '#16a34a'] },
  { label: 'Emerald', value: 'from-emerald-400 to-emerald-600', colors: ['#34d399', '#059669'] },
  { label: 'Lime', value: 'from-lime-400 to-lime-600', colors: ['#a3e635', '#65a30d'] },
  { label: 'Yellow', value: 'from-yellow-400 to-yellow-600', colors: ['#facc15', '#ca8a04'] },
  { label: 'Amber', value: 'from-amber-400 to-amber-600', colors: ['#fbbf24', '#d97706'] },
  { label: 'Orange', value: 'from-orange-400 to-orange-600', colors: ['#fb923c', '#ea580c'] },
  { label: 'Red', value: 'from-red-400 to-red-600', colors: ['#f87171', '#dc2626'] },
  { label: 'Rose', value: 'from-rose-400 to-rose-600', colors: ['#fb7185', '#e11d48'] },
  { label: 'Pink', value: 'from-pink-400 to-pink-600', colors: ['#f472b6', '#db2777'] },
  { label: 'Fuchsia', value: 'from-fuchsia-400 to-fuchsia-600', colors: ['#e879f9', '#c026d3'] },
  { label: 'Purple', value: 'from-purple-400 to-purple-600', colors: ['#c084fc', '#9333ea'] },
  { label: 'Violet', value: 'from-violet-400 to-violet-600', colors: ['#a78bfa', '#7c3aed'] },
  { label: 'Indigo', value: 'from-indigo-400 to-indigo-600', colors: ['#818cf8', '#4f46e5'] },
];

// Solid color presets (hex values)
const SOLID_COLOR_PRESETS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#10b981' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Slate', value: '#64748b' }
];

/**
 * Universal ColorPicker component that supports both gradients and solid colors
 * @param {Object} props
 * @param {string} props.value - Current color value (gradient class or hex)
 * @param {function} props.onChange - Callback when color changes
 * @param {string} props.mode - 'gradient' or 'solid' (default: 'gradient')
 * @param {string} props.label - Optional label for the picker
 */
export default function ColorPicker({ value, onChange, mode = 'gradient', label }) {
  const [customColor, setCustomColor] = useState('#3b82f6');

  const isGradientMode = mode === 'gradient';
  const presets = isGradientMode ? GRADIENT_PRESETS : SOLID_COLOR_PRESETS;

  const handlePresetClick = (presetValue) => {
    onChange(presetValue);
  };

  const handleCustomColorChange = (hexColor) => {
    setCustomColor(hexColor);
    if (isGradientMode) {
      // Convert hex to Tailwind gradient (approximate)
      onChange(`from-blue-400 to-blue-600`);
    } else {
      onChange(hexColor);
    }
  };

  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium">{label}</Label>}

      {/* Current Selection Preview */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
        <div
          className={`w-16 h-10 rounded border-2 border-slate-300 ${
            isGradientMode ? `bg-gradient-to-r ${value}` : ''
          }`}
          style={!isGradientMode ? { backgroundColor: value } : {}}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-600">Current Selection</p>
          <p className="font-mono text-xs truncate text-slate-900">{value}</p>
        </div>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Presets
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-3">
          <div className={`grid gap-2 ${isGradientMode ? 'grid-cols-3' : 'grid-cols-6'}`}>
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className={`h-12 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md ${
                  value === preset.value
                    ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                    : 'border-slate-300'
                }`}
                title={preset.label}
              >
                {isGradientMode ? (
                  <div className={`w-full h-full rounded-md bg-gradient-to-r ${preset.value}`} />
                ) : (
                  <div
                    className="w-full h-full rounded-md"
                    style={{ backgroundColor: preset.value }}
                  />
                )}
              </button>
            ))}
          </div>
          {isGradientMode && (
            <p className="text-xs text-slate-500 mt-2">
              Select from Tailwind gradient presets
            </p>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-3 space-y-4">
          {isGradientMode ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Tailwind Gradient Class</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="e.g., from-blue-400 to-blue-600"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Enter a Tailwind gradient class (from-[color]-[shade] to-[color]-[shade])
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>Tip:</strong> Use format like "from-purple-400 to-pink-600" for custom gradients
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Pick a Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-20 h-10 rounded border-2 border-slate-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomColor(val);
                      if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
                        onChange(val);
                      }
                    }}
                    placeholder="#3b82f6"
                    className="flex-1 font-mono"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Use the color wheel or enter a hex color code
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}