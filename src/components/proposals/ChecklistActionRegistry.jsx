import { createPageUrl } from "@/utils";

// 15-Column Single-Word Template Definition
export const TEMPLATE_8_PHASE_SINGLE_WORD = {
  id: "15_column_single_word",
  name: "15-Column Single-Word Workflow",
  description: "Comprehensive 15-column proposal workflow with detailed phase breakdown",
  columns: [
    // PHASE 1 - Split into 2 columns
    {
      id: "phase1_initiate",
      label: "Initiate",
      order: 1,
      color: "border-t-slate-500",
      default_status_mapping: "evaluating",
      checklist_items: [
        { id: "proposal_name", label: "Enter Proposal Name", type: "modal_trigger", associated_action: "open_phase1_basic", required: true },
        { id: "solicitation_number", label: "Enter Solicitation Number", type: "manual_check", required: true },
        { id: "project_type", label: "Select Project Type", type: "manual_check", required: true }
      ]
    },
    {
      id: "phase1_team",
      label: "Team",
      order: 2,
      color: "border-t-slate-600",
      default_status_mapping: "evaluating",
      checklist_items: [
        { id: "prime_contractor", label: "Select Prime Contractor", type: "modal_trigger", associated_action: "open_phase1_team", required: true },
        { id: "teaming_partners", label: "Add Teaming Partners", type: "manual_check", required: false },
        { id: "kickoff_meeting", label: "Schedule Kickoff Meeting", type: "manual_check", required: false }
      ]
    },
    
    // PHASE 2
    {
      id: "phase2_resources",
      label: "Resources",
      order: 3,
      color: "border-t-blue-500",
      default_status_mapping: "researching",
      checklist_items: [
        { id: "boilerplate", label: "Link Boilerplate Content", type: "modal_trigger", associated_action: "open_phase2_resources", required: true },
        { id: "templates", label: "Link Templates", type: "manual_check", required: false },
        { id: "past_performance", label: "Link Past Performance", type: "manual_check", required: false }
      ]
    },
    
    // PHASE 3
    {
      id: "phase3_solicit",
      label: "Solicit",
      order: 4,
      color: "border-t-indigo-500",
      default_status_mapping: "analyzing",
      checklist_items: [
        { id: "upload_rfp", label: "Upload RFP/Solicitation", type: "modal_trigger", associated_action: "open_phase3_solicitation", required: true },
        { id: "extract_requirements", label: "Extract Requirements (AI)", type: "manual_check", required: true },
        { id: "set_due_date", label: "Set Due Date", type: "manual_check", required: true }
      ]
    },
    
    // PHASE 4
    {
      id: "phase4_evaluate",
      label: "Evaluate",
      order: 5,
      color: "border-t-purple-500",
      default_status_mapping: "evaluating",
      checklist_items: [
        { id: "ai_evaluation", label: "Run AI Evaluation", type: "manual_check", required: true },
        { id: "compliance_matrix", label: "Build Compliance Matrix", type: "modal_trigger", associated_action: "open_phase4_compliance", required: true },
        { id: "competitor_analysis", label: "Analyze Competitors", type: "modal_trigger", associated_action: "open_phase4_competitor", required: false }
      ]
    },
    
    // PHASE 5 - Split into 2 columns
    {
      id: "phase5_strategy",
      label: "Strategy",
      order: 6,
      color: "border-t-pink-500",
      default_status_mapping: "planning",
      checklist_items: [
        { id: "win_themes", label: "Define Win Themes", type: "modal_trigger", associated_action: "open_phase5_strategy", required: true },
        { id: "competitive_strategy", label: "Set Competitive Strategy", type: "manual_check", required: true },
        { id: "tone_style", label: "Configure Tone & Style", type: "manual_check", required: false }
      ]
    },
    {
      id: "phase5_plan",
      label: "Plan",
      order: 7,
      color: "border-t-pink-600",
      default_status_mapping: "planning",
      checklist_items: [
        { id: "section_selection", label: "Select Proposal Sections", type: "modal_trigger", associated_action: "open_phase5_sections", required: true },
        { id: "assign_writers", label: "Assign Section Writers", type: "manual_check", required: false },
        { id: "outline_approval", label: "Approve Outline", type: "manual_check", required: false }
      ]
    },
    
    // PHASE 6
    {
      id: "phase6_draft",
      label: "Draft",
      order: 8,
      color: "border-t-orange-500",
      default_status_mapping: "writing",
      checklist_items: [
        { id: "draft_sections", label: "Draft Proposal Sections", type: "page_trigger", associated_action: "open_proposal_writer", required: true },
        { id: "ai_content_generation", label: "Generate AI Content", type: "manual_check", required: false },
        { id: "section_completion", label: "Complete All Sections", type: "manual_check", required: true }
      ]
    },
    
    // PHASE 7
    {
      id: "phase7_price",
      label: "Price",
      order: 9,
      color: "border-t-amber-500",
      default_status_mapping: "pricing",
      checklist_items: [
        { id: "labor_categories", label: "Set Up Labor Categories", type: "page_trigger", associated_action: "open_proposal_pricing", required: true },
        { id: "build_clins", label: "Build CLINs", type: "manual_check", required: true },
        { id: "odc_items", label: "Add ODC Items", type: "manual_check", required: false },
        { id: "pricing_analysis", label: "Run Pricing Analysis", type: "manual_check", required: true }
      ]
    },
    
    // PHASE 8 - Split into 2 columns
    {
      id: "phase8_review",
      label: "Review",
      order: 10,
      color: "border-t-green-500",
      default_status_mapping: "finalizing",
      checklist_items: [
        { id: "internal_review", label: "Internal Review", type: "manual_check", required: false },
        { id: "red_team", label: "Red Team Review", type: "modal_trigger", associated_action: "open_phase8_review", required: false },
        { id: "resolve_comments", label: "Resolve All Comments", type: "manual_check", required: true }
      ]
    },
    {
      id: "phase8_finalize",
      label: "Finalize",
      order: 11,
      color: "border-t-green-600",
      default_status_mapping: "finalizing",
      checklist_items: [
        { id: "readiness_check", label: "Run Readiness Check", type: "manual_check", required: true },
        { id: "final_review", label: "Final Executive Review", type: "manual_check", required: true },
        { id: "export_proposal", label: "Export Proposal Package", type: "modal_trigger", associated_action: "open_phase8_export", required: true }
      ]
    },
    
    // OUTCOME COLUMNS
    {
      id: "outcome_submitted",
      label: "Submitted",
      order: 12,
      color: "border-t-blue-600",
      default_status_mapping: "submitted",
      checklist_items: [
        { id: "confirm_submission", label: "Confirm Submission", type: "manual_check", required: true },
        { id: "submission_date", label: "Record Submission Date", type: "manual_check", required: true }
      ]
    },
    {
      id: "outcome_won",
      label: "Won",
      order: 13,
      color: "border-t-emerald-600",
      default_status_mapping: "won",
      checklist_items: [
        { id: "record_win", label: "Record Contract Award", type: "manual_check", required: true },
        { id: "win_analysis", label: "Capture Win/Loss Analysis", type: "modal_trigger", associated_action: "open_phase8_winloss", required: false }
      ]
    },
    {
      id: "outcome_lost",
      label: "Lost",
      order: 14,
      color: "border-t-red-600",
      default_status_mapping: "lost",
      checklist_items: [
        { id: "record_loss", label: "Record Loss", type: "manual_check", required: true },
        { id: "loss_analysis", label: "Capture Win/Loss Analysis", type: "modal_trigger", associated_action: "open_phase8_winloss", required: true },
        { id: "lessons_learned", label: "Document Lessons Learned", type: "manual_check", required: false }
      ]
    },
    {
      id: "outcome_archive",
      label: "Archive",
      order: 15,
      color: "border-t-gray-500",
      default_status_mapping: "archived",
      checklist_items: [
        { id: "archive_reason", label: "Document Archive Reason", type: "manual_check", required: false }
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