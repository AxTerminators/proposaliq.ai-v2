import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

// Predefined color palette
const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Slate', value: '#64748b' }
];

export default function ColorPicker({ color, onChange }) {
  const [customColor, setCustomColor] = useState(color);

  const handlePresetClick = (presetColor) => {
    onChange(presetColor);
    setCustomColor(presetColor);
  };

  const handleCustomColorChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div className="space-y-3">
      {/* Current Color Display */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg border-2 border-slate-300"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1">
          <Label className="text-xs text-slate-600">Selected Color</Label>
          <p className="font-mono text-sm">{color}</p>
        </div>
      </div>

      {/* Preset Colors */}
      <div>
        <Label className="mb-2 block">Preset Colors</Label>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetClick(preset.value)}
              className={`w-full h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                color === preset.value ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-300'
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div>
        <Label className="mb-2 block">Custom Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-16 h-10 rounded border-2 border-slate-300 cursor-pointer"
          />
          <Input
            type="text"
            value={customColor}
            onChange={(e) => {
              const value = e.target.value;
              setCustomColor(value);
              // Only update if it's a valid hex color
              if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
                onChange(value);
              }
            }}
            placeholder="#3b82f6"
            className="flex-1 font-mono"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Enter a hex color code or use the color wheel
        </p>
      </div>
    </div>
  );
}