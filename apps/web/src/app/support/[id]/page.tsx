"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "../../../components/layout/dashboard-shell";
import { supportTicketsApi, usersApi, type SupportTicketDetail, type SupportTicketReply } from "../../../lib/api";
import type { User } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import {
  ChevronLeft, Send, Loader2, AlertCircle, Clock,
  CheckCircle2, X, UserCircle2, ShieldCheck, Tag, RefreshCw,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Card, CardHeader, CardBody } from "../../../components/ui/shared";

// ─── Helpers ──────────────────────────────────────────────────
const STAFF_ROLES = ["SUPER_ADMIN", "BD_TEAM", "MENTOR"];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN:      { label: "Open",      color: "bg-brand/10 text-brand border-brand/20",         icon: AlertCircle },
  IN_REVIEW: { label: "In Review", color: "bg-amber-50 text-amber-600 border-amber-200",     icon: Clock },
  RESOLVED:  { label: "Resolved",  color: "bg-success/10 text-success border-success/20",    icon: CheckCircle2 },
  CLOSED:    { label: "Closed",    color: "bg-borderGray text-text-muted border-borderGray", icon: X },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// ─── Reply Bubble ─────────────────────────────────────────────
function ReplyBubble({ reply, isOwn }: { reply: SupportTicketReply; isOwn: boolean }) {
  const isStaff = reply.isStaff;

  return (
    <div className={cn("flex gap-3 animate-in fade-in duration-200", isOwn ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
          isStaff ? "bg-brand/15 text-brand" : "bg-bgInput text-text-muted"
        )}
      >
        {isStaff ? <ShieldCheck className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[75%] space-y-1", isOwn ? "items-end" : "items-start", "flex flex-col")}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-text-muted">
            {reply.author.name}
          </span>
          {isStaff && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              Staff
            </span>
          )}
        </div>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isOwn
              ? "bg-brand text-white rounded-tr-sm"
              : isStaff
              ? "bg-brand/5 text-text-primary border border-brand/20 rounded-tl-sm"
              : "bg-white text-text-primary border border-borderGray rounded-tl-sm"
          )}
        >
          {reply.message}
        </div>
        <span className="text-[10px] text-text-muted font-medium">{formatTime(reply.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Status Change Dropdown ───────────────────────────────────
function StatusChanger({
  currentStatus,
  ticketId,
  onChanged,
}: {
  currentStatus: string;
  ticketId: string;
  onChanged: (s: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleChange = async (status: string) => {
    if (status === currentStatus) return;
    setLoading(true);
    try {
      await supportTicketsApi.updateStatus(ticketId, status);
      onChanged(status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-text-muted" />}
      <select
        id="status-changer"
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className="text-xs font-semibold border border-borderGray rounded-lg px-2.5 py-1.5 bg-bgInput text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-60"
      >
        {Object.entries(STATUS_META).map(([val, meta]) => (
          <option key={val} value={val}>{meta.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = React.useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [replyError, setReplyError] = React.useState("");
  const [staffUsers, setStaffUsers] = React.useState<User[]>([]);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const isStaff = STAFF_ROLES.includes(user?.role ?? "");
  const canAssign = user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM";

  const loadTicket = React.useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    supportTicketsApi
      .get(id)
      .then((data) => {
        setTicket(data as unknown as SupportTicketDetail);
      })
      .catch((err: any) => setError(err?.message || "Failed to load ticket."))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  React.useEffect(() => {
    if (canAssign) {
      usersApi.list({ limit: 100 }).then((res) => {
        // Only BD_TEAM and SUPER_ADMIN can be assigned to support tickets; exclude ticket author
        const assignable = res.data.filter(
          (u) =>
            (u.role === "SUPER_ADMIN" || u.role === "BD_TEAM") &&
            (!ticket || u.id !== ticket.author.id)
        );
        setStaffUsers(assignable);
      }).catch(console.error);
    }
  }, [canAssign, ticket?.author?.id]);

  React.useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.replies?.length, loading]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setReplyError("");
    try {
      const newReply = await supportTicketsApi.addReply(id, reply.trim());
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: isStaff && prev.status === "OPEN" ? "IN_REVIEW" : prev.status,
              replies: [...prev.replies, newReply as unknown as SupportTicketReply],
            }
          : prev
      );
      setReply("");
    } catch (err: any) {
      setReplyError(err?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async (assigneeId?: string) => {
    if (!ticket) return;
    try {
      const updated = await supportTicketsApi.assign(id, assigneeId);
      setTicket((prev) => prev ? { ...prev, ...(updated as any) } : prev);
    } catch (err: any) {
      alert(err?.message || "Failed to assign ticket.");
    }
  };

  const handleStatusChanged = (newStatus: string) => {
    setTicket((prev) => prev ? { ...prev, status: newStatus as any } : prev);
  };

  if (loading) {
    return (
      <DashboardShell title="Support Ticket" breadcrumb={[{ label: "Support", href: "/support" }, { label: "Ticket" }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardShell title="Support Ticket" breadcrumb={[{ label: "Support", href: "/support" }, { label: "Error" }]}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-8 w-8 text-danger mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-3">{error || "Ticket not found."}</p>
          <button onClick={() => router.push("/support")} className="text-sm text-brand hover:underline font-medium">
            ← Back to Support
          </button>
        </div>
      </DashboardShell>
    );
  }

  const statusMeta = STATUS_META[ticket.status] ?? STATUS_META.OPEN;
  const StatusIcon = statusMeta.icon;
  const isClosed = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

  return (
    <DashboardShell
      title="Support Ticket"
      breadcrumb={[{ label: "Support", href: "/support" }, { label: ticket.subject }]}
    >
      {/* Back + refresh */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/support"
          className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-brand transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Support
        </Link>
        <button
          onClick={loadTicket}
          className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-bold text-text-primary">{ticket.subject}</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Opened {formatTime(ticket.createdAt)} by <strong>{ticket.author.name}</strong>
                </p>
              </div>
              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border", statusMeta.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusMeta.label}
              </span>
            </CardHeader>

            {/* Original message */}
            <CardBody className="p-5 border-b border-borderGray bg-bgPage/40">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Original Request</p>
              <p className="text-sm text-text-primary leading-relaxed">{ticket.description}</p>
            </CardBody>

            {/* Replies */}
            <div className="p-5 space-y-5 min-h-[200px] max-h-[480px] overflow-y-auto">
              {ticket.replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-text-muted font-medium">No replies yet. Support staff will respond shortly.</p>
                </div>
              ) : (
                ticket.replies.map((r) => (
                  <ReplyBubble
                    key={r.id}
                    reply={r}
                    isOwn={r.authorId === user?.id}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply Input */}
            <div className="border-t border-borderGray p-4">
              {isClosed ? (
                <p className="text-xs text-text-muted text-center font-medium py-2">
                  This ticket is {ticket.status.toLowerCase()} — no further replies allowed.
                </p>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-3">
                  {replyError && (
                    <div className="text-xs text-danger font-semibold">{replyError}</div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      id="reply-input"
                      rows={2}
                      placeholder="Write a reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e as any);
                        }
                      }}
                      className="flex-1 px-3 py-2.5 text-sm border border-borderGray rounded-xl bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
                    />
                    <button
                      id="reply-send-btn"
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="px-4 py-2.5 rounded-xl bg-brand text-white flex items-center gap-1.5 text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-50 self-end"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted">Press Enter to send · Shift+Enter for new line</p>
                </form>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-text-primary">Ticket Details</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-medium">Status</span>
                {isStaff ? (
                  <StatusChanger
                    currentStatus={ticket.status}
                    ticketId={ticket.id}
                    onChanged={handleStatusChanged}
                  />
                ) : (
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold", statusMeta.color)}>
                    <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-text-muted font-medium">Priority</span>
                <span className="font-semibold text-text-primary">{ticket.priority}</span>
              </div>

              {ticket.category && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">Category</span>
                  <span className="flex items-center gap-1 font-semibold text-text-primary capitalize">
                    <Tag className="h-3 w-3" /> {ticket.category}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-text-muted font-medium">Replies</span>
                <span className="font-bold text-text-primary">{ticket.replies.length}</span>
              </div>

              <div className="pt-1 border-t border-borderGray">
                <p className="text-text-muted font-medium mb-0.5">Submitted by</p>
                <p className="font-semibold text-text-primary">{ticket.author.name}</p>
                <p className="text-text-muted">{ticket.author.email}</p>
              </div>

              <div className="border-t border-borderGray pt-1.5">
                <p className="text-text-muted font-medium mb-0.5">Assigned to</p>
                {canAssign ? (
                  <div className="space-y-1.5 mt-1">
                    <select
                      value={ticket.assignedTo?.id || ""}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="w-full h-8 px-2 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="">Unassigned</option>
                      {staffUsers
                        .filter((u) => u.id !== ticket.author.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role.replace("_", " ")})
                          </option>
                        ))}
                    </select>
                    {!ticket.assignedTo && user?.id !== ticket.author.id && (
                      <button
                        id="btn-assign-self"
                        onClick={() => handleAssign()}
                        className="text-[11.5px] font-bold text-brand hover:underline block ml-1"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="font-semibold text-text-primary">{ticket.assignedTo?.name || "Unassigned"}</p>
                )}
              </div>
            </CardBody>
          </Card>

          {ticket.resolvedAt && (
            <Card>
              <CardBody className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="text-xs font-bold text-success">Resolved</p>
                  <p className="text-[11px] text-text-muted">{formatTime(ticket.resolvedAt)}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
