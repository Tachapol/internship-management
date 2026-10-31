"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { usersApi, companiesApi, invitationsApi } from "../../lib/api";
import type { User, UserRole, Company } from "../../lib/types";
import { PageHeader, StatusBadge, EmptyState, ErrorState, DataTable, Card } from "../../components/ui/shared";
import { Users, UserPlus, Search, MoreVertical, Mail, Loader2, Link2, Check, Upload, Copy, CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";
import { ImportUsersModal } from "../../components/users/ImportUsersModal";

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  BD_TEAM: "bg-blue-100 text-blue-800 border border-blue-200",
  MENTOR: "bg-sky-100 text-sky-800 border border-sky-200",
  STUDENT: "bg-slate-100 text-slate-800 border border-slate-200",
};

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sizeClass} rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function InviteUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"STUDENT" | "MENTOR" | "BD_TEAM">("STUDENT");
  const [companyId, setCompanyId] = React.useState("");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const [error, setError] = React.useState("");
  const [successData, setSuccessData] = React.useState<{ email: string; token?: string; emailSent?: boolean } | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    companiesApi
      .list({ limit: 100, status: "ACTIVE" })
      .then(res => {
        setCompanies(res.data.filter(company => company.status === "ACTIVE"));
      })
      .catch(err => {
        console.error("Failed to load companies:", err);
        setError("Could not load active organisations. Close this dialog and try again.");
      })
      .finally(() => {
        setLoadingCompanies(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    if (!companyId) { setError("Please select a company."); return; }
    setLoading(true);
    setError("");
    try {
      const res: any = await usersApi.invite({ email, role, companyId });
      setSuccessData({
        email: email.trim(),
        token: res?.token,
        emailSent: res?.emailSent,
      });
      onDone();
    } catch (err: any) {
      setError(err?.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!successData?.token) return;
    const inviteLink = `${window.location.origin}/auth/accept-invitation?token=${successData.token}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const generatedInviteLink = successData?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/accept-invitation?token=${successData.token}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        {!successData ? (
          <>
            <div>
              <h3 className="font-bold text-text-primary text-base">Invite New User</h3>
              <p className="text-xs text-text-muted mt-0.5">Send onboarding invitation email to a new member.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. intern@acme.com"
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">System Role *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="STUDENT">Student / Intern</option>
                  <option value="MENTOR">Mentor Supervisor</option>
                  <option value="BD_TEAM">BD Team Member</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Organisation *</label>
                {loadingCompanies ? (
                  <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm flex items-center text-text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading companies...
                  </div>
                ) : (
                  <select
                    required
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">{companies.length === 0 ? "No active organisations available" : "Select organisation"}</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingCompanies || !companyId}
                  className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Invite
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Account Created</h3>
                <p className="text-xs text-text-muted">Invitation for <span className="font-semibold text-text-primary">{successData.email}</span></p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${successData.emailSent
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
              }`}>
              {successData.emailSent ? (
                <p>✅ An invitation email has been dispatched to <strong>{successData.email}</strong>.</p>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Email Delivery Notice:</strong> In development / test environment with unverified domains, email delivery to external inboxes may be restricted by Resend. You can copy the direct registration link below to share directly with the user.
                  </p>
                </div>
              )}
            </div>

            {generatedInviteLink && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary block">Direct Invitation Link</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedInviteLink}
                    className="flex-1 h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs font-mono text-text-muted select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="h-9 px-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersPageContent() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") || "";

  const canInvite = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "BD_TEAM";
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState(roleParam);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const r = searchParams.get("role");
    if (r !== null) {
      setRoleFilter(r);
      setPage(1);
    }
  }, [searchParams]);

  async function handleCopyLink(u: User) {
    try {
      const res = await invitationsApi.getLink(u.email);
      if (!res?.token) {
        alert("No pending invitation found for this user. You can generate a new one using 'Resend & Renew Link'.");
        return;
      }
      const link = `${window.location.origin}/auth/accept-invitation?token=${res.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert("Failed to copy link.");
    }
  }

  async function handleResendInvite(u: User) {
    try {
      setResendingId(u.id);
      const res = await invitationsApi.resend(u.email);
      const link = `${window.location.origin}/auth/accept-invitation?token=${res.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(null), 3000);
      alert(`New invitation generated!\n\nLink copied to clipboard:\n${link}\n\n(Previous links have been revoked. This link is valid for 7 days.)`);
    } catch (err: any) {
      alert(err?.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  }

  const cacheKey = `users_cache_${search}_${roleFilter}_${statusFilter}_${page}`;

  React.useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setUsers(parsed.data || []);
        setMeta(parsed.meta || { total: 0, totalPages: 1 });
        setLoading(false);
      }
    } catch { }
  }, [cacheKey]);

  const load = React.useCallback(() => {
    setLoading((prev) => (users.length > 0 ? false : true));
    setError("");
    usersApi
      .list({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 15 })
      .then((res) => {
        setUsers(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res));
        } catch { }
      })
      .catch((e) => {
        if (users.length === 0) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter, page, cacheKey, users.length]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await usersApi.delete(id);
      // Invalidate all users cache in sessionStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("users_cache_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
      // Optimistically remove from state
      setUsers((prev) => prev.filter((u) => u.id !== id));
      // Reload fresh list from server
      load();
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate user.");
    }
  }

  const renderUserActions = (u: User) => (
    <div className="relative">
      <button
        aria-label={`Actions for ${u.name}`}
        aria-expanded={openMenu === u.id}
        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
        className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {openMenu === u.id && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-borderGray rounded-xl shadow-lg min-w-[160px] py-1">
          <Link href={`/users/${u.id}`} onClick={() => setOpenMenu(null)} className="flex px-3 py-2 text-sm text-text-primary hover:bg-bgInput">View Profile</Link>
          {currentUser && (currentUser.role === "SUPER_ADMIN" || currentUser.role === "BD_TEAM") && (
            <>
              {u.status === "PENDING_SETUP" && (
                <>
                  <button
                    onClick={() => { handleCopyLink(u); setOpenMenu(null); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand/5 w-full text-left"
                  >
                    {copiedId === u.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copiedId === u.id ? "Copied!" : "Copy Invite Link"}
                  </button>
                  <button
                    onClick={() => { handleResendInvite(u); setOpenMenu(null); }}
                    disabled={resendingId === u.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand/5 w-full text-left disabled:opacity-50"
                  >
                    {resendingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                    Resend & Renew Link
                  </button>
                </>
              )}
              <button onClick={() => { handleDelete(u.id); setOpenMenu(null); }} className="flex px-3 py-2 text-sm text-danger hover:bg-danger/5 w-full text-left">Deactivate</button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <DashboardShell title="Users" breadcrumb={[{ label: "Users" }]}>
      <PageHeader
        title="Users"
        description="Manage interns, mentors, and team members"
        action={
          canInvite ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-white border border-borderGray text-text-primary text-sm font-semibold rounded-lg hover:bg-bgInput transition-all shadow-sm active:scale-[0.98]">
                <Upload className="h-4 w-4" /> Import Users
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> Invite User
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-borderGray pb-1 mb-5">
        {([
          { value: "", label: "All Users" },
          { value: "STUDENT", label: "Students" },
          { value: "MENTOR", label: "Mentors" },
          { value: "BD_TEAM", label: "BD Team" },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setRoleFilter(tab.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${roleFilter === tab.value
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-primary"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING_SETUP">Pending Setup</option>
          </select>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <div className="md:hidden divide-y divide-borderGray" data-testid="users-mobile-list">
            {loading ? <p role="status" className="p-5 text-sm text-text-muted">Loading users…</p> : users.map(u => (
              <article key={u.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 min-w-0">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <Link href={`/users/${u.id}`} className="font-semibold text-sm text-text-primary break-words">{u.name}</Link>
                      <p className="text-xs text-text-muted break-all">{u.email}</p>
                    </div>
                  </div>
                  {renderUserActions(u)}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[u.role]}`}>{u.role.replaceAll('_', ' ')}</span>
                  <StatusBadge status={u.status} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-text-muted">Company</dt><dd className="text-text-primary break-words">{u.company?.name ?? 'Unassigned'}</dd>
                  <dt className="text-text-muted">Mentor</dt><dd className="text-text-primary">{u.mentor?.name ?? 'Unassigned'}</dd>
                  <dt className="text-text-muted">Joined</dt><dd className="text-text-primary">{formatDate(u.createdAt)}</dd>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden md:block" data-testid="users-desktop-table">
          <DataTable
            headers={["User", "Role", "Status", "Company", "Mentor", "Joined", "Actions"]}
            loading={loading}
            empty={!loading && users.length === 0}
          >
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-bgPage/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <Link href={`/users/${u.id}`} className="text-sm font-semibold text-text-primary hover:text-brand block">
                        {u.name}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Mail className="h-3 w-3" />{u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3.5 text-sm text-text-muted">{u.company?.name ?? "—"}</td>
                <td className="px-4 py-3.5 text-sm text-text-muted">{u.mentor?.name ?? "—"}</td>
                <td className="px-4 py-3.5 text-sm text-text-muted whitespace-nowrap">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3.5">
                  {renderUserActions(u)}
                </td>
              </tr>
            ))}
          </DataTable>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-borderGray flex items-center justify-between">
              <p className="text-xs text-text-muted">Total {meta.total} users</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon={Users} title="No users found" description="Invite your first team member to get started."
          action={canInvite ? <button onClick={() => setShowInviteModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><UserPlus className="h-4 w-4" /> Invite User</button> : undefined} />
      )}

      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} onDone={load} />
      )}

      {showImportModal && (
        <ImportUsersModal onClose={() => setShowImportModal(false)} onDone={load} />
      )}
    </DashboardShell>
  );
}

export default function UsersPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Users" breadcrumb={[{ label: "Users" }]}>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        </DashboardShell>
      }
    >
      <UsersPageContent />
    </React.Suspense>
  );
}
