import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Generate Checklist Items Using AI
 * 
 * This function takes a user's brief description and uses AI to generate
 * a structured checklist with appropriate item types and actions.
 * 
 * @param {string} description - User's project/task description
 * @returns {object} { success, items, error }
 */

// Available modal action options that AI can suggest
const AVAILABLE_MODAL_OPTIONS = [
  { value: 'add_partner', label: 'Add Teaming Partner', description: 'Upload capability statement and extract partner details' },
  { value: 'upload_solicitation', label: 'Upload Solicitation', description: 'Upload RFP, SOW, or other solicitation documents' },
  { value: 'add_past_performance', label: 'Add Past Performance', description: 'Document past performance and project details' },
  { value: 'add_resource', label: 'Upload Resource', description: 'Upload general resources or boilerplate content' },
  { value: 'ai_data_collection', label: 'AI-Enhanced Data Call', description: 'Smart form with AI-powered data extraction' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { description } = await req.json();
    
    if (!description || !description.trim()) {
      return Response.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    console.log('[generateChecklistFromAI] 🤖 Generating checklist for:', description);

    // Create detailed AI prompt
    const prompt = `You are an expert project manager and workflow designer for government proposal development.

Based on the following project description, generate a comprehensive checklist of tasks:

"${description}"

Generate 5-10 checklist items that would be needed to accomplish this project. For each item, provide:
1. label: A clear, actionable task name (e.g., "Upload RFP Document", "Add Teaming Partner")
2. type: One of these types:
   - "manual_check": User manually marks as complete
   - "modal_trigger": Opens a form or file upload
   - "ai_trigger": Triggers AI analysis or generation
   - "approval_request": Requires role-based approval
3. required: Boolean indicating if this task is required to progress (mark critical items as required)
4. associated_action: If type is "modal_trigger", choose from these options:
   ${AVAILABLE_MODAL_OPTIONS.map(opt => `- "${opt.value}": ${opt.description}`).join('\n   ')}
5. ai_config: If type is "ai_trigger", provide: { "action": "generate_content" | "analyze_compliance" | "evaluate_match" | "suggest_improvements" }
6. approval_config: If type is "approval_request", provide: { "approver_roles": ["admin"] }

Guidelines:
- Start with foundational tasks (info gathering, team formation)
- Include document upload tasks when appropriate
- Add AI analysis tasks for complex evaluation needs
- Include approval checkpoints for critical decisions
- Make the first 2-3 items "required: true" as gates
- Use "manual_check" for simple verification tasks
- Use "modal_trigger" when data collection or file upload is needed
- Use "ai_trigger" for analysis, evaluation, or content generation
- Use "approval_request" sparingly for critical gates

Return ONLY a valid JSON array with no additional text.`;

    // Call AI with structured schema
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                type: { 
                  type: "string",
                  enum: ["manual_check", "modal_trigger", "ai_trigger", "approval_request"]
                },
                required: { type: "boolean" },
                associated_action: { type: "string" },
                ai_config: {
                  type: "object",
                  properties: {
                    action: { type: "string" }
                  }
                },
                approval_config: {
                  type: "object",
                  properties: {
                    approver_roles: {
                      type: "array",
                      items: { type: "string" }
                    }
                  }
                }
              },
              required: ["label", "type", "required"]
            }
          }
        },
        required: ["items"]
      }
    });

    console.log('[generateChecklistFromAI] ✅ AI response received');

    // Validate and process the generated items
    const generatedItems = response?.items || [];
    
    if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
      return Response.json(
        { error: 'AI failed to generate valid checklist items' },
        { status: 500 }
      );
    }

    // Validate and clean up items
    const validatedItems = generatedItems.map((item, index) => {
      const validItem = {
        id: `ai_item_${Date.now()}_${index}`,
        label: item.label || 'Untitled Task',
        type: item.type || 'manual_check',
        required: item.required || false,
        order: index,
        associated_action: null,
        ai_config: null,
        approval_config: null
      };

      // Validate associated_action for modal_trigger
      if (validItem.type === 'modal_trigger' && item.associated_action) {
        const validAction = AVAILABLE_MODAL_OPTIONS.find(
          opt => opt.value === item.associated_action
        );
        if (validAction) {
          validItem.associated_action = item.associated_action;
        }
      }

      // Add ai_config for ai_trigger
      if (validItem.type === 'ai_trigger' && item.ai_config) {
        validItem.ai_config = {
          action: item.ai_config.action || 'generate_content'
        };
      }

      // Add approval_config for approval_request
      if (validItem.type === 'approval_request' && item.approval_config) {
        validItem.approval_config = {
          approver_roles: item.approval_config.approver_roles || ['admin']
        };
      }

      return validItem;
    });

    console.log('[generateChecklistFromAI] 📋 Generated', validatedItems.length, 'checklist items');

    return Response.json({
      success: true,
      items: validatedItems,
      count: validatedItems.length
    });

  } catch (error) {
    console.error('[generateChecklistFromAI] ❌ Error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate checklist' },
      { status: 500 }
    );
  }
});