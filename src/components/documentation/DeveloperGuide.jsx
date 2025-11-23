import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  Boxes,
  GitBranch,
  TestTube,
  BookOpen
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const ARCHITECTURE_DOC = `
# System Architecture

## Technology Stack

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Build Tool**: Vite

### Backend
- **Platform**: Base44 Backend-as-a-Service
- **Database**: Supabase (PostgreSQL)
- **Serverless Functions**: Deno Deploy
- **Authentication**: JWT-based auth via Base44
- **File Storage**: Supabase Storage

### Key Libraries
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Rich Text**: react-quill
- **Charts**: recharts
- **Forms**: react-hook-form
- **Drag & Drop**: @hello-pangea/dnd

## Architecture Layers

### 1. Presentation Layer
- React components organized by feature
- Mobile-first responsive design
- Accessibility (WCAG AA compliance)

### 2. State Management Layer
- React Query for API data caching
- Local component state with useState/useReducer
- Context API for global state (OrganizationContext)

### 3. API/Integration Layer
- Base44 SDK client (\`@/api/base44Client\`)
- Entity operations (CRUD)
- AI integrations (Core.InvokeLLM)
- File uploads

### 4. Backend Layer (Base44)
- Entity definitions (JSON schemas)
- Backend functions (Deno)
- Authentication & authorization
- Database operations

## Data Flow

\`\`\`
User Action → React Component → API Call (base44 SDK) → Backend Function/Entity Operation → Database → Response → React Query Cache → Component Update
\`\`\`

## Key Design Patterns

### 1. Component Composition
- Small, focused components
- Reusable UI primitives from shadcn/ui
- Custom components wrap primitives

### 2. Server State with React Query
- \`useQuery\` for data fetching
- \`useMutation\` for data modifications
- Optimistic updates for better UX
- Automatic caching and refetching

### 3. Feature-Based Organization
\`\`\`
/pages           - Top-level routes
/components      - Reusable components
  /ui            - Base UI primitives
  /proposals     - Proposal-specific
  /collaboration - Collaboration features
  /mobile        - Mobile-optimized
\`\`\`
`;

const COMPONENT_LIBRARY = `
# Component Library

## UI Primitives (\`@/components/ui\`)

All base components are built on Radix UI primitives and styled with Tailwind CSS.

### Button
\`\`\`jsx
import { Button } from "@/components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
\`\`\`

### Card
\`\`\`jsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
\`\`\`

### Dialog (Modal)
\`\`\`jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
\`\`\`

### Form Components
\`\`\`jsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

<Input placeholder="Enter text" />
<Textarea placeholder="Enter description" />
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Choose" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
\`\`\`

## Feature Components

### ProposalsKanban
Drag-and-drop Kanban board for proposals.

### ProposalBuilder
Multi-phase proposal creation wizard.

### NotificationCenter
Real-time notification system.

### GlobalSearch
Organization-wide search functionality.

## Mobile Components (\`@/components/mobile\`)

Mobile-optimized versions of complex components:
- \`MobileKanbanView\`
- \`MobileNavigation\`
- \`MobileProposalBuilder\`
`;

const STATE_MANAGEMENT = `
# State Management Guide

## React Query for Server State

React Query is our primary tool for managing server state (API data).

### Basic Query
\`\`\`jsx
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list(),
    staleTime: 300000,  // 5 minutes
    cacheTime: 1800000  // 30 minutes
  });
}
\`\`\`

### Mutations
\`\`\`jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateButton() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });
  
  return <button onClick={() => mutation.mutate(data)}>Create</button>;
}
\`\`\`

## Local State

Use React's built-in state management for UI state:

### Component State
\`\`\`jsx
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({});
\`\`\`

### useReducer for Complex State
\`\`\`jsx
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

## Global State

### Context API
\`\`\`jsx
import { OrganizationProvider, useOrganization } from '@/components/layout/OrganizationContext';

// In root
<OrganizationProvider>
  <App />
</OrganizationProvider>

// In components
const { organization, user, subscription } = useOrganization();
\`\`\`

## Best Practices

1. **Server state in React Query**, UI state in local state
2. **Cache aggressively** with appropriate staleTime
3. **Invalidate queries** after mutations
4. **Use optimistic updates** for better UX
5. **Avoid prop drilling** - use Context when needed
`;

const TESTING_GUIDE = `
# Testing Strategy

## Testing Philosophy

- Focus on user-facing functionality
- Test behavior, not implementation
- Prioritize integration tests over unit tests
- Use manual testing for complex workflows

## Manual Testing Checklist

### Core Functionality
- [ ] User registration and login
- [ ] Create/edit/delete proposals
- [ ] Kanban drag and drop
- [ ] AI content generation
- [ ] File uploads
- [ ] Export to PDF/Word

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Device Testing
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (iPad, Android)
- [ ] Mobile (iPhone, Android)

### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader (NVDA/JAWS)
- [ ] Color contrast
- [ ] Touch target sizes

## Performance Testing

### Lighthouse Audits
Run Lighthouse on key pages:
\`\`\`bash
npm run lighthouse
\`\`\`

Target scores:
- Performance: >90
- Accessibility: >90
- Best Practices: >90

### Load Testing
Use k6 or JMeter for load testing:
- Simulate 100+ concurrent users
- Monitor API response times
- Check database performance
`;

const CONTRIBUTING_GUIDE = `
# Contributing Guide

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Getting Started
\`\`\`bash
# Clone repository
git clone <repo-url>
cd govhq-ai

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## Code Style

### JavaScript/React
- Use functional components
- Prefer hooks over classes
- Keep components small (<200 lines)
- Use descriptive variable names

### File Organization
\`\`\`
pages/           # Route components (flat structure)
components/      # Reusable components (can have folders)
  /ui            # Base UI primitives
  /feature       # Feature-specific components
entities/        # Entity schemas (JSON)
functions/       # Backend functions (Deno)
\`\`\`

### Naming Conventions
- **Components**: PascalCase (e.g., \`ProposalCard.js\`)
- **Functions**: camelCase (e.g., \`fetchProposals\`)
- **Constants**: UPPER_SNAKE_CASE (e.g., \`MAX_UPLOAD_SIZE\`)
- **Files**: Match component name (e.g., \`ProposalCard.js\`)

## Git Workflow

### Branch Naming
\`\`\`
feature/description  # New features
fix/description      # Bug fixes
docs/description     # Documentation
refactor/description # Code refactoring
\`\`\`

### Commit Messages
\`\`\`
feat: Add proposal export feature
fix: Resolve Kanban drag bug
docs: Update API documentation
refactor: Optimize proposal list query
\`\`\`

## Pull Request Process

1. Create feature branch from \`main\`
2. Make changes and commit
3. Push branch and create PR
4. Request review
5. Address feedback
6. Merge after approval

## Code Review Checklist

- [ ] Code follows style guide
- [ ] Components are properly tested
- [ ] No console.log statements
- [ ] Accessibility considered
- [ ] Mobile responsive
- [ ] Documentation updated
`;

export default function DeveloperGuide({ user }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Developer Guide
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Internal documentation for developers
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="architecture">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="state">State Mgmt</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="contributing">Contributing</TabsTrigger>
            </TabsList>

            <TabsContent value="architecture">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    System Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{ARCHITECTURE_DOC}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="components">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-green-600" />
                    Component Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{COMPONENT_LIBRARY}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="state">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-purple-600" />
                    State Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{STATE_MANAGEMENT}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-amber-600" />
                    Testing Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{TESTING_GUIDE}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributing">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Contributing Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{CONTRIBUTING_GUIDE}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}