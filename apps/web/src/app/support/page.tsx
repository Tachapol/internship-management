"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { supportTicketsApi, type SupportTicket } from "../../lib/api";
import {
  LifeBuoy, Plus, ChevronRight, Clock, CheckCircle2,
  AlertCircle, X, Send, Loader2, Search, Tag,
  MessageSquare, ArrowUpRight, ShieldAlert,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Card, CardHeader, CardBody, PageHeader, StatusBadge, EmptyState
} from "../../components/ui/shared";

// ─── Helpers ──────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN:      { label: "Open",      color: "bg-brand/10 text-brand border-brand/20",           icon: AlertCircle },
  IN_REVIEW: { label: "In Review", color: "bg-amber-50 text-amber-600 border-amber-200",       icon: Clock },
  RESOLVED:  { label: "Resolved",  color: "bg-success/10 text-success border-success/20",      icon: CheckCircle2 },
  CLOSED:    { label: "Closed",    color: "bg-borderGray text-text-muted border-borderGray",   icon: X },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "text-success bg-success/10 border-success/20" },
  MEDIUM: { label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
  HIGH:   { label: "High",   color: "text-danger bg-danger/10 border-danger/20" },
};

const CATEGORIES = ["attendance", "leave", "training", "account", "other"];

function formatRelative(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ─── Ticket Card ──────────────────────────────────────────────
function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const status = STATUS_META[ticket.status] ?? STATUS_META.OPEN;
  const priority = PRIORITY_META[ticket.priority] ?? PRIORITY_META.MEDIUM;
  const StatusIcon = status.icon;

  return (
    <Link
      href={`/support/${ticket.id}`}
      className="block group"
      id={`ticket-${ticket.id}`}
    >
      <div className="bg-white border border-borderGray rounded-xl p-4 hover:border-brand/40 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  status.color
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  priority.color
                )}
              >
                {priority.label}
              </span>
              {ticket.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-borderGray bg-bgInput text-text-muted capitalize">
                  <Tag className="h-2.5 w-2.5" />
                  {ticket.category}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary truncate group-hover:text-brand transition-colors">
              {ticket.subject}
            </p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ticket.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted shrink-0 mt-1 group-hover:text-brand transition-colors" />
        </div>

        <div className="flex items-center gap-3 mt-3 text-[11px] text-text-muted font-medium">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {ticket._count?.replies ?? 0} replies
          </span>
          <span>·</span>
          <span>{formatRelative(ticket.createdAt)}</span>
          {ticket.assignedTo && (
            <>
              <span>·</span>
              <span>Assigned to <strong className="text-text-secondary">{ticket.assignedTo.name}</strong></span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────
function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [form, setForm] = React.useState({
    subject: "",
    description: "",
    category: "other",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ticket = await supportTicketsApi.create(form);
      onCreated(ticket as unknown as SupportTicket);
    } catch (err: any) {
      setError(err?.message || "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-borderGray animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderGray">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <LifeBuoy className="h-4 w-4 text-brand" />
            </div>
            <h2 className="text-sm font-bold text-text-primary">New Support Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-danger/20 rounded-lg text-xs font-semibold text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              id="ticket-subject"
              type="text"
              placeholder="e.g. Unable to check in today"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="ticket-description"
              rows={4}
              placeholder="Describe your issue in detail…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-borderGray text-sm font-semibold text-text-muted hover:bg-bgInput transition-colors"
            >
              Cancel
            </button>
            <button
              id="ticket-submit"
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SupportPage() {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("ALL");

  const loadTickets = React.useCallback(() => {
    setLoading(true);
    setError("");
    supportTicketsApi
      .list()
      .then((res) => setTickets((res as any).data ?? []))
      .catch((err: any) => setError(err?.message || "Failed to load tickets."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  React.useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "true") {
      setShowCreate(true);
    }
  }, []);

  const handleCreated = (ticket: SupportTicket) => {
    setShowCreate(false);
    setTickets((prev) => [ticket, ...prev]);
  };

  const filtered = React.useMemo(() => {
    let list = tickets;
    if (filterStatus !== "ALL") list = list.filter((t) => t.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filterStatus, search]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: tickets.length };
    tickets.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  return (
    <DashboardShell
      title="Support"
      breadcrumb={[{ label: "Support" }]}
    >
      <PageHeader
        title="My Support Tickets"
        description="Submit and track your support requests."
        action={
          <button
            id="btn-new-ticket"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "ALL" : s)}
              className={cn(
                "flex items-center gap-3 p-3 bg-white border rounded-xl text-left transition-all hover:shadow-sm",
                filterStatus === s ? "border-brand/40 shadow-sm bg-brand/5" : "border-borderGray"
              )}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", meta.color.replace("text-", "text-").split(" ").slice(1).join(" "))}>
                <Icon className="h-4 w-4" style={{ color: "currentColor" }} />
              </div>
              <div>
                <p className="text-lg font-black text-text-primary leading-none">{statusCounts[s] ?? 0}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{meta.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + Filter */}
      <Card className="mb-4">
        <CardBody className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            />
          </div>
        </CardBody>
      </Card>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-borderGray rounded-xl p-4 animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="h-5 w-16 bg-borderGray/60 rounded-full" />
                <div className="h-5 w-16 bg-borderGray/60 rounded-full" />
              </div>
              <div className="h-4 w-2/3 bg-borderGray/60 rounded mb-2" />
              <div className="h-3 w-full bg-borderGray/40 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-danger mb-3" />
          <p className="text-sm font-semibold text-text-primary">{error}</p>
          <button onClick={loadTickets} className="mt-3 text-sm text-brand hover:underline font-medium">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={tickets.length === 0 ? "No tickets yet" : "No results found"}
          description={
            tickets.length === 0
              ? "Submit a support request and our team will respond shortly."
              : "Try adjusting your search or filters."
          }
          action={
            tickets.length === 0 ? (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
              >
                <Plus className="h-4 w-4" /> New Ticket
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* FAQ Link Banner */}
      <div className="mt-8 p-4 rounded-xl border border-borderGray bg-bgPage flex items-center justify-between gap-4">
        <p className="text-xs text-text-muted font-medium">
          Check the FAQ first — your question might already be answered.
        </p>
        <Link
          href="/faq"
          className="flex items-center gap-1 text-xs font-bold text-brand hover:underline shrink-0"
        >
          Go to FAQ <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {showCreate && (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </DashboardShell>
  );
}
