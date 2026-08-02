import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${filled ? "filled" : ""} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
}

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary-container text-on-primary hover:brightness-110 disabled:opacity-30 disabled:grayscale",
  secondary: "border border-outline-variant text-on-surface hover:bg-surface-container-highest disabled:opacity-40",
  danger: "border border-error text-error hover:bg-error-container hover:text-on-error-container disabled:opacity-40",
  ghost: "text-primary-container hover:bg-surface-container-highest disabled:opacity-40",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-sm rounded-lg px-lg py-md font-label-md text-label-md font-bold uppercase tracking-wide transition-all active:scale-95 ${
        fullWidth ? "w-full" : ""
      } ${buttonVariants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = "", ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <label className="mb-md block">
      {label && <span className="mb-xs block font-label-md text-label-md text-on-surface">{label}</span>}
      <input
        id={inputId}
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container ${className}`}
        {...rest}
      />
    </label>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, id, className = "", ...rest }: TextAreaProps) {
  return (
    <label className="mb-md block">
      {label && <span className="mb-xs block font-label-md text-label-md text-on-surface">{label}</span>}
      <textarea
        id={id ?? rest.name}
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container ${className}`}
        {...rest}
      />
    </label>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-outline-variant bg-surface-container p-lg ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-lg flex items-start justify-between gap-md">
      <div>
        <h1 className="font-headline text-headline-lg font-bold text-on-surface">{title}</h1>
        {subtitle && <p className="mt-xs font-label-md text-label-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mb-md flex items-center gap-xs rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
      <Icon name="error" className="!text-base" />
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-xl text-center font-label-md text-label-md text-on-surface-variant">{children}</p>;
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-xl text-primary-container">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function ListRow({ onClick, children, className = "" }: { onClick?: () => void; children: ReactNode; className?: string }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={`group block w-full rounded-xl border border-outline-variant bg-surface-container-low p-md text-left transition-all active:scale-[0.99] ${
        onClick ? "hover:bg-surface-container-high" : ""
      } ${className}`}
    >
      {children}
    </Component>
  );
}

const pillVariants = {
  active: "bg-primary-container text-on-primary-container",
  neutral: "bg-surface-container-highest text-on-surface-variant",
  error: "bg-error-container text-on-error-container",
};

export function StatusPill({ variant = "neutral", children }: { variant?: keyof typeof pillVariants; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-md py-xs font-label-sm text-label-sm ${pillVariants[variant]}`}>{children}</span>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-md py-xs font-label-md text-label-md transition-colors ${
        active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm p-0 sm:items-center sm:p-md" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[28rem] overflow-y-auto rounded-t-xl border border-outline-variant bg-surface-container p-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-lg font-headline text-headline-sm font-bold text-on-surface">{title}</h2>
        {children}
      </div>
    </div>
  );
}
