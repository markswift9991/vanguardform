import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

const baseInput =
  "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export function inputClasses(hasError: boolean) {
  return `${baseInput} ${hasError ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`;
}

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hasError?: boolean;
  maxLength?: number;
}

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  hasError,
  maxLength,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={inputClasses(!!hasError)}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, hasError, rows = 4 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClasses(!!hasError)} resize-none`}
    />
  );
}
