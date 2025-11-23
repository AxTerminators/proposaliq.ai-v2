import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, HelpCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function FAQManager({ user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    tags: '',
    priority: 0
  });

  const { data: faqItems = [] } = useQuery({
    queryKey: ['faq-items'],
    queryFn: () => base44.entities.FAQItem.filter({}, '-priority')
  });

  const createFAQMutation = useMutation({
    mutationFn: (data) => {
      return base44.entities.FAQItem.create({
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(t => t)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-items'] });
      setShowDialog(false);
      resetForm();
      toast.success('FAQ item created');
    }
  });

  const updateFAQMutation = useMutation({
    mutationFn: ({ id, data }) => {
      return base44.entities.FAQItem.update(id, {
        ...data,
        tags: typeof data.tags === 'string'
          ? data.tags.split(',').map(t => t.trim()).filter(t => t)
          : data.tags
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-items'] });
      setShowDialog(false);
      resetForm();
      toast.success('FAQ item updated');
    }
  });

  const deleteFAQMutation = useMutation({
    mutationFn: (id) => base44.entities.FAQItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-items'] });
      toast.success('FAQ item deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'general',
      tags: '',
      priority: 0
    });
    setEditingFAQ(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingFAQ) {
      updateFAQMutation.mutate({ id: editingFAQ.id, data: formData });
    } else {
      createFAQMutation.mutate(formData);
    }
  };

  const handleEdit = (faq) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: Array.isArray(faq.tags) ? faq.tags.join(', ') : '',
      priority: faq.priority || 0
    });
    setShowDialog(true);
  };

  const filteredFAQ = filterCategory === 'all' 
    ? faqItems 
    : faqItems.filter(f => f.category === filterCategory);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FAQ Items</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {faqItems.filter(f => f.is_published).length} published items
              </p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="proposals">Proposals</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
                <SelectItem value="ai_features">AI Features</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="permissions">Permissions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No FAQ items yet</p>
                <Button onClick={() => setShowDialog(true)} className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First FAQ
                </Button>
              </div>
            ) : (
              filteredFAQ.map((faq) => (
                <div key={faq.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {faq.category.replace('_', ' ')}
                        </Badge>
                        {faq.priority > 0 && (
                          <Badge className="bg-amber-600 text-white">
                            Priority: {faq.priority}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                      <div className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{faq.answer}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {faq.helpful_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="w-4 h-4" />
                          {faq.not_helpful_count || 0}
                        </span>
                        <span>{faq.view_count || 0} views</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(faq)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this FAQ?')) {
                            deleteFAQMutation.mutate(faq.id);
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFAQ ? 'Edit FAQ Item' : 'Add FAQ Item'}
            </DialogTitle>
            <DialogDescription>
              Add frequently asked questions to help users
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Question
              </label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="How do I create my first proposal?"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Answer (Markdown supported)
              </label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Write a clear, helpful answer..."
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="proposals">Proposals</SelectItem>
                    <SelectItem value="kanban">Kanban</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="ai_features">AI Features</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="permissions">Permissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Priority (0-10)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="login, password, account"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingFAQ ? 'Update' : 'Add'} FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}