import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileProposalCard from "./MobileProposalCard";

const defaultColumns = [
  { id: 'evaluating', label: 'Evaluating', emoji: '🔍' },
  { id: 'watch_list', label: 'Watch List', emoji: '👀' },
  { id: 'draft', label: 'Draft', emoji: '📝' },
  { id: 'in_progress', label: 'In Progress', emoji: '⚡' },
  { id: 'submitted', label: 'Submitted', emoji: '📤' },
  { id: 'won', label: 'Won', emoji: '🏆' },
  { id: 'lost', label: 'Lost', emoji: '❌' },
  { id: 'archived', label: 'Archived', emoji: '📦' }
];

// Helper to get emoji for a column
const getColumnEmoji = (col) => {
  if (col?.emoji) return col.emoji;
  
  // Try to extract emoji from label
  const emojiMatch = col?.label?.match(/^([🔍👀📝⚡📤🏆❌📦🎯📋🔬🏛️📑🏢📊])\s*/);
  if (emojiMatch) return emojiMatch[1];
  
  // Fallback based on common column types
  if (col?.label?.toLowerCase().includes('submit')) return '📤';
  if (col?.label?.toLowerCase().includes('won')) return '🏆';
  if (col?.label?.toLowerCase().includes('lost')) return '❌';
  if (col?.label?.toLowerCase().includes('archive')) return '📦';
  if (col?.label?.toLowerCase().includes('draft')) return '📝';
  if (col?.label?.toLowerCase().includes('progress')) return '⚡';
  if (col?.label?.toLowerCase().includes('evaluat')) return '🔍';
  if (col?.label?.toLowerCase().includes('watch')) return '👀';
  
  // Default fallback
  return '📋';
};

export default function MobileKanbanView({ proposals = [], columns = defaultColumns }) {
  const [selectedColumn, setSelectedColumn] = useState(columns[0]?.id || 'evaluating');
  const [expandedColumn, setExpandedColumn] = useState(null);

  const currentColumn = columns.find(c => c?.id === selectedColumn) || columns[0];
  
  const columnProposals = proposals.filter(p => {
    if (!currentColumn) return false;
    
    if (currentColumn.type === 'default_status') {
      return p.status === currentColumn.default_status_mapping;
    } else if (currentColumn.type === 'custom_stage') {
      return p.custom_workflow_stage_id === currentColumn.id;
    } else if (currentColumn.type === 'locked_phase') {
      return p.custom_workflow_stage_id === currentColumn.id;
    } else if (currentColumn.type === 'master_status') {
      return currentColumn.status_mapping?.includes(p.status);
    } else {
      // Fallback for default columns
      return p.status === currentColumn.id;
    }
  });

  const currentEmoji = getColumnEmoji(currentColumn);

  return (
    <div className="space-y-4">
      {/* Column Selector */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => {
                  if (!col) return null;
                  
                  const colEmoji = getColumnEmoji(col);
                  const colProposalCount = proposals.filter(p => {
                    if (col.type === 'default_status') {
                      return p.status === col.default_status_mapping;
                    } else if (col.type === 'custom_stage') {
                      return p.custom_workflow_stage_id === col.id;
                    } else if (col.type === 'locked_phase') {
                      return p.custom_workflow_stage_id === col.id;
                    } else if (col.type === 'master_status') {
                      return col.status_mapping?.includes(p.status);
                    } else {
                      return p.status === col.id;
                    }
                  }).length;
                  
                  return (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <span>{colEmoji}</span>
                        <span>{col.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {colProposalCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Current Column Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{currentEmoji}</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{currentColumn?.label || 'Column'}</h2>
            <p className="text-sm text-slate-600">{columnProposals.length} proposal{columnProposals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {columnProposals.length}
        </Badge>
      </div>

      {/* Proposals List */}
      <div className="space-y-3">
        {columnProposals.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">{currentEmoji}</div>
              <p className="text-slate-600">No proposals in {currentColumn?.label || 'this column'}</p>
            </CardContent>
          </Card>
        ) : (
          columnProposals.map(proposal => (
            <MobileProposalCard 
              key={proposal.id} 
              proposal={proposal}
              showProgress={true}
            />
          ))
        )}
      </div>

      {/* Horizontal Column Scroller */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Jump</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {columns.map((col) => {
            if (!col) return null;
            
            const colEmoji = getColumnEmoji(col);
            const count = proposals.filter(p => {
              if (col.type === 'default_status') {
                return p.status === col.default_status_mapping;
              } else if (col.type === 'custom_stage') {
                return p.custom_workflow_stage_id === col.id;
              } else if (col.type === 'locked_phase') {
                return p.custom_workflow_stage_id === col.id;
              } else if (col.type === 'master_status') {
                return col.status_mapping?.includes(p.status);
              } else {
                return p.status === col.id;
              }
            }).length;

            return (
              <button
                key={col.id}
                onClick={() => setSelectedColumn(col.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all active:scale-95",
                  selectedColumn === col.id
                    ? "bg-blue-50 border-blue-400 shadow-lg"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="text-2xl mb-1">{colEmoji}</div>
                <div className={cn(
                  "text-xs font-medium mb-1",
                  selectedColumn === col.id ? "text-blue-900" : "text-slate-700"
                )}>
                  {col.label}
                </div>
                <Badge 
                  variant={selectedColumn === col.id ? "default" : "secondary"}
                  className="text-xs"
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}