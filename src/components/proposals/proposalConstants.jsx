/**
 * Shared constants and configurations for proposal components
 * Consolidates duplicate code from KanbanCard, ProposalsList, ProposalsTable
 */

export const STATUS_CONFIG = {
  evaluating: { label: 'Evaluating', color: 'bg-slate-100 text-slate-700' },
  watch_list: { label: 'Watch List', color: 'bg-amber-100 text-amber-700' },
  draft: { label: 'Draft', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  on_hold: { label: 'On Hold', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-700' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700' },
  client_review: { label: 'Client Review', color: 'bg-cyan-100 text-cyan-700' },
  client_accepted: { label: 'Client Accepted', color: 'bg-emerald-100 text-emerald-700' },
  client_rejected: { label: 'Client Rejected', color: 'bg-rose-100 text-rose-700' },
};

export const TYPE_EMOJIS = {
  RFP: '📄',
  RFI: '📝',
  SBIR: '💡',
  GSA: '🏛️',
  IDIQ: '📑',
  STATE_LOCAL: '🏙️',
  RFP_15_COLUMN: '📋',
  CUSTOM_PROJECT: '🎯',
  OTHER: '📊'
};

export const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'bg-red-500 text-white',
    borderColor: 'border-red-500'
  },
  high: {
    label: 'High Priority',
    color: 'bg-orange-500 text-white',
    borderColor: 'border-orange-400'
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-500 text-white',
    borderColor: 'border-yellow-400'
  },
  normal: {
    label: 'Normal',
    color: 'bg-blue-500 text-white',
    borderColor: 'border-slate-200'
  }
};

export const CONTRACT_VALUE_TIERS = {
  MEGA: 10000000,      // $10M+
  LARGE: 5000000,      // $5M+
  MEDIUM: 1000000,     // $1M+
  SMALL: 100000        // $100K+
};