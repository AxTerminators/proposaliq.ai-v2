import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Accessible Status Badges
 * Status indicators with icons for color-blind accessibility
 */

export const STATUS_CONFIG = {
  evaluating: { 
    label: 'Evaluating', 
    color: 'bg-slate-600 text-white', 
    icon: '🔍',
    description: 'Under initial evaluation'
  },
  watch_list: { 
    label: 'Watch List', 
    color: 'bg-amber-600 text-white', 
    icon: '👀',
    description: 'Monitoring for opportunities'
  },
  draft: { 
    label: 'Draft', 
    color: 'bg-blue-600 text-white', 
    icon: '📝',
    description: 'In draft stage'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-purple-600 text-white', 
    icon: '⚡',
    description: 'Active development'
  },
  on_hold: {
    label: 'On Hold',
    color: 'bg-orange-600 text-white',
    icon: '⏸️',
    description: 'Temporarily paused'
  },
  submitted: { 
    label: 'Submitted', 
    color: 'bg-indigo-600 text-white', 
    icon: '📤',
    description: 'Submitted to client'
  },
  won: { 
    label: 'Won', 
    color: 'bg-green-600 text-white', 
    icon: '🏆',
    description: 'Successfully won'
  },
  lost: { 
    label: 'Lost', 
    color: 'bg-red-600 text-white', 
    icon: '❌',
    description: 'Not selected'
  },
  archived: { 
    label: 'Archived', 
    color: 'bg-gray-600 text-white', 
    icon: '📦',
    description: 'Archived'
  },
  client_review: {
    label: 'Client Review',
    color: 'bg-cyan-600 text-white',
    icon: '👁️',
    description: 'Under client review'
  },
  client_accepted: {
    label: 'Client Accepted',
    color: 'bg-emerald-600 text-white',
    icon: '✅',
    description: 'Accepted by client'
  },
  client_rejected: {
    label: 'Client Rejected',
    color: 'bg-rose-600 text-white',
    icon: '🚫',
    description: 'Rejected by client'
  }
};

export default function AccessibleStatusBadges({ showDescription = false }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="space-y-1">
            <Badge className={cn("w-full justify-start gap-2 py-2", config.color)}>
              <span className="text-lg">{config.icon}</span>
              <span className="font-medium">{config.label}</span>
            </Badge>
            {showDescription && (
              <p className="text-xs text-slate-700 pl-2">{config.description}</p>
            )}
          </div>
        ))}
      </div>

      {!showDescription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-blue-900">
            <strong>Accessibility Feature:</strong> Each status includes an emoji icon so users with color blindness can distinguish statuses without relying solely on color.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get status badge config
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || { 
    label: status, 
    color: 'bg-gray-600 text-white', 
    icon: '📋',
    description: 'Status'
  };
}