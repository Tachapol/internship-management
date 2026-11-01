"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { leaveRequestsApi } from "../../lib/api";
import type { LeaveRequest, LeaveStatus } from "../../lib/types";
import { PageHeader, StatusBadge, EmptyState, ErrorState, Card, CardHeader, CardBody } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { useAuth } from "../../lib/auth-context";
import { FileSpreadsheet, Plus, Search, CheckCircle, XCircle, Loader2, MoreVertical, Paperclip } from "lucide-react";
import { formatDate } from "../../lib/utils";

function ReviewModal({ request, onClose, onDone }: {
  request: LeaveRequest; onClose: () => void; onDone: () => void;
}) {
  const [action, setAction] = React.useState<"approve" | "reject">("approve");
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit() {
    if (action === "reject" && note.trim().length < 10) { setError("Rejection reason must be at least 10 characters."); return; }
    setLoading(true);
    try {
      if (action === "approve") await leaveRequestsApi.approve(request.id, note || undefined);
      else await leaveRequestsApi.reject(request.id, note);
      onDone();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div>
          <h3 className="font-bold text-text-primary text-base">Review Leave Request</h3>
          <p className="text-sm text-text-muted mt-0.5">{request.student?.name} · {request.type} leave</p>
        </div>
        <div className="bg-bgPage rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Period</span><span className="font-semibold text-text-primary">{formatDate(request.startDate)} – {formatDate(request.endDate)}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Reason</span><span className="font-semibold text-text-primary max-w-[200px] text-right">{request.reason}</span></div>
        </div>
        <div className="flex gap-2">
          {(["approve", "reject"] as const).map(a => (
            <button key={a} onClick={() => setAction(a)}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-all ${action === a ? a === "approve" ? "bg-success text-white border-success" : "bg-danger text-white border-danger" : "border-borderGray text-text-muted hover:bg-bgInput"}`}>
              {a === "approve" ? "✓ Approve" : "✗ Reject"}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold text-text-primary block mb-1.5">
            Note {action === "reject" && <span className="text-danger">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={action === "approve" ? "Optional approval note…" : "Reason for rejection (required)…"}
            className="w-full px-3 py-2 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
          />
          {error && <p className="text-xs text-danger mt-1">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${action === "approve" ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"}`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitLeaveModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [type, setType] = React.useState<"SICK" | "CASUAL" | "ANNUAL" | "OTHER">("SICK");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) { setError("Start date is required."); return; }
    if (!endDate) { setError("End date is required."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("startDate", new Date(startDate).toISOString());
      formData.append("endDate", new Date(endDate).toISOString());
      formData.append("reason", reason);
      if (file) {
        formData.append("file", file);
      }

      await leaveRequestsApi.create(formData);
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Submit Leave Request</h3>
          <p className="text-xs text-text-muted mt-0.5">Request formal time-off from your mentor supervisor.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Leave Type *</label>
            <CustomSelect
              value={type}
              onChange={(val) => setType(val as any)}
              options={[
                { value: "SICK", label: "Sick Leave" },
                { value: "CASUAL", label: "Casual Leave" },
                { value: "ANNUAL", label: "Annual Leave" },
                { value: "OTHER", label: "Other Leave" },
              ]}
              className="w-full"
              size="sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Start Date *</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">End Date *</label>
              <input
                required
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Supporting Document</label>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Reason *</label>
            <textarea
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. High fever, doctor advised resting..."
              rows={2}
              className="w-full px-3 py-1.5 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const canApprove = user?.role !== "STUDENT";

  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<LeaveStatus | "">("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [reviewTarget, setReviewTarget] = React.useState<LeaveRequest | null>(null);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    leaveRequestsApi
      .list({ status: statusFilter || undefined, page, limit: 15 })
      .then((res) => { setRequests(res.data); setMeta({ total: res.meta.total, totalPages: res.meta.totalPages }); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r =>
    !search ||
    r.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = {
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };

  return (
    <DashboardShell title="Leave Requests" breadcrumb={[{ label: "Leave Requests" }]}>
      {reviewTarget && (
        <ReviewModal request={reviewTarget} onClose={() => setReviewTarget(null)} onDone={load} />
      )}

      <PageHeader
        title="Leave Requests"
        description={isStudent ? "Submit and track your leave requests" : "Review and manage intern leave requests"}
        action={isStudent && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]">
            <Plus className="h-4 w-4" /> New Request
          </button>
        )}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Pending", count: statusCounts.PENDING, color: "text-amber-600 bg-amber-50" },
          { label: "Approved", count: statusCounts.APPROVED, color: "text-success bg-success/10" },
          { label: "Rejected", count: statusCounts.REJECTED, color: "text-danger bg-danger/10" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-borderGray rounded-xl p-4 text-center hover:shadow-sm transition-shadow">
            <p className="text-xl font-bold text-text-primary">{s.count}</p>
            <p className={`text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full inline-block ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student or type…"
            className="w-full h-9 pl-9 pr-3 bg-white border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
        </div>
        <div className="flex gap-2">
          {(["", "PENDING", "APPROVED", "REJECTED"] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all ${statusFilter === s ? "bg-brand text-white border-brand" : "bg-white border-borderGray text-text-muted hover:border-brand hover:text-brand"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <div className="divide-y divide-borderGray">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between animate-pulse">
                    <div className="space-y-2"><div className="h-4 w-40 bg-bgInput rounded" /><div className="h-3 w-56 bg-bgInput rounded" /></div>
                    <div className="h-6 w-16 bg-bgInput rounded-full" />
                  </div>
                ))
              : filtered.length === 0
              ? <EmptyState icon={FileSpreadsheet} title="No requests" description={isStudent ? "Submit your first leave request." : "No leave requests to review."} />
              : filtered.map(r => (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-bgPage/50 transition-colors gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-buddy/10 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="h-4 w-4 text-buddy" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.student && <span className="text-sm font-bold text-text-primary">{r.student.name}</span>}
                          <StatusBadge status={r.type} />
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatDate(r.startDate)} – {formatDate(r.endDate)} · <span className="text-text-secondary">{r.reason}</span>
                        </p>
                        {r.attachmentUrl && (
                          <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:underline mt-0.5">
                            <Paperclip className="h-3 w-3" /> Attachment
                          </a>
                        )}
                        {r.approverNote && <p className="text-xs text-text-muted italic mt-0.5">"{r.approverNote}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status} />
                      {canApprove && r.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => setReviewTarget(r)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold text-success bg-success/10 hover:bg-success/20 rounded-lg transition-colors">
                            <CheckCircle className="h-3 w-3" /> Review
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                ))
            }
          </div>

          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-borderGray flex items-center justify-between">
              <p className="text-xs text-text-muted">Total {meta.total} requests</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showSubmitModal && (
        <SubmitLeaveModal onClose={() => setShowSubmitModal(false)} onDone={load} />
      )}
    </DashboardShell>
  );
}
