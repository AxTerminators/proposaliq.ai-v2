import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, CheckSquare, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

const TEMPLATES = [
  {
    id: 'technical_capabilities',
    name: 'Technical Capabilities Package',
    description: 'Request technical documentation, certifications, and capability demonstrations',
    category: 'Technical',
    icon: '🔧',
    items: [
      { label: 'Technical Approach Document', description: 'Detailed technical solution overview', required: true },
      { label: 'Relevant Certifications', description: 'ISO, CMMI, or other quality certifications', required: true },
      { label: 'Technology Stack Overview', description: 'List of technologies, platforms, and tools', required: false },
      { label: 'Architecture Diagrams', description: 'System architecture and technical diagrams', required: false },
      { label: 'Security & Compliance Documentation', description: 'Security protocols and compliance evidence', required: true }
    ]
  },
  {
    id: 'past_performance',
    name: 'Past Performance References',
    description: 'Collect past performance data, case studies, and client references',
    category: 'Past Performance',
    icon: '🏆',
    items: [
      { label: 'Project Overview & Scope', description: 'Description of similar past projects', required: true },
      { label: 'Contract Details', description: 'Contract number, value, and period of performance', required: true },
      { label: 'Client Reference Contact', description: 'Name, title, email, and phone of client POC', required: true },
      { label: 'Outcomes & Metrics', description: 'Quantifiable results and achievements', required: true },
      { label: 'CPARS Rating (if applicable)', description: 'Government performance rating', required: false },
      { label: 'Testimonial or Feedback', description: 'Client testimonial or evaluation letter', required: false }
    ]
  },
  {
    id: 'key_personnel',
    name: 'Key Personnel Information',
    description: 'Gather resumes, bios, and personnel qualifications',
    category: 'Personnel',
    icon: '👥',
    items: [
      { label: 'Current Resume/CV', description: 'Up-to-date resume in required format', required: true },
      { label: 'Clearance Level & Expiration', description: 'Security clearance documentation', required: false },
      { label: 'Certifications & Training', description: 'Professional certifications and recent training', required: true },
      { label: 'Education Verification', description: 'Degree verification documents', required: false },
      { label: 'Professional Bio (150 words)', description: 'Executive summary bio', required: true }
    ]
  },
  {
    id: 'pricing_cost_data',
    name: 'Pricing & Cost Data',
    description: 'Request pricing information, labor rates, and cost breakdowns',
    category: 'Financial',
    icon: '💰',
    items: [
      { label: 'Labor Rate Cards', description: 'Current fully-loaded labor rates by category', required: true },
      { label: 'Indirect Rate Structure', description: 'Fringe, overhead, and G&A rates', required: true },
      { label: 'Basis of Estimate', description: 'Methodology and assumptions for pricing', required: true },
      { label: 'Subcontractor Quotes', description: 'Quotes from teaming partners or subs', required: false },
      { label: 'ODC Cost Breakdown', description: 'Travel, materials, equipment costs', required: false }
    ]
  },
  {
    id: 'compliance_certifications',
    name: 'Compliance & Certifications',
    description: 'Collect compliance documentation and certification evidence',
    category: 'Compliance',
    icon: '✅',
    items: [
      { label: 'SAM.gov Registration', description: 'Active SAM registration screenshot', required: true },
      { label: 'Small Business Certifications', description: '8(a), HUBZone, WOSB, SDVOSB certificates', required: false },
      { label: 'Quality Management System Cert', description: 'ISO 9001 or equivalent certification', required: false },
      { label: 'Cybersecurity Certifications', description: 'CMMC, FedRAMP, or other cyber certs', required: false },
      { label: 'Insurance Certificates', description: 'Liability, workers comp, etc.', required: true }
    ]
  },
  {
    id: 'project_deliverables',
    name: 'Project Deliverables & Artifacts',
    description: 'Request work samples, deliverables, and project artifacts',
    category: 'Deliverables',
    icon: '📦',
    items: [
      { label: 'Sample Deliverable #1', description: 'Representative work sample from similar project', required: true },
      { label: 'Sample Deliverable #2', description: 'Additional work sample', required: false },
      { label: 'Project Plan Template', description: 'Sample project management plan', required: false },
      { label: 'Quality Assurance Documentation', description: 'QA/QC processes and examples', required: false }
    ]
  },
  {
    id: 'teaming_agreement',
    name: 'Teaming Agreement Documents',
    description: 'Collect teaming partner agreements and commitment letters',
    category: 'Teaming',
    icon: '🤝',
    items: [
      { label: 'Signed Teaming Agreement', description: 'Executed teaming or subcontractor agreement', required: true },
      { label: 'Scope of Work (SOW)', description: 'Detailed scope for partner/sub work', required: true },
      { label: 'Capability Statement', description: 'Partner capability statement', required: true },
      { label: 'Commitment Letter', description: 'Letter committing to the partnership', required: true },
      { label: 'Past Performance Summary', description: 'Partner past performance documentation', required: false }
    ]
  },
  {
    id: 'internal_review',
    name: 'Internal Review Materials',
    description: 'Request documents for internal team review and coordination',
    category: 'Internal',
    icon: '📋',
    items: [
      { label: 'Draft Content for Review', description: 'Current draft of assigned section', required: true },
      { label: 'Supporting Data/Research', description: 'Research materials and references used', required: false },
      { label: 'Questions or Blockers', description: 'List of open questions or issues', required: false },
      { label: 'Recommended Approach', description: 'Your recommendation for this section', required: false }
    ]
  }
];

export default function DataCallTemplateLibrary({ onSelectTemplate, onClose }) {
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const categories = ['all', ...new Set(TEMPLATES.map(t => t.category))];

  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const handleUseTemplate = (template) => {
    const checklistItems = template.items.map(item => ({
      id: nanoid(),
      item_label: item.label,
      item_description: item.description,
      is_required: item.required,
      status: 'pending',
      uploaded_files: []
    }));

    onSelectTemplate({
      request_title: template.name,
      request_description: template.description,
      checklist_items: checklistItems
    });

    toast.success(`✅ Template "${template.name}" applied!`);
    onClose();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          Data Call Templates
        </h3>
        <p className="text-sm text-slate-600">
          Pre-built checklists for common data requests
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="capitalize"
          >
            {cat === 'all' ? 'All Templates' : cat}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id}
            className="border-2 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => handleUseTemplate(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{template.icon}</span>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>{template.items.length} checklist items</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-red-600">★</span>
                  <span>{template.items.filter(i => i.required).length} required items</span>
                </div>
              </div>

              <Button
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseTemplate(template);
                }}
              >
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Templates provide a starting point. You can customize the checklist items after selecting a template.
        </p>
      </div>
    </div>
  );
}