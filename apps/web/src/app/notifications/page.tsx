"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { notificationsApi } from "../../lib/api";
import type { Notification } from "../../lib/types";
import { PageHeader, EmptyState, ErrorState, Card } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle, CalendarCheck, FileSpreadsheet, BookOpen, Megaphone, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  INFO:       { icon: Info,          bg: "bg-brand/10",   color: "text-brand" },
  SUCCESS:    { icon: CheckCircle,   bg: "bg-success/10", color: "text-success" },
  WARNING:    { icon: AlertTriangle, bg: "bg-amber-50",   color: "text-amber-600" },
  ALERT:      { icon: AlertCircle,   bg: "bg-danger/10",  color: "text-danger" },
  ATTENDANCE: { icon: CalendarCheck, bg: "bg-buddy/10",   color: "text-buddy" },
  LEAVE:      { icon: FileSpreadsheet, bg: "bg-brand/10", color: "text-brand" },
  TRAINING:   { icon: BookOpen,      bg: "bg-success/10", color: "text-success" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [showBroadcastModal, setShowBroadcastModal] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    notificationsApi
      .list({ read: filter === "unread" ? false : undefined, page, limit: 20 })
      .then((res) => {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter, page]);

  React.useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function deleteNotification(id: string) {
    await notificationsApi.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <DashboardShell title="Notifications" breadcrumb={[{ label: "Notifications" }]}>
      <PageHeader
        title="Notifications"
        description="Stay up to date with system events"
        action={
          <div className="flex items-center gap-2">
            {currentUser?.role === "SUPER_ADMIN" && (
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]"
              >
                <Megaphone className="h-4 w-4" /> Broadcast Notice
              </button>
            )}
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="inline-flex items-center gap-2 h-9 px-4 border border-borderGray bg-white text-sm font-medium rounded-lg hover:bg-bgInput transition-colors">
                <CheckCheck className="h-4 w-4" /> Mark all read
              </button>
            )}
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => { setFilter("all"); setPage(1); }}
          className={cn("h-8 px-4 text-xs font-semibold rounded-lg border transition-all",
            filter === "all" ? "bg-brand text-white border-brand" : "bg-white border-borderGray text-text-muted hover:border-brand hover:text-brand")}>
          All
        </button>
        <button onClick={() => { setFilter("unread"); setPage(1); }}
          className={cn("h-8 px-4 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5",
            filter === "unread" ? "bg-brand text-white border-brand" : "bg-white border-borderGray text-text-muted hover:border-brand hover:text-brand")}>
          Unread
          {unreadCount > 0 && (
            <span className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
              filter === "unread" ? "bg-white text-brand" : "bg-brand text-white")}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <div className="divide-y divide-borderGray">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-bgInput shrink-0" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-bgInput rounded" /><div className="h-3 w-64 bg-bgInput rounded" /></div>
                  </div>
                ))
              : notifications.length === 0
              ? <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
              : notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.INFO;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
                      className={cn(
                        "px-5 py-4 flex items-start gap-3 hover:bg-bgPage/50 transition-colors cursor-pointer group",
                        !n.read && "bg-brand/[0.03]"
                      )}
                    >
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                        <Icon className={cn("h-4 w-4", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-semibold", n.read ? "text-text-secondary" : "text-text-primary")}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {!n.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger rounded transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-text-muted mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-borderGray flex items-center justify-between">
              <p className="text-xs text-text-muted">{meta.total} notifications</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}
      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          onDone={load}
        />
      )}
    </DashboardShell>
  );
}

function BroadcastModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState("INFO");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await notificationsApi.broadcast({
        title: title.trim(),
        message: message.trim(),
        type,
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to send broadcast.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Broadcast Notification</h3>
          <p className="text-xs text-text-muted mt-0.5">Send a global notification to all users in the system.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-danger/8 border border-danger/20 text-danger text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Title *</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. System Maintenance Notice"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Message *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your announcement details here..."
              className="w-full p-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Notification Type</label>
            <CustomSelect
              value={type}
              onChange={(val) => setType(val)}
              options={[
                { value: "INFO", label: "Information (Blue)" },
                { value: "SUCCESS", label: "Success (Green)" },
                { value: "WARNING", label: "Warning (Yellow)" },
                { value: "ALERT", label: "Alert (Red)" },
              ]}
              className="w-full"
              size="sm"
            />
          </div>
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
              Send Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
