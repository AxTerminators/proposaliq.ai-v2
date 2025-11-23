import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2 } from "lucide-react"

const Textarea = React.forwardRef(({ 
  className, 
  error,
  success,
  required,
  showValidationIcon = true,
  maxLength,
  showCharCount = false,
  ...props 
}, ref) => {
  const [charCount, setCharCount] = React.useState(0);
  const errorId = error ? `${props.id || 'textarea'}-error` : undefined;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    props.onChange?.(e);
  };

  return (
    <div className="relative w-full">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          hasError && "border-red-500 focus-visible:ring-red-500",
          hasSuccess && "border-green-500 focus-visible:ring-green-500",
          !hasError && !hasSuccess && "border-slate-200 focus-visible:ring-slate-950",
          className
        )}
        ref={ref}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={errorId}
        aria-required={required ? "true" : "false"}
        maxLength={maxLength}
        onChange={handleChange}
        {...props}
      />
      {showValidationIcon && hasError && (
        <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" aria-hidden="true" />
      )}
      {showValidationIcon && hasSuccess && (
        <CheckCircle2 className="absolute right-3 top-3 w-5 h-5 text-green-500" aria-hidden="true" />
      )}
      {showCharCount && maxLength && (
        <p className="text-xs text-slate-500 mt-1 text-right">
          {charCount} / {maxLength}
        </p>
      )}
      {hasError && error && (
        <p id={errorId} className="text-sm text-red-600 mt-1.5 flex items-start gap-1" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }