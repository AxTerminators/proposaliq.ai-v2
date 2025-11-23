import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Copy,
  ExternalLink,
  CheckCircle2,
  Lock,
  Globe,
  Code
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_ENDPOINTS = [
  {
    category: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Authenticate user and get access token",
        authenticated: false,
        requestBody: {
          email: "string (required)",
          password: "string (required)"
        },
        response: {
          access_token: "string",
          user: "User object"
        }
      },
      {
        method: "POST",
        path: "/api/auth/signup",
        description: "Register a new user account",
        authenticated: false,
        requestBody: {
          email: "string (required)",
          password: "string (required)",
          full_name: "string (required)",
          organization_name: "string (required)"
        },
        response: {
          access_token: "string",
          user: "User object"
        }
      },
      {
        method: "GET",
        path: "/api/auth/me",
        description: "Get current authenticated user",
        authenticated: true,
        response: {
          id: "string",
          email: "string",
          full_name: "string",
          role: "string"
        }
      }
    ]
  },
  {
    category: "Proposals",
    endpoints: [
      {
        method: "GET",
        path: "/api/proposals",
        description: "List all proposals for organization",
        authenticated: true,
        queryParams: {
          status: "string (optional)",
          limit: "number (optional, default: 50)",
          offset: "number (optional, default: 0)"
        },
        response: "Array of Proposal objects"
      },
      {
        method: "POST",
        path: "/api/proposals",
        description: "Create a new proposal",
        authenticated: true,
        requestBody: {
          proposal_name: "string (required)",
          agency_name: "string (optional)",
          due_date: "date (optional)"
        },
        response: "Proposal object"
      },
      {
        method: "GET",
        path: "/api/proposals/:id",
        description: "Get proposal by ID",
        authenticated: true,
        response: "Proposal object"
      },
      {
        method: "PATCH",
        path: "/api/proposals/:id",
        description: "Update proposal",
        authenticated: true,
        requestBody: "Partial Proposal object",
        response: "Updated Proposal object"
      },
      {
        method: "DELETE",
        path: "/api/proposals/:id",
        description: "Delete proposal",
        authenticated: true,
        response: "Success message"
      }
    ]
  },
  {
    category: "AI Features",
    endpoints: [
      {
        method: "POST",
        path: "/api/ai/chat",
        description: "Send message to AI assistant",
        authenticated: true,
        requestBody: {
          message: "string (required)",
          context_files: "array of URLs (optional)"
        },
        response: {
          response: "string",
          citations: "array (optional)"
        }
      },
      {
        method: "POST",
        path: "/api/ai/generate-content",
        description: "Generate proposal content using AI",
        authenticated: true,
        requestBody: {
          proposal_id: "string (required)",
          section_type: "string (required)",
          prompt: "string (optional)"
        },
        response: {
          content: "string",
          sources: "array"
        }
      }
    ]
  }
];

const AUTH_GUIDE = `
# Authentication Guide

## Overview
GovHQ.ai uses JWT-based authentication. All API requests (except login/signup) require a valid access token.

## Getting an Access Token

### 1. Sign Up
\`\`\`javascript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123',
    full_name: 'John Doe',
    organization_name: 'Acme Corp'
  })
});

const { access_token, user } = await response.json();
\`\`\`

### 2. Login
\`\`\`javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123'
  })
});

const { access_token, user } = await response.json();
\`\`\`

## Making Authenticated Requests

Include the access token in the Authorization header:

\`\`\`javascript
const response = await fetch('/api/proposals', {
  headers: {
    'Authorization': \`Bearer \${access_token}\`,
    'Content-Type': 'application/json'
  }
});
\`\`\`

## Token Expiration
- Access tokens expire after 24 hours
- Refresh tokens are not currently supported
- Users must re-authenticate after expiration

## Security Best Practices
- Store tokens securely (httpOnly cookies recommended)
- Never expose tokens in URLs or logs
- Use HTTPS in production
- Implement token refresh before expiration
`;

export default function APIDocumentation({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const filteredEndpoints = API_ENDPOINTS.map(category => ({
    ...category,
    endpoints: category.endpoints.filter(endpoint =>
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.endpoints.length > 0);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Documentation</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Postman
              </Button>
              <Button variant="outline" size="sm">
                Download OpenAPI Spec
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs defaultValue="endpoints">
            <TabsList>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              {filteredEndpoints.map((category) => (
                <Card key={category.category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.endpoints.map((endpoint, idx) => {
                      const endpointId = `${category.category}-${idx}`;
                      const isSelected = selectedEndpoint === endpointId;
                      
                      return (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setSelectedEndpoint(isSelected ? null : endpointId)}
                            className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                className={
                                  endpoint.method === 'GET' ? 'bg-blue-600' :
                                  endpoint.method === 'POST' ? 'bg-green-600' :
                                  endpoint.method === 'PATCH' ? 'bg-amber-600' :
                                  'bg-red-600'
                                }
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="font-mono text-sm">{endpoint.path}</code>
                              {endpoint.authenticated && (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-2">{endpoint.description}</p>
                          </button>

                          {isSelected && (
                            <div className="p-4 bg-slate-50 border-t space-y-4">
                              {endpoint.authenticated && (
                                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                                  <Lock className="w-4 h-4" />
                                  Requires authentication
                                </div>
                              )}

                              {endpoint.queryParams && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Query Parameters</h4>
                                  <div className="bg-white rounded-lg p-3 space-y-1">
                                    {Object.entries(endpoint.queryParams).map(([key, value]) => (
                                      <div key={key} className="text-sm">
                                        <code className="text-blue-600">{key}</code>: {value}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {endpoint.requestBody && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                                  <div className="bg-slate-900 rounded-lg p-4 relative">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => copyCode(JSON.stringify(endpoint.requestBody, null, 2), `${endpointId}-req`)}
                                    >
                                      {copiedCode === `${endpointId}-req` ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-slate-400" />
                                      )}
                                    </Button>
                                    <pre className="text-sm text-slate-100 overflow-x-auto">
                                      <code>{JSON.stringify(endpoint.requestBody, null, 2)}</code>
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {endpoint.response && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Response</h4>
                                  <div className="bg-slate-900 rounded-lg p-4 relative">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => copyCode(
                                        typeof endpoint.response === 'string' 
                                          ? endpoint.response 
                                          : JSON.stringify(endpoint.response, null, 2), 
                                        `${endpointId}-res`
                                      )}
                                    >
                                      {copiedCode === `${endpointId}-res` ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-slate-400" />
                                      )}
                                    </Button>
                                    <pre className="text-sm text-slate-100 overflow-x-auto">
                                      <code>
                                        {typeof endpoint.response === 'string' 
                                          ? endpoint.response 
                                          : JSON.stringify(endpoint.response, null, 2)}
                                      </code>
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="authentication">
              <Card>
                <CardContent className="p-6">
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{AUTH_GUIDE}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhooks">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Webhooks Coming Soon</h3>
                    <p className="text-sm text-slate-600">
                      Webhook functionality will be available in a future release.
                    </p>
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