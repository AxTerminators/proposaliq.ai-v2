import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2 } from "lucide-react"

const Input = React.forwardRef(({ 
  className, 
  type, 
  error,
  success,
  required,
  showValidationIcon = true,
  ...props 
}, ref) => {
  const errorId = error ? `${props.id || 'input'}-error` : undefined;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  return (
    <div className="relative w-full">
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
          hasError && "border-red-500 focus-visible:ring-red-500 pr-10",
          hasSuccess && showValidationIcon && "border-green-500 focus-visible:ring-green-500 pr-10",
          !hasError && !hasSuccess && "border-slate-200 focus-visible:ring-slate-950",
          className
        )}
        ref={ref}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={errorId}
        aria-required={required ? "true" : "false"}
        {...props}
      />
      {showValidationIcon && hasError && (
        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" aria-hidden="true" />
      )}
      {showValidationIcon && hasSuccess && (
        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" aria-hidden="true" />
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
Input.displayName = "Input"

export { Input }