import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, board_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Get the board to find column IDs
    const boards = await base44.asServiceRole.entities.KanbanConfig.filter({
      id: board_id
    });

    if (boards.length === 0) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }

    const board = boards[0];
    const columns = board.columns || [];
    
    if (columns.length === 0) {
      return Response.json({ error: 'Board has no columns' }, { status: 400 });
    }

    // Sample tasks across different stages
    const sampleTasks = [
      {
        title: "Setup development environment",
        description: "Configure local development environment with all required tools and dependencies",
        assigned_to_email: user.email,
        assigned_to_name: user.full_name,
        priority: "high",
        status: "completed",
        estimated_hours: 4,
        current_column_id: columns[columns.length - 1]?.id, // Last column
        tags: ["setup", "infrastructure"],
        is_sample_data: true
      },
      {
        title: "Design database schema",
        description: "Create comprehensive database schema for the project including all entities and relationships",
        assigned_to_email: user.email,
        assigned_to_name: user.full_name,
        priority: "high",
        status: "in_progress",
        estimated_hours: 8,
        current_column_id: columns[Math.min(1, columns.length - 1)]?.id,
        tags: ["database", "design"],
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_sample_data: true
      },
      {
        title: "Implement authentication module",
        description: "Build secure authentication system with JWT tokens and role-based access control",
        assigned_to_email: user.email,
        assigned_to_name: user.full_name,
        priority: "urgent",
        status: "not_started",
        estimated_hours: 12,
        current_column_id: columns[0]?.id,
        tags: ["security", "backend"],
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_sample_data: true
      },
      {
        title: "Create UI mockups",
        description: "Design user interface mockups for all main application screens",
        priority: "medium",
        status: "not_started",
        estimated_hours: 16,
        current_column_id: columns[0]?.id,
        tags: ["design", "ui/ux"],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_sample_data: true
      },
      {
        title: "Write API documentation",
        description: "Document all API endpoints with request/response examples and authentication requirements",
        assigned_to_email: user.email,
        assigned_to_name: user.full_name,
        priority: "low",
        status: "not_started",
        estimated_hours: 6,
        current_column_id: columns[0]?.id,
        tags: ["documentation", "api"],
        is_sample_data: true
      },
      {
        title: "Code review: Payment integration",
        description: "Review and test the new payment processing integration for security and compliance",
        assigned_to_email: user.email,
        assigned_to_name: user.full_name,
        priority: "high",
        status: "in_progress",
        estimated_hours: 3,
        current_column_id: columns[Math.min(1, columns.length - 1)]?.id,
        tags: ["review", "payments"],
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_sample_data: true
      },
      {
        title: "Deploy to staging environment",
        description: "Deploy latest build to staging for QA testing and client review",
        priority: "medium",
        status: "blocked",
        estimated_hours: 2,
        current_column_id: columns[Math.min(2, columns.length - 1)]?.id,
        tags: ["deployment", "devops"],
        is_blocked: true,
        blocker_reason: "Waiting for infrastructure team to provision staging server",
        is_sample_data: true
      }
    ];

    // Create all sample tasks
    const createdTasks = [];
    for (const taskData of sampleTasks) {
      const task = await base44.asServiceRole.entities.ProjectTask.create({
        ...taskData,
        organization_id,
        board_id
      });
      createdTasks.push(task);
    }

    return Response.json({
      success: true,
      message: `Created ${createdTasks.length} sample project tasks`,
      tasks: createdTasks
    });

  } catch (error) {
    console.error('Error generating sample tasks:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});