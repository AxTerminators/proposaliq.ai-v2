import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a real organization
    const existingOrgs = await base44.asServiceRole.entities.Organization.filter({
      created_by: user.email,
      is_sample_data: false
    });

    if (existingOrgs.length > 0) {
      return Response.json({ 
        message: 'User already has real organization', 
        skipSampleData: true 
      });
    }

    // Create sample organization
    const sampleOrg = await base44.asServiceRole.entities.Organization.create({
      organization_name: "Acme Solutions Inc. (SAMPLE)",
      organization_type: "corporate",
      contact_name: user.full_name || "Sample User",
      contact_email: user.email,
      address: "123 Business Ave, Tech City, CA 94000",
      uei: "SAMPLEUEI123456",
      cage_code: "1A2B3",
      website_url: "https://example.com",
      primary_naics: "541511",
      secondary_naics: ["541512", "541519"],
      certifications: ["8(a)", "SDVOSB"],
      is_primary: true,
      onboarding_completed: false,
      is_sample_data: true
    });

    // Create sample subscription (no is_sample_data field in Subscription entity)
    await base44.asServiceRole.entities.Subscription.create({
      organization_id: sampleOrg.id,
      plan_type: "free",
      token_credits: 200000,
      token_credits_used: 15000,
      max_users: 1,
      monthly_price: 0,
      status: "active",
      features_enabled: {
        client_portal: false,
        custom_branding: false,
        advanced_analytics: false,
        api_access: false,
        white_label: false
      }
    });

    // Create sample proposals
    const proposal1 = await base44.asServiceRole.entities.Proposal.create({
      organization_id: sampleOrg.id,
      proposal_name: "DoD Cloud Migration Initiative (SAMPLE)",
      project_type: "RFP",
      solicitation_number: "W52P1J-24-R-0001",
      agency_name: "Department of Defense",
      project_title: "Enterprise Cloud Migration Services",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contract_value: 5000000,
      contract_value_type: "ceiling",
      current_phase: "phase3",
      status: "in_progress",
      match_score: 85,
      is_sample_data: true
    });

    const proposal2 = await base44.asServiceRole.entities.Proposal.create({
      organization_id: sampleOrg.id,
      proposal_name: "GSA IT Support Services (SAMPLE)",
      project_type: "RFP",
      solicitation_number: "GS-00F-0001",
      agency_name: "General Services Administration",
      project_title: "Comprehensive IT Support and Maintenance",
      due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contract_value: 2500000,
      contract_value_type: "estimated",
      current_phase: "phase2",
      status: "draft",
      match_score: 78,
      is_sample_data: true
    });

    const proposal3 = await base44.asServiceRole.entities.Proposal.create({
      organization_id: sampleOrg.id,
      proposal_name: "DHS Cybersecurity Assessment (SAMPLE)",
      project_type: "RFQ",
      solicitation_number: "HSHQDC-24-Q-0001",
      agency_name: "Department of Homeland Security",
      project_title: "Cybersecurity Risk Assessment Services",
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contract_value: 1200000,
      contract_value_type: "target",
      current_phase: "phase1",
      status: "evaluating",
      match_score: 92,
      is_sample_data: true
    });

    // Create sample sections for proposal 1
    await base44.asServiceRole.entities.ProposalSection.create({
      proposal_id: proposal1.id,
      section_name: "Executive Summary",
      section_type: "executive_summary",
      content: "<p>Acme Solutions Inc. is pleased to submit this proposal for the DoD Cloud Migration Initiative...</p>",
      order: 1,
      word_count: 250,
      status: "reviewed",
      is_sample_data: true
    });

    await base44.asServiceRole.entities.ProposalSection.create({
      proposal_id: proposal1.id,
      section_name: "Technical Approach",
      section_type: "technical_approach",
      content: "<p>Our technical approach leverages industry-leading cloud technologies and proven methodologies...</p>",
      order: 2,
      word_count: 1200,
      status: "draft",
      is_sample_data: true
    });

    // Create sample tasks
    await base44.asServiceRole.entities.ProposalTask.create({
      proposal_id: proposal1.id,
      title: "Complete Technical Approach Section (SAMPLE)",
      description: "Finalize the technical approach with detailed architecture diagrams",
      assigned_to_email: user.email,
      assigned_to_name: user.full_name || "Sample User",
      assigned_by_email: user.email,
      assigned_by_name: user.full_name || "Sample User",
      status: "in_progress",
      priority: "high",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_sample_data: true
    });

    await base44.asServiceRole.entities.ProposalTask.create({
      proposal_id: proposal2.id,
      title: "Review Pricing Strategy (SAMPLE)",
      description: "Analyze competitor pricing and finalize our pricing model",
      assigned_to_email: user.email,
      assigned_to_name: user.full_name || "Sample User",
      assigned_by_email: user.email,
      assigned_by_name: user.full_name || "Sample User",
      status: "todo",
      priority: "medium",
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_sample_data: true
    });

    // Create sample subtasks
    await base44.asServiceRole.entities.ProposalSubtask.create({
      proposal_id: proposal1.id,
      organization_id: sampleOrg.id,
      title: "Review architecture diagrams (SAMPLE)",
      description: "Review and approve the technical architecture diagrams",
      assigned_to_email: user.email,
      assigned_to_name: user.full_name || "Sample User",
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "in_progress",
      priority: "high",
      order: 1,
      is_sample_data: true
    });

    // Create sample past performance
    await base44.asServiceRole.entities.PastPerformance.create({
      organization_id: sampleOrg.id,
      project_name: "Air Force IT Modernization (SAMPLE)",
      client_name: "U.S. Air Force",
      client_agency: "DoD",
      client_type: "federal",
      contract_number: "FA8771-20-C-0001",
      contract_value: 3500000,
      contract_type: "FFP",
      start_date: "2020-06-01",
      end_date: "2023-05-31",
      period_of_performance_months: 36,
      status: "completed",
      naics_codes: ["541512"],
      project_description: "Successfully modernized legacy IT systems for Air Force base operations",
      services_provided: ["Cloud Migration", "System Integration", "Training"],
      team_size: 12,
      outcomes: {
        on_time_delivery_pct: 100,
        on_budget_pct: 98,
        customer_satisfaction: 4.8
      },
      cpars_rating: "Exceptional",
      is_sample_data: true
    });

    // Create sample teaming partner
    await base44.asServiceRole.entities.TeamingPartner.create({
      organization_id: sampleOrg.id,
      partner_name: "TechVentures LLC (SAMPLE)",
      partner_type: "teaming_partner",
      address: "456 Innovation Dr, Silicon Valley, CA 95000",
      poc_name: "Jane Smith",
      poc_email: "jane.smith@techventures.example",
      poc_phone: "(555) 123-4567",
      uei: "PARTNERUEI789",
      cage_code: "9X8Y7",
      primary_naics: "541519",
      certifications: ["HUBZone", "WOSB"],
      core_capabilities: ["Cybersecurity", "Cloud Services"],
      status: "active",
      is_sample_data: true
    });

    // Create sample key personnel
    await base44.asServiceRole.entities.KeyPersonnel.create({
      organization_id: sampleOrg.id,
      full_name: "Dr. Michael Chen (SAMPLE)",
      title: "Chief Technology Officer",
      email: "m.chen@acme.example",
      years_experience: 15,
      education: [
        {
          degree: "Ph.D.",
          field: "Computer Science",
          institution: "MIT",
          year: "2008"
        }
      ],
      certifications: [
        {
          name: "PMP",
          issuing_org: "PMI",
          date_obtained: "2015-06-01"
        }
      ],
      clearance_level: "top_secret",
      skills: ["Cloud Architecture", "DevOps", "Agile Leadership"],
      bio_short: "Dr. Chen brings 15+ years of experience in enterprise cloud solutions...",
      is_sample_data: true
    });

    // Create sample resource
    await base44.asServiceRole.entities.ProposalResource.create({
      organization_id: sampleOrg.id,
      resource_type: "boilerplate_text",
      content_category: "company_overview",
      title: "Acme Solutions Company Overview (SAMPLE)",
      description: "Standard company overview boilerplate",
      boilerplate_content: "<p>Acme Solutions Inc. is a leading provider of innovative technology solutions...</p>",
      word_count: 150,
      usage_count: 3,
      is_favorite: true,
      is_sample_data: true
    });

    // Create sample KanbanConfig
    await base44.asServiceRole.entities.KanbanConfig.create({
      organization_id: sampleOrg.id,
      columns: [
        {
          id: "evaluating",
          label: "Evaluating",
          color: "bg-blue-100",
          order: 1,
          type: "default_status",
          default_status_mapping: "evaluating"
        },
        {
          id: "draft",
          label: "Draft",
          color: "bg-yellow-100",
          order: 2,
          type: "default_status",
          default_status_mapping: "draft"
        },
        {
          id: "in_progress",
          label: "In Progress",
          color: "bg-purple-100",
          order: 3,
          type: "default_status",
          default_status_mapping: "in_progress"
        },
        {
          id: "submitted",
          label: "Submitted",
          color: "bg-green-100",
          order: 4,
          type: "default_status",
          default_status_mapping: "submitted"
        }
      ],
      is_sample_data: true
    });

    // Create sample automation rule
    await base44.asServiceRole.entities.ProposalAutomationRule.create({
      organization_id: sampleOrg.id,
      rule_name: "Auto-notify on high-value proposals (SAMPLE)",
      description: "Send notification when a high-value proposal is created",
      is_active: true,
      trigger: {
        trigger_type: "on_creation",
        trigger_conditions: {}
      },
      conditions: [
        {
          field: "contract_value",
          operator: "greater_than",
          value: 1000000
        }
      ],
      actions: [
        {
          action_type: "send_notification",
          action_config: {
            notification_message: "High-value proposal created - review required"
          }
        }
      ],
      is_sample_data: true
    });

    // Create sample client
    await base44.asServiceRole.entities.Client.create({
      organization_id: sampleOrg.id,
      client_name: "Defense Logistics Agency (SAMPLE)",
      contact_name: "John Director",
      contact_email: "john.director@dla.example",
      contact_phone: "(555) 987-6543",
      client_organization: "DLA",
      client_title: "Contracting Director",
      industry: "Government",
      relationship_status: "active",
      portal_access_enabled: false,
      is_sample_data: true
    });

    // Update user to reflect they're using sample data and have completed onboarding guide
    await base44.auth.updateMe({
      using_sample_data: true,
      onboarding_guide_completed: true
    });

    return Response.json({ 
      success: true, 
      message: 'Sample data generated successfully',
      organization_id: sampleOrg.id
    });

  } catch (error) {
    console.error('Error generating sample data:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});