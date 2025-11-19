# Phase 5 Integration Guide - Advanced Data Operations

## Quick Start

Phase 5 adds powerful data manipulation capabilities to your modals. Here's how to use them.

---

## 1. Conditional Entity Operations

Execute entity operations only when specific conditions are met.

### Configuration Steps

1. **Navigate to Operations Tab**
   - Open Modal Builder
   - Go to "Operations" tab
   - Add or edit an entity operation

2. **Add Conditions**
   - Click "Add Condition" in the Conditional Execution section
   - Select the form field to check
   - Choose an operator
   - Enter the comparison value (if needed)

3. **Set Logic Type**
   - If multiple conditions: choose AND (all must match) or OR (any can match)

### Example: Create Partner Only If New

```javascript
// In Modal Builder UI:
Operation Type: Create
Entity: TeamingPartner
Conditions:
  - Field: "Partner Type" | Operator: equals | Value: "new"
```

**Result:** TeamingPartner only created when user selects "new" as partner type.

---

## 2. Update Operations

Update existing entities by resolving their IDs from form data or context.

### Method 1: ID from Form Field

**Use Case:** User selects an existing entity from a dropdown

**Steps:**
1. Add a select field that contains entity IDs as values
2. In Operations tab, set operation type to "Update"
3. Configure ID Resolution:
   - Method: "From Form Field"
   - Select the field containing the ID

**Example:**
```javascript
// Select field options
options: [
  { label: "Project Alpha", value: "proj_123" },
  { label: "Project Beta", value: "proj_456" }
]

// Operation config
idResolution: {
  method: "field",
  fieldId: "project_select_field_id"
}
```

### Method 2: ID from Context

**Use Case:** Modal opened with proposal context, want to update that proposal

**Steps:**
1. In Operations tab, set operation type to "Update"
2. Configure ID Resolution:
   - Method: "From Context Data"
   - Enter context path (e.g., "proposal.id")

**Example:**
```javascript
idResolution: {
  method: "context",
  contextPath: "proposal.id"
}
```

**Available Context Paths:**
- `proposal.id` - Current proposal ID
- `organization.id` - Current organization ID
- `user.email` - Current user email

---

## 3. Advanced Field Mappings

### 3.1 Nested Object Mapping

**Use Case:** Store address fields in a nested object structure

**Steps:**
1. Select a field in the canvas
2. Open Advanced Settings
3. Expand "Advanced Mapping Options"
4. Check "Map to nested object path"
5. Enter path: `address.street`

**Example:**
```javascript
// Fields
street: "123 Main St"
city: "Boston"
state: "MA"

// With nested paths
street → address.street
city → address.city
state → address.state

// Results in entity
{
  address: {
    street: "123 Main St",
    city: "Boston",
    state: "MA"
  }
}
```

### 3.2 Array Field Mapping

**Use Case:** Multi-select field maps to array attribute

**Steps:**
1. Create a select field with multiple=true
2. In Advanced Settings → Advanced Mapping
3. Check "This field produces an array of values"

### 3.3 Computed Values

**Use Case:** Automatically combine first and last name into full name

**Steps:**
1. Create source fields (first_name, last_name)
2. Create computed field (full_name)
3. In Advanced Settings → Advanced Mapping
4. Check "Compute value from other fields"
5. Add source fields
6. Select computation type: "Concatenate"
7. Set separator: " "

**Computation Types:**

#### Concatenate
Joins text fields with a separator.
```javascript
first_name: "John"
last_name: "Doe"
separator: " "
→ "John Doe"
```

#### Sum
Adds numeric values.
```javascript
labor_cost: 50000
materials_cost: 30000
→ 80000
```

#### Average
Calculates mean of numbers.
```javascript
score1: 85
score2: 90
score3: 95
→ 90
```

#### Custom Expression
Simple string substitution expressions.
```javascript
computedExpression: "field_123 + ' - ' + field_456"
field_123: "Phase 1"
field_456: "Complete"
→ "Phase 1 - Complete"
```

---

## 4. Complete Example Workflow

### Scenario: Partner Onboarding Modal

**Goal:** Collect partner info, create/update entities conditionally

**Configuration:**

```javascript
// Fields
1. partner_name (text)
2. partner_type (select: "new" or "existing")
3. existing_partner_id (select, showIf: partner_type = "existing")
4. street (text)
5. city (text)
6. contact_first_name (text)
7. contact_last_name (text)
8. contact_full_name (computed from 6 & 7)

// Advanced Mappings
street → nestedPath: "address.street"
city → nestedPath: "address.city"
contact_full_name → computed: concat(contact_first_name, contact_last_name)

// Entity Operations

Operation 1: Create TeamingPartner
  Conditions:
    - partner_type equals "new"
  Field Mappings:
    - partner_name → partner_name
    - address.street → address (nested)
    - contact_full_name → poc_name

Operation 2: Update TeamingPartner
  Conditions:
    - partner_type equals "existing"
  ID Resolution:
    - method: field
    - fieldId: existing_partner_id
  Field Mappings:
    - contact_full_name → poc_name
```

**Result:**
- If user selects "new": creates new TeamingPartner with computed full name and nested address
- If user selects "existing": updates selected partner's contact name only

---

## 5. Best Practices

### Condition Design
✅ **DO:**
- Use simple, clear conditions
- Test both true and false cases
- Provide user feedback when operations are skipped

❌ **DON'T:**
- Create circular dependencies between fields
- Use complex nested conditions without testing
- Assume conditions will always evaluate correctly

### ID Resolution
✅ **DO:**
- Validate IDs exist before showing update options
- Use context paths for implicit entity references
- Handle missing ID errors gracefully

❌ **DON'T:**
- Hardcode entity IDs
- Mix field and context resolution in same operation
- Update without confirming entity exists

### Computed Values
✅ **DO:**
- Use for simple combinations (name, address, totals)
- Validate source fields are filled before computing
- Test with various input combinations

❌ **DON'T:**
- Use for complex business logic (use backend functions)
- Chain multiple computed fields (can cause race conditions)
- Rely on custom expressions for critical calculations

### Nested Mappings
✅ **DO:**
- Use for logically grouped data (addresses, contacts)
- Keep nesting depth reasonable (2-3 levels max)
- Document nested structure for other developers

❌ **DON'T:**
- Over-nest (makes debugging hard)
- Mix nested and flat attributes for same logical group
- Create deeply nested structures (> 3 levels)

---

## 6. Troubleshooting

### Operation Not Executing
**Check:**
1. Are conditions configured correctly?
2. Do condition field IDs match actual fields?
3. Is conditionLogic set properly (AND vs OR)?
4. Check browser console for condition evaluation logs

### Update Fails
**Check:**
1. Is ID resolution configured?
2. Does the field/context path exist?
3. Is the entity ID valid?
4. Does user have permission to update?

### Computed Value Empty
**Check:**
1. Are all source fields filled?
2. Is computation type appropriate for data types?
3. Check console for computation errors
4. Verify field IDs match in configuration

### Nested Value Not Saving
**Check:**
1. Is nested path correctly formatted (dot notation)?
2. Does target entity support nested attributes?
3. Check entity schema for field compatibility

---

## 7. Migration from Previous Phases

If you have existing modals from Phases 3 or 4:

### Add Conditions to Existing Operations
1. Open modal in builder
2. Go to Operations tab
3. Click operation to edit
4. Scroll to "Conditional Execution" section
5. Add conditions as needed
6. Save

### Convert Create to Update
1. Change operation type from "Create" to "Update"
2. Configure ID Resolution
3. Adjust field mappings if needed
4. Test thoroughly before deployment

### Enable Advanced Mappings
1. Edit field in canvas
2. Open Advanced Settings
3. Configure nested/array/computed options
4. Save and test

---

## 8. API Reference

### Condition Object
```typescript
{
  id: string;
  field: string;           // Field ID to check
  operator: ConditionOperator;
  value: any;              // Comparison value
}

type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'is_empty' 
  | 'is_not_empty' 
  | 'greater_than' 
  | 'less_than';
```

### ID Resolution Object
```typescript
{
  method: 'field' | 'context';
  fieldId?: string;        // For method: 'field'
  contextPath?: string;    // For method: 'context'
}
```

### Advanced Mapping Object
```typescript
{
  isNested: boolean;
  nestedPath?: string;
  isArray: boolean;
  isComputed: boolean;
  computedFields?: string[];
  computationType?: 'concat' | 'sum' | 'average' | 'custom';
  computationSeparator?: string;
  computedExpression?: string;
}
```

---

## 9. Support

For questions or issues:
1. Check Phase 5 Summary document
2. Review browser console logs
3. Test in preview mode before deploying
4. Contact development team for complex scenarios

---

**Last Updated:** 2025-01-19  
**Phase:** 5.0  
**Status:** Production Ready