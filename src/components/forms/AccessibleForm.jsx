import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { useFormValidation, validators, composeValidators } from "@/components/ui/FormValidation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 8: Accessible Form Component with Built-in Validation
 * 
 * Example usage:
 * 
 * <AccessibleForm
 *   fields={[
 *     { name: 'name', label: 'Full Name', type: 'text', required: true, validation: validators.required },
 *     { name: 'email', label: 'Email', type: 'email', required: true, validation: composeValidators(validators.required, validators.email) },
 *     { name: 'bio', label: 'Bio', type: 'textarea', maxLength: 500, showCharCount: true }
 *   ]}
 *   onSubmit={(values) => console.log(values)}
 *   submitLabel="Save"
 * />
 */

export default function AccessibleForm({
  fields = [],
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onCancel,
  initialValues = {},
  className,
  showSuccessMessage = true,
  successMessage = "Form submitted successfully!",
  isLoading = false
}) {
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Build validation rules from fields
  const validationRules = React.useMemo(() => {
    const rules = {};
    fields.forEach(field => {
      if (field.validation) {
        rules[field.name] = field.validation;
      } else if (field.required) {
        rules[field.name] = validators.required;
      }
    });
    return rules;
  }, [fields]);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset
  } = useFormValidation(initialValues, validationRules);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitSuccess(false);

    // Validate all fields
    const isValid = validateAll();
    
    if (!isValid) {
      // Find first error field and focus it
      const firstErrorField = fields.find(f => errors[f.name]);
      if (firstErrorField) {
        document.getElementById(firstErrorField.name)?.focus();
      }
      return;
    }

    try {
      await onSubmit(values);
      
      if (showSuccessMessage) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleReset = () => {
    reset();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)} noValidate>
      {/* Success Message */}
      {submitSuccess && (
        <div 
          className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-900 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-5">
        {fields.map((field) => {
          const fieldError = touched[field.name] ? errors[field.name] : undefined;
          const fieldSuccess = touched[field.name] && !errors[field.name] && values[field.name];

          return (
            <FormField
              key={field.name}
              ref={field.name === fields[0].name ? ref : undefined}
              label={field.label}
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target ? e.target.value : e)}
              onBlur={() => handleBlur(field.name)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled || field.disabled}
              error={fieldError}
              success={fieldSuccess}
              helperText={field.helperText}
              options={field.options}
              maxLength={field.maxLength}
              rows={field.rows}
              showCharCount={field.showCharCount}
              showValidationIcon={field.showValidationIcon !== false}
              inputClassName={field.inputClassName}
              {...field.props}
            />
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="min-h-[44px] bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}