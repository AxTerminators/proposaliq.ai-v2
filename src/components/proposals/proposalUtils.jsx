import moment from "moment";
import { CONTRACT_VALUE_TIERS } from "./proposalConstants";

/**
 * Shared utility functions for proposal components
 * Consolidates duplicate logic from KanbanCard, ProposalsList, ProposalsTable
 */

/**
 * Format contract value with K/M notation
 */
export const formatCurrency = (value) => {
  if (!value) return null;
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

/**
 * Calculate days until due date
 * Returns null if no due_date, negative if overdue
 */
export const calculateDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  const today = moment();
  const due = moment(dueDate);
  return due.diff(today, 'days');
};

/**
 * Determine if proposal is overdue
 */
export const isProposalOverdue = (dueDate) => {
  const days = calculateDaysUntilDue(dueDate);
  return days !== null && days < 0;
};

/**
 * Determine if proposal is urgent (within 7 days)
 */
export const isProposalUrgent = (dueDate) => {
  const days = calculateDaysUntilDue(dueDate);
  return days !== null && days >= 0 && days <= 7;
};

/**
 * Calculate priority level based on urgency and contract value
 */
export const calculatePriorityLevel = (dueDate, contractValue) => {
  if (isProposalOverdue(dueDate)) return 'critical';
  if (isProposalUrgent(dueDate)) return 'high';
  if (contractValue >= CONTRACT_VALUE_TIERS.LARGE) return 'high';
  if (contractValue >= CONTRACT_VALUE_TIERS.MEDIUM) return 'medium';
  return 'normal';
};

/**
 * Calculate completion percentage from subtasks
 */
export const calculateCompletionPercentage = (subtasks) => {
  if (!subtasks || subtasks.length === 0) return 0;
  const completed = subtasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / subtasks.length) * 100);
};

/**
 * Group proposals by a specific field
 */
export const groupProposals = (proposals, groupBy) => {
  if (groupBy === 'none' || !groupBy) {
    return { all: proposals };
  }

  const groups = {};
  
  proposals.forEach(proposal => {
    let key;
    
    switch(groupBy) {
      case 'proposal_type_category':
        key = proposal.proposal_type_category || 'OTHER';
        break;
      case 'status':
        key = proposal.status || 'unknown';
        break;
      case 'agency':
        key = proposal.agency_name || 'No Agency';
        break;
      case 'client':
        key = proposal.prime_contractor_name || 'No Client';
        break;
      default:
        key = 'all';
    }
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(proposal);
  });
  
  return groups;
};

/**
 * Format due date for display
 */
export const formatDueDate = (dueDate, format = 'MMM D, YYYY') => {
  if (!dueDate) return 'N/A';
  return moment(dueDate).format(format);
};

/**
 * Get progress bar color based on percentage
 */
export const getProgressBarColor = (percentage) => {
  if (percentage === 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-orange-500';
};