import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Generate Predictive Timeline Function
 * 
 * Uses historical proposal data and AI to suggest realistic internal deadlines
 * and key milestones based on the final due date and proposal type.
 * 
 * Input:
 * - proposal_id: ID of the proposal
 * - organization_id: Organization ID
 * - final_due_date: The RFP submission deadline (ISO date string)
 * - proposal_type_category: Type of proposal (RFP, SBIR, GSA, etc.)
 * 
 * Output:
 * - suggested_timeline: Object containing arrays of internal_deadlines and key_milestones
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { proposal_id, organization_id, final_due_date, proposal_type_category } = await req.json();

    // Validation
    if (!proposal_id || !organization_id || !final_due_date) {
      return Response.json({ 
        error: 'Missing required parameters: proposal_id, organization_id, and final_due_date are required' 
      }, { status: 400 });
    }

    const dueDate = new Date(final_due_date);
    if (isNaN(dueDate.getTime())) {
      return Response.json({ error: 'Invalid date format for final_due_date' }, { status: 400 });
    }

    // Calculate days until due date
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Fetch historical data for similar proposals
    const historicalProposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id,
      proposal_type_category: proposal_type_category || 'RFP'
    });

    // Analyze historical timeline data
    const historicalTimelines = historicalProposals
      .filter(p => p.internal_deadlines && p.internal_deadlines.length > 0)
      .map(p => ({
        internal_deadlines: p.internal_deadlines,
        key_milestones: p.key_milestones || [],
        total_days: p.due_date ? Math.ceil((new Date(p.due_date) - new Date(p.created_date)) / (1000 * 60 * 60 * 24)) : null
      }));

    // Generate unique ID helper
    const generateId = () => `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate date helper (working backwards from due date)
    const calculateDate = (daysBeforeDue) => {
      const date = new Date(dueDate);
      date.setDate(date.getDate() - daysBeforeDue);
      return date.toISOString();
    };

    // Default timeline templates based on proposal type and duration
    let suggestedInternalDeadlines = [];
    let suggestedKeyMilestones = [];

    // Determine timeline template based on days until due
    if (daysUntilDue >= 60) {
      // Long timeline (60+ days) - comprehensive approach
      suggestedInternalDeadlines = [
        {
          id: generateId(),
          name: 'Initial Planning Complete',
          date: calculateDate(daysUntilDue - 7),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Complete initial proposal planning, team assignments, and resource allocation',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Outline & Strategy Finalized',
          date: calculateDate(Math.floor(daysUntilDue * 0.85)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Finalize proposal outline, win themes, and overall strategy',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'First Draft Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.65)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'All sections should have first draft content',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Pink Team Review',
          date: calculateDate(Math.floor(daysUntilDue * 0.50)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Internal review for content completeness and compliance',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Pricing Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.40)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Final pricing reviewed and approved',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Red Team Review',
          date: calculateDate(Math.floor(daysUntilDue * 0.25)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Comprehensive review by independent team',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Final Edits & Formatting',
          date: calculateDate(Math.floor(daysUntilDue * 0.15)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Address all review comments, finalize formatting',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Executive Review & Approval',
          date: calculateDate(5),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Final executive sign-off',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Final Package Assembly',
          date: calculateDate(2),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Assemble all deliverables, prepare submission package',
          ai_generated: true
        }
      ];

      suggestedKeyMilestones = [
        {
          id: generateId(),
          name: 'Kick-off Meeting',
          date: calculateDate(daysUntilDue - 5),
          status: 'pending',
          notes: 'Team kick-off to align on strategy and assignments',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Mid-Point Review',
          date: calculateDate(Math.floor(daysUntilDue * 0.50)),
          status: 'pending',
          notes: 'Check progress at halfway point',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Go/No-Go Decision',
          date: calculateDate(10),
          status: 'pending',
          notes: 'Final decision on submission',
          ai_generated: true
        }
      ];
    } else if (daysUntilDue >= 30) {
      // Medium timeline (30-59 days) - accelerated approach
      suggestedInternalDeadlines = [
        {
          id: generateId(),
          name: 'Initial Planning Complete',
          date: calculateDate(daysUntilDue - 3),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Complete initial proposal planning and team assignments',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Outline Finalized',
          date: calculateDate(Math.floor(daysUntilDue * 0.80)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Finalize proposal outline and win themes',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'First Draft Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.60)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'All sections have first draft',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Internal Review',
          date: calculateDate(Math.floor(daysUntilDue * 0.40)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Comprehensive internal review',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Pricing Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.30)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Final pricing approved',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Final Edits',
          date: calculateDate(Math.floor(daysUntilDue * 0.20)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Address all comments, finalize content',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Executive Approval',
          date: calculateDate(3),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Final executive sign-off',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Package Assembly',
          date: calculateDate(1),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Prepare final submission package',
          ai_generated: true
        }
      ];

      suggestedKeyMilestones = [
        {
          id: generateId(),
          name: 'Team Kick-off',
          date: calculateDate(daysUntilDue - 2),
          status: 'pending',
          notes: 'Initial team alignment meeting',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Go/No-Go Decision',
          date: calculateDate(7),
          status: 'pending',
          notes: 'Final decision on submission',
          ai_generated: true
        }
      ];
    } else if (daysUntilDue >= 14) {
      // Short timeline (14-29 days) - rapid approach
      suggestedInternalDeadlines = [
        {
          id: generateId(),
          name: 'Initial Planning',
          date: calculateDate(daysUntilDue - 2),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Quick planning and team alignment',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Draft Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.60)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Complete first pass of all content',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Pricing & Review',
          date: calculateDate(Math.floor(daysUntilDue * 0.40)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Complete pricing and internal review',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Final Polish',
          date: calculateDate(3),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Final edits and formatting',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Package & Submit',
          date: calculateDate(1),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Finalize submission package',
          ai_generated: true
        }
      ];

      suggestedKeyMilestones = [
        {
          id: generateId(),
          name: 'Rapid Kick-off',
          date: calculateDate(daysUntilDue - 1),
          status: 'pending',
          notes: 'Quick team alignment',
          ai_generated: true
        }
      ];
    } else {
      // Very short timeline (<14 days) - emergency approach
      suggestedInternalDeadlines = [
        {
          id: generateId(),
          name: 'Emergency Planning',
          date: calculateDate(daysUntilDue - 1),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Immediate planning and resource allocation',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Draft Complete',
          date: calculateDate(Math.floor(daysUntilDue * 0.50)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Complete initial draft',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Review & Pricing',
          date: calculateDate(Math.floor(daysUntilDue * 0.30)),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Quick review and pricing finalization',
          ai_generated: true
        },
        {
          id: generateId(),
          name: 'Final Package',
          date: calculateDate(1),
          assigned_to_email: '',
          assigned_to_name: '',
          status: 'pending',
          notes: 'Assemble and submit',
          ai_generated: true
        }
      ];

      suggestedKeyMilestones = [
        {
          id: generateId(),
          name: 'Emergency Kick-off',
          date: today.toISOString(),
          status: 'pending',
          notes: 'Immediate team mobilization',
          ai_generated: true
        }
      ];
    }

    // If we have historical data, try to refine suggestions
    if (historicalTimelines.length > 0) {
      // Calculate average timeline patterns from history
      const commonDeadlineNames = new Map();
      
      historicalTimelines.forEach(timeline => {
        timeline.internal_deadlines.forEach(deadline => {
          const count = commonDeadlineNames.get(deadline.name) || 0;
          commonDeadlineNames.set(deadline.name, count + 1);
        });
      });

      // Add frequently used deadline names from history (if not already included)
      const existingNames = new Set(suggestedInternalDeadlines.map(d => d.name.toLowerCase()));
      
      for (const [name, count] of commonDeadlineNames.entries()) {
        if (count >= 2 && !existingNames.has(name.toLowerCase()) && suggestedInternalDeadlines.length < 12) {
          // Add historical deadline with calculated date
          suggestedInternalDeadlines.push({
            id: generateId(),
            name: name,
            date: calculateDate(Math.floor(daysUntilDue * 0.35)), // Place in middle of timeline
            assigned_to_email: '',
            assigned_to_name: '',
            status: 'pending',
            notes: `Based on historical data from similar ${proposal_type_category} proposals`,
            ai_generated: true
          });
        }
      }
    }

    // Sort deadlines and milestones by date
    suggestedInternalDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
    suggestedKeyMilestones.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Return suggested timeline
    return Response.json({
      success: true,
      suggested_timeline: {
        internal_deadlines: suggestedInternalDeadlines,
        key_milestones: suggestedKeyMilestones
      },
      metadata: {
        days_until_due: daysUntilDue,
        proposal_type: proposal_type_category || 'RFP',
        timeline_template: daysUntilDue >= 60 ? 'comprehensive' : 
                          daysUntilDue >= 30 ? 'accelerated' : 
                          daysUntilDue >= 14 ? 'rapid' : 'emergency',
        historical_data_used: historicalTimelines.length > 0,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating predictive timeline:', error);
    return Response.json({ 
      error: 'Failed to generate timeline', 
      details: error.message 
    }, { status: 500 });
  }
});