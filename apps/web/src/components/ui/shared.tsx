import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-borderGray/60", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-borderGray rounded-xl p-6 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-bgInput flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-text-muted" />
        </div>
      )}
      <p className="font-semibold text-text-primary text-base mb-1">{title}</p>
      {description && <p className="text-sm text-text-muted max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}
export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
        <svg className="h-7 w-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="font-semibold text-text-primary text-base mb-1">{title}</p>
      {message && <p className="text-sm text-text-muted max-w-xs mb-4">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-brand hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_SETUP: "bg-amber-100 text-amber-800 border-amber-200",
    PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
    LATE: "bg-amber-100 text-amber-800 border-amber-200",
    ABSENT: "bg-rose-100 text-rose-800 border-rose-200",
    ON_LEAVE: "bg-violet-100 text-violet-800 border-violet-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ARCHIVED: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        styles[status] ?? "bg-bgInput text-text-muted border-borderGray"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  variant,
  className,
  href,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  variant?: "orange" | "blue" | "emerald" | "violet" | "amber" | "rose" | "brand" | string;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const isInteractive = Boolean(href || onClick);

  // Icon styling: defaults to DevPlus Brand Orange unless explicitly specified
  let resolvedIconBg = iconBg || "bg-brand/10";
  let resolvedIconColor = iconColor || "text-brand";

  if (variant && !iconBg && !iconColor) {
    if (variant === "emerald") {
      resolvedIconBg = "bg-emerald-50 border border-emerald-100";
      resolvedIconColor = "text-emerald-600";
    } else if (variant === "amber") {
      resolvedIconBg = "bg-amber-50 border border-amber-100";
      resolvedIconColor = "text-amber-600";
    } else if (variant === "rose") {
      resolvedIconBg = "bg-rose-50 border border-rose-100";
      resolvedIconColor = "text-rose-600";
    } else if (variant === "violet") {
      resolvedIconBg = "bg-violet-50 border border-violet-100";
      resolvedIconColor = "text-violet-600";
    } else if (variant === "blue") {
      resolvedIconBg = "bg-blue-50 border border-blue-100";
      resolvedIconColor = "text-blue-600";
    } else {
      resolvedIconBg = "bg-brand/10 border border-brand/20";
      resolvedIconColor = "text-brand";
    }
  }

  const cardContent = (
    <div
      className={cn(
        "bg-white border border-borderGray rounded-xl p-5 flex items-center justify-between select-none transition-all duration-150",
        isInteractive &&
          "cursor-pointer hover:border-brand/60 hover:shadow-[0_6px_20px_rgba(255,140,55,0.12)] hover:-translate-y-0.5 active:scale-[0.985] active:translate-y-0 active:shadow-none group",
        className
      )}
    >
      <div className="space-y-1.5 flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-[11px] font-bold tracking-wider uppercase text-text-muted transition-colors",
              isInteractive && "group-hover:text-brand"
            )}
          >
            {label}
          </p>
          {isInteractive && (
            <ArrowUpRight className="h-3.5 w-3.5 text-brand opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
          )}
        </div>
        <p
          className={cn(
            "text-2xl font-bold text-text-primary leading-none transition-colors",
            isInteractive && "group-hover:text-brand"
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </div>
      {Icon && (
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150",
            isInteractive && "group-hover:scale-105",
            resolvedIconBg
          )}
        >
          <Icon className={cn("h-5 w-5", resolvedIconColor)} />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="block rounded-xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none cursor-pointer"
      >
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="block w-full text-left rounded-xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none cursor-pointer"
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
}

export function DataTable({
  headers,
  children,
  loading,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-borderGray bg-bgPage">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borderGray">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={headers.length} />
              ))
            : children}
        </tbody>
      </table>
      {!loading && empty && (
        <EmptyState
          title="No records found"
          description="Try adjusting your filters or create a new entry."
        />
      )}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-borderGray rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-4 border-b border-borderGray flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
