import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates the default Content Library folder structure for an organization.
 * This function sets up a comprehensive, industry-neutral folder hierarchy
 * designed to organize all types of reusable proposal content.
 * 
 * Call this function when:
 * - A new organization is created (during onboarding)
 * - An admin wants to reset/create the default structure
 * 
 * @param {string} organization_id - The organization to create folders for
 * @returns {object} Success status and created folder details
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ 
        success: false, 
        message: 'organization_id is required' 
      }, { status: 400 });
    }

    console.log('[CreateDefaultFolders] Creating default folder structure for org:', organization_id);

    // Check if folders already exist
    const existingFolders = await base44.asServiceRole.entities.Folder.filter({
      organization_id: organization_id,
      purpose: 'content_library'
    });

    if (existingFolders.length > 0) {
      console.log('[CreateDefaultFolders] Folders already exist, skipping creation');
      return Response.json({
        success: true,
        message: 'Default folder structure already exists',
        folder_count: existingFolders.length
      });
    }

    // Define the folder structure
    const folderStructure = [
      // 1. Company Information
      {
        folder_name: 'Company Information',
        icon: '🏢',
        description: 'Core information about your organization',
        parent: null,
        order: 0,
        subfolders: [
          { folder_name: 'Company Overviews', icon: '📄', description: 'Mission, vision, values, company history' },
          { folder_name: 'Capability Statements', icon: '⭐', description: 'Capability statements for various audiences' },
          { folder_name: 'Corporate Bios', icon: '👔', description: 'Leadership and company structure bios' },
          { folder_name: 'Certifications & Awards', icon: '🏆', description: 'Company certifications, awards, memberships' },
          { folder_name: 'Financials', icon: '💰', description: 'Financial statements and relevant data' }
        ]
      },
      
      // 2. Proposal Sections
      {
        folder_name: 'Proposal Sections',
        icon: '📋',
        description: 'Reusable boilerplate organized by proposal section',
        parent: null,
        order: 1,
        subfolders: [
          { folder_name: 'Executive Summaries', icon: '📊', description: 'Templates and versions of executive summaries' },
          { folder_name: 'Technical Approaches', icon: '⚙️', description: 'Methodologies, frameworks, and approaches' },
          { folder_name: 'Management Plans', icon: '📈', description: 'Project management and quality control approaches' },
          { folder_name: 'Staffing & Resourcing', icon: '👥', description: 'Team formation and recruitment approaches' },
          { folder_name: 'Quality Assurance', icon: '✅', description: 'Quality processes and testing methodologies' },
          { folder_name: 'Transition Plans', icon: '🔄', description: 'Project transition and handover templates' },
          { folder_name: 'Pricing & Cost Narratives', icon: '💵', description: 'Pricing models and value propositions' }
        ]
      },
      
      // 3. Past Performance & Case Studies
      {
        folder_name: 'Past Performance & Case Studies',
        icon: '🏆',
        description: 'Previous successful projects and case studies',
        parent: null,
        order: 2,
        subfolders: [
          { folder_name: 'Government Contracts', icon: '🏛️', description: 'Federal, State, and Local government projects' },
          { folder_name: 'Commercial Projects', icon: '🏢', description: 'Private sector projects and case studies' },
          { folder_name: 'Success Stories', icon: '⭐', description: 'Narrative-driven achievements and impact stories' }
        ]
      },
      
      // 4. Key Personnel
      {
        folder_name: 'Key Personnel',
        icon: '🧑‍💼',
        description: 'Resumes, bios, and qualifications',
        parent: null,
        order: 3,
        subfolders: [
          { folder_name: 'Leadership Profiles', icon: '👔', description: 'Executive and senior management profiles' },
          { folder_name: 'Project Managers', icon: '📋', description: 'Qualified project manager profiles' },
          { folder_name: 'Technical Experts', icon: '💻', description: 'Personnel with specialized technical skills' },
          { folder_name: 'Functional Specialists', icon: '🎯', description: 'Other key roles (analysts, trainers, etc.)' }
        ]
      },
      
      // 5. Teaming Partners
      {
        folder_name: 'Teaming Partners',
        icon: '🤝',
        description: 'Partner and subcontractor information',
        parent: null,
        order: 4,
        subfolders: [
          { folder_name: 'Partner Overviews', icon: '🏢', description: 'General capabilities of teaming partners' },
          { folder_name: 'Partner Past Performance', icon: '📊', description: 'Partner-specific project examples' },
          { folder_name: 'Socioeconomic Certifications', icon: '🏅', description: 'Partner small business designations' }
        ]
      },
      
      // 6. Admin & Compliance
      {
        folder_name: 'Admin & Compliance',
        icon: '⚖️',
        description: 'Administrative data, regulations, and templates',
        parent: null,
        order: 5,
        subfolders: [
          { folder_name: 'Regulatory Information', icon: '📜', description: 'FAR/DFARS clauses, industry standards' },
          { folder_name: 'Internal Policies', icon: '📋', description: 'Company policies and ethical guidelines' },
          { folder_name: 'SOPs', icon: '📑', description: 'Standard Operating Procedures' },
          { folder_name: 'Document Templates', icon: '📄', description: 'Proposal and report templates' }
        ]
      },
      
      // 7. Marketing & Sales Collateral
      {
        folder_name: 'Marketing & Sales Collateral',
        icon: '📈',
        description: 'Pre-proposal and outreach materials',
        parent: null,
        order: 6,
        subfolders: [
          { folder_name: 'Brochures & Flyers', icon: '📰', description: 'Product and service brochures' },
          { folder_name: 'Presentations', icon: '🎤', description: 'Company and solution presentations' },
          { folder_name: 'Customer Testimonials', icon: '💬', description: 'Client quotes and success stories' }
        ]
      },
      
      // 8. General Boilerplate
      {
        folder_name: 'General Boilerplate',
        icon: '📦',
        description: 'Generic text snippets and common phrases',
        parent: null,
        order: 7,
        subfolders: [
          { folder_name: 'Introductions/Closings', icon: '✍️', description: 'Generic opening and closing statements' },
          { folder_name: 'Disclaimer Text', icon: '⚠️', description: 'Legal disclaimers and standard terms' },
          { folder_name: 'Acronyms & Glossary', icon: '📖', description: 'Standardized terms and definitions' }
        ]
      }
    ];

    // Create all folders
    const createdFolders = [];
    
    // First pass: Create parent folders
    for (const parentDef of folderStructure) {
      const parentFolder = await base44.asServiceRole.entities.Folder.create({
        organization_id: organization_id,
        folder_name: parentDef.folder_name,
        icon: parentDef.icon,
        description: parentDef.description,
        purpose: 'content_library',
        parent_folder_id: null,
        sort_order: parentDef.order,
        is_system_folder: true, // Mark as system folder so users can't accidentally delete
        allowed_content_types: [] // Empty = all types allowed
      });
      
      createdFolders.push(parentFolder);
      console.log(`[CreateDefaultFolders] Created parent folder: ${parentFolder.folder_name}`);
      
      // Second pass: Create subfolders
      if (parentDef.subfolders && parentDef.subfolders.length > 0) {
        for (let i = 0; i < parentDef.subfolders.length; i++) {
          const subDef = parentDef.subfolders[i];
          const subFolder = await base44.asServiceRole.entities.Folder.create({
            organization_id: organization_id,
            folder_name: subDef.folder_name,
            icon: subDef.icon,
            description: subDef.description,
            purpose: 'content_library',
            parent_folder_id: parentFolder.id,
            sort_order: i,
            is_system_folder: false, // Subfolders can be modified by users
            allowed_content_types: []
          });
          
          createdFolders.push(subFolder);
          console.log(`[CreateDefaultFolders]   - Created subfolder: ${subFolder.folder_name}`);
        }
      }
    }

    console.log(`[CreateDefaultFolders] ✅ Successfully created ${createdFolders.length} folders`);

    return Response.json({
      success: true,
      message: `Default Content Library folder structure created successfully`,
      folder_count: createdFolders.length,
      folders: createdFolders.map(f => ({
        id: f.id,
        name: f.folder_name,
        icon: f.icon,
        parent_id: f.parent_folder_id
      }))
    });

  } catch (error) {
    console.error('[CreateDefaultFolders] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});