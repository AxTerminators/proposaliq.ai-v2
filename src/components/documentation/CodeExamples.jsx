import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2, Code } from "lucide-react";

const CODE_EXAMPLES = {
  authentication: [
    {
      title: "User Login",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Login user
const loginUser = async (email, password) => {
  try {
    await base44.auth.login(email, password);
    const user = await base44.auth.me();
    console.log('Logged in as:', user.full_name);
    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};`
    },
    {
      title: "User Logout",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Logout user
const logoutUser = () => {
  base44.auth.logout();
  // User will be redirected to login page
};

// Logout with specific redirect
const logoutWithRedirect = () => {
  base44.auth.logout('/welcome');
};`
    },
    {
      title: "Get Current User",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

function MyComponent() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000 // 5 minutes
  });

  if (isLoading) return <div>Loading...</div>;
  
  return <div>Welcome, {user.full_name}!</div>;
}`
    }
  ],
  entities: [
    {
      title: "List Proposals",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// List all proposals
const proposals = await base44.entities.Proposal.list();

// List with sorting (most recent first)
const recentProposals = await base44.entities.Proposal.list('-created_date', 20);

// List with filtering
const activeProposals = await base44.entities.Proposal.filter({
  status: 'in_progress'
}, '-updated_date', 10);`
    },
    {
      title: "Create Proposal",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Create a new proposal
const newProposal = await base44.entities.Proposal.create({
  proposal_name: "NASA IT Services RFP",
  agency_name: "NASA",
  project_title: "IT Infrastructure Support",
  due_date: "2025-12-31",
  status: "draft"
});

console.log('Created proposal:', newProposal.id);`
    },
    {
      title: "Update Proposal",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Update proposal
const updatedProposal = await base44.entities.Proposal.update(
  proposalId,
  {
    status: 'in_progress',
    contract_value: 5000000
  }
);`
    },
    {
      title: "Delete Proposal",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Delete proposal
await base44.entities.Proposal.delete(proposalId);
console.log('Proposal deleted');`
    },
    {
      title: "Bulk Create Entities",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

// Create multiple records at once
const tasks = await base44.entities.ProposalTask.bulkCreate([
  {
    proposal_id: proposalId,
    task_name: "Draft Executive Summary",
    status: "pending"
  },
  {
    proposal_id: proposalId,
    task_name: "Technical Approach",
    status: "pending"
  }
]);`
    }
  ],
  reactQuery: [
    {
      title: "Fetch Data with useQuery",
      language: "javascript",
      code: `import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function ProposalsList() {
  const { data: proposals, isLoading, error } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list(),
    staleTime: 300000, // 5 minutes
    cacheTime: 1800000  // 30 minutes
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {proposals.map(proposal => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
}`
    },
    {
      title: "Mutate Data with useMutation",
      language: "javascript",
      code: `import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function CreateProposalForm() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: () => {
      // Invalidate and refetch proposals list
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleSubmit = (formData) => {
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}`
    },
    {
      title: "Optimistic Updates",
      language: "javascript",
      code: `import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function UpdateProposalStatus() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => 
      base44.entities.Proposal.update(id, { status }),
    
    // Optimistically update the UI before the request completes
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['proposals'] });
      
      const previousProposals = queryClient.getQueryData(['proposals']);
      
      queryClient.setQueryData(['proposals'], (old) =>
        old.map(p => p.id === id ? { ...p, status } : p)
      );
      
      return { previousProposals };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['proposals'], context.previousProposals);
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  return { updateStatus: updateMutation.mutate };
}`
    }
  ],
  integrations: [
    {
      title: "Call AI Chat",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

const sendMessage = async (message, contextFiles = []) => {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt: message,
    add_context_from_internet: false,
    file_urls: contextFiles
  });
  
  return response;
};`
    },
    {
      title: "Generate AI Content",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

const generateContent = async (proposalId, sectionType) => {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt: \`Generate a \${sectionType} section for this proposal.\`,
    response_json_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        word_count: { type: "number" }
      }
    }
  });
  
  return response;
};`
    },
    {
      title: "Upload File",
      language: "javascript",
      code: `import { base44 } from '@/api/base44Client';

const uploadFile = async (file) => {
  const { file_url } = await base44.integrations.Core.UploadFile({
    file: file
  });
  
  console.log('File uploaded:', file_url);
  return file_url;
};`
    }
  ]
};

export default function CodeExamples({ user }) {
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Code Examples
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Ready-to-use code snippets for common operations
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="authentication">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="entities">Entity Operations</TabsTrigger>
              <TabsTrigger value="reactQuery">React Query</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            {Object.entries(CODE_EXAMPLES).map(([key, examples]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                {examples.map((example, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{example.title}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(example.code, `${key}-${idx}`)}
                        >
                          {copiedCode === `${key}-${idx}` ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-slate-100">
                          <code>{example.code}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}