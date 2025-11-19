import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, ExternalLink, Sparkles, FileEdit, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";
import { useChecklistModal } from "./modals/ChecklistIntegration";

/**
 * Phase 1.1: Enhanced ChecklistItemRenderer with DynamicModal Integration
 * 
 * This component renders individual checklist items and handles their click interactions.
 * It now fully integrates with useChecklistModal for modal_trigger items.
 */
export default function ChecklistItemRenderer({ item, isCompleted, onItemClick, proposal }) {
  const navigate = useNavigate();
  const actionConfig = getActionConfig(item.associated_action);
  
  // Initialize modal hook for modal_trigger items
  const { openModal } = useChecklistModal(proposal?.id, proposal?.organization_id);
  
  const handleClick = (e) => {
    // CRITICAL: Stop event propagation to prevent card click
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[ChecklistItem] 🔍 Clicked:', {
      label: item.label,
      type: item.type, 
      action: item.associated_action,
      proposalId: proposal?.id,
      hasProposal: !!proposal
    });
    
    // Handle proposal_action type - navigate to proposal card tab
    if (item.type === 'proposal_action' && item.associated_action) {
      try {
        const actionConfig = JSON.parse(item.associated_action);
        if (actionConfig.action_type === 'navigate_to_tab' && actionConfig.target_tab) {
          console.log('[ChecklistItem] Navigating to proposal tab:', actionConfig.target_tab);
          // Store tab to open in sessionStorage
          sessionStorage.setItem('openProposalTab', actionConfig.target_tab);
          // Trigger parent click to open the proposal card
          onItemClick(item);
          return;
        }
      } catch (error) {
        console.error('[ChecklistItem] Error parsing proposal_action config:', error);
      }
    }
    
    // Handle AI trigger items
    if (item.type === 'ai_trigger' && item.associated_action) {
      console.log('[ChecklistItem] AI trigger action:', item.associated_action);
      onItemClick(item);
      return;
    }
    
    // Handle modal_trigger type with DynamicModal integration
    if (item.type === 'modal_trigger' && item.associated_action && openModal) {
      console.log('[ChecklistItem] Opening DynamicModal for:', item.associated_action);
      try {
        openModal(item.associated_action);
        return;
      } catch (error) {
        console.warn('[ChecklistItem] DynamicModal failed, falling back to parent handler:', error);
      }
    }
    
    if (!item.associated_action) {
      // Manual checkbox - call parent handler
      console.log('[ChecklistItem] Manual checkbox - calling onItemClick');
      onItemClick(item);
      return;
    }

    // Get action configuration for legacy actions
    const action = getActionConfig(item.associated_action);
    
    if (!action) {
      console.error(`[ChecklistItem] Action not found: ${item.associated_action}`);
      onItemClick(item);
      return;
    }

    console.log('[ChecklistItem] Action config:', action);

    // Handle different action types
    if (isNavigateAction(item.associated_action)) {
      // Navigate to the specified page with proposal ID
      console.log('[ChecklistItem] 📍 Navigate action detected:', {
        actionPath: action.path,
        proposalId: proposal?.id,
        actionConfig: action
      });
      
      if (!proposal?.id) {
        console.error('[ChecklistItem] ❌ Cannot navigate: proposal ID is missing', proposal);
        alert('Error: Proposal ID is missing. Please try again or contact support.');
        return;
      }
      
      // Handle dedicated full-screen pages (Phase 5, Phase 6)
      if (action.path === 'ProposalStrategyConfigPage' || action.path === 'AIAssistedWriterPage') {
        const url = `${createPageUrl(action.path)}?proposalId=${proposal.id}`;
        console.log('[ChecklistItem] 🚀 Navigating to full-screen page:', action.path);
        console.log('[ChecklistItem] 🔗 URL:', url);
        console.log('[ChecklistItem] 📊 About to redirect...');
        window.location.href = url;
        return;
      }
      
      const url = `${createPageUrl(action.path)}?id=${proposal.id}`;
      console.log('[ChecklistItem] 🔗 Navigating to:', url);
      navigate(url);
      onClose();
      return;
    } else if (isModalAction(item.associated_action) || isAIAction(item.associated_action)) {
      // Trigger modal/AI action - call parent handler
      console.log('[ChecklistItem] Modal/AI action - calling onItemClick');
      onItemClick(item);
    } else {
      // Default: manual check - call parent handler
      console.log('[ChecklistItem] Default - calling onItemClick');
      onItemClick(item);
    }
  };

  // Determine icon based on action type and item type
  const getIcon = () => {
    if (isCompleted) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }

    // Check for new item types first
    if (item.type === 'proposal_action') {
      return <ExternalLink className="w-4 h-4 text-orange-500" />;
    }

    if (item.type === 'ai_trigger') {
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    }

    if (item.type === 'approval_request') {
      return <Shield className="w-4 h-4 text-emerald-500" />;
    }

    if (item.type === 'modal_trigger' && item.associated_action) {
      return <FileEdit className="w-4 h-4 text-indigo-500" />;
    }

    if (!item.associated_action || item.type === 'manual_check') {
      return <Circle className="w-4 h-4 text-slate-400" />;
    }

    if (isNavigateAction(item.associated_action)) {
      return <ExternalLink className="w-4 h-4 text-blue-500" />;
    }

    if (isAIAction(item.associated_action)) {
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    }

    if (isModalAction(item.associated_action)) {
      return <FileEdit className="w-4 h-4 text-indigo-500" />;
    }

    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  // Determine if this is clickable
  const isClickable = !isCompleted && (item.associated_action || item.type === 'manual_check');

  // Get button label based on action type and item type
  const getButtonLabel = () => {
    if (item.type === 'proposal_action') {
      try {
        const actionConfig = JSON.parse(item.associated_action);
        if (actionConfig.action_type === 'navigate_to_tab') {
          return 'Go to Tab';
        }
      } catch (e) {
        return 'Open';
      }
    }
    if (item.type === 'ai_trigger') {
      try {
        const config = JSON.parse(item.associated_action);
        return `Generate ${config.section_type?.replace(/_/g, ' ') || 'Content'}`;
      } catch {
        return 'Generate';
      }
    }
    if (item.type === 'approval_request') {
      return 'Request Approval';
    }
    if (item.type === 'modal_trigger') {
      return 'Open';
    }
    if (isNavigateAction(item.associated_action)) {
      return 'Open';
    }
    if (isModalAction(item.associated_action)) {
      return 'Edit';
    }
    if (isAIAction(item.associated_action)) {
      return 'Run';
    }
    return 'Start';
  };

  return (
    <button
      onClick={isClickable ? handleClick : undefined}
      disabled={!isClickable}
      type="button"
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded transition-colors w-full text-left",
        isClickable && "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        isCompleted && "opacity-60",
        !isClickable && "cursor-default opacity-50"
      )}
    >
      {getIcon()}
      <span className={cn(
        "text-sm flex-1",
        isCompleted && "line-through text-slate-500",
        !isCompleted && "text-slate-700"
      )}>
        {item.label}
      </span>
      {item.required && !isCompleted && (
        <span className="text-xs text-red-500 font-medium">Required</span>
      )}
      
      {/* Type-specific badges */}
      {item.type === 'ai_trigger' && !isCompleted && item.ai_config?.action && (
        <Badge className="bg-purple-100 text-purple-700 text-xs">
          {item.ai_config.action.replace(/_/g, ' ')}
        </Badge>
      )}
      
      {item.type === 'approval_request' && !isCompleted && item.approval_config?.approver_roles && (
        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
          <Users className="w-3 h-3 mr-1" />
          {item.approval_config.approver_roles.join(', ')}
        </Badge>
      )}
      
      {isClickable && (
        <span className="text-xs text-blue-600 font-medium">{getButtonLabel()}</span>
      )}
    </button>
  );
}