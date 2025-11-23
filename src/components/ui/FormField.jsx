import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * SPRINT 8: Enhanced Form Field Component
 * 
 * Accessible form field wrapper with built-in validation, error handling,
 * and ARIA attributes. Supports input, textarea, and select components.
 */

export const FormField = React.forwardRef(({
  label,
  type = "text",
  error,
  success,
  required = false,
  helperText,
  className,
  inputClassName,
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  options, // For select fields
  maxLength,
  rows,
  showCharCount = false,
  showValidationIcon = true,
  ...props
}, ref) => {
  const fieldId = id || name || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  
  const [touched, setTouched] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value || '');

  React.useEffect(() => {
    if (value !== undefined) {
      setLocalValue(value);
    }
  }, [value]);

  const handleBlur = (e) => {
    setTouched(true);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    const newValue = e.target ? e.target.value : e;
    setLocalValue(newValue);
    onChange?.(e);
  };

  const showError = touched && error;
  const showSuccess = touched && success && !error;

  const ariaDescribedBy = [
    showError ? errorId : null,
    helperText ? helperId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}

      {type === 'textarea' ? (
        <Textarea
          ref={ref}
          id={fieldId}
          name={name}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          error={showError ? error : undefined}
          success={showSuccess}
          showValidationIcon={showValidationIcon}
          maxLength={maxLength}
          showCharCount={showCharCount}
          rows={rows}
          aria-describedby={ariaDescribedBy}
          className={inputClassName}
          {...props}
        />
      ) : type === 'select' ? (
        <Select
          value={localValue}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={fieldId}
            className={cn(
              showError && "border-red-500 focus:ring-red-500",
              showSuccess && "border-green-500 focus:ring-green-500",
              inputClassName
            )}
            aria-invalid={showError ? "true" : "false"}
            aria-describedby={ariaDescribedBy}
            aria-required={required ? "true" : "false"}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem 
                key={typeof option === 'string' ? option : option.value} 
                value={typeof option === 'string' ? option : option.value}
              >
                {typeof option === 'string' ? option : option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          ref={ref}
          type={type}
          id={fieldId}
          name={name}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          error={showError ? error : undefined}
          success={showSuccess}
          showValidationIcon={showValidationIcon}
          maxLength={maxLength}
          aria-describedby={ariaDescribedBy}
          className={inputClassName}
          {...props}
        />
      )}

      {helperText && !showError && (
        <p id={helperId} className="text-sm text-slate-600">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormField.displayName = "FormField";

export { FormField };