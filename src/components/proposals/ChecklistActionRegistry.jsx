import { createPageUrl } from "@/utils";

// 8-Phase Single-Word Template Definition
export const TEMPLATE_8_PHASE_SINGLE_WORD = {
  id: "8_phase_single_word",
  name: "8-Phase Single-Word Workflow",
  description: "Comprehensive 8-phase proposal workflow with detailed checklists",
  columns: [
    {
      id: "phase1_basics",
      label: "Basics",
      order: 1,
      color: "border-t-slate-500",
      default_status_mapping: "evaluating",
      checklist_items: [
        { id: "basic_info", label: "Enter Basic Information", type: "modal_trigger", associated_action: "open_phase1_basic", required: true },
        { id: "team_setup", label: "Set Up Proposal Team", type: "modal_trigger", associated_action: "open_phase1_team", required: true },
        { id: "kickoff_meeting", label: "Schedule Kickoff Meeting", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase2_gather",
      label: "Gather",
      order: 2,
      color: "border-t-blue-500",
      default_status_mapping: "researching",
      checklist_items: [
        { id: "upload_resources", label: "Upload Resources & Documents", type: "modal_trigger", associated_action: "open_phase2_resources", required: true },
        { id: "review_pastperf", label: "Review Past Performance", type: "manual_check", required: false },
        { id: "identify_teaming", label: "Identify Teaming Partners", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase3_analyze",
      label: "Analyze",
      order: 3,
      color: "border-t-indigo-500",
      default_status_mapping: "analyzing",
      checklist_items: [
        { id: "upload_solicitation", label: "Upload Solicitation Documents", type: "modal_trigger", associated_action: "open_phase3_solicitation", required: true },
        { id: "extract_requirements", label: "Extract Requirements (AI)", type: "manual_check", required: true },
        { id: "assess_feasibility", label: "Assess Feasibility", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase4_bidnobid",
      label: "Bid/No-Bid",
      order: 4,
      color: "border-t-purple-500",
      default_status_mapping: "evaluating",
      checklist_items: [
        { id: "compliance_matrix", label: "Build Compliance Matrix", type: "modal_trigger", associated_action: "open_phase4_compliance", required: true },
        { id: "competitor_analysis", label: "Analyze Competitors", type: "modal_trigger", associated_action: "open_phase4_competitor", required: false },
        { id: "bidnobid_decision", label: "Bid/No-Bid Decision", type: "manual_check", required: true }
      ]
    },
    {
      id: "phase5_strategize",
      label: "Strategize",
      order: 5,
      color: "border-t-pink-500",
      default_status_mapping: "planning",
      checklist_items: [
        { id: "win_strategy", label: "Define Win Strategy & Themes", type: "modal_trigger", associated_action: "open_phase5_strategy", required: true },
        { id: "section_selection", label: "Select Proposal Sections", type: "modal_trigger", associated_action: "open_phase5_sections", required: true },
        { id: "outline_approval", label: "Approve Outline", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase6_draft",
      label: "Draft",
      order: 6,
      color: "border-t-orange-500",
      default_status_mapping: "writing",
      checklist_items: [
        { id: "draft_sections", label: "Draft Proposal Sections", type: "page_trigger", associated_action: "open_proposal_writer", required: true },
        { id: "integrate_graphics", label: "Integrate Graphics & Tables", type: "manual_check", required: false },
        { id: "internal_review", label: "Conduct Internal Review", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase7_price",
      label: "Price",
      order: 7,
      color: "border-t-amber-500",
      default_status_mapping: "pricing",
      checklist_items: [
        { id: "build_pricing", label: "Build Pricing Model & CLINs", type: "page_trigger", associated_action: "open_proposal_pricing", required: true },
        { id: "review_rates", label: "Review Labor Rates", type: "manual_check", required: true },
        { id: "finalize_budget", label: "Finalize Budget", type: "manual_check", required: true }
      ]
    },
    {
      id: "phase8_finalize",
      label: "Finalize",
      order: 8,
      color: "border-t-green-500",
      default_status_mapping: "finalizing",
      checklist_items: [
        { id: "red_team_review", label: "Final Red Team Review", type: "modal_trigger", associated_action: "open_phase8_review", required: false },
        { id: "export_proposal", label: "Export Proposal Package", type: "modal_trigger", associated_action: "open_phase8_export", required: true },
        { id: "quality_check", label: "Final Quality Check", type: "manual_check", required: true },
        { id: "submit", label: "Submit Proposal", type: "manual_check", required: true },
        { id: "winloss_analysis", label: "Win/Loss Analysis", type: "modal_trigger", associated_action: "open_phase8_winloss", required: false }
      ]
    }
  ]
};

// Action handler function
export const handleChecklistAction = (actionId, proposal, organization, navigate, openModal) => {
  switch (actionId) {
    // Phase 1 actions
    case "open_phase1_basic":
      openModal("phase1_basic");
      break;
    case "open_phase1_team":
      openModal("phase1_team");
      break;

    // Phase 2 actions
    case "open_phase2_resources":
      openModal("phase2_resources");
      break;

    // Phase 3 actions
    case "open_phase3_solicitation":
      openModal("phase3_solicitation");
      break;

    // Phase 4 actions
    case "open_phase4_compliance":
      openModal("phase4_compliance");
      break;
    case "open_phase4_competitor":
      openModal("phase4_competitor");
      break;

    // Phase 5 actions
    case "open_phase5_strategy":
      openModal("phase5_strategy");
      break;
    case "open_phase5_sections":
      openModal("phase5_sections");
      break;

    // Phase 6 actions
    case "open_proposal_writer":
      navigate(createPageUrl("ProposalWriter") + `?proposalId=${proposal.id}`);
      break;

    // Phase 7 actions
    case "open_proposal_pricing":
      navigate(createPageUrl("ProposalPricing") + `?proposalId=${proposal.id}`);
      break;

    // Phase 8 actions
    case "open_phase8_review":
      openModal("phase8_review");
      break;
    case "open_phase8_export":
      openModal("phase8_export");
      break;
    case "open_phase8_winloss":
      openModal("phase8_winloss");
      break;

    default:
      console.warn(`Unknown action: ${actionId}`);
  }
};