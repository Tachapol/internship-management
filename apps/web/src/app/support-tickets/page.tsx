"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { supportTicketsApi, type SupportTicket } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import {
  LifeBuoy, ChevronRight, Clock, CheckCircle2, AlertCircle,
  X, Search, RefreshCw, Filter, Tag, MessageSquare,
  Users, ShieldAlert, UserCheck,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, CardHeader, CardBody, PageHeader, EmptyState } from "../../components/ui/shared";

// ─── Constants ────────────────────────────────────────────────
const STAFF_ROLES = ["SUPER_ADMIN", "BD_TEAM", "MENTOR"];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN:      { label: "Open",      color: "bg-brand/10 text-brand border-brand/20",         icon: AlertCircle },
  IN_REVIEW: { label: "In Review", color: "bg-amber-50 text-amber-600 border-amber-200",     icon: Clock },
  RESOLVED:  { label: "Resolved",  color: "bg-success/10 text-success border-success/20",    icon: CheckCircle2 },
  CLOSED:    { label: "Closed",    color: "bg-borderGray text-text-muted border-borderGray", icon: X },
};

const PRIORITY_META: Record<string, { label: string; dot: string }> = {
  LOW:    { label: "Low",    dot: "bg-success" },
  MEDIUM: { label: "Medium", dot: "bg-amber-400" },
  HIGH:   { label: "High",   dot: "bg-danger" },
};

function formatRelative(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Row Component ────────────────────────────────────────────
function TicketRow({ ticket, returnTo }: { ticket: SupportTicket; returnTo: string }) {
  const status = STATUS_META[ticket.status] ?? STATUS_META.OPEN;
  const priority = PRIORITY_META[ticket.priority] ?? PRIORITY_META.MEDIUM;
  const StatusIcon = status.icon;

  return (
    <Link
      href={`/support/${ticket.id}?returnTo=${encodeURIComponent(returnTo)}`}
      id={`admin-ticket-${ticket.id}`}
      className="block group"
    >
      <div className="px-5 py-4 hover:bg-bgPage/50 transition-colors border-b border-borderGray last:border-0">
        <div className="flex items-start gap-4">
          {/* Priority dot */}
          <div className="mt-1.5 shrink-0">
            <div className={cn("w-2.5 h-2.5 rounded-full", priority.dot)} title={priority.label} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", status.color)}>
                <StatusIcon className="h-2.5 w-2.5" />
                {status.label}
              </span>
              {ticket.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-borderGray bg-bgInput text-text-muted capitalize">
                  <Tag className="h-2.5 w-2.5" />
                  {ticket.category}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
              {ticket.subject}
            </p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ticket.description}</p>

            <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {ticket.author.name}
                <span className="text-borderGray">·</span>
                <span className="text-text-muted/70 capitalize">{ticket.author.role.replace("_", " ").toLowerCase()}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket._count?.replies ?? 0} replies
              </span>
              <span>·</span>
              <span>{formatRelative(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Assigned + arrow */}
          <div className="shrink-0 flex items-center gap-2">
            {ticket.assignedTo ? (
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-text-muted bg-bgInput px-2 py-1 rounded-lg border border-borderGray">
                <UserCheck className="h-3 w-3 text-brand" />
                {ticket.assignedTo.name}
              </span>
            ) : (
              <span className="hidden sm:inline text-[11px] text-text-muted italic">Unassigned</span>
            )}
            <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-brand transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────
function SupportTicketsAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState(searchParams.get('q') ?? '');
  const [filterStatus, setFilterStatus] = React.useState(searchParams.get('status') ?? 'ALL');
  const [filterPriority, setFilterPriority] = React.useState(searchParams.get('priority') ?? 'ALL');
  const returnQuery = new URLSearchParams();
  if (search) returnQuery.set('q', search);
  if (filterStatus !== 'ALL') returnQuery.set('status', filterStatus);
  if (filterPriority !== 'ALL') returnQuery.set('priority', filterPriority);
  const returnTo = '/support-tickets' + (returnQuery.size ? `?${returnQuery}` : '');

  // Guard: staff only
  React.useEffect(() => {
    if (user && !STAFF_ROLES.includes(user.role)) {
      router.replace("/support");
    }
  }, [user, router]);

  const loadTickets = React.useCallback(() => {
    setLoading(true);
    setError("");
    const params: Record<string, string | undefined> = {};
    if (filterStatus !== "ALL") params.status = filterStatus;
    supportTicketsApi
      .list(params)
      .then((res) => setTickets((res as any).data ?? []))
      .catch((err: any) => setError(err?.message || "Failed to load tickets."))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filtered = React.useMemo(() => {
    let list = tickets;
    if (filterPriority !== "ALL") list = list.filter((t) => t.priority === filterPriority);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.author.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filterPriority, search]);

  // Stats
  const stats = React.useMemo(() => ({
    open: tickets.filter((t) => t.status === "OPEN").length,
    inReview: tickets.filter((t) => t.status === "IN_REVIEW").length,
    resolved: tickets.filter((t) => t.status === "RESOLVED").length,
    high: tickets.filter((t) => t.priority === "HIGH").length,
  }), [tickets]);

  if (user && !STAFF_ROLES.includes(user.role)) return null;

  return (
    <DashboardShell
      title="Support Tickets"
      breadcrumb={[{ label: "Support Tickets" }]}
    >
      <PageHeader
        title="Support Ticket Management"
        description="Review, respond to, and resolve user support requests."
        action={
          <button
            onClick={loadTickets}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-borderGray text-sm font-semibold text-text-muted hover:text-brand hover:border-brand/40 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Open", value: stats.open, color: "text-brand", bg: "bg-brand/10", icon: AlertCircle },
          { label: "In Review", value: stats.inReview, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "Resolved", value: stats.resolved, color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
          { label: "High Priority", value: stats.high, color: "text-danger", bg: "bg-danger/10", icon: ShieldAlert },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white border border-borderGray rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <p className={cn("text-xl font-black leading-none", color)}>{value}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardBody className="p-3 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              id="admin-ticket-search"
              type="text"
              placeholder="Search by subject or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted shrink-0" />
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-borderGray rounded-lg px-3 py-2 bg-bgInput text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            >
              <option value="ALL">All Status</option>
              {Object.entries(STATUS_META).map(([val, m]) => (
                <option key={val} value={val}>{m.label}</option>
              ))}
            </select>

            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-borderGray rounded-lg px-3 py-2 bg-bgInput text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            >
              <option value="ALL">All Priority</option>
              {Object.entries(PRIORITY_META).map(([val, m]) => (
                <option key={val} value={val}>{m.label}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Ticket Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-text-primary">All Tickets</h3>
          </div>
          <span className="text-xs font-bold text-text-muted bg-bgInput px-2.5 py-1 rounded-full">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>

        {loading ? (
          <div className="divide-y divide-borderGray">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-borderGray/60 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 bg-borderGray/60 rounded" />
                  <div className="h-3 w-3/4 bg-borderGray/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <ShieldAlert className="h-8 w-8 text-danger mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-3">{error}</p>
            <button onClick={loadTickets} className="text-sm text-brand hover:underline font-medium">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets found"
            description="Adjust your filters or wait for new support requests."
          />
        ) : (
          <div>
            {filtered.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} returnTo={returnTo} />
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

export default function SupportTicketsAdminPage() {
  return <React.Suspense fallback={<p role="status">Loading tickets…</p>}><SupportTicketsAdminContent /></React.Suspense>;
}
