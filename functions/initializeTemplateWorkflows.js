
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Comprehensive template definitions for all proposal types
const TEMPLATE_DEFINITIONS = {
  RFP: {
    template_name: "Standard RFP Workflow",
    proposal_type_category: "RFP",
    board_type: "rfp",
    description: "Comprehensive 8-phase workflow for federal RFPs with detailed compliance tracking",
    icon_emoji: "📄",
    estimated_duration_days: 60,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Complete basic proposal information", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "review_solicitation", label: "Review solicitation requirements", type: "manual_check", required: true, order: 1 },
            { id: "bid_decision", label: "Make bid/no-bid decision", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "team",
          label: "Team Formation",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase2",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "assign_lead", label: "Assign lead writer and team roles", type: "manual_check", required: true, order: 0 },
            { id: "identify_partners", label: "Identify teaming partners if needed", type: "manual_check", required: false, order: 1 },
            { id: "kickoff_meeting", label: "Schedule kickoff meeting", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "resources",
          label: "Resources",
          color: "from-green-400 to-green-600",
          type: "locked_phase",
          phase_mapping: "phase3",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "past_performance", label: "Gather relevant past performance", type: "manual_check", required: true, order: 0 },
            { id: "resumes", label: "Collect key personnel resumes", type: "manual_check", required: true, order: 1 },
            { id: "capabilities", label: "Compile capability statements", type: "manual_check", required: false, order: 2 }
          ]
        },
        {
          id: "solicit",
          label: "Solicitation Analysis",
          color: "from-amber-400 to-amber-600",
          type: "locked_phase",
          phase_mapping: "phase4",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "upload_docs", label: "Upload all solicitation documents", type: "modal_trigger", associated_action: "open_modal_phase4", required: true, order: 0 },
            { id: "ai_analysis", label: "Run AI compliance analysis", type: "ai_trigger", required: true, order: 1 },
            { id: "compliance_matrix", label: "Review compliance matrix", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "strategy",
          label: "Win Strategy",
          color: "from-red-400 to-red-600",
          type: "locked_phase",
          phase_mapping: "phase5",
          is_locked: true,
          order: 4,
          checklist_items: [
            { id: "win_themes", label: "Define win themes", type: "manual_check", required: true, order: 0 },
            { id: "competitive_analysis", label: "Complete competitive analysis", type: "manual_check", required: true, order: 1 },
            { id: "discriminators", label: "Identify discriminators", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "outline",
          label: "Outline",
          color: "from-indigo-400 to-indigo-600",
          type: "locked_phase",
          phase_mapping: "phase6",
          is_locked: true,
          order: 5,
          checklist_items: [
            { id: "section_structure", label: "Define section structure", type: "manual_check", required: true, order: 0 },
            { id: "assign_sections", label: "Assign sections to writers", type: "manual_check", required: true, order: 1 },
            { id: "set_deadlines", label: "Set section deadlines", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "draft",
          label: "Drafting",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 6,
          checklist_items: [
            { id: "draft_sections", label: "Draft all required sections", type: "manual_check", required: true, order: 0 },
            { id: "pricing_complete", label: "Complete pricing volume", type: "manual_check", required: true, order: 1 },
            { id: "initial_review", label: "Complete initial review", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "review",
          label: "Review",
          color: "from-pink-400 to-pink-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 7,
          checklist_items: [
            { id: "pink_team", label: "Pink team review complete", type: "manual_check", required: false, order: 0 },
            { id: "red_team", label: "Red team review complete", type: "manual_check", required: true, order: 1 },
            { id: "final_edits", label: "Incorporate all feedback", type: "manual_check", required: true, order: 2 },
            { id: "quality_check", label: "Final quality check", type: "manual_check", required: true, order: 3 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 8,
          checklist_items: []
        },
        {
          id: "won",
          label: "Won",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 9,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 10,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 11,
          checklist_items: []
        }
      ]
    }
  },
  
  RFI: {
    template_name: "Standard RFI Workflow",
    proposal_type_category: "RFI",
    board_type: "rfi",
    description: "Streamlined workflow for Requests for Information with focus on capability demonstration",
    icon_emoji: "📝",
    estimated_duration_days: 21,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Capture RFI details", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "understand_purpose", label: "Understand RFI purpose and scope", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "gather",
          label: "Gather Information",
          color: "from-green-400 to-green-600",
          type: "locked_phase",
          phase_mapping: "phase3",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "capabilities", label: "Compile relevant capabilities", type: "manual_check", required: true, order: 0 },
            { id: "examples", label: "Gather example projects", type: "manual_check", required: true, order: 1 },
            { id: "technical_data", label: "Collect technical data sheets", type: "manual_check", required: false, order: 2 }
          ]
        },
        {
          id: "draft",
          label: "Draft Response",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "write_response", label: "Write response to all questions", type: "manual_check", required: true, order: 0 },
            { id: "attach_docs", label: "Attach supporting documents", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "review",
          label: "Review & Submit",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "review", label: "Review response for accuracy", type: "manual_check", required: true, order: 0 },
            { id: "compliance", label: "Verify format compliance", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 4,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 5,
          checklist_items: []
        }
      ]
    }
  },
  
  SBIR: {
    template_name: "SBIR/STTR Workflow",
    proposal_type_category: "SBIR",
    board_type: "sbir",
    description: "Research-focused workflow for SBIR/STTR proposals with innovation emphasis",
    icon_emoji: "💡",
    estimated_duration_days: 90,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Complete SBIR proposal details", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "review_topic", label: "Review SBIR topic requirements", type: "manual_check", required: true, order: 1 },
            { id: "assess_fit", label: "Assess innovation fit and feasibility", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "research",
          label: "Research Plan",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase2",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "research_plan", label: "Develop technical research plan", type: "manual_check", required: true, order: 0 },
            { id: "identify_personnel", label: "Identify principal investigator and key personnel", type: "manual_check", required: true, order: 1 },
            { id: "literature_review", label: "Complete literature review", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "innovation",
          label: "Innovation Strategy",
          color: "from-pink-400 to-pink-600",
          type: "locked_phase",
          phase_mapping: "phase5",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "define_innovation", label: "Define innovation and commercialization path", type: "manual_check", required: true, order: 0 },
            { id: "ip_strategy", label: "Define IP strategy", type: "manual_check", required: true, order: 1 },
            { id: "market_analysis", label: "Complete market analysis", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "technical",
          label: "Technical Volume",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "technical_approach", label: "Write technical approach", type: "manual_check", required: true, order: 0 },
            { id: "milestones", label: "Define research milestones", type: "manual_check", required: true, order: 1 },
            { id: "commercialization", label: "Write commercialization plan", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "budget",
          label: "Budget Development",
          color: "from-green-400 to-green-600",
          type: "custom_stage",
          is_locked: true,
          order: 4,
          checklist_items: [
            { id: "detailed_budget", label: "Create detailed budget (Phase I or II)", type: "manual_check", required: true, order: 0 },
            { id: "budget_narrative", label: "Write budget narrative", type: "manual_check", required: true, order: 1 },
            { id: "cost_share", label: "Document cost sharing if applicable", type: "manual_check", required: false, order: 2 }
          ]
        },
        {
          id: "review",
          label: "Review",
          color: "from-amber-400 to-amber-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 5,
          checklist_items: [
            { id: "technical_review", label: "Technical expert review", type: "manual_check", required: true, order: 0 },
            { id: "compliance_check", label: "Compliance and format check", type: "manual_check", required: true, order: 1 },
            { id: "final_review", label: "Final review by PI", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 6,
          checklist_items: []
        },
        {
          id: "won",
          label: "Won",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 7,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 8,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 9,
          checklist_items: []
        }
      ]
    }
  },
  
  GSA: {
    template_name: "GSA Schedule Workflow",
    proposal_type_category: "GSA",
    board_type: "gsa",
    description: "Specialized workflow for GSA Schedule additions and modifications",
    icon_emoji: "🏛️",
    estimated_duration_days: 45,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Enter GSA opportunity details", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "schedule_type", label: "Identify target schedule (MAS, OASIS, etc.)", type: "manual_check", required: true, order: 1 },
            { id: "sin_review", label: "Review applicable SINs", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "pricing",
          label: "Pricing Strategy",
          color: "from-green-400 to-green-600",
          type: "locked_phase",
          phase_mapping: "phase5",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "commercial_sales", label: "Gather commercial sales practices data", type: "manual_check", required: true, order: 0 },
            { id: "rate_structure", label: "Define labor category rate structure", type: "manual_check", required: true, order: 1 },
            { id: "discount_strategy", label: "Determine discount strategy", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "documentation",
          label: "Documentation",
          color: "from-amber-400 to-amber-600",
          type: "locked_phase",
          phase_mapping: "phase3",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "financial_docs", label: "Prepare financial documentation", type: "manual_check", required: true, order: 0 },
            { id: "past_performance", label: "Compile past performance examples", type: "manual_check", required: true, order: 1 },
            { id: "certifications", label: "Gather required certifications", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "draft",
          label: "Draft Proposal",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "complete_forms", label: "Complete all required forms", type: "manual_check", required: true, order: 0 },
            { id: "pricing_volume", label: "Complete pricing volume", type: "manual_check", required: true, order: 1 },
            { id: "technical_volume", label: "Write technical/capability volume", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "review",
          label: "Review & Submit",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 4,
          checklist_items: [
            { id: "compliance_review", label: "GSA compliance review", type: "manual_check", required: true, order: 0 },
            { id: "pricing_review", label: "Pricing competitiveness review", type: "manual_check", required: true, order: 1 },
            { id: "legal_review", label: "Legal review of terms", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 5,
          checklist_items: []
        },
        {
          id: "won",
          label: "Awarded",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 6,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Not Selected",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 7,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 8,
          checklist_items: []
        }
      ]
    }
  },
  
  IDIQ: {
    template_name: "IDIQ/Contract Vehicle Workflow",
    proposal_type_category: "IDIQ",
    board_type: "idiq",
    description: "Workflow for IDIQ and other contract vehicle submissions",
    icon_emoji: "📑",
    estimated_duration_days: 60,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Enter IDIQ opportunity details", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "vehicle_analysis", label: "Analyze contract vehicle requirements", type: "manual_check", required: true, order: 1 },
            { id: "ceiling_review", label: "Review contract ceiling and scope", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "team",
          label: "Team & Partners",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase2",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "prime_sub_strategy", label: "Define prime/sub strategy", type: "manual_check", required: true, order: 0 },
            { id: "teaming_agreements", label: "Establish teaming agreements", type: "manual_check", required: true, order: 1 },
            { id: "assign_roles", label: "Assign proposal roles and responsibilities", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "resources",
          label: "Capability Development",
          color: "from-green-400 to-green-600",
          type: "locked_phase",
          phase_mapping: "phase3",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "past_performance", label: "Compile relevant past performance", type: "manual_check", required: true, order: 0 },
            { id: "corporate_experience", label: "Document corporate experience", type: "manual_check", required: true, order: 1 },
            { id: "certifications", label: "Gather all certifications", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "strategy",
          label: "Win Strategy",
          color: "from-red-400 to-red-600",
          type: "locked_phase",
          phase_mapping: "phase5",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "positioning", label: "Define competitive positioning", type: "manual_check", required: true, order: 0 },
            { id: "win_themes", label: "Develop win themes", type: "manual_check", required: true, order: 1 },
            { id: "pricing_strategy", label: "Define pricing strategy", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "draft",
          label: "Drafting",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 4,
          checklist_items: [
            { id: "technical_volume", label: "Draft technical capability volume", type: "manual_check", required: true, order: 0 },
            { id: "management_volume", label: "Draft management volume", type: "manual_check", required: true, order: 1 },
            { id: "pricing_volume", label: "Complete pricing volume", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "review",
          label: "Review",
          color: "from-pink-400 to-pink-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 5,
          checklist_items: [
            { id: "color_team", label: "Color team reviews complete", type: "manual_check", required: true, order: 0 },
            { id: "compliance", label: "Final compliance check", type: "manual_check", required: true, order: 1 },
            { id: "executive_review", label: "Executive review and approval", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 6,
          checklist_items: []
        },
        {
          id: "won",
          label: "Won",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 7,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 8,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 9,
          checklist_items: []
        }
      ]
    }
  },
  
  STATE_LOCAL: {
    template_name: "State/Local Government Workflow",
    proposal_type_category: "STATE_LOCAL",
    board_type: "state_local",
    description: "Workflow optimized for state and local government proposals",
    icon_emoji: "🏙️",
    estimated_duration_days: 45,
    workflow_config: {
      columns: [
        {
          id: "initiate",
          label: "Initiate",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Enter opportunity details", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "jurisdiction_review", label: "Review jurisdiction-specific requirements", type: "manual_check", required: true, order: 1 },
            { id: "local_preference", label: "Check local business preference requirements", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "team",
          label: "Team Formation",
          color: "from-purple-400 to-purple-600",
          type: "locked_phase",
          phase_mapping: "phase2",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "assign_team", label: "Assign proposal team", type: "manual_check", required: true, order: 0 },
            { id: "local_partners", label: "Identify local partners if needed", type: "manual_check", required: false, order: 1 }
          ]
        },
        {
          id: "resources",
          label: "Resources",
          color: "from-green-400 to-green-600",
          type: "locked_phase",
          phase_mapping: "phase3",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "references", label: "Compile local references", type: "manual_check", required: true, order: 0 },
            { id: "certifications", label: "Gather state/local certifications", type: "manual_check", required: true, order: 1 },
            { id: "insurance", label: "Verify insurance requirements", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "strategy",
          label: "Strategy",
          color: "from-red-400 to-red-600",
          type: "locked_phase",
          phase_mapping: "phase5",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "local_approach", label: "Define local engagement approach", type: "manual_check", required: true, order: 0 },
            { id: "pricing_strategy", label: "Develop competitive pricing", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "draft",
          label: "Drafting",
          color: "from-cyan-400 to-cyan-600",
          type: "locked_phase",
          phase_mapping: "phase7",
          is_locked: true,
          order: 4,
          checklist_items: [
            { id: "complete_forms", label: "Complete all required forms", type: "manual_check", required: true, order: 0 },
            { id: "write_narrative", label: "Write proposal narrative", type: "manual_check", required: true, order: 1 },
            { id: "pricing_sheets", label: "Complete pricing sheets", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "review",
          label: "Review",
          color: "from-pink-400 to-pink-600",
          type: "locked_phase",
          phase_mapping: "phase8",
          is_locked: true,
          order: 5,
          checklist_items: [
            { id: "compliance_check", label: "Compliance check", type: "manual_check", required: true, order: 0 },
            { id: "final_review", label: "Final review", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 6,
          checklist_items: []
        },
        {
          id: "won",
          label: "Won",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 7,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 8,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 9,
          checklist_items: []
        }
      ]
    }
  },
  
  QUICK_PROPOSAL: {
    template_name: "Quick Proposal",
    proposal_type_category: "OTHER",
    board_type: "quick_proposal",
    description: "Rapid proposal creation with AI assistance - ideal for tight deadlines and simple opportunities",
    icon_emoji: "⚡",
    estimated_duration_days: 7,
    workflow_config: {
      columns: [
        {
          id: "setup",
          label: "Setup",
          color: "from-blue-400 to-blue-600",
          type: "locked_phase",
          phase_mapping: "phase1",
          is_locked: true,
          order: 0,
          checklist_items: [
            { id: "basic_info", label: "Enter basic opportunity info", type: "modal_trigger", associated_action: "open_modal_phase1", required: true, order: 0 },
            { id: "upload_rfp", label: "Upload RFP/requirements (optional)", type: "manual_check", required: false, order: 1 }
          ]
        },
        {
          id: "ai_generate",
          label: "AI Generation",
          color: "from-purple-400 to-purple-600",
          type: "custom_stage",
          is_locked: true,
          order: 1,
          checklist_items: [
            { id: "ai_outline", label: "Generate AI-powered outline", type: "ai_trigger", required: true, order: 0 },
            { id: "ai_content", label: "Generate initial content with AI", type: "ai_trigger", required: true, order: 1 },
            { id: "review_ai", label: "Review and customize AI content", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "refine",
          label: "Refine",
          color: "from-cyan-400 to-cyan-600",
          type: "custom_stage",
          is_locked: true,
          order: 2,
          checklist_items: [
            { id: "add_details", label: "Add specific details and examples", type: "manual_check", required: true, order: 0 },
            { id: "quick_pricing", label: "Add quick pricing estimate", type: "manual_check", required: true, order: 1 },
            { id: "format_check", label: "Quick format check", type: "manual_check", required: true, order: 2 }
          ]
        },
        {
          id: "finalize",
          label: "Finalize",
          color: "from-green-400 to-green-600",
          type: "custom_stage",
          is_locked: true,
          order: 3,
          checklist_items: [
            { id: "final_review", label: "Final quality review", type: "manual_check", required: true, order: 0 },
            { id: "export_ready", label: "Prepare for export", type: "manual_check", required: true, order: 1 }
          ]
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          type: "default_status",
          default_status_mapping: "submitted",
          is_terminal: true,
          is_locked: true,
          order: 4,
          checklist_items: []
        },
        {
          id: "won",
          label: "Won",
          color: "from-green-400 to-green-600",
          type: "default_status",
          default_status_mapping: "won",
          is_terminal: true,
          is_locked: true,
          order: 5,
          checklist_items: []
        },
        {
          id: "lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          type: "default_status",
          default_status_mapping: "lost",
          is_terminal: true,
          is_locked: true,
          order: 6,
          checklist_items: []
        },
        {
          id: "archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          type: "default_status",
          default_status_mapping: "archived",
          is_terminal: true,
          is_locked: true,
          order: 7,
          checklist_items: []
        }
      ]
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, template_type, overwrite_existing } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Check if templates already exist for this organization
    const existingTemplates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({
      template_type: 'system'
    });

    const results = {
      created: [],
      skipped: [],
      updated: []
    };

    // Determine which templates to create
    const templatesToCreate = template_type 
      ? [template_type] 
      : Object.keys(TEMPLATE_DEFINITIONS);

    for (const type of templatesToCreate) {
      const definition = TEMPLATE_DEFINITIONS[type];
      if (!definition) continue;

      // Check if template already exists
      const existing = existingTemplates.find(t => 
        t.proposal_type_category === type && t.template_type === 'system'
      );

      const templateData = {
        ...definition,
        template_type: 'system',
        organization_id: null, // System templates are global
        workflow_config: JSON.stringify(definition.workflow_config),
        is_active: true,
        usage_count: 0
      };

      if (existing) {
        if (overwrite_existing) {
          // Update existing template
          await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(
            existing.id,
            templateData
          );
          results.updated.push({
            type,
            template_id: existing.id,
            message: `Updated template for ${type}`
          });
        } else {
          results.skipped.push({
            type,
            template_id: existing.id,
            message: `Template for ${type} already exists`
          });
        }
      } else {
        // Create new template
        const created = await base44.asServiceRole.entities.ProposalWorkflowTemplate.create(
          templateData
        );
        results.created.push({
          type,
          template_id: created.id,
          message: `Created template for ${type}`
        });
      }
    }

    return Response.json({
      success: true,
      results,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        skipped: results.skipped.length
      }
    });

  } catch (error) {
    console.error('Error initializing templates:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});
