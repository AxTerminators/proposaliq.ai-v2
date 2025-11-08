import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Migration function to categorize existing proposals into proposal_type_category
 * Uses heuristics based on project_type, title keywords, and agency patterns
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, dry_run = false } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'Missing organization_id' }, { status: 400 });
    }

    // Fetch all proposals for this organization that don't have a category
    const proposals = await base44.asServiceRole.entities.Proposal.filter({ 
      organization_id 
    });

    const categorizationResults = [];
    let categorizedCount = 0;
    let alreadyCategorizedCount = 0;

    for (const proposal of proposals) {
      // Skip if already categorized
      if (proposal.proposal_type_category && proposal.proposal_type_category !== '') {
        alreadyCategorizedCount++;
        continue;
      }

      let category = 'RFP'; // Default fallback

      // Heuristic 1: Check project_type field
      if (proposal.project_type) {
        const projectType = proposal.project_type.toUpperCase();
        if (projectType.includes('RFI')) {
          category = 'RFI';
        } else if (projectType.includes('RFQ')) {
          category = 'RFP'; // RFQ similar to RFP
        } else if (projectType.includes('RFP')) {
          category = 'RFP';
        }
      }

      // Heuristic 2: Check proposal_name and project_title for keywords
      const searchText = `${proposal.proposal_name || ''} ${proposal.project_title || ''}`.toLowerCase();
      
      if (searchText.includes('sbir') || searchText.includes('sttr') || searchText.includes('phase i') || searchText.includes('phase ii')) {
        category = 'SBIR';
      } else if (searchText.includes('gsa') || searchText.includes('schedule') || searchText.includes('sin ')) {
        category = 'GSA';
      } else if (searchText.includes('idiq') || searchText.includes('task order') || searchText.includes('bpa')) {
        category = 'IDIQ';
      } else if (searchText.includes('state') || searchText.includes('local') || searchText.includes('county') || searchText.includes('city of')) {
        category = 'STATE_LOCAL';
      } else if (searchText.includes('rfi') || searchText.includes('sources sought') || searchText.includes('market research')) {
        category = 'RFI';
      }

      // Heuristic 3: Check agency name patterns
      const agency = (proposal.agency_name || '').toLowerCase();
      if (agency.includes('state') || agency.includes('county') || agency.includes('city') || agency.includes('municipal')) {
        category = 'STATE_LOCAL';
      }

      categorizationResults.push({
        proposal_id: proposal.id,
        proposal_name: proposal.proposal_name,
        old_type: proposal.project_type,
        assigned_category: category,
        reasoning: `Based on: ${proposal.project_type || 'N/A'}, keywords in title/name, agency: ${proposal.agency_name || 'N/A'}`
      });

      // Update if not dry run
      if (!dry_run) {
        await base44.asServiceRole.entities.Proposal.update(proposal.id, {
          proposal_type_category: category
        });
        categorizedCount++;
      }
    }

    return Response.json({ 
      success: true,
      total_proposals: proposals.length,
      already_categorized: alreadyCategorizedCount,
      newly_categorized: categorizedCount,
      dry_run,
      categorization_details: categorizationResults,
      message: dry_run 
        ? `Dry run complete. ${categorizationResults.length} proposals would be categorized.`
        : `Successfully categorized ${categorizedCount} proposals.`
    });

  } catch (error) {
    console.error('Error categorizing proposals:', error);
    return Response.json({ 
      error: error.message || 'Failed to categorize proposals'
    }, { status: 500 });
  }
});