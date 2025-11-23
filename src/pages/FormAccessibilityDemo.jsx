import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AccessibleForm from "../components/forms/AccessibleForm";
import { validators, composeValidators } from "@/components/ui/FormValidation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";

/**
 * SPRINT 8: Form Accessibility & Validation Demo Page
 * 
 * Demonstrates the new accessible form components with:
 * - ARIA attributes for screen readers
 * - Real-time validation feedback
 * - Required field indicators
 * - Error announcements
 */

export default function FormAccessibilityDemo() {
  const [standaloneValue, setStandaloneValue] = React.useState("");
  const [standaloneError, setStandaloneError] = React.useState("");
  const [standaloneTouched, setStandaloneTouched] = React.useState(false);

  const handleStandaloneBlur = () => {
    setStandaloneTouched(true);
    if (!standaloneValue.trim()) {
      setStandaloneError("This field is required");
    } else if (standaloneValue.length < 3) {
      setStandaloneError("Must be at least 3 characters");
    } else {
      setStandaloneError("");
    }
  };

  const handleContactFormSubmit = async (values) => {
    console.log('Contact form submitted:', values);
    toast.success('Contact form submitted successfully!');
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleProposalFormSubmit = async (values) => {
    console.log('Proposal form submitted:', values);
    toast.success('Proposal created successfully!');
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Form Accessibility & Validation</CardTitle>
            <CardDescription className="text-base">
              Sprint 8: Enhanced forms with ARIA attributes, real-time validation, and visual feedback
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="examples" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="examples">Form Examples</TabsTrigger>
            <TabsTrigger value="standalone">Standalone Fields</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* Form Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Form Example */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                  <CardDescription>
                    Complete form with validation and ARIA support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccessibleForm
                    fields={[
                      {
                        name: 'name',
                        label: 'Full Name',
                        type: 'text',
                        required: true,
                        placeholder: 'John Doe',
                        validation: composeValidators(
                          validators.required,
                          validators.minLength(2)
                        ),
                        helperText: 'Enter your full name as it appears on official documents'
                      },
                      {
                        name: 'email',
                        label: 'Email Address',
                        type: 'email',
                        required: true,
                        placeholder: 'john@example.com',
                        validation: composeValidators(
                          validators.required,
                          validators.email
                        )
                      },
                      {
                        name: 'phone',
                        label: 'Phone Number',
                        type: 'tel',
                        placeholder: '(555) 123-4567',
                        helperText: 'Optional - for urgent follow-ups'
                      },
                      {
                        name: 'message',
                        label: 'Message',
                        type: 'textarea',
                        required: true,
                        placeholder: 'How can we help you?',
                        maxLength: 500,
                        showCharCount: true,
                        rows: 4,
                        validation: composeValidators(
                          validators.required,
                          validators.minLength(10)
                        )
                      }
                    ]}
                    onSubmit={handleContactFormSubmit}
                    submitLabel="Send Message"
                  />
                </CardContent>
              </Card>

              {/* Proposal Creation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Proposal</CardTitle>
                  <CardDescription>
                    Form with select fields and number validation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccessibleForm
                    fields={[
                      {
                        name: 'proposal_name',
                        label: 'Proposal Name',
                        type: 'text',
                        required: true,
                        placeholder: 'Q1 2025 IT Services RFP',
                        validation: validators.required
                      },
                      {
                        name: 'agency',
                        label: 'Government Agency',
                        type: 'text',
                        required: true,
                        placeholder: 'Department of Defense',
                        validation: validators.required
                      },
                      {
                        name: 'proposal_type',
                        label: 'Proposal Type',
                        type: 'select',
                        required: true,
                        options: [
                          { value: 'RFP', label: 'Request for Proposal (RFP)' },
                          { value: 'RFI', label: 'Request for Information (RFI)' },
                          { value: 'SBIR', label: 'Small Business Innovation Research (SBIR)' },
                          { value: 'GSA', label: 'GSA Schedule' }
                        ],
                        validation: validators.required
                      },
                      {
                        name: 'contract_value',
                        label: 'Estimated Contract Value',
                        type: 'number',
                        placeholder: '1000000',
                        validation: validators.positiveNumber,
                        helperText: 'Enter amount in USD'
                      },
                      {
                        name: 'due_date',
                        label: 'Due Date',
                        type: 'date',
                        required: true,
                        validation: composeValidators(
                          validators.required,
                          validators.futureDate
                        )
                      }
                    ]}
                    onSubmit={handleProposalFormSubmit}
                    submitLabel="Create Proposal"
                    onCancel={() => toast.info('Cancelled')}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Standalone Fields Tab */}
          <TabsContent value="standalone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Individual Form Field Examples</CardTitle>
                <CardDescription>
                  Standalone fields with different states and validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Field with Error */}
                <FormField
                  label="Field with Error"
                  id="error-example"
                  name="error_example"
                  value={standaloneValue}
                  onChange={(e) => {
                    setStandaloneValue(e.target.value);
                    setStandaloneError("");
                  }}
                  onBlur={handleStandaloneBlur}
                  error={standaloneTouched ? standaloneError : undefined}
                  required
                  placeholder="Type at least 3 characters..."
                  helperText="This field demonstrates real-time validation on blur"
                />

                {/* Field with Success */}
                <FormField
                  label="Valid Email Field"
                  id="success-example"
                  name="success_example"
                  type="email"
                  defaultValue="user@example.com"
                  success
                  helperText="This field shows a success state"
                />

                {/* Disabled Field */}
                <FormField
                  label="Disabled Field"
                  id="disabled-example"
                  name="disabled_example"
                  value="This field is disabled"
                  disabled
                  helperText="Users cannot interact with this field"
                />

                {/* Textarea with Character Count */}
                <FormField
                  label="Message"
                  type="textarea"
                  id="textarea-example"
                  name="textarea_example"
                  placeholder="Enter your message..."
                  maxLength={200}
                  showCharCount
                  required
                  helperText="Character count is displayed below"
                />

                {/* Select Field */}
                <FormField
                  label="Priority Level"
                  type="select"
                  id="select-example"
                  name="select_example"
                  options={[
                    'Low',
                    'Medium',
                    'High',
                    'Critical'
                  ]}
                  placeholder="Select priority..."
                  required
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">✅ ARIA Attributes</h3>
                  <ul className="space-y-2 text-sm text-slate-600 ml-4">
                    <li>• <code className="bg-slate-100 px-1 rounded">aria-invalid</code> - Marks invalid fields for screen readers</li>
                    <li>• <code className="bg-slate-100 px-1 rounded">aria-describedby</code> - Links errors and help text to inputs</li>
                    <li>• <code className="bg-slate-100 px-1 rounded">aria-required</code> - Indicates required fields</li>
                    <li>• <code className="bg-slate-100 px-1 rounded">role="alert"</code> - Announces errors immediately</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">✅ Visual Indicators</h3>
                  <ul className="space-y-2 text-sm text-slate-600 ml-4">
                    <li>• Red asterisk (*) for required fields</li>
                    <li>• Red border and icon for validation errors</li>
                    <li>• Green border and checkmark for valid fields</li>
                    <li>• Character counter for length-limited fields</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">✅ Validation Features</h3>
                  <ul className="space-y-2 text-sm text-slate-600 ml-4">
                    <li>• Real-time validation on blur</li>
                    <li>• Composable validator functions</li>
                    <li>• Built-in validators (email, URL, number, date, etc.)</li>
                    <li>• Custom validation support</li>
                    <li>• Auto-focus first error on submit</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">✅ Touch Targets</h3>
                  <ul className="space-y-2 text-sm text-slate-600 ml-4">
                    <li>• All inputs minimum 44px height</li>
                    <li>• All buttons minimum 44x44px</li>
                    <li>• Adequate spacing between elements</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Example</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs">
{`import AccessibleForm from "@/components/forms/AccessibleForm";
import { validators, composeValidators } from "@/components/ui/FormValidation";

<AccessibleForm
  fields={[
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      validation: composeValidators(
        validators.required,
        validators.email
      ),
      placeholder: 'user@example.com'
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      maxLength: 500,
      showCharCount: true,
      validation: validators.required
    }
  ]}
  onSubmit={(values) => console.log(values)}
  submitLabel="Send"
  onCancel={() => console.log('Cancelled')}
/>`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}