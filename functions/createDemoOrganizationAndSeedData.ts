import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates a fully-featured demo organization with mock data for sales demos and testing.
 * 
 * This function creates:
 * - A demo organization with generous subscription limits
 * - Mock proposals in various stages (evaluating, in progress, submitted, won, lost)
 * - Sample past performance, key personnel, teaming partners
 * - Content library with default folder structure
 * - Clients (for consultancy demo view)
 * - Tasks, discussions, and other supporting data
 * 
 * Only callable by super admins.
 * 
 * @param {string} owner_email - Email of the user who will own this demo account
 * @param {string} organization_name - Name for the demo organization
 * @param {string} demo_view_mode - Initial view mode ('corporate' or 'consultancy')
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user and check super admin permission
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.admin_role !== 'super_admin') {
      return Response.json({ 
        error: 'Forbidden - Only super admins can create demo accounts' 
      }, { status: 403 });
    }

    const { owner_email, organization_name, demo_view_mode = 'corporate' } = await req.json();

    if (!owner_email || !organization_name) {
      return Response.json({ 
        success: false, 
        message: 'owner_email and organization_name are required' 
      }, { status: 400 });
    }

    console.log('[CreateDemoOrg] Creating demo organization:', organization_name, 'for:', owner_email);

    // 1. Create Demo Organization
    const demoOrg = await base44.asServiceRole.entities.Organization.create({
      organization_name: organization_name,
      organization_type: 'demo',
      demo_view_mode: demo_view_mode,
      contact_name: 'Demo User',
      contact_email: owner_email,
      address: '123 Demo Street, Washington, DC 20001',
      uei: 'DEMO123456789',
      cage_code: 'DEMO1',
      website_url: 'https://demo-company.example.com',
      primary_naics: '541330',
      secondary_naics: ['541511', '541512', '541519'],
      certifications: ['8(a)', 'SDVOSB', 'WOSB', 'ISO 9001', 'CMMI Level 3'],
      is_primary: false,
      onboarding_completed: true,
      is_sample_data: true
    });

    console.log('[CreateDemoOrg] ✅ Organization created:', demoOrg.id);

    // 2. Create Generous Subscription
    await base44.asServiceRole.entities.Subscription.create({
      organization_id: demoOrg.id,
      plan_type: 'demo',
      token_credits: 10000000, // 10M tokens for demos
      token_credits_used: 0,
      max_users: 50,
      max_clients: 50,
      monthly_price: 0,
      status: 'active',
      preferred_llm: 'gemini',
      features_enabled: {
        client_portal: true,
        custom_branding: true,
        advanced_analytics: true,
        api_access: true,
        white_label: true
      }
    });

    console.log('[CreateDemoOrg] ✅ Subscription created');

    // 3. Create Default Content Library Folders
    await base44.asServiceRole.functions.invoke('createDefaultContentLibraryFolders', {
      organization_id: demoOrg.id
    });

    console.log('[CreateDemoOrg] ✅ Content Library folders created');

    // 4. Create Master Board
    await base44.asServiceRole.functions.invoke('createMasterBoardConfig', {
      organization_id: demoOrg.id
    });

    console.log('[CreateDemoOrg] ✅ Kanban board created');

    // 5. Create Mock Teaming Partners
    const partners = [
      {
        partner_name: 'TechCorp Solutions',
        partner_type: 'subcontractor',
        address: '456 Partner Ave, Boston, MA 02101',
        poc_name: 'Sarah Johnson',
        poc_email: 'sarah.johnson@techcorp.example.com',
        poc_phone: '(617) 555-0100',
        uei: 'TECH987654321',
        cage_code: 'TECH1',
        website_url: 'https://techcorp.example.com',
        primary_naics: '541511',
        certifications: ['8(a)', 'HUBZone', 'ISO 27001'],
        core_capabilities: ['Cloud Migration', 'Cybersecurity', 'DevSecOps'],
        differentiators: ['FedRAMP Authorized', '15+ Years DoD Experience', 'Agile Certified Team'],
        past_performance_summary: 'Successfully delivered 50+ cloud migration projects for federal agencies with 98% customer satisfaction.',
        status: 'preferred',
        is_sample_data: true
      },
      {
        partner_name: 'DataVault Inc',
        partner_type: 'teaming_partner',
        address: '789 Data Blvd, Austin, TX 78701',
        poc_name: 'Michael Chen',
        poc_email: 'michael.chen@datavault.example.com',
        poc_phone: '(512) 555-0200',
        uei: 'DATA456789123',
        cage_code: 'DATA1',
        certifications: ['SDVOSB', 'ISO 9001'],
        core_capabilities: ['Data Analytics', 'AI/ML Solutions', 'Business Intelligence'],
        differentiators: ['Veteran-Owned', 'Proprietary AI Platform', 'Clearance-Ready Team'],
        status: 'active',
        is_sample_data: true
      }
    ];

    for (const partner of partners) {
      await base44.asServiceRole.entities.TeamingPartner.create({
        ...partner,
        organization_id: demoOrg.id
      });
    }

    console.log('[CreateDemoOrg] ✅ Teaming partners created');

    // 6. Create Mock Past Performance
    const pastPerformanceProjects = [
      {
        project_name: 'Enterprise Cloud Modernization - Department of Defense',
        client_name: 'U.S. Department of Defense',
        client_agency: 'DoD',
        client_type: 'federal',
        contract_number: 'W52P1J-20-D-0001',
        contract_value: 15000000,
        contract_type: 'CPFF',
        start_date: '2020-01-15',
        end_date: '2023-01-15',
        period_of_performance_months: 36,
        status: 'completed',
        naics_codes: ['541330', '541511'],
        project_description: 'Led comprehensive cloud modernization initiative migrating legacy systems to AWS GovCloud, improving system performance by 300% and reducing operational costs by 40%.',
        services_provided: ['Cloud Architecture', 'DevSecOps', 'System Migration', 'Security Compliance', 'Training'],
        technologies_used: ['AWS GovCloud', 'Kubernetes', 'Terraform', 'Jenkins', 'Python'],
        team_size: 12,
        outcomes: {
          on_time_delivery_pct: 100,
          on_budget_pct: 98,
          uptime_pct: 99.9,
          customer_satisfaction: 5,
          quality_score: 5
        },
        cpars_rating: 'Exceptional',
        testimonial: 'Outstanding performance. The team exceeded all expectations and delivered ahead of schedule.',
        reference_permission: true,
        prime_or_sub: 'prime',
        is_featured: true,
        is_sample_data: true
      },
      {
        project_name: 'Cybersecurity Assessment - Department of Homeland Security',
        client_name: 'Department of Homeland Security',
        client_agency: 'DHS',
        client_type: 'federal',
        contract_number: 'HSHQDC-21-C-00234',
        contract_value: 8500000,
        contract_type: 'FFP',
        start_date: '2021-03-01',
        end_date: '2023-03-01',
        status: 'completed',
        project_description: 'Conducted comprehensive cybersecurity assessment across 50+ systems, identifying vulnerabilities and implementing robust security controls.',
        services_provided: ['Security Assessment', 'Penetration Testing', 'Compliance Review', 'Risk Management'],
        technologies_used: ['Nessus', 'Metasploit', 'Splunk', 'SIEM Tools'],
        outcomes: {
          customer_satisfaction: 4.8,
          quality_score: 5
        },
        cpars_rating: 'Very Good',
        prime_or_sub: 'prime',
        is_sample_data: true
      },
      {
        project_name: 'IT Modernization - Veterans Affairs',
        client_name: 'Department of Veterans Affairs',
        client_agency: 'VA',
        client_type: 'federal',
        contract_value: 5200000,
        contract_type: 'T&M',
        start_date: '2022-06-01',
        end_date: '2024-06-01',
        status: 'in_progress',
        project_description: 'Modernizing veteran healthcare IT systems to improve patient care and operational efficiency.',
        prime_or_sub: 'subcontractor',
        is_sample_data: true
      }
    ];

    for (const project of pastPerformanceProjects) {
      await base44.asServiceRole.entities.PastPerformance.create({
        ...project,
        organization_id: demoOrg.id
      });
    }

    console.log('[CreateDemoOrg] ✅ Past performance created');

    // 7. Create Mock Key Personnel
    const keyPersonnel = [
      {
        full_name: 'Dr. James Mitchell',
        title: 'Chief Technology Officer',
        email: 'james.mitchell@demo.example.com',
        phone: '(202) 555-0301',
        years_experience: 20,
        education: [
          { degree: 'Ph.D.', field: 'Computer Science', institution: 'MIT', year: '2004' },
          { degree: 'M.S.', field: 'Information Systems', institution: 'Stanford University', year: '2000' }
        ],
        certifications: [
          { name: 'PMP', issuing_org: 'PMI', date_obtained: '2010-05-15' },
          { name: 'CISSP', issuing_org: 'ISC2', date_obtained: '2012-08-20' }
        ],
        clearance_level: 'top_secret',
        skills: ['Cloud Architecture', 'Enterprise Systems', 'Agile Management', 'Strategic Planning'],
        bio_short: 'Dr. James Mitchell is a seasoned technology leader with 20 years of experience delivering mission-critical systems for federal agencies. He holds a Ph.D. in Computer Science from MIT and has led over 50 successful cloud modernization projects.',
        is_available: true,
        is_sample_data: true
      },
      {
        full_name: 'Maria Rodriguez',
        title: 'Senior Program Manager',
        email: 'maria.rodriguez@demo.example.com',
        years_experience: 15,
        education: [
          { degree: 'MBA', field: 'Business Administration', institution: 'Harvard Business School', year: '2008' }
        ],
        certifications: [
          { name: 'PgMP', issuing_org: 'PMI', date_obtained: '2015-03-10' }
        ],
        clearance_level: 'secret',
        skills: ['Program Management', 'Stakeholder Engagement', 'Budget Management', 'Team Leadership'],
        bio_short: 'Maria Rodriguez brings 15 years of federal program management expertise, having successfully managed portfolios exceeding $100M. Known for exceptional client relationships and on-time delivery.',
        is_available: true,
        is_sample_data: true
      },
      {
        full_name: 'Alex Thompson',
        title: 'Lead Software Architect',
        email: 'alex.thompson@demo.example.com',
        years_experience: 12,
        certifications: [
          { name: 'AWS Solutions Architect - Professional', issuing_org: 'Amazon', date_obtained: '2019-06-15' }
        ],
        clearance_level: 'secret',
        skills: ['Microservices', 'Cloud Native', 'DevOps', 'Python', 'Java'],
        bio_short: 'Alex Thompson is an innovative software architect specializing in cloud-native solutions. With 12 years of experience, Alex has designed scalable systems supporting millions of users.',
        is_available: true,
        is_sample_data: true
      }
    ];

    for (const person of keyPersonnel) {
      await base44.asServiceRole.entities.KeyPersonnel.create({
        ...person,
        organization_id: demoOrg.id
      });
    }

    console.log('[CreateDemoOrg] ✅ Key personnel created');

    // 8. Create Mock Proposals
    const mockProposals = [
      {
        proposal_name: 'DoD Cloud Infrastructure Modernization',
        proposal_type_category: 'RFP',
        project_type: 'RFP',
        solicitation_number: 'FA8750-25-R-0001',
        agency_name: 'Department of Defense - Air Force',
        project_title: 'Enterprise Cloud Infrastructure Modernization and Support',
        due_date: '2025-03-15',
        contract_value: 25000000,
        contract_value_type: 'ceiling',
        status: 'in_progress',
        current_phase: 'phase6',
        match_score: 92,
        is_sample_data: true
      },
      {
        proposal_name: 'DHS Cybersecurity Enhancement Program',
        proposal_type_category: 'RFP',
        project_type: 'RFP',
        solicitation_number: 'HSHQDC-25-R-00123',
        agency_name: 'Department of Homeland Security',
        project_title: 'Comprehensive Cybersecurity Assessment and Enhancement',
        due_date: '2025-02-28',
        contract_value: 12000000,
        status: 'draft',
        current_phase: 'phase4',
        match_score: 88,
        is_sample_data: true
      },
      {
        proposal_name: 'NASA Data Analytics Platform',
        proposal_type_category: 'RFP',
        project_type: 'RFP',
        solicitation_number: 'NASA-25-001',
        agency_name: 'NASA',
        project_title: 'Advanced Data Analytics and Visualization Platform',
        due_date: '2025-04-20',
        contract_value: 18000000,
        status: 'evaluating',
        current_phase: 'phase2',
        match_score: 85,
        is_sample_data: true
      },
      {
        proposal_name: 'GSA Schedule Refresh',
        proposal_type_category: 'GSA',
        project_type: 'Other',
        solicitation_number: 'GSA-25-SCHED-001',
        agency_name: 'General Services Administration',
        project_title: 'GSA Schedule 70 IT Services',
        due_date: '2025-01-30',
        contract_value: 50000000,
        status: 'submitted',
        is_sample_data: true
      },
      {
        proposal_name: 'VA Healthcare IT Support - WON',
        proposal_type_category: 'RFP',
        project_type: 'RFP',
        solicitation_number: 'VA-24-IT-9876',
        agency_name: 'Department of Veterans Affairs',
        project_title: 'Healthcare IT Support Services',
        due_date: '2024-11-15',
        contract_value: 8000000,
        status: 'won',
        is_sample_data: true
      },
      {
        proposal_name: 'State Department Security Audit',
        proposal_type_category: 'RFP',
        project_type: 'RFP',
        solicitation_number: 'STATE-24-SEC-555',
        agency_name: 'Department of State',
        project_title: 'Comprehensive Security Audit and Remediation',
        due_date: '2024-10-01',
        contract_value: 6000000,
        status: 'lost',
        is_sample_data: true
      }
    ];

    const createdProposals = [];
    for (const proposalData of mockProposals) {
      const created = await base44.asServiceRole.entities.Proposal.create({
        ...proposalData,
        organization_id: demoOrg.id,
        prime_contractor_id: demoOrg.id,
        prime_contractor_name: demoOrg.organization_name
      });
      createdProposals.push(created);
    }

    console.log('[CreateDemoOrg] ✅ Mock proposals created:', createdProposals.length);

    // 9. Create Sample Proposal Sections for Won Proposal
    const wonProposal = createdProposals.find(p => p.status === 'won');
    if (wonProposal) {
      const sampleSections = [
        {
          section_name: 'Executive Summary',
          section_type: 'executive_summary',
          content: '<h2>Executive Summary</h2><p>Our team brings unparalleled expertise in healthcare IT modernization, having successfully delivered similar projects for the VA over the past decade. We understand the critical importance of reliable, secure healthcare systems that serve our nation\'s veterans.</p><p>Our approach combines proven methodologies with innovative cloud-native solutions, ensuring seamless integration with existing VA infrastructure while providing a clear path to future scalability.</p>',
          word_count: 78,
          status: 'approved',
          order: 1
        },
        {
          section_name: 'Technical Approach',
          section_type: 'technical_approach',
          content: '<h2>Technical Approach</h2><p>We propose a phased modernization strategy that prioritizes system stability and security. Our approach includes:</p><ul><li>Comprehensive system assessment and architecture review</li><li>Incremental migration to AWS GovCloud with zero-downtime deployment</li><li>Implementation of microservices architecture for improved scalability</li><li>Continuous monitoring and automated security compliance</li></ul><p>This methodology has been successfully applied across 15+ federal healthcare IT projects.</p>',
          word_count: 95,
          status: 'approved',
          order: 2
        },
        {
          section_name: 'Management Plan',
          section_type: 'management_plan',
          content: '<h2>Management Plan</h2><p>Our proven project management framework ensures successful delivery through:</p><ul><li>Dedicated Program Manager with 15+ years VA experience</li><li>Bi-weekly sprint cycles with continuous stakeholder engagement</li><li>Risk management framework aligned with NIST 800-53</li><li>Quality assurance processes including automated testing and peer review</li></ul>',
          word_count: 67,
          status: 'approved',
          order: 3
        }
      ];

      for (const sectionData of sampleSections) {
        await base44.asServiceRole.entities.ProposalSection.create({
          ...sectionData,
          proposal_id: wonProposal.id,
          is_sample_data: true
        });
      }

      console.log('[CreateDemoOrg] ✅ Sample sections created for won proposal');
    }

    // 10. Create Mock Clients (for consultancy demo view)
    const mockClients = [
      {
        client_name: 'Acme Federal Contracting',
        contact_name: 'Jennifer Williams',
        contact_email: 'j.williams@acmefederal.example.com',
        contact_phone: '(301) 555-0400',
        client_organization: 'Acme Federal Contracting LLC',
        client_title: 'Vice President of Business Development',
        address: '100 Client Plaza, Rockville, MD 20850',
        industry: 'Government Contracting',
        relationship_status: 'active',
        portal_access_enabled: true,
        notes: 'Key client with strong track record. Interested in expanding into cybersecurity space. Regular monthly check-ins scheduled.',
        tags: ['federal', 'prime-contractor', 'strategic'],
        total_proposals_shared: 5,
        engagement_score: 87,
        last_engagement_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        avg_response_time_hours: 24,
        is_sample_data: true
      },
      {
        client_name: 'TechGov Innovations',
        contact_name: 'Robert Davis',
        contact_email: 'r.davis@techgov.example.com',
        contact_phone: '(703) 555-0500',
        client_organization: 'TechGov Innovations Inc',
        client_title: 'Director of Proposals',
        address: '250 Innovation Drive, Arlington, VA 22201',
        industry: 'IT Consulting',
        relationship_status: 'active',
        portal_access_enabled: true,
        notes: 'Fast-growing company focusing on DoD contracts. Very responsive and collaborative. Interested in teaming opportunities.',
        tags: ['it-services', 'dod', 'fast-response'],
        total_proposals_shared: 3,
        engagement_score: 92,
        last_engagement_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        avg_response_time_hours: 12,
        is_sample_data: true
      },
      {
        client_name: 'Quantum Defense Solutions',
        contact_name: 'Dr. Lisa Chang',
        contact_email: 'l.chang@quantumdefense.example.com',
        contact_phone: '(571) 555-0600',
        client_organization: 'Quantum Defense Solutions Corp',
        client_title: 'Chief Operating Officer',
        address: '500 Defense Boulevard, McLean, VA 22102',
        industry: 'Defense Technology',
        relationship_status: 'prospect',
        portal_access_enabled: true,
        notes: 'High-value prospect specializing in AI/ML defense applications. Initial meeting went very well. Follow-up scheduled for next week.',
        tags: ['ai-ml', 'defense', 'high-value'],
        total_proposals_shared: 1,
        engagement_score: 78,
        last_engagement_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        avg_response_time_hours: 48,
        is_sample_data: true
      },
      {
        client_name: 'HealthTech Federal Services',
        contact_name: 'Marcus Johnson',
        contact_email: 'm.johnson@healthtechfed.example.com',
        contact_phone: '(240) 555-0700',
        client_organization: 'HealthTech Federal Services LLC',
        client_title: 'Senior Capture Manager',
        address: '150 Healthcare Way, Bethesda, MD 20814',
        industry: 'Healthcare IT',
        relationship_status: 'active',
        portal_access_enabled: true,
        notes: 'Specialized in VA and HHS contracts. Excellent partner for healthcare IT opportunities. Strong past performance in EHR systems.',
        tags: ['healthcare', 'va', 'hhs', 'ehr'],
        total_proposals_shared: 4,
        engagement_score: 85,
        last_engagement_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        avg_response_time_hours: 18,
        is_sample_data: true
      },
      {
        client_name: 'CloudFirst Government',
        contact_name: 'Amanda Peterson',
        contact_email: 'a.peterson@cloudfirstgov.example.com',
        contact_phone: '(202) 555-0800',
        client_organization: 'CloudFirst Government Inc',
        client_title: 'Business Development Director',
        address: '800 Cloud Circle, Washington, DC 20001',
        industry: 'Cloud Services',
        relationship_status: 'active',
        portal_access_enabled: true,
        notes: 'FedRAMP authorized provider. Ideal partner for cloud modernization projects. Recently won major GSA contract.',
        tags: ['cloud', 'fedramp', 'gsa-schedule'],
        total_proposals_shared: 6,
        engagement_score: 94,
        last_engagement_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        avg_response_time_hours: 8,
        is_sample_data: true
      },
      {
        client_name: 'SecureNet Systems',
        contact_name: 'David Kim',
        contact_email: 'd.kim@securenet.example.com',
        contact_phone: '(703) 555-0900',
        client_organization: 'SecureNet Systems LLC',
        client_title: 'VP of Federal Sales',
        address: '900 Cyber Way, Fairfax, VA 22030',
        industry: 'Cybersecurity',
        relationship_status: 'inactive',
        portal_access_enabled: true,
        notes: 'Previously active client. Lost contact after key POC left company. Worth re-engaging with new leadership.',
        tags: ['cybersecurity', 'inactive', 're-engage'],
        total_proposals_shared: 2,
        engagement_score: 45,
        last_engagement_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        avg_response_time_hours: 72,
        is_sample_data: true
      }
    ];

    const createdClients = [];
    for (const client of mockClients) {
      // Generate secure access token
      const token = crypto.randomUUID() + '-' + Date.now();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const createdClient = await base44.asServiceRole.entities.Client.create({
        ...client,
        organization_id: demoOrg.id,
        access_token: token,
        token_expires_at: expiresAt.toISOString(),
        email_notifications: {
          enabled: true,
          proposal_shared: true,
          status_changes: true,
          new_comments: true,
          documents_uploaded: true,
          deadline_reminders: true,
          frequency: 'immediate'
        }
      });
      createdClients.push(createdClient);
    }

    console.log('[CreateDemoOrg] ✅ Mock clients created with access tokens:', createdClients.length);

    // 10b. Create Client Team Members for ALL clients (not just first one)
    if (createdClients.length > 0) {
      // Create team members for first 3 clients (most active ones)
      const clientsWithTeams = createdClients.slice(0, 3);
      
      const teamMembersData = [
        [
          // Acme Federal (client 0)
          {
            member_name: 'Sarah Mitchell',
            member_email: 's.mitchell@acmefederal.example.com',
            member_title: 'Proposal Coordinator',
            team_role: 'reviewer'
          },
          {
            member_name: 'Tom Bradley',
            member_email: 't.bradley@acmefederal.example.com',
            member_title: 'Contracts Manager',
            team_role: 'approver'
          }
        ],
        [
          // TechGov (client 1)
          {
            member_name: 'Emily Carter',
            member_email: 'e.carter@techgov.example.com',
            member_title: 'Technical Lead',
            team_role: 'reviewer'
          }
        ],
        [
          // Quantum Defense (client 2)
          {
            member_name: 'James Wilson',
            member_email: 'j.wilson@quantumdefense.example.com',
            member_title: 'Project Manager',
            team_role: 'approver'
          }
        ]
      ];

      for (let i = 0; i < clientsWithTeams.length; i++) {
        const client = clientsWithTeams[i];
        
        const members = teamMembersData[i] || [];
        
        for (const member of members) {
          const memberToken = crypto.randomUUID() + '-' + Date.now();
          const memberExpiresAt = new Date();
          memberExpiresAt.setFullYear(memberExpiresAt.getFullYear() + 1);

          await base44.asServiceRole.entities.ClientTeamMember.create({
            ...member,
            client_id: client.id,
            access_token: memberToken,
            token_expires_at: memberExpiresAt.toISOString(),
            permissions: {
              can_approve: member.team_role === 'approver',
              can_comment: true,
              can_upload_files: true,
              can_invite_others: member.team_role === 'approver',
              can_see_internal_comments: member.team_role === 'approver'
            },
            invitation_status: 'accepted',
            is_active: true
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Client team members created for', clientsWithTeams.length, 'clients');
    }

    // 10c. Share proposals with ALL clients
    if (createdProposals.length > 0 && createdClients.length > 0) {
      // Share different proposals with different clients
      const proposalClientMapping = [
        { proposal: createdProposals[0], clients: [createdClients[0], createdClients[1], createdClients[3]] }, // DoD Cloud - shared with 3 clients
        { proposal: createdProposals[1], clients: [createdClients[2], createdClients[4]] }, // DHS Cyber - shared with 2 clients
        { proposal: createdProposals[2], clients: [createdClients[0]] }, // NASA - shared with 1 client
        { proposal: createdProposals[4], clients: [createdClients[0], createdClients[3]] }, // Won proposal - shared with 2 clients
        { proposal: createdProposals[5], clients: [createdClients[5]] }, // Lost proposal - shared with inactive client
      ];

      for (const mapping of proposalClientMapping) {
        if (mapping.proposal) {
          const clientIds = mapping.clients.map(c => c.id);
          await base44.asServiceRole.entities.Proposal.update(mapping.proposal.id, {
            shared_with_client_ids: clientIds,
            client_view_enabled: true,
            status: mapping.proposal.status === 'in_progress' ? 'client_review' : mapping.proposal.status
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Proposals shared with all clients');
    }

    // 10d. Create Client Engagement Metrics for ALL clients
    if (createdProposals.length > 0 && createdClients.length > 0) {
      for (let i = 0; i < createdClients.length; i++) {
        const client = createdClients[i];
        // Each client gets engagement data for 1-2 proposals
        const relevantProposals = createdProposals.slice(i % createdProposals.length, (i % createdProposals.length) + 2);
        
        for (const proposal of relevantProposals) {
          const eventCount = Math.max(2, 5 - i); // More events for earlier clients
          const engagementEvents = [];
          
          // Always add page view
          engagementEvents.push({
            event_type: 'page_view',
            time_spent_seconds: 120 + (i * 30),
            session_id: crypto.randomUUID()
          });
          
          // Add section views based on client activity level
          if (eventCount > 2) {
            engagementEvents.push({
              event_type: 'section_view',
              section_name: 'Executive Summary',
              time_spent_seconds: 90 + (i * 20),
              scroll_depth_percent: 100 - (i * 5),
              session_id: crypto.randomUUID()
            });
          }
          
          if (eventCount > 3) {
            engagementEvents.push({
              event_type: 'section_view',
              section_name: 'Technical Approach',
              time_spent_seconds: 180 - (i * 30),
              scroll_depth_percent: 85 - (i * 10),
              session_id: crypto.randomUUID()
            });
          }
          
          if (eventCount > 4 && i < 2) {
            engagementEvents.push({
              event_type: 'comment_added',
              session_id: crypto.randomUUID()
            });
          }

          for (const event of engagementEvents) {
            await base44.asServiceRole.entities.ClientEngagementMetric.create({
              client_id: client.id,
              proposal_id: proposal.id,
              organization_id: demoOrg.id,
              ...event,
              device_type: i % 2 === 0 ? 'desktop' : 'mobile',
              browser: i % 2 === 0 ? 'Chrome' : 'Safari',
              is_first_visit: i > 2
            });
          }
        }
      }

      console.log('[CreateDemoOrg] ✅ Client engagement metrics created for all clients');
    }

    // 10e. Create Client Meetings for first 4 clients
    if (createdClients.length > 0) {
      const clientsWithMeetings = createdClients.slice(0, 4);
      
      for (let i = 0; i < clientsWithMeetings.length; i++) {
        const client = clientsWithMeetings[i];
        const relatedProposal = createdProposals[i % createdProposals.length];
        
        const meetingsData = [
          {
            meeting_title: `${i === 0 ? 'Proposal Kickoff' : i === 1 ? 'Technical Review' : i === 2 ? 'Strategy Session' : 'Q&A Session'}`,
            meeting_type: i === 0 ? 'kickoff' : i === 1 ? 'review' : 'q_and_a',
            scheduled_date: new Date(Date.now() + (7 - i * 2) * 24 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 60,
            meeting_link: i % 2 === 0 ? 'https://zoom.us/j/123456789' : 'https://teams.microsoft.com/l/meetup-join/example',
            agenda: `Discuss proposal progress and next steps for ${client.client_name}.`,
            organized_by: owner_email,
            status: i > 1 ? 'completed' : 'scheduled',
            attendees: [
              {
                name: client.contact_name,
                email: client.contact_email,
                role: 'Client Lead',
                is_required: true,
                rsvp_status: 'accepted'
              },
              {
                name: 'Demo User',
                email: owner_email,
                role: 'Consultant',
                is_required: true,
                rsvp_status: 'accepted'
              }
            ],
            has_notes: i > 1,
            action_items_count: i > 1 ? Math.floor(Math.random() * 3) + 1 : 0
          }
        ];

        for (const meeting of meetingsData) {
          await base44.asServiceRole.entities.ClientMeeting.create({
            ...meeting,
            client_id: client.id,
            organization_id: demoOrg.id,
            proposal_id: relatedProposal?.id
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Client meetings created for', clientsWithMeetings.length, 'clients');
    }

    // 10f. Create Client Uploaded Files for first 4 clients
    if (createdClients.length > 0 && createdProposals.length > 0) {
      const clientsWithFiles = createdClients.slice(0, 4);
      
      for (let i = 0; i < clientsWithFiles.length; i++) {
        const client = clientsWithFiles[i];
        const relatedProposal = createdProposals[i % createdProposals.length];
        
        const filesData = [
          {
            file_name: `Requirements_Document_v${i + 1}.pdf`,
            file_url: 'https://placehold.co/600x400/png?text=Requirements+Doc',
            file_size: 2457600,
            file_type: 'application/pdf',
            file_category: 'requirement',
            description: 'Updated requirements document with clarifications',
            viewed_by_consultant: i < 2,
            viewed_date: i < 2 ? new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            tags: ['requirements', `v${i + 1}`, i < 2 ? 'reviewed' : 'new']
          },
          {
            file_name: `Technical_Specifications_${client.client_name.split(' ')[0]}.docx`,
            file_url: 'https://placehold.co/600x400/png?text=Tech+Specs',
            file_size: 1048576,
            file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            file_category: 'specification',
            description: 'Technical specifications and requirements',
            viewed_by_consultant: i === 0,
            viewed_date: i === 0 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            tags: ['technical', 'specifications']
          }
        ];

        // Only add extra file for very active clients
        if (i === 0) {
          filesData.push({
            file_name: 'Past_Performance_References.xlsx',
            file_url: 'https://placehold.co/600x400/png?text=References',
            file_size: 524288,
            file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            file_category: 'reference',
            description: 'Reference contacts for past performance verification',
            viewed_by_consultant: true,
            viewed_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ['references', 'past-performance']
          });
        }

        for (const file of filesData) {
          await base44.asServiceRole.entities.ClientUploadedFile.create({
            ...file,
            client_id: client.id,
            proposal_id: relatedProposal.id,
            organization_id: demoOrg.id,
            uploaded_by_name: client.contact_name,
            uploaded_by_email: client.contact_email,
            version_number: 1,
            is_latest_version: true
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Client uploaded files created for', clientsWithFiles.length, 'clients');
    }

    // 10g. Create Client Notifications for ALL active clients
    if (createdClients.length > 0 && createdProposals.length > 0) {
      const activeClients = createdClients.filter(c => c.relationship_status === 'active');
      
      for (let i = 0; i < activeClients.length; i++) {
        const client = activeClients[i];
        const relatedProposal = createdProposals[i % createdProposals.length];
        
        const notifications = [
          {
            notification_type: 'proposal_shared',
            title: 'New Proposal Shared With You',
            message: `${relatedProposal?.proposal_name || 'A new proposal'} has been shared with you for review`,
            action_url: `/ClientPortal?token=${client.access_token}&proposal=${relatedProposal?.id}`,
            is_read: i < 2,
            read_date: i < 2 ? new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            from_consultant_email: owner_email,
            from_consultant_name: 'Demo User',
            priority: 'high'
          },
          {
            notification_type: 'status_change',
            title: 'Proposal Status Updated',
            message: `Proposal status changed to ${relatedProposal?.status}`,
            is_read: i === 0,
            read_date: i === 0 ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            from_consultant_email: owner_email,
            from_consultant_name: 'Demo User',
            priority: 'normal'
          }
        ];

        // Add extra notification for very active clients
        if (i < 2) {
          notifications.push({
            notification_type: 'new_comment',
            title: 'New Comment on Proposal',
            message: 'Demo User commented on the Technical Approach section',
            is_read: true,
            read_date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            from_consultant_email: owner_email,
            from_consultant_name: 'Demo User',
            priority: 'normal'
          });
        }

        for (const notification of notifications) {
          await base44.asServiceRole.entities.ClientNotification.create({
            ...notification,
            client_id: client.id,
            proposal_id: relatedProposal?.id
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Client notifications created for', activeClients.length, 'clients');
    }

    // 10h. Create Client Feedback for first 3 clients
    if (createdClients.length > 0 && createdProposals.length > 0) {
      const clientsWithFeedback = createdClients.slice(0, 3);
      
      const feedbackTemplates = [
        [
          // Client 0 feedback
          {
            issue_type: 'improvement',
            priority: 'medium',
            title: 'Suggestion: Add Cost Breakdown Section',
            description: 'It would be helpful to have a more detailed cost breakdown by phase in the pricing section.',
            status: 'resolved',
            public_response: 'Great suggestion! We\'ve added a detailed cost breakdown table.',
            user_satisfaction_rating: 5
          },
          {
            issue_type: 'question',
            priority: 'high',
            title: 'Question: Team Availability Dates',
            description: 'Can you confirm the availability dates for the key personnel listed?',
            status: 'resolved',
            public_response: 'All key personnel are confirmed available.',
            user_satisfaction_rating: 4
          }
        ],
        [
          // Client 1 feedback
          {
            issue_type: 'feature_request',
            priority: 'low',
            title: 'Request: Add Timeline Visualization',
            description: 'A visual timeline would help us better understand the project phases.',
            status: 'new'
          }
        ],
        [
          // Client 2 feedback
          {
            issue_type: 'question',
            priority: 'high',
            title: 'Clarification Needed on Security Protocols',
            description: 'Please provide more details on the security measures for data protection.',
            status: 'in_progress',
            public_response: 'Thank you for your question. We\'re preparing a detailed security addendum.'
          }
        ]
      ];

      for (let i = 0; i < clientsWithFeedback.length; i++) {
        const client = clientsWithFeedback[i];
        const relatedProposal = createdProposals[i % createdProposals.length];
        const feedbacks = feedbackTemplates[i] || [];
        
        for (const fb of feedbacks) {
          await base44.asServiceRole.entities.Feedback.create({
            ...fb,
            organization_id: demoOrg.id,
            client_id: client.id,
            proposal_id: relatedProposal?.id,
            reporter_email: client.contact_email,
            reporter_name: client.contact_name,
            browser_info: 'Chrome 120.0.0 / Windows 10',
            consultant_response_date: fb.public_response ? new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            resolved_date: fb.status === 'resolved' ? new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            user_satisfaction_comment: fb.user_satisfaction_rating === 5 ? 'Perfect! Exactly what we needed.' : undefined
          });
        }
      }

      console.log('[CreateDemoOrg] ✅ Client feedback created for', clientsWithFeedback.length, 'clients');
    }

    // 10i. Create Proposal Annotations for first 3 clients
    if (createdProposals.length > 0 && createdClients.length > 0 && wonProposal) {
      const clientsWithAnnotations = createdClients.slice(0, 3);
      
      // Get sections from won proposal
      const sections = await base44.asServiceRole.entities.ProposalSection.filter({
        proposal_id: wonProposal.id
      });

      if (sections.length > 0) {
        for (let i = 0; i < clientsWithAnnotations.length; i++) {
          const client = clientsWithAnnotations[i];
          const annotationsData = [
            {
              section_id: sections[0]?.id,
              annotation_type: i === 0 ? 'comment' : 'highlight',
              content: i === 0 ? 'Excellent executive summary!' : 'Key point - note for our team',
              color: i === 0 ? '#10b981' : '#fbbf24',
              is_resolved: i === 0,
              priority: 'low'
            }
          ];

          // Add question annotation for first 2 clients
          if (i < 2 && sections[1]) {
            annotationsData.push({
              section_id: sections[1].id,
              annotation_type: 'question',
              content: `Can you provide more details on ${i === 0 ? 'deployment strategy' : 'implementation timeline'}?`,
              color: '#f59e0b',
              is_resolved: i === 0,
              priority: 'high',
              replies: i === 0 ? [
                {
                  author_name: 'Demo User',
                  author_email: owner_email,
                  content: 'Great question! I\'ve added more details in the updated section.',
                  created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
              ] : []
            });
          }

          for (const annotation of annotationsData) {
            await base44.asServiceRole.entities.ProposalAnnotation.create({
              ...annotation,
              proposal_id: wonProposal.id,
              client_id: client.id,
              team_member_id: 'primary',
              author_name: client.contact_name,
              author_email: client.contact_email,
              visible_to_consultant: true,
              resolved_by: annotation.is_resolved ? owner_email : undefined,
              resolved_date: annotation.is_resolved ? new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString() : undefined,
              text_selection: annotation.annotation_type === 'highlight' ? {
                start_offset: i * 50,
                end_offset: i * 50 + 40,
                selected_text: 'important highlighted text'
              } : undefined
            });
          }
        }
      }

      console.log('[CreateDemoOrg] ✅ Proposal annotations created for', clientsWithAnnotations.length, 'clients');
    }

    // 11. Create Mock Resources (Boilerplate)
    const mockResources = [
      {
        resource_type: 'boilerplate_text',
        content_category: 'company_overview',
        title: 'Standard Company Overview',
        description: 'Generic company overview boilerplate for federal proposals',
        boilerplate_content: '<p>Founded in 2010, our company has established itself as a trusted partner to federal agencies, delivering innovative technology solutions that drive mission success. With a proven track record of excellence and a team of certified professionals, we combine deep domain expertise with cutting-edge technical capabilities.</p>',
        tags: ['company', 'overview', 'federal'],
        word_count: 52,
        is_sample_data: true
      },
      {
        resource_type: 'capability_statement',
        title: 'Cloud & Cybersecurity Capability Statement',
        description: 'Capability statement highlighting cloud and security expertise',
        boilerplate_content: '<h3>Core Capabilities</h3><ul><li>Cloud Migration & Modernization (AWS, Azure, GCP)</li><li>Cybersecurity & Compliance (FedRAMP, FISMA, NIST)</li><li>DevSecOps Implementation</li><li>Enterprise Architecture</li></ul><p>Certifications: ISO 9001, ISO 27001, CMMI Level 3, FedRAMP Authorized</p>',
        tags: ['capability', 'cloud', 'cybersecurity'],
        is_favorite: true,
        is_sample_data: true
      }
    ];

    for (const resource of mockResources) {
      await base44.asServiceRole.entities.ProposalResource.create({
        ...resource,
        organization_id: demoOrg.id
      });
    }

    console.log('[CreateDemoOrg] ✅ Mock resources created');

    // 12. Create Sample Tasks for In-Progress Proposal
    const inProgressProposal = createdProposals.find(p => p.status === 'in_progress' || p.status === 'client_review'); // Check for updated status
    if (inProgressProposal) {
      const sampleTasks = [
        {
          title: 'Complete Technical Approach Section',
          description: 'Draft comprehensive technical approach addressing all RFP requirements',
          assigned_to_email: owner_email,
          assigned_to_name: 'Demo User',
          status: 'in_progress',
          priority: 'high',
          due_date: '2025-02-15',
          is_sample_data: true
        },
        {
          title: 'Review Compliance Matrix',
          description: 'Ensure all mandatory requirements are addressed',
          assigned_to_email: owner_email,
          assigned_to_name: 'Demo User',
          status: 'todo',
          priority: 'high',
          due_date: '2025-02-20',
          is_sample_data: true
        },
        {
          title: 'Gather Past Performance References',
          description: 'Collect and format relevant past performance examples',
          assigned_to_email: owner_email,
          assigned_to_name: 'Demo User',
          status: 'completed',
          priority: 'medium',
          completed_date: new Date().toISOString(),
          is_sample_data: true
        }
      ];

      for (const task of sampleTasks) {
        await base44.asServiceRole.entities.ProposalTask.create({
          ...task,
          proposal_id: inProgressProposal.id,
          assigned_by_email: owner_email,
          assigned_by_name: 'Demo User'
        });
      }

      console.log('[CreateDemoOrg] ✅ Sample tasks created');
    }

    // 13. Create Sample Discussions
    const discussions = [
      {
        title: 'Win Strategy Discussion for DoD Cloud Project',
        content: 'Let\'s discuss our win themes and competitive positioning for the DoD cloud modernization opportunity. What are our key discriminators?',
        author_email: owner_email,
        author_name: 'Demo User',
        category: 'proposal',
        proposal_id: createdProposals[0]?.id,
        tags: ['strategy', 'win-themes'],
        comment_count: 2,
        is_sample_data: true
      }
    ];

    for (const discussion of discussions) {
      await base44.asServiceRole.entities.Discussion.create({
        ...discussion,
        organization_id: demoOrg.id
      });
    }

    console.log('[CreateDemoOrg] ✅ Sample discussions created');

    console.log('[CreateDemoOrg] 🎉 DEMO ORGANIZATION FULLY SEEDED!');

    return Response.json({
      success: true,
      message: `Demo organization "${organization_name}" created and seeded successfully!`,
      organization_id: demoOrg.id,
      organization_name: demoOrg.organization_name,
      demo_view_mode: demo_view_mode,
      data_created: {
        proposals: createdProposals.length,
        past_performance: pastPerformanceProjects.length,
        key_personnel: keyPersonnel.length,
        teaming_partners: partners.length,
        clients: createdClients.length,
        client_team_members: createdClients.slice(0, 3).reduce((acc, _, i) => acc + (teamMembersData[i] || []).length, 0), // Calculate based on new logic
        resources: mockResources.length,
        boards: 1
      }
    });

  } catch (error) {
    console.error('[CreateDemoOrg] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});