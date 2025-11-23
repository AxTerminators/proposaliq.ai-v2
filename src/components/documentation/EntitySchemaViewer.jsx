import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Database,
  Copy,
  CheckCircle2,
  Download
} from "lucide-react";

// Common entity names in the system
const ENTITY_NAMES = [
  "Proposal",
  "ProposalSection",
  "ProposalTask",
  "ProposalResource",
  "Organization",
  "User",
  "TeamingPartner",
  "PastPerformanceRecord",
  "KeyPersonnel",
  "SolicitationDocument",
  "CalendarEvent",
  "Discussion",
  "DiscussionComment",
  "Notification",
  "SystemLog",
  "Subscription",
  "TokenUsage",
  "KanbanConfig",
  "UserGuide",
  "TutorialVideo",
  "FAQItem"
];

export default function EntitySchemaViewer({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('Proposal');
  const [copiedSchema, setCopiedSchema] = useState(null);

  // Fetch schema for selected entity
  const { data: schema, isLoading } = useQuery({
    queryKey: ['entity-schema', selectedEntity],
    queryFn: async () => {
      try {
        return await base44.entities[selectedEntity].schema();
      } catch (error) {
        console.error('Error fetching schema:', error);
        return null;
      }
    },
    enabled: !!selectedEntity,
    staleTime: 300000
  });

  const filteredEntities = ENTITY_NAMES.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copySchema = () => {
    if (schema) {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopiedSchema(selectedEntity);
      setTimeout(() => setCopiedSchema(null), 2000);
    }
  };

  const downloadSchema = () => {
    if (schema) {
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEntity}-schema.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Entity Schema Reference
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Browse all entity schemas and their field definitions
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Entity List */}
            <div className="md:col-span-1">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search entities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Card className="max-h-[600px] overflow-y-auto">
                <CardContent className="p-2 space-y-1">
                  {filteredEntities.map((entityName) => (
                    <button
                      key={entityName}
                      onClick={() => setSelectedEntity(entityName)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedEntity === entityName
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {entityName}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Schema Display */}
            <div className="md:col-span-2">
              {selectedEntity && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedEntity} Schema</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          JSON Schema definition
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copySchema}
                          disabled={!schema}
                        >
                          {copiedSchema === selectedEntity ? (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadSchema}
                          disabled={!schema}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading && (
                      <div className="text-center py-8 text-slate-600">
                        Loading schema...
                      </div>
                    )}

                    {!isLoading && !schema && (
                      <div className="text-center py-8 text-slate-600">
                        Schema not available for this entity
                      </div>
                    )}

                    {!isLoading && schema && (
                      <>
                        {/* Field Summary */}
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                          <h4 className="font-semibold text-sm mb-3">Field Summary</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-slate-600">Total Fields:</span>
                              <span className="ml-2 font-semibold">
                                {schema.properties ? Object.keys(schema.properties).length : 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-600">Required Fields:</span>
                              <span className="ml-2 font-semibold">
                                {schema.required ? schema.required.length : 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Properties Table */}
                        {schema.properties && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Properties</h4>
                            <div className="space-y-2">
                              {Object.entries(schema.properties).map(([key, prop]) => (
                                <div key={key} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono text-blue-600">{key}</code>
                                      {schema.required?.includes(key) && (
                                        <Badge className="bg-red-100 text-red-700 text-xs">
                                          required
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {prop.type || 'any'}
                                    </Badge>
                                  </div>
                                  {prop.description && (
                                    <p className="text-sm text-slate-600 mt-1">{prop.description}</p>
                                  )}
                                  {prop.enum && (
                                    <div className="mt-2">
                                      <span className="text-xs text-slate-500">Allowed values:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {prop.enum.map((val, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {val}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {prop.default !== undefined && (
                                    <div className="mt-2 text-xs text-slate-600">
                                      Default: <code className="text-slate-900">{JSON.stringify(prop.default)}</code>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Raw JSON Schema */}
                        <div className="mt-6">
                          <h4 className="font-semibold text-sm mb-2">Raw JSON Schema</h4>
                          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-slate-100">
                              <code>{JSON.stringify(schema, null, 2)}</code>
                            </pre>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}