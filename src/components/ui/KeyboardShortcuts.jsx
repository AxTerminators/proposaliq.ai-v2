import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Command, Keyboard } from 'lucide-react';

/**
 * Keyboard Shortcuts Manager
 * 
 * Provides a hook for registering keyboard shortcuts and a UI component
 * to display available shortcuts to users.
 */

// Hook for registering keyboard shortcuts
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Build key combination string
      const keys = [];
      if (event.ctrlKey || event.metaKey) keys.push('mod');
      if (event.shiftKey) keys.push('shift');
      if (event.altKey) keys.push('alt');
      keys.push(event.key.toLowerCase());
      
      const combination = keys.join('+');

      // Find matching shortcut
      const shortcut = shortcuts.find(s => s.key === combination);
      
      if (shortcut) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Execute callback
        try {
          shortcut.callback(event);
        } catch (error) {
          console.error('[KeyboardShortcuts] Error executing shortcut:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Helper to format key combination for display
function formatKeyCombo(key) {
  const parts = key.split('+');
  return parts.map(part => {
    switch (part) {
      case 'mod': return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
      case 'shift': return '⇧';
      case 'alt': return navigator.platform.includes('Mac') ? '⌥' : 'Alt';
      case 'enter': return '↵';
      case 'escape': return 'Esc';
      default: return part.toUpperCase();
    }
  }).join(' + ');
}

// UI Component to display shortcuts
export function KeyboardShortcutsPanel({ shortcuts, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            <CardTitle>Keyboard Shortcuts</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {shortcuts.map((shortcut, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <div className="font-medium text-slate-900">{shortcut.label}</div>
                  {shortcut.description && (
                    <div className="text-sm text-slate-600">{shortcut.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-lg font-mono text-sm">
                  {formatKeyCombo(shortcut.key)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t text-sm text-slate-600">
            <p>Press <kbd className="px-2 py-1 bg-slate-100 rounded">?</kbd> to show this dialog</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Common shortcuts for proposal workflow
export const COMMON_SHORTCUTS = {
  SAVE: { key: 'mod+s', label: 'Save', description: 'Save current changes' },
  CLOSE: { key: 'escape', label: 'Close', description: 'Close modal or dialog' },
  HELP: { key: 'shift+/', label: 'Help', description: 'Show keyboard shortcuts' },
  SEARCH: { key: 'mod+k', label: 'Search', description: 'Open search' },
  NEW: { key: 'mod+n', label: 'New', description: 'Create new item' },
};