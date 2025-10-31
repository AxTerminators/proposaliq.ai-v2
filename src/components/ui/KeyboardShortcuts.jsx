import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Command,
  Search,
  FileText,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  Settings,
  BarChart3,
  Download,
  Plus,
  Zap,
  Home,
  Globe,
  Award,
  Handshake,
  Library,
  Bug,
  Bell,
  Keyboard
} from "lucide-react";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  // Navigation
  {
    category: "Navigation",
    items: [
      { key: "g d", label: "Go to Dashboard", icon: Home, action: "Dashboard" },
      { key: "g p", label: "Go to Proposals", icon: FileText, action: "Proposals" },
      { key: "g c", label: "Go to Clients", icon: Users, action: "Clients" },
      { key: "g t", label: "Go to Tasks", icon: CheckSquare, action: "Tasks" },
      { key: "g k", label: "Go to Calendar", icon: Calendar, action: "Calendar" },
      { key: "g a", label: "Go to Analytics", icon: BarChart3, action: "Analytics" },
      { key: "g s", label: "Go to Settings", icon: Settings, action: "Settings" },
      { key: "g r", label: "Go to Resources", icon: Library, action: "Resources" },
    ]
  },
  // Actions
  {
    category: "Quick Actions",
    items: [
      { key: "n p", label: "New Proposal", icon: Plus, action: "new_proposal" },
      { key: "n c", label: "New Client", icon: Users, action: "new_client" },
      { key: "n t", label: "New Task", icon: CheckSquare, action: "new_task" },
      { key: "n e", label: "New Event", icon: Calendar, action: "new_event" },
    ]
  },
  // Search & Commands
  {
    category: "Search & Commands",
    items: [
      { key: "/", label: "Search Everything", icon: Search, action: "search" },
      { key: "cmd k", label: "Command Palette", icon: Command, action: "command_palette" },
      { key: "?", label: "Show Keyboard Shortcuts", icon: Keyboard, action: "help" },
    ]
  },
  // Global
  {
    category: "Global",
    items: [
      { key: "esc", label: "Close Modal / Cancel", icon: null, action: "escape" },
      { key: "cmd s", label: "Save (where applicable)", icon: null, action: "save" },
      { key: "cmd enter", label: "Submit Form", icon: null, action: "submit" },
    ]
  }
];

const COMMAND_PALETTE_ITEMS = [
  { label: "Dashboard", icon: Home, url: "Dashboard", keywords: ["home", "overview"] },
  { label: "Proposals", icon: FileText, url: "Proposals", keywords: ["proposals", "rfp", "contracts"] },
  { label: "Create New Proposal", icon: Plus, url: "ProposalBuilder", keywords: ["new", "create", "proposal"] },
  { label: "Clients", icon: Users, url: "Clients", keywords: ["clients", "customers"] },
  { label: "Tasks", icon: CheckSquare, url: "Tasks", keywords: ["tasks", "todos", "assignments"] },
  { label: "Calendar", icon: Calendar, url: "Calendar", keywords: ["calendar", "events", "meetings"] },
  { label: "Analytics", icon: BarChart3, url: "Analytics", keywords: ["analytics", "reports", "stats"] },
  { label: "Export Center", icon: Download, url: "ExportCenter", keywords: ["export", "download", "pdf"] },
  { label: "Past Performance", icon: Award, url: "PastPerformance", keywords: ["past", "performance", "history"] },
  { label: "Team", icon: Users, url: "Team", keywords: ["team", "members", "users"] },
  { label: "Teaming Partners", icon: Handshake, url: "TeamingPartners", keywords: ["partners", "subcontractors"] },
  { label: "Resources", icon: Library, url: "Resources", keywords: ["resources", "library", "documents"] },
  { label: "AI Chat", icon: MessageSquare, url: "Chat", keywords: ["chat", "ai", "assistant"] },
  { label: "Discussions", icon: MessageSquare, url: "Discussions", keywords: ["discussions", "forums"] },
  { label: "Opportunity Finder", icon: Globe, url: "OpportunityFinder", keywords: ["opportunities", "sam", "contracts"] },
  { label: "Settings", icon: Settings, url: "Settings", keywords: ["settings", "preferences", "account"] },
  { label: "Feedback", icon: Bug, url: "Feedback", keywords: ["feedback", "bug", "report"] },
];

export default function KeyboardShortcuts({ onAction }) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pressedKeys, setPressedKeys] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Only handle command palette shortcut
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setShowCommandPalette(true);
          setSearchQuery("");
        }
        return;
      }

      const key = e.key.toLowerCase();
      
      // Show help
      if (key === '?') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Escape key
      if (key === 'escape') {
        if (showHelp) setShowHelp(false);
        if (showCommandPalette) {
          setShowCommandPalette(false);
          setSearchQuery("");
        }
        return;
      }

      // Command palette
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setSearchQuery("");
        return;
      }

      // Search shortcut
      if (key === '/') {
        e.preventDefault();
        setShowCommandPalette(true);
        setSearchQuery("");
        return;
      }

      // Track key sequence for two-key shortcuts
      setPressedKeys(prev => {
        const newKeys = [...prev, key].slice(-2); // Keep last 2 keys
        
        // Check for two-key combinations
        const combo = newKeys.join(' ');
        
        // Navigation shortcuts (g + letter)
        if (combo === 'g d') { navigate(createPageUrl('Dashboard')); return []; }
        if (combo === 'g p') { navigate(createPageUrl('Proposals')); return []; }
        if (combo === 'g c') { navigate(createPageUrl('Clients')); return []; }
        if (combo === 'g t') { navigate(createPageUrl('Tasks')); return []; }
        if (combo === 'g k') { navigate(createPageUrl('Calendar')); return []; }
        if (combo === 'g a') { navigate(createPageUrl('Analytics')); return []; }
        if (combo === 'g s') { navigate(createPageUrl('Settings')); return []; }
        if (combo === 'g r') { navigate(createPageUrl('Resources')); return []; }
        
        // New item shortcuts (n + letter)
        if (combo === 'n p') { navigate(createPageUrl('ProposalBuilder')); return []; }
        if (combo === 'n c') { 
          if (onAction) onAction('new_client');
          return [];
        }
        if (combo === 'n t') { 
          if (onAction) onAction('new_task');
          return [];
        }
        if (combo === 'n e') { 
          if (onAction) onAction('new_event');
          return [];
        }
        
        return newKeys;
      });

      // Clear keys after 1 second
      setTimeout(() => setPressedKeys([]), 1000);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showHelp, showCommandPalette, onAction]);

  // Filter command palette items
  const filteredItems = COMMAND_PALETTE_ITEMS.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  const handleSelectItem = (item) => {
    navigate(createPageUrl(item.url));
    setShowCommandPalette(false);
    setSearchQuery("");
  };

  return (
    <>
      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Power user shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {SHORTCUTS.map((section) => (
                <div key={section.category}>
                  <h3 className="font-semibold text-slate-900 mb-3">{section.category}</h3>
                  <div className="space-y-2">
                    {section.items.map((shortcut) => {
                      const Icon = shortcut.icon;
                      return (
                        <div 
                          key={shortcut.key}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                            <span className="text-sm text-slate-700">{shortcut.label}</span>
                          </div>
                          <div className="flex gap-1">
                            {shortcut.key.split(' ').map((key, idx) => (
                              <Badge 
                                key={idx}
                                variant="outline" 
                                className="font-mono text-xs px-2"
                              >
                                {key === 'cmd' ? '⌘' : key === 'enter' ? '↵' : key}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Pro Tip:</strong> Press <Badge variant="outline" className="mx-1 font-mono">⌘ K</Badge> 
                  or <Badge variant="outline" className="mx-1 font-mono">/</Badge> to open the command palette 
                  and search for anything!
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Command Palette */}
      <Dialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <DialogContent className="max-w-2xl p-0">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages and actions..."
                className="pl-10 text-lg border-none focus-visible:ring-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredItems.length > 0) {
                    handleSelectItem(filteredItems[0]);
                  }
                }}
              />
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="p-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectItem(item)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                          "hover:bg-blue-50",
                          idx === 0 && "bg-slate-50"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="text-xs text-slate-500">
                            {item.keywords.slice(0, 3).join(', ')}
                          </p>
                        </div>
                        {idx === 0 && (
                          <Badge variant="outline" className="font-mono text-xs">
                            ↵
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono">↑↓</Badge>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono">↵</Badge>
                Select
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono">ESC</Badge>
                Close
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {filteredItems.length} results
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visual Key Indicator (bottom-right corner) */}
      {pressedKeys.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white px-4 py-2 rounded-lg shadow-xl">
          <div className="flex gap-2 items-center">
            <Zap className="w-4 h-4" />
            {pressedKeys.map((key, idx) => (
              <Badge key={idx} variant="secondary" className="font-mono">
                {key}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
}