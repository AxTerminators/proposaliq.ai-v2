import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body with organization name or ID
    const body = await req.json().catch(() => ({}));
    const { organization_name, organization_id } = body;

    if (!organization_name && !organization_id) {
      return Response.json({ 
        error: 'Please provide either organization_name or organization_id' 
      }, { status: 400 });
    }

    // Find the organization
    let organization;
    if (organization_id) {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
      organization = orgs.length > 0 ? orgs[0] : null;
    } else {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ 
        organization_name: organization_name 
      });
      organization = orgs.length > 0 ? orgs[0] : null;
    }

    if (!organization) {
      return Response.json({ 
        error: 'Organization not found',
        searched_for: organization_name || organization_id
      }, { status: 404 });
    }

    // Verify user has access to this organization
    if (organization.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ 
        error: 'You do not have permission to clear data from this organization' 
      }, { status: 403 });
    }

    let deletedCount = {
      proposals: 0,
      sections: 0,
      section_history: 0,
      tasks: 0,
      subtasks: 0,
      comments: 0,
      solicitation_documents: 0,
      activity_logs: 0,
      compliance_requirements: 0,
      win_themes: 0,
      clins: 0,
      labor_allocations: 0,
      odc_items: 0,
      pricing_strategies: 0,
      subcontractor_pricing: 0,
      review_rounds: 0,
      section_reviews: 0,
      calendar_events: 0,
      approval_workflows: 0,
      export_history: 0,
      proposal_annotations: 0,
      client_meetings: 0,
      meeting_notes: 0,
      client_approval_requests: 0,
      client_engagement_metrics: 0,
      presence_sessions: 0,
      interactive_elements: 0,
      proposal_comparisons: 0,
      proposal_health_metrics: 0,
      content_reuse_suggestions: 0,
      win_loss_analyses: 0,
      workflow_rules: 0,
      task_dependencies: 0,
      proposal_dependencies: 0,
      proposal_automation_rules: 0,
      proposal_metric_snapshots: 0,
      notifications: 0
    };

    console.log(`Starting to clear all proposals from organization: ${organization.organization_name} (${organization.id})`);

    // Get all proposals for this organization
    const proposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id: organization.id
    });

    console.log(`Found ${proposals.length} proposals to delete`);

    // Delete all proposal-related data
    for (const proposal of proposals) {
      console.log(`Processing proposal: ${proposal.proposal_name} (${proposal.id})`);

      // Delete proposal sections and their history
      const sections = await base44.asServiceRole.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });
      for (const section of sections) {
        // Delete section history
        const history = await base44.asServiceRole.entities.ProposalSectionHistory.filter({
          proposal_section_id: section.id
        });
        for (const hist of history) {
          await base44.asServiceRole.entities.ProposalSectionHistory.delete(hist.id);
          deletedCount.section_history++;
        }
        await base44.asServiceRole.entities.ProposalSection.delete(section.id);
        deletedCount.sections++;
      }

      // Delete proposal tasks
      const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
        proposal_id: proposal.id
      });
      for (const task of tasks) {
        await base44.asServiceRole.entities.ProposalTask.delete(task.id);
        deletedCount.tasks++;
      }

      // Delete proposal subtasks
      const subtasks = await base44.asServiceRole.entities.ProposalSubtask.filter({
        proposal_id: proposal.id
      });
      for (const subtask of subtasks) {
        await base44.asServiceRole.entities.ProposalSubtask.delete(subtask.id);
        deletedCount.subtasks++;
      }

      // Delete comments
      const comments = await base44.asServiceRole.entities.ProposalComment.filter({
        proposal_id: proposal.id
      });
      for (const comment of comments) {
        await base44.asServiceRole.entities.ProposalComment.delete(comment.id);
        deletedCount.comments++;
      }

      // Delete solicitation documents
      const docs = await base44.asServiceRole.entities.SolicitationDocument.filter({
        proposal_id: proposal.id
      });
      for (const doc of docs) {
        await base44.asServiceRole.entities.SolicitationDocument.delete(doc.id);
        deletedCount.solicitation_documents++;
      }

      // Delete activity logs
      const activities = await base44.asServiceRole.entities.ActivityLog.filter({
        proposal_id: proposal.id
      });
      for (const activity of activities) {
        await base44.asServiceRole.entities.ActivityLog.delete(activity.id);
        deletedCount.activity_logs++;
      }

      // Delete compliance requirements
      const compliance = await base44.asServiceRole.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id
      });
      for (const req of compliance) {
        await base44.asServiceRole.entities.ComplianceRequirement.delete(req.id);
        deletedCount.compliance_requirements++;
      }

      // Delete win themes
      const themes = await base44.asServiceRole.entities.WinTheme.filter({
        proposal_id: proposal.id
      });
      for (const theme of themes) {
        await base44.asServiceRole.entities.WinTheme.delete(theme.id);
        deletedCount.win_themes++;
      }

      // Delete pricing data
      const clins = await base44.asServiceRole.entities.CLIN.filter({
        proposal_id: proposal.id
      });
      for (const clin of clins) {
        // Delete labor allocations for this CLIN
        const laborAllocs = await base44.asServiceRole.entities.LaborAllocation.filter({
          clin_id: clin.id
        });
        for (const alloc of laborAllocs) {
          await base44.asServiceRole.entities.LaborAllocation.delete(alloc.id);
          deletedCount.labor_allocations++;
        }

        // Delete ODC items for this CLIN
        const odcItems = await base44.asServiceRole.entities.ODCItem.filter({
          clin_id: clin.id
        });
        for (const odc of odcItems) {
          await base44.asServiceRole.entities.ODCItem.delete(odc.id);
          deletedCount.odc_items++;
        }

        await base44.asServiceRole.entities.CLIN.delete(clin.id);
        deletedCount.clins++;
      }

      // Delete pricing strategies
      const strategies = await base44.asServiceRole.entities.PricingStrategy.filter({
        proposal_id: proposal.id
      });
      for (const strategy of strategies) {
        await base44.asServiceRole.entities.PricingStrategy.delete(strategy.id);
        deletedCount.pricing_strategies++;
      }

      // Delete subcontractor pricing
      const subPricing = await base44.asServiceRole.entities.SubcontractorPricing.filter({
        proposal_id: proposal.id
      });
      for (const sub of subPricing) {
        await base44.asServiceRole.entities.SubcontractorPricing.delete(sub.id);
        deletedCount.subcontractor_pricing++;
      }

      // Delete review rounds and section reviews
      const reviews = await base44.asServiceRole.entities.ReviewRound.filter({
        proposal_id: proposal.id
      });
      for (const review of reviews) {
        const sectionReviews = await base44.asServiceRole.entities.SectionReview.filter({
          review_round_id: review.id
        });
        for (const secReview of sectionReviews) {
          await base44.asServiceRole.entities.SectionReview.delete(secReview.id);
          deletedCount.section_reviews++;
        }
        await base44.asServiceRole.entities.ReviewRound.delete(review.id);
        deletedCount.review_rounds++;
      }

      // Delete calendar events
      const events = await base44.asServiceRole.entities.CalendarEvent.filter({
        proposal_id: proposal.id
      });
      for (const event of events) {
        await base44.asServiceRole.entities.CalendarEvent.delete(event.id);
        deletedCount.calendar_events++;
      }

      // Delete approval workflows
      const workflows = await base44.asServiceRole.entities.ApprovalWorkflow.filter({
        proposal_id: proposal.id
      });
      for (const workflow of workflows) {
        await base44.asServiceRole.entities.ApprovalWorkflow.delete(workflow.id);
        deletedCount.approval_workflows++;
      }

      // Delete export history
      const exports = await base44.asServiceRole.entities.ExportHistory.filter({
        proposal_id: proposal.id
      });
      for (const exp of exports) {
        await base44.asServiceRole.entities.ExportHistory.delete(exp.id);
        deletedCount.export_history++;
      }

      // Delete client-related data
      const annotations = await base44.asServiceRole.entities.ProposalAnnotation.filter({
        proposal_id: proposal.id
      });
      for (const annotation of annotations) {
        await base44.asServiceRole.entities.ProposalAnnotation.delete(annotation.id);
        deletedCount.proposal_annotations++;
      }

      const meetings = await base44.asServiceRole.entities.ClientMeeting.filter({
        proposal_id: proposal.id
      });
      for (const meeting of meetings) {
        const notes = await base44.asServiceRole.entities.MeetingNote.filter({
          meeting_id: meeting.id
        });
        for (const note of notes) {
          await base44.asServiceRole.entities.MeetingNote.delete(note.id);
          deletedCount.meeting_notes++;
        }
        await base44.asServiceRole.entities.ClientMeeting.delete(meeting.id);
        deletedCount.client_meetings++;
      }

      const approvalRequests = await base44.asServiceRole.entities.ClientApprovalRequest.filter({
        proposal_id: proposal.id
      });
      for (const req of approvalRequests) {
        await base44.asServiceRole.entities.ClientApprovalRequest.delete(req.id);
        deletedCount.client_approval_requests++;
      }

      const engagementMetrics = await base44.asServiceRole.entities.ClientEngagementMetric.filter({
        proposal_id: proposal.id
      });
      for (const metric of engagementMetrics) {
        await base44.asServiceRole.entities.ClientEngagementMetric.delete(metric.id);
        deletedCount.client_engagement_metrics++;
      }

      const presenceSessions = await base44.asServiceRole.entities.PresenceSession.filter({
        proposal_id: proposal.id
      });
      for (const session of presenceSessions) {
        await base44.asServiceRole.entities.PresenceSession.delete(session.id);
        deletedCount.presence_sessions++;
      }

      const interactiveElements = await base44.asServiceRole.entities.InteractiveElement.filter({
        proposal_id: proposal.id
      });
      for (const element of interactiveElements) {
        await base44.asServiceRole.entities.InteractiveElement.delete(element.id);
        deletedCount.interactive_elements++;
      }

      // Delete analytics data
      const healthMetrics = await base44.asServiceRole.entities.ProposalHealthMetric.filter({
        proposal_id: proposal.id
      });
      for (const metric of healthMetrics) {
        await base44.asServiceRole.entities.ProposalHealthMetric.delete(metric.id);
        deletedCount.proposal_health_metrics++;
      }

      const reuseSuggestions = await base44.asServiceRole.entities.ContentReuseSuggestion.filter({
        proposal_id: proposal.id
      });
      for (const suggestion of reuseSuggestions) {
        await base44.asServiceRole.entities.ContentReuseSuggestion.delete(suggestion.id);
        deletedCount.content_reuse_suggestions++;
      }

      const winLossAnalyses = await base44.asServiceRole.entities.WinLossAnalysis.filter({
        proposal_id: proposal.id
      });
      for (const analysis of winLossAnalyses) {
        await base44.asServiceRole.entities.WinLossAnalysis.delete(analysis.id);
        deletedCount.win_loss_analyses++;
      }

      // Delete workflow and dependency data
      const workflowRules = await base44.asServiceRole.entities.WorkflowRule.filter({
        proposal_id: proposal.id
      });
      for (const rule of workflowRules) {
        await base44.asServiceRole.entities.WorkflowRule.delete(rule.id);
        deletedCount.workflow_rules++;
      }

      const taskDeps = await base44.asServiceRole.entities.TaskDependency.filter({
        proposal_id: proposal.id
      });
      for (const dep of taskDeps) {
        await base44.asServiceRole.entities.TaskDependency.delete(dep.id);
        deletedCount.task_dependencies++;
      }

      const proposalDeps = await base44.asServiceRole.entities.ProposalDependency.filter({
        proposal_id: proposal.id
      });
      for (const dep of proposalDeps) {
        await base44.asServiceRole.entities.ProposalDependency.delete(dep.id);
        deletedCount.proposal_dependencies++;
      }

      const metricSnapshots = await base44.asServiceRole.entities.ProposalMetricSnapshot.filter({
        proposal_id: proposal.id
      });
      for (const snapshot of metricSnapshots) {
        await base44.asServiceRole.entities.ProposalMetricSnapshot.delete(snapshot.id);
        deletedCount.proposal_metric_snapshots++;
      }

      // Delete notifications related to this proposal
      const notifications = await base44.asServiceRole.entities.Notification.filter({
        related_proposal_id: proposal.id
      });
      for (const notification of notifications) {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
        deletedCount.notifications++;
      }

      // Finally, delete the proposal itself
      await base44.asServiceRole.entities.Proposal.delete(proposal.id);
      deletedCount.proposals++;

      console.log(`Deleted proposal: ${proposal.proposal_name}`);
    }

    // Also delete comparison data that references this org's proposals
    const comparisons = await base44.asServiceRole.entities.ProposalComparison.filter({
      organization_id: organization.id
    });
    for (const comparison of comparisons) {
      await base44.asServiceRole.entities.ProposalComparison.delete(comparison.id);
      deletedCount.proposal_comparisons++;
    }

    return Response.json({ 
      success: true,
      message: `Successfully cleared all proposal data from "${organization.organization_name}"`,
      organization: {
        id: organization.id,
        name: organization.organization_name
      },
      deletedCount
    });

  } catch (error) {
    console.error('Error clearing organization proposals:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});