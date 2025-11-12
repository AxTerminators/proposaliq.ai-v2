import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export default function AIChecklistSuggester({ 
  isOpen, 
  onClose, 
  dataCall,
  proposal,
  onItemsGenerated 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are an expert at proposal development and data gathering.

${proposal ? `Based on this proposal:
- Proposal Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Project Type: ${proposal.project_type}
- Solicitation: ${proposal.solicitation_number}
` : ''}

Data Call Request: ${dataCall.request_title}
Description: ${dataCall.request_description || 'No description provided'}

Generate a comprehensive checklist of 8-12 specific items that should be requested. Each item should be:
- Specific and actionable
- Relevant to ${proposal ? 'this type of government proposal' : 'general content library enrichment'}
- Clear about what format/content is expected

Output as a JSON array with this structure:
[
  {
    "item_label": "Brief name of item",
    "item_description": "Detailed description of what's needed, format, and why",
    "is_required": true/false
  }
]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_label: { type: "string" },
                  item_description: { type: "string" },
                  is_required: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      return response.items || [];
    },
    onSuccess: (items) => {
      setSuggestions(items);
      setSelectedItems(items.map((_, idx) => idx)); // Select all by default
      toast.success(`${items.length} items suggested!`);
    },
    onError: (error) => {
      toast.error('AI generation failed: ' + error.message);
    }
  });

  const handleApply = () => {
    const itemsToAdd = selectedItems.map(idx => ({
      id: nanoid(),
      item_label: suggestions[idx].item_label,
      item_description: suggestions[idx].item_description,
      is_required: suggestions[idx].is_required,
      status: 'pending',
      uploaded_files: []
    }));

    onItemsGenerated(itemsToAdd);
    toast.success(`${itemsToAdd.length} items added!`);
    onClose();
    setSuggestions([]);
    setSelectedItems([]);
  };

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Checklist Suggestions
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Let AI suggest relevant checklist items based on your proposal context
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Ready to Generate Suggestions
              </h3>
              <p className="text-slate-600 mb-6">
                AI will analyze {proposal ? 'your proposal' : 'the request context'} and suggest relevant checklist items
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-100 text-purple-700">
                  {suggestions.length} items suggested
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems(suggestions.map((_, idx) => idx))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {suggestions.map((item, index) => (
                  <Card
                    key={index}
                    className={`border-2 cursor-pointer transition-all ${
                      selectedItems.includes(index)
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-200'
                    }`}
                    onClick={() => toggleItem(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(index)}
                          onCheckedChange={() => toggleItem(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">
                              {item.item_label}
                            </h4>
                            {item.is_required && (
                              <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {item.item_description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 inline mr-1 text-purple-600" />
                  {selectedItems.length} items selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuggestions([]);
                      setSelectedItems([]);
                      onClose();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={selectedItems.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}